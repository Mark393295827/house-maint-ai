import express, { type RequestHandler } from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { SQLiteFallback } from '../config/database.js';
import {
    createCasesRouter,
    type CaseAuthorizationResolver,
} from '../routes/cases.routes.js';
import { createReportCompatibilityRouter } from '../routes/reportCompatibility.routes.js';

const auth: RequestHandler = (req, _res, next) => {
    req.user = { id: 1, phone: '13800000000', name: 'Resident', role: 'user' };
    next();
};

const resolver: CaseAuthorizationResolver = vi.fn(async () => ({
    allowed: true,
    organizationId: 1,
    membershipId: 1,
    userId: 1,
}));

async function createDatabase(): Promise<SQLiteFallback> {
    const database = new SQLiteFallback(':memory:');
    await database.initSchema();
    await database.query(
        `INSERT INTO users (phone, password_hash, name, role) VALUES ($1, $2, $3, $4)`,
        ['13800000000', 'test', 'Resident', 'user'],
    );
    await database.query(
        `INSERT INTO organizations (slug, name) VALUES ($1, $2)`,
        ['api-test', 'API Test Organization'],
    );
    await database.query(
        `INSERT INTO organization_memberships (organization_id, user_id, role, status)
         VALUES ($1, $2, $3, $4)`,
        [1, 1, 'resident', 'active'],
    );
    return database;
}

function caseApp(database: SQLiteFallback, authResolver?: CaseAuthorizationResolver) {
    const app = express();
    app.use(express.json());
    app.use('/cases', createCasesRouter({
        database,
        authorizationResolver: authResolver,
        authenticate: auth,
    }));
    return app;
}

function reportApp(database: SQLiteFallback, authResolver?: CaseAuthorizationResolver) {
    const app = express();
    app.use(express.json());
    app.use('/reports', createReportCompatibilityRouter({
        database,
        authorizationResolver: authResolver,
        authenticate: auth,
    }));
    return app;
}

const casePayload = {
    title: 'Kitchen sink leak',
    description: 'Water is leaking below the kitchen sink and needs inspection.',
    category: 'plumbing',
    priority: 'urgent',
    idempotency_key: 'case-api-1',
    evidence: { image_urls: ['uploads/leak.jpg'] },
};

describe('concise case API route factory', () => {
    it('fails closed when no organization authorization resolver is injected', async () => {
        const database = await createDatabase();
        try {
            const response = await request(caseApp(database)).post('/cases').send(casePayload);
            expect(response.status).toBe(503);
            expect(response.body).toMatchObject({
                error: { code: 'authorization_unavailable' },
            });
            expect((await database.query('SELECT COUNT(*) AS count FROM maintenance_cases')).rows[0].count)
                .toBe(0);
        } finally {
            database.close();
        }
    });

    it('validates at the edge and returns the stable error envelope', async () => {
        const database = await createDatabase();
        try {
            const response = await request(caseApp(database, resolver)).post('/cases').send({
                title: 'x', description: 'short', idempotency_key: 'bad-input',
            });
            expect(response.status).toBe(422);
            expect(response.body.error).toMatchObject({ code: 'invalid_input' });
            expect(response.body.error.details.fieldErrors.title).toBeTruthy();
        } finally {
            database.close();
        }
    });

    it('binds body and header organization hints to the resolver result', async () => {
        const database = await createDatabase();
        try {
            const allowAllResolver: CaseAuthorizationResolver = vi.fn(async () => ({
                allowed: true,
                organizationId: 1,
                membershipId: 1,
                userId: 1,
            }));
            const app = caseApp(database, allowAllResolver);
            const crossOrganization = await request(app).post('/cases').send({
                ...casePayload,
                organization_id: 2,
                idempotency_key: 'case-api-cross-org',
            });
            expect(crossOrganization.status).toBe(403);
            expect(crossOrganization.body).toEqual({
                error: {
                    code: 'forbidden',
                    message: 'The requester is not authorized to create a case',
                },
            });
            expect(allowAllResolver).toHaveBeenCalledTimes(1);

            vi.mocked(allowAllResolver).mockClear();
            const conflictingHints = await request(app)
                .post('/cases')
                .set('X-Organization-Id', '3')
                .send({ ...casePayload, organization_id: 1, idempotency_key: 'case-api-hints' });
            expect(conflictingHints.status).toBe(403);
            expect(allowAllResolver).not.toHaveBeenCalled();
            expect(Number((await database.query('SELECT COUNT(*) AS count FROM maintenance_cases'))
                .rows[0].count)).toBe(0);
        } finally {
            database.close();
        }
    });

    it('creates one projection and one opening event atomically', async () => {
        const database = await createDatabase();
        try {
            const response = await request(caseApp(database, resolver)).post('/cases').send(casePayload);
            expect(response.status).toBe(201);
            expect(response.body).toMatchObject({
                data: {
                    title: 'Kitchen sink leak',
                    status: 'open',
                    stage: 'intake',
                    priority: 'urgent',
                    version: 1,
                    description: casePayload.description,
                },
                meta: { replayed: false, version: 1 },
            });
            const cases = await database.query<{ count: number }>(
                'SELECT COUNT(*) AS count FROM maintenance_cases',
            );
            const events = await database.query<{ count: number }>(
                'SELECT COUNT(*) AS count FROM case_events',
            );
            expect(Number(cases.rows[0].count)).toBe(1);
            expect(Number(events.rows[0].count)).toBe(1);
        } finally {
            database.close();
        }
    });

    it('replays same-key requests and rejects a different payload or stale version', async () => {
        const database = await createDatabase();
        try {
            const app = caseApp(database, resolver);
            const first = await request(app).post('/cases').send(casePayload);
            const replay = await request(app).post('/cases').send(casePayload);
            expect(first.status).toBe(201);
            expect(replay.status).toBe(200);
            expect(replay.body.meta).toMatchObject({ replayed: true, version: 1 });

            const conflict = await request(app).post('/cases').send({
                ...casePayload,
                description: 'A different issue was submitted with the same key.',
            });
            expect(conflict.status).toBe(409);
            expect(conflict.body.error.code).toBe('idempotency_conflict');

            const stale = await request(app).post('/cases').send({
                ...casePayload,
                idempotency_key: 'case-api-stale',
                expected_version: 1,
            });
            expect(stale.status).toBe(409);
            expect(stale.body.error.code).toBe('version_conflict');

            const events = await database.query<{ count: number }>(
                'SELECT COUNT(*) AS count FROM case_events',
            );
            expect(Number(events.rows[0].count)).toBe(1);
        } finally {
            database.close();
        }
    });

    it('rolls back the case row when opening-event append fails', async () => {
        const database = await createDatabase();
        try {
            await database.query(`
                CREATE TRIGGER fail_case_opening
                BEFORE INSERT ON case_events
                BEGIN SELECT RAISE(ABORT, 'forced opening failure'); END
            `);
            const response = await request(caseApp(database, resolver)).post('/cases').send(casePayload);
            expect(response.status).toBe(500);
            expect(response.headers['content-type']).toMatch(/json/);
            expect(response.body).toEqual({
                error: {
                    code: 'internal_error',
                    message: 'Unable to create maintenance case',
                },
            });
            expect(JSON.stringify(response.body)).not.toMatch(/forced opening failure|SQLITE|stack|INSERT INTO/i);
            const cases = await database.query<{ count: number }>(
                'SELECT COUNT(*) AS count FROM maintenance_cases',
            );
            expect(Number(cases.rows[0].count)).toBe(0);
        } finally {
            database.close();
        }
    });
});

