import express, {
    type Request,
    type RequestHandler,
    type Response,
    type Router,
} from 'express';
import { z } from 'zod';
import db from '../config/database.js';
import { withTransaction } from '../config/database.js';
import { authenticate } from '../middleware/auth.js';
import { CaseEventError, type CaseEventDatabase } from '../services/case-events/index.js';
import {
    createCaseInTransaction,
    findExistingOpeningEvent,
    openingCommandHash,
    resolveCaseAuthorization,
    type CaseAuthorizationResolver,
    type CaseCreateInput,
    type CaseRouterOptions,
} from './cases.routes.js';

const legacyReportSchema = z.object({
    title: z.string().min(2, 'Title is required'),
    description: z.string().min(10, 'Description must be at least 10 characters'),
    category: z.enum([
        'plumbing', 'electrical', 'hvac', 'appliance', 'structural', 'carpentry', 'painting', 'other',
    ]).optional(),
    voice_url: z.string().optional(),
    video_url: z.string().optional(),
    image_urls: z.array(z.string()).optional(),
    latitude: z.number().optional(),
    longitude: z.number().optional(),
    urgency_score: z.number().min(0).max(10).optional().default(0),
    organization_id: z.number().int().positive().optional(),
    property_id: z.number().int().positive().nullable().optional(),
    unit_id: z.number().int().positive().nullable().optional(),
    priority: z.enum(['low', 'normal', 'urgent', 'emergency']).optional().default('normal'),
    expected_version: z.number().int().nonnegative().optional().default(0),
    idempotency_key: z.string().trim().min(1).max(128).optional(),
}).passthrough();

export type LegacyReportPayload = z.infer<typeof legacyReportSchema>;

export interface ReportCompatibilityRouterOptions {
    database?: CaseEventDatabase;
    authorizationResolver?: CaseAuthorizationResolver;
    authenticate?: RequestHandler;
}

function defaultDatabase(): CaseEventDatabase {
    return { query: (text, params) => db.query(text, params), withTransaction };
}

function sendError(res: Response, error: unknown): void {
    if (error instanceof CaseEventError) {
        const status = error.code === 'version_conflict' || error.code === 'idempotency_conflict'
            ? 409
            : error.code === 'invalid_input' || error.code === 'invalid_json' ? 422 : 500;
        res.status(status).json({ error: { code: error.code, message: error.message } });
        return;
    }
    const routeError = error as { code?: string; status?: number; message?: string; details?: unknown };
    if (routeError && routeError.code && routeError.status) {
        res.status(routeError.status).json({
            error: { code: routeError.code, message: routeError.message, details: routeError.details },
        });
        return;
    }
    res.status(500).json({ error: { code: 'internal_error', message: 'Unable to create report' } });
}

function parseBody(body: unknown): LegacyReportPayload {
    const parsed = legacyReportSchema.safeParse(body);
    if (!parsed.success) {
        const error = new Error('Request body is invalid') as Error & {
            code: string;
            status: number;
            details: unknown;
        };
        error.code = 'invalid_input';
        error.status = 422;
        error.details = parsed.error.flatten();
        throw error;
    }
    return parsed.data;
}

function reportKey(req: Request, body: LegacyReportPayload): string {
    const key = body.idempotency_key ?? req.header('Idempotency-Key');
    return key && key.trim().length > 0 ? key.trim() : `legacy-report-${cryptoRandomUuid()}`;
}

function cryptoRandomUuid(): string {
    // Keep the compatibility module free of provider/model dependencies while
    // still giving old clients a safe unique key when they omit the header.
    return `${Date.now()}-${Math.random().toString(36).slice(2, 14)}`;
}

interface LegacyReportRow {
    id: number;
    user_id: number;
    title: string;
    description: string;
    category: string | null;
    voice_url: string | null;
    video_url: string | null;
    image_urls: string | null;
    latitude: number | null;
    longitude: number | null;
    urgency_score: number;
    status: string;
    created_at: string;
    updated_at: string;
    [key: string]: unknown;
}

function reportInput(
    req: Request,
    body: LegacyReportPayload,
    key: string,
): CaseCreateInput {
    const expectedVersionHeader = req.header('X-Expected-Version');
    const expectedVersion = expectedVersionHeader === undefined
        ? body.expected_version ?? 0
        : /^\d+$/.test(expectedVersionHeader) ? Number(expectedVersionHeader) : -1;
    return {
        title: body.title,
        description: body.description,
        category: body.category,
        priority: body.priority ?? 'normal',
        propertyId: body.property_id ?? null,
        unitId: body.unit_id ?? null,
        evidence: legacyEvidence(body),
        expectedVersion,
        idempotencyKey: key,
        correlationId: 'legacy-report-' + key.slice(0, 48),
    };
}

