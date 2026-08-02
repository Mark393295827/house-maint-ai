import { describe, expect, it } from 'vitest';
import { SQLiteFallback } from '../config/database.js';
import {
    CaseEventError,
    CaseEventService,
    canonicalizeJson,
    decodeProjectionPatch,
    encodeProjectionPatch,
    replayEvents,
    reduceCaseProjection,
    sha256,
    type CaseEventInput,
    type CaseEventRow,
} from '../services/case-events/index.js';

async function createCaseDatabase(): Promise<SQLiteFallback> {
    const database = new SQLiteFallback(':memory:');
    await database.initSchema();
    await database.query(
        `INSERT INTO organizations (slug, name) VALUES ($1, $2)`,
        ['case-events-test', 'Case Events Test'],
    );
    await database.query(
        `INSERT INTO maintenance_cases (organization_id, title, status, stage, priority, version)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [1, 'Kitchen leak', 'open', 'intake', 'normal', 0],
    );
    return database;
}

function openingInput(overrides: Partial<CaseEventInput> = {}): CaseEventInput {
    return {
        organizationId: 1,
        caseId: 1,
        eventType: 'case_opened',
        actorType: 'system',
        actorMembershipId: null,
        idempotencyKey: 'open-1',
        correlationId: 'corr-1',
        expectedVersion: 0,
        payload: {
            title: 'Kitchen leak',
            priority: 'urgent',
            propertyId: null,
            unitId: null,
        },
        ...overrides,
    };
}

function eventWithPayload(event: CaseEventRow, payload: unknown): CaseEventRow {
    const payloadJson = canonicalizeJson(payload, 'payload');
    const commandJson = canonicalizeJson({
        actorMembershipId: event.actor_membership_id ?? null,
        actorType: event.actor_type,
        correlationId: event.correlation_id ?? null,
        eventType: event.event_type,
        payload,
    }, 'command');
    return {
        ...event,
        payload_json: payloadJson,
        payload_hash: sha256(payloadJson),
        command_hash: sha256(commandJson),
    };
}

async function count(database: SQLiteFallback, table: string): Promise<number> {
    const result = await database.query<{ count: number }>(`SELECT COUNT(*) AS count FROM ${table}`);
    return Number(result.rows[0].count);
}

describe('case-events service', () => {
    it('commits one append, stores a canonical patch envelope, and replays deterministically', async () => {
        const database = await createCaseDatabase();
        try {
            const service = new CaseEventService(database);
            const created = await service.append(openingInput());

            expect(created.replayed).toBe(false);
            expect(created.event.sequence).toBe(1);
            expect(created.event.reducer_version).toBe(1);
            expect(created.projection.version).toBe(1);
            expect(created.projection.priority).toBe('urgent');
            expect(created.event.projection_patch_json).toBe(
                canonicalizeJson(JSON.parse(created.event.projection_patch_json), 'projectionPatch'),
            );
            expect(JSON.parse(created.event.projection_patch_json)).toMatchObject({
                reducerVersion: 1,
                patch: { title: 'Kitchen leak', priority: 'urgent' },
            });

            const replayed = await service.replay(1, 1);
            expect(replayed).toEqual(created.projection);

            const row = await database.query<{ version: number; priority: string }>(
                `SELECT version, priority FROM maintenance_cases WHERE organization_id = $1 AND id = $2`,
                [1, 1],
            );
            expect(row.rows).toEqual([{ version: 1, priority: 'urgent' }]);
        } finally {
            database.close();
        }
    });

    it('returns the original result for same-key replay and rejects a different payload', async () => {
        const database = await createCaseDatabase();
        try {
            const service = new CaseEventService(database);
            const first = await service.append(openingInput());
            const replay = await service.append(openingInput({ expectedVersion: 1 }));
            expect(replay.replayed).toBe(true);
            expect(replay.event.id).toBe(first.event.id);
            expect(replay.projection).toEqual(first.projection);
            expect(await count(database, 'case_events')).toBe(1);

            await expect(service.append(openingInput({
                expectedVersion: 1,
                payload: { title: 'Different leak' },
            }))).rejects.toMatchObject({ code: 'idempotency_conflict' });
            expect(await count(database, 'case_events')).toBe(1);
        } finally {
            database.close();
        }
    });

    it('enforces optimistic versions, positive identifiers, bounded keys, and known actors', async () => {
        const database = await createCaseDatabase();
        try {
            const service = new CaseEventService(database);
            await expect(service.append(openingInput({ expectedVersion: 1 })))
                .rejects.toMatchObject({ code: 'version_conflict' });
            await expect(service.append(openingInput({ organizationId: 0 })))
                .rejects.toMatchObject({ code: 'invalid_input' });
            await expect(service.append(openingInput({ eventType: 'not-real' as CaseEventInput['eventType'] })))
                .rejects.toMatchObject({ code: 'invalid_input' });
            await expect(service.append(openingInput({ idempotencyKey: 'x'.repeat(129) })))
                .rejects.toMatchObject({ code: 'invalid_input' });
            await expect(service.append(openingInput({ actorType: 'member', actorMembershipId: null })))
                .rejects.toMatchObject({ code: 'invalid_input' });
            await expect(service.append(openingInput({ payload: { title: 'bad', value: undefined } })))
                .rejects.toMatchObject({ code: 'invalid_json' });
        } finally {
            database.close();
        }
    });

    it('rolls back the event when the projection update fails', async () => {
        const database = await createCaseDatabase();
        try {
            await database.query(`
                CREATE TRIGGER fail_case_projection
                BEFORE UPDATE ON maintenance_cases
                BEGIN SELECT RAISE(ABORT, 'forced projection failure'); END
            `);
            const service = new CaseEventService(database);
            await expect(service.append(openingInput())).rejects.toThrow(/forced projection failure/i);
            expect(await count(database, 'case_events')).toBe(0);
            const row = await database.query<{ version: number }>(
                `SELECT version FROM maintenance_cases WHERE organization_id = $1 AND id = $2`,
                [1, 1],
            );
            expect(row.rows).toEqual([{ version: 0 }]);
        } finally {
            database.close();
        }
    });

    it('replays from event patches without reading mutable case projection fields', async () => {
        const database = await createCaseDatabase();
        try {
            const service = new CaseEventService(database);
            await service.append(openingInput());
            await service.append({
                organizationId: 1,
                caseId: 1,
                eventType: 'case_stage_changed',
                actorType: 'system',
                actorMembershipId: null,
                idempotencyKey: 'stage-1',
                correlationId: null,
                expectedVersion: 1,
                payload: { stage: 'diagnosis' },
            });

            await database.query(
                `UPDATE maintenance_cases SET title = $1 WHERE organization_id = $2 AND id = $3`,
                ['mutated outside event stream', 1, 1],
            );
            const originalQuery = database.query.bind(database);
            database.query = async <T = unknown>(text: string, params?: unknown[]) => {
                if (/maintenance_cases/i.test(text)) {
                    throw new Error('mutable case projection was read during replay');
                }
                return originalQuery<T>(text, params);
            };

            const replayed = await service.replay(1, 1);
            expect(replayed.title).toBe('Kitchen leak');
            expect(replayed.stage).toBe('diagnosis');
            expect(replayed.version).toBe(2);
        } finally {
            database.close();
        }
    });

    it('rejects malformed stored JSON during replay', () => {
        const malformed = {
            id: 1,
            organization_id: 1,
            case_id: 1,
            sequence: 1,
            event_type: 'case_opened',
            schema_version: 1,
            reducer_version: 1,
            actor_type: 'system',
            actor_membership_id: null,
            idempotency_key: 'malformed',
            command_hash: 'x',
            payload_hash: 'x',
            projection_patch_json: '{bad',
            payload_json: '{bad',
            correlation_id: null,
            created_at: new Date().toISOString(),
        } satisfies CaseEventRow;
        expect(() => replayEvents([malformed])).toThrow(CaseEventError);
    });

    it('rejects non-object stored payloads even when their hashes are valid', async () => {
        const database = await createCaseDatabase();
        try {
            const service = new CaseEventService(database);
            const created = await service.append(openingInput());
            const malformedPayloads: unknown[] = [[], null, 1, 'text'];

            for (const payload of malformedPayloads) {
                expect(() => replayEvents([eventWithPayload(created.event, payload)])).toThrow(
                    /stored payload must be a json object/i,
                );
            }

            expect(replayEvents([eventWithPayload(created.event, {
                title: 'Kitchen leak',
                priority: 'urgent',
                propertyId: null,
                unitId: null,
            })])).toEqual(created.projection);
        } finally {
            database.close();
        }
    });

    it('fails closed when replay hashes, patch keys, or opening timestamps are tampered', async () => {
        const database = await createCaseDatabase();
        try {
            const service = new CaseEventService(database);
            const created = await service.append(openingInput());
            expect(() => replayEvents([{ ...created.event, payload_hash: '0'.repeat(64) }]))
                .toThrow(/payload hash/i);
            expect(() => replayEvents([{ ...created.event, command_hash: '0'.repeat(64) }]))
                .toThrow(/command hash/i);
            expect(() => decodeProjectionPatch(canonicalizeJson({
                reducerVersion: 1,
                patch: { stage: 'diagnosis', unexpected: 'x' },
            }, 'projectionPatch'))).toThrow(/unsupported/i);

            const invalidTimestamp = encodeProjectionPatch({
                title: 'Kitchen leak',
                status: 'open',
                stage: 'intake',
                priority: 'normal',
                createdAt: 'not-a-date',
                updatedAt: new Date().toISOString(),
                closedAt: null,
            });
            expect(() => reduceCaseProjection(null, {
                ...created.event,
                projection_patch_json: invalidTimestamp,
            })).toThrow(/createdAt/i);
        } finally {
            database.close();
        }
    });

    it('rejects opening or import events after a case already has a projection', async () => {
        const database = await createCaseDatabase();
        try {
            const service = new CaseEventService(database);
            await service.append(openingInput());
            await expect(service.append(openingInput({
                idempotencyKey: 'open-2',
                expectedVersion: 1,
                payload: { title: 'Second opening' },
            }))).rejects.toMatchObject({ code: 'invalid_event' });
            expect(await count(database, 'case_events')).toBe(1);
        } finally {
            database.close();
        }
    });
});