describe('legacy report compatibility adapter', () => {
    it('keeps the legacy success envelope while creating one mapped case event', async () => {
        const database = await createDatabase();
        try {
            const response = await request(reportApp(database, resolver)).post('/reports').send({
                title: 'Boiler issue',
                description: 'The boiler is not heating water for the apartment.',
                category: 'hvac',
                image_urls: ['uploads/boiler.jpg'],
                idempotency_key: 'legacy-report-1',
            });
            expect(response.status).toBe(201);
            expect(response.body).toMatchObject({
                status: 'success',
                message: 'Report created successfully',
                data: { report: { title: 'Boiler issue', status: 'pending' } },
            });
            expect(Number((await database.query('SELECT COUNT(*) AS count FROM reports')).rows[0].count))
                .toBe(1);
            expect(Number((await database.query('SELECT COUNT(*) AS count FROM maintenance_cases')).rows[0].count))
                .toBe(1);
            expect(Number((await database.query('SELECT COUNT(*) AS count FROM case_events')).rows[0].count))
                .toBe(1);
            expect(Number((await database.query('SELECT COUNT(*) AS count FROM tasks')).rows[0].count))
                .toBe(1);
        } finally {
            database.close();
        }
    });

    it('does not duplicate a legacy report when the idempotency key is replayed', async () => {
        const database = await createDatabase();
        try {
            const app = reportApp(database, resolver);
            const body = {
                title: 'Toilet leak',
                description: 'The toilet supply line is leaking onto the floor.',
                category: 'plumbing',
                idempotency_key: 'legacy-report-replay',
            };
            expect((await request(app).post('/reports').send(body)).status).toBe(201);
            const replay = await request(app).post('/reports').send(body);
            expect(replay.status).toBe(200);
            expect(Number((await database.query('SELECT COUNT(*) AS count FROM reports')).rows[0].count))
                .toBe(1);
            expect(Number((await database.query('SELECT COUNT(*) AS count FROM case_events')).rows[0].count))
                .toBe(1);
        } finally {
            database.close();
        }
    });

    it('maps unexpected storage failures to the stable JSON error envelope', async () => {
        const database = await createDatabase();
        try {
            await database.query(`
                CREATE TRIGGER fail_legacy_case_opening
                BEFORE INSERT ON case_events
                BEGIN SELECT RAISE(ABORT, 'forced report opening failure'); END
            `);
            const response = await request(reportApp(database, resolver)).post('/reports').send({
                title: 'Broken report',
                description: 'This report intentionally exercises the storage failure path.',
                idempotency_key: 'legacy-report-failure',
            });
            expect(response.status).toBe(500);
            expect(response.headers['content-type']).toMatch(/json/);
            expect(response.body).toEqual({
                error: {
                    code: 'internal_error',
                    message: 'Unable to create report',
                },
            });
            expect(JSON.stringify(response.body)).not.toMatch(/forced report opening failure|SQLITE|stack|INSERT INTO/i);
            expect(Number((await database.query('SELECT COUNT(*) AS count FROM reports')).rows[0].count))
                .toBe(0);
            expect(Number((await database.query('SELECT COUNT(*) AS count FROM tasks')).rows[0].count))
                .toBe(0);
        } finally {
            database.close();
        }
    });
});