function legacyEvidence(body: LegacyReportPayload): NonNullable<CaseCreateInput['evidence']> {
    const evidence: NonNullable<CaseCreateInput['evidence']> = {};
    if (body.image_urls !== undefined) evidence.image_urls = body.image_urls;
    if (body.voice_url !== undefined) evidence.voice_url = body.voice_url;
    if (body.video_url !== undefined) evidence.video_url = body.video_url;
    return evidence;
}

/**
 * Compatibility-only POST /reports adapter. The existing reports router is
 * untouched; the commander mounts this adapter before it only under the
 * explicit case API feature flag.
 */
export function createReportCompatibilityRouter(
    options: ReportCompatibilityRouterOptions = {},
): Router {
    const router = express.Router();
    const database = options.database ?? defaultDatabase();
    const authOptions: CaseRouterOptions = {
        database,
        authorizationResolver: options.authorizationResolver,
        authenticate: options.authenticate,
    };
    router.use(options.authenticate ?? authenticate);
    router.post('/', async (req, res) => {
        try {
            const body = parseBody(req.body);
            const context = await resolveCaseAuthorization(authOptions, req, {
                title: body.title,
                description: body.description,
                category: body.category,
                priority: body.priority,
                property_id: body.property_id,
                unit_id: body.unit_id,
                organization_id: body.organization_id,
                expected_version: body.expected_version,
                idempotency_key: body.idempotency_key,
                evidence: legacyEvidence(body),
            });
            const key = reportKey(req, body);
            const input = reportInput(req, body, key);
            const result = await database.withTransaction(async (client) => {
                const existing = await findExistingOpeningEvent(client, context.organizationId, key);
                if (existing) {
                    const existingReportId = existing.legacyReportId;
                    if (!existingReportId) {
                        throw new CaseEventError('idempotency_conflict', 'Idempotency key belongs to a different case command');
                    }
                    input.legacyReportId = existingReportId;
                    if (existing.event.command_hash !== openingCommandHash(input, context)) {
                        throw new CaseEventError('idempotency_conflict', 'Idempotency key was already used with a different command');
                    }
                    const previous = await client.query<LegacyReportRow>(
                        'SELECT * FROM reports WHERE id = $1 LIMIT 1',
                        [existingReportId],
                    );
                    if (!previous.rows[0]) {
                        throw new CaseEventError('invalid_state', 'Legacy report for the idempotent case is missing');
                    }
                    return { report: previous.rows[0], replayed: true };
                }

                const inserted = await client.query<LegacyReportRow>(
                    `INSERT INTO reports (
                        user_id, title, description, category, voice_url, video_url,
                        image_urls, latitude, longitude, urgency_score
                     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                     RETURNING *`,
                    [
                        req.user.id,
                        body.title,
                        body.description,
                        body.category ?? 'other',
                        body.voice_url ?? null,
                        body.video_url ?? null,
                        body.image_urls ? JSON.stringify(body.image_urls) : null,
                        body.latitude ?? null,
                        body.longitude ?? null,
                        body.urgency_score ?? 0,
                    ],
                );
                const report = inserted.rows[0];
                if (!report || !Number.isInteger(Number(report.id)) || Number(report.id) <= 0) {
                    throw new Error('Inserted report could not be read back');
                }

                await client.query(
                    `INSERT INTO tasks (title, objective, status, priority, inputs)
                     VALUES ($1, $2, 'new', 'high', $3)`,
                    [
                        `Diagnose Report #${report.id}`,
                        'diagnose_image',
                        JSON.stringify({ report_id: report.id }),
                    ],
                );

                input.legacyReportId = Number(report.id);
                await createCaseInTransaction(client, input, context);
                return { report, replayed: false };
            });

            // Preserve the legacy response body exactly; case metadata is
            // available through the new /cases surface, not this facade.
            res.status(result.replayed ? 200 : 201).json({
                status: 'success',
                message: 'Report created successfully',
                data: { report: result.report },
            });
        } catch (error) {
            if (error instanceof CaseEventError
                || (error && typeof error === 'object' && 'status' in error && 'code' in error)) {
                sendError(res, error);
                return;
            }
            console.error('[report-compatibility] unexpected create failure', error);
            res.status(500).json({
                error: {
                    code: 'internal_error',
                    message: 'Unable to create report',
                },
            });
        }
    });
    return router;
}

export default createReportCompatibilityRouter;
