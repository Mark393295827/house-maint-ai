import { describe, expect, it } from 'vitest';
import { replayCaseEvents } from '@house-maint/domain';
import { CaseCommandService } from '../../../packages/domain/src/index.js';
import { InMemoryCaseCommandRepository } from '../../../packages/persistence/src/cases/index.js';
import { CanonicalCasesModule } from '../../../apps/api/src/modules/cases/index.js';
import {
    FIXED_NOW,
    caseScope,
    existingCaseCommand,
    openCaseCommand,
} from '../../contract/cases/fixtures.js';

function setup() {
    const repository = new InMemoryCaseCommandRepository();
    const service = new CaseCommandService(repository, () => FIXED_NOW);
    return { repository, service };
}

describe('in-memory canonical command authority', () => {
    it('checks idempotency before version and rejects key reuse with changed intent', async () => {
        const { repository, service } = setup();
        const command = openCaseCommand({ key: 'opening-replay' });
        const first = await service.execute({ command, scope: caseScope() });
        const replay = await service.execute({ command, scope: caseScope() });
        expect(replay.replayed).toBe(true);
        expect(replay.event.event_id).toBe(first.event.event_id);
        expect(repository.getWriteAudit()).toHaveLength(1);

        await expect(service.execute({
            command: openCaseCommand({ key: 'opening-replay', title: 'Different issue' }),
            scope: caseScope(),
        })).rejects.toMatchObject({ code: 'idempotency_conflict' });
        await expect(service.execute({
            command: existingCaseCommand({
                type: 'update_case', caseId: first.projection.id, expectedVersion: 0, key: 'stale-update',
            }),
            scope: caseScope({ caseId: first.projection.id }),
        })).rejects.toMatchObject({ code: 'version_conflict' });
    });

    it('serializes same-version commands and preserves a contiguous replayable timeline', async () => {
        const { repository, service } = setup();
        const opened = await service.execute({ command: openCaseCommand(), scope: caseScope() });
        const caseId = opened.projection.id;
        const contenders = await Promise.allSettled([
            service.execute({
                command: existingCaseCommand({
                    type: 'update_case', caseId, expectedVersion: 1, key: 'update-a',
                    payload: { title: 'Leak beneath kitchen sink' },
                }),
                scope: caseScope({ caseId }),
            }),
            service.execute({
                command: existingCaseCommand({
                    type: 'update_case', caseId, expectedVersion: 1, key: 'update-b',
                    payload: { priority: 'emergency' },
                }),
                scope: caseScope({ caseId }),
            }),
        ]);
        expect(contenders.filter((entry) => entry.status === 'fulfilled')).toHaveLength(1);
        expect(contenders.filter((entry) => entry.status === 'rejected')).toHaveLength(1);
        const afterUpdate = await repository.load(1, caseId);
        expect(afterUpdate?.version).toBe(2);

        const resolved = await service.execute({
            command: existingCaseCommand({
                type: 'resolve_case', caseId, expectedVersion: 2, key: 'resolve-1',
            }),
            scope: caseScope({ caseId }),
        });
        const closed = await service.execute({
            command: existingCaseCommand({
                type: 'close_case', caseId, expectedVersion: 3, key: 'close-1',
            }),
            scope: caseScope({ caseId }),
        });
        expect(resolved.projection.status).toBe('resolved');
        expect(closed.projection).toMatchObject({ status: 'closed', stage: 'closed', version: 4 });
        const timeline = await repository.timeline(1, caseId);
        expect(timeline.map((event) => event.sequence)).toEqual([1, 2, 3, 4]);
        expect(replayCaseEvents(timeline)).toEqual(closed.projection);
    });

    it('uses organization-qualified reads and hides cross-organization case ids', async () => {
        const { service } = setup();
        const opened = await service.execute({ command: openCaseCommand(), scope: caseScope() });
        await expect(service.getCase(caseScope({ organizationId: 2 }), opened.projection.id))
            .rejects.toMatchObject({ code: 'not_found' });
        await expect(service.execute({
            command: existingCaseCommand({
                type: 'update_case', caseId: opened.projection.id, expectedVersion: 1,
                key: 'cross-org', organizationId: 2,
            }),
            scope: caseScope({ organizationId: 2, caseId: opened.projection.id }),
        })).rejects.toMatchObject({ code: 'not_found' });
        await expect(service.getCase(caseScope({ caseId: opened.projection.id + 1 }), opened.projection.id))
            .rejects.toMatchObject({ code: 'not_found' });
    });

    it('enforces property ancestry for commands, reads, timelines, and receipt replays', async () => {
        const { repository, service } = setup();
        const opened = await service.execute({
            command: openCaseCommand({ propertyId: 10, unitId: 100 }),
            scope: caseScope(),
        });
        const caseId = opened.projection.id;
        const wrongProperty = caseScope({ propertyId: 99 });

        await expect(service.execute({
            command: existingCaseCommand({
                type: 'update_case', caseId, expectedVersion: 0, key: 'wrong-property-stale',
            }),
            scope: wrongProperty,
        })).rejects.toMatchObject({ code: 'not_found' });
        await expect(service.execute({
            command: existingCaseCommand({
                type: 'update_case', caseId, expectedVersion: 1, key: 'wrong-property-fresh',
            }),
            scope: wrongProperty,
        })).rejects.toMatchObject({ code: 'not_found' });
        await expect(service.getCase(wrongProperty, caseId)).rejects.toMatchObject({ code: 'not_found' });
        await expect(service.getTimeline(wrongProperty, caseId)).rejects.toMatchObject({ code: 'not_found' });
        expect((await repository.load(1, caseId))?.version).toBe(1);

        const validUpdate = existingCaseCommand({
            type: 'update_case', caseId, expectedVersion: 1, key: 'property-replay',
        });
        await service.execute({ command: validUpdate, scope: caseScope({ propertyId: 10 }) });
        await expect(service.execute({ command: validUpdate, scope: wrongProperty }))
            .rejects.toMatchObject({ code: 'not_found' });

        await expect(service.execute({
            command: existingCaseCommand({
                type: 'update_case', caseId, expectedVersion: 2, key: 'property-escape',
                payload: { property_id: 99, unit_id: null },
            }),
            scope: caseScope({ propertyId: 10 }),
        })).rejects.toMatchObject({ code: 'not_found' });
        expect(await repository.load(1, caseId)).toMatchObject({ property_id: 10, unit_id: 100, version: 2 });
    });

    it('denies an original open receipt replay after the canonical property changes', async () => {
        const { repository, service } = setup();
        const command = openCaseCommand({
            propertyId: 10, unitId: 100, key: 'property-open-replay',
        });
        const oldPropertyScope = caseScope({ propertyId: 10 });
        const opened = await service.execute({ command, scope: oldPropertyScope });
        const validReplay = await service.execute({ command, scope: oldPropertyScope });
        expect(validReplay).toEqual({ ...opened, replayed: true });
        expect(repository.getWriteAudit()).toHaveLength(1);

        await service.execute({
            command: existingCaseCommand({
                type: 'update_case', caseId: opened.projection.id, expectedVersion: 1,
                key: 'move-opened-property', payload: { property_id: 99, unit_id: null },
            }),
            scope: caseScope(),
        });
        expect(await repository.load(1, opened.projection.id))
            .toMatchObject({ property_id: 99, unit_id: null, version: 2 });

        await expect(service.execute({ command, scope: oldPropertyScope }))
            .rejects.toMatchObject({ code: 'not_found' });
        expect(repository.getWriteAudit()).toHaveLength(2);
    });

    it('enforces unit ancestry for commands, reads, timelines, and projection changes', async () => {
        const { repository, service } = setup();
        const opened = await service.execute({
            command: openCaseCommand({ propertyId: 10, unitId: 100, key: 'unit-open' }),
            scope: caseScope(),
        });
        const caseId = opened.projection.id;
        const wrongUnit = caseScope({ propertyId: 10, unitId: 999 });

        await expect(service.execute({
            command: existingCaseCommand({
                type: 'update_case', caseId, expectedVersion: 1, key: 'wrong-unit-fresh',
            }),
            scope: wrongUnit,
        })).rejects.toMatchObject({ code: 'not_found' });
        await expect(service.getCase(wrongUnit, caseId)).rejects.toMatchObject({ code: 'not_found' });
        await expect(service.getTimeline(wrongUnit, caseId)).rejects.toMatchObject({ code: 'not_found' });

        await expect(service.execute({
            command: existingCaseCommand({
                type: 'update_case', caseId, expectedVersion: 1, key: 'unit-escape',
                payload: { unit_id: 200 },
            }),
            scope: caseScope({ propertyId: 10, unitId: 100 }),
        })).rejects.toMatchObject({ code: 'not_found' });
        expect(await repository.load(1, caseId)).toMatchObject({ property_id: 10, unit_id: 100, version: 1 });
    });

    it('denies an original open receipt replay after the canonical unit changes', async () => {
        const { repository, service } = setup();
        const command = openCaseCommand({ propertyId: 10, unitId: 100, key: 'unit-open-replay' });
        const oldUnitScope = caseScope({ propertyId: 10, unitId: 100 });
        const opened = await service.execute({ command, scope: oldUnitScope });

        await service.execute({
            command: existingCaseCommand({
                type: 'update_case', caseId: opened.projection.id, expectedVersion: 1,
                key: 'move-opened-unit', payload: { unit_id: 200 },
            }),
            scope: caseScope(),
        });
        expect(await repository.load(1, opened.projection.id))
            .toMatchObject({ property_id: 10, unit_id: 200, version: 2 });

        await expect(service.execute({ command, scope: oldUnitScope }))
            .rejects.toMatchObject({ code: 'not_found' });
        expect(repository.getWriteAudit()).toHaveLength(2);
    });

    it('records only the canonical projection, history, and receipt write set', async () => {
        const { repository, service } = setup();
        await service.execute({ command: openCaseCommand(), scope: caseScope() });
        expect(repository.getWriteAudit()).toEqual([expect.objectContaining({
            writer: 'case-command-service/v1',
            targets: ['maintenance_cases', 'case_events', 'case_command_receipts'],
        })]);
        expect(JSON.stringify(repository.getWriteAudit())).not.toMatch(/\b(?:reports|cases)\b/);
    });

    it('exposes one headless API command entrance and returns versioned errors', async () => {
        const { service } = setup();
        const module = new CanonicalCasesModule(service, {
            canonicalCommand: true,
            legacyReport: false,
            legacyCase: false,
        });
        const created = await module.command({ command: openCaseCommand(), resolvedScope: caseScope() });
        expect(created).toMatchObject({
            status: 201,
            body: { data: { schema: 'case-projection/v1', version: 1 }, meta: { replayed: false } },
        });
        const denied = await module.command({
            command: openCaseCommand({ organizationId: 2, key: 'other-org' }),
            resolvedScope: caseScope({ organizationId: 1 }),
        });
        expect(denied).toMatchObject({
            status: 403,
            body: { schema: 'error/v1', error: { code: 'forbidden', retryable: false } },
        });
        expect(() => new CanonicalCasesModule(service, {
            canonicalCommand: true,
            legacyReport: true,
            legacyCase: false,
        })).toThrow(/one case lifecycle writer/i);
    });
});
