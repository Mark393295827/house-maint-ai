import crypto from 'node:crypto';
import express, {
    type Request,
    type RequestHandler,
    type Response,
    type Router,
} from 'express';
import { z } from 'zod';
import db from '../config/database.js';
import { withTransaction, type QueryResult, type TransactionClient } from '../config/database.js';
import { authenticate } from '../middleware/auth.js';
import {
    CaseEventError,
    CaseEventService,
    canonicalizeJson,
    sha256,
    type CaseEventRow,
    type CaseProjection,
    type CaseEventDatabase,
} from '../services/case-events/index.js';
import { normalizeCorrelationId } from '../services/authorization/contracts.js';

const categoryValues = [
    'plumbing', 'electrical', 'hvac', 'appliance', 'structural', 'carpentry', 'painting', 'other',
] as const;
const priorityValues = ['low', 'normal', 'urgent', 'emergency'] as const;

const evidenceSchema = z.object({
    image_urls: z.array(z.string().max(2048)).max(20).optional(),
    voice_url: z.string().max(2048).optional(),
    video_url: z.string().max(2048).optional(),
}).strict();

export const createCaseSchema = z.object({
    title: z.string().trim().min(2).max(200),
    description: z.string().trim().min(10).max(20_000),
    category: z.enum(categoryValues).optional(),
    priority: z.enum(priorityValues).optional().default('normal'),
    property_id: z.number().int().positive().nullable().optional(),
    unit_id: z.number().int().positive().nullable().optional(),
    organization_id: z.number().int().positive().optional(),
    evidence: evidenceSchema.optional(),
    expected_version: z.number().int().nonnegative().optional().default(0),
    idempotency_key: z.string().trim().min(1).max(128).optional(),
}).strict();

export type CreateCasePayload = z.infer<typeof createCaseSchema>;

/**
 * The route deliberately accepts an authorization resolver instead of reaching
 * into the database itself. Until a concrete organization-scoped resolver is
 * mounted, the route returns an explicit fail-closed error.
 */
export interface CaseAuthorizationRequest {
    req: Request;
    action: 'contribute';
    organizationHint?: number;
    input: CreateCasePayload;
}

export interface CaseAuthorizationResult {
    allowed: boolean;
    organizationId?: number;
    membershipId?: number;
    userId?: number;
}

export type CaseAuthorizationResolver = (
    input: CaseAuthorizationRequest,
) => Promise<CaseAuthorizationResult | null> | CaseAuthorizationResult | null;

export interface CaseRouterOptions {
    database?: CaseEventDatabase;
    authorizationResolver?: CaseAuthorizationResolver;
    authenticate?: RequestHandler;
}

export interface CaseCreateContext {
    organizationId: number;
    membershipId: number;
    userId?: number;
}

export interface CaseCreateInput {
    title: string;
    description: string;
    category?: (typeof categoryValues)[number];
    priority: (typeof priorityValues)[number];
    propertyId: number | null;
    unitId: number | null;
    evidence?: CreateCasePayload['evidence'];
    expectedVersion: number;
    idempotencyKey: string;
    correlationId: string;
    legacyReportId?: number | null;
}

export interface ExistingOpeningEvent {
    event: CaseEventRow;
    caseId: number;
    legacyReportId: number | null;
}

export interface CaseCreateResult {
    event: CaseEventRow;
    projection: CaseProjection;
    replayed: boolean;
}

class CaseRouteError extends Error {
    constructor(
        public readonly code: string,
        public readonly status: number,
        message: string,
        public readonly details?: unknown,
    ) {
        super(message);
        this.name = 'CaseRouteError';
    }
}

function defaultDatabase(): CaseEventDatabase {
    return {
        query: <T = unknown>(text: string, params?: unknown[]): Promise<QueryResult<T>> =>
            db.query<T>(text, params),
        withTransaction,
    };
}

function transactionDatabase(client: TransactionClient): CaseEventDatabase {
    return {
        query: <T = unknown>(text: string, params?: unknown[]): Promise<QueryResult<T>> =>
            client.query<T>(text, params),
        // CaseEventService owns the transaction boundary in normal use. When a
        // caller already holds one, run the service work on that same client.
        withTransaction: <T>(work: (inner: TransactionClient) => Promise<T>): Promise<T> =>
            work(client),
    };
}

function positiveId(value: unknown): value is number {
    return Number.isInteger(value) && Number(value) > 0;
}

function idempotencyKey(req: Request, body: CreateCasePayload): string {
    const candidate = body.idempotency_key ?? req.header('Idempotency-Key');
    return candidate && candidate.trim().length > 0 ? candidate.trim() : crypto.randomUUID();
}

function expectedVersion(req: Request, body: CreateCasePayload): number {
    const header = req.header('X-Expected-Version');
    if (header === undefined) return body.expected_version ?? 0;
    if (!/^\d+$/.test(header)) {
        throw new CaseRouteError('invalid_input', 422, 'X-Expected-Version must be a non-negative integer');
    }
    return Number(header);
}

function correlationId(req: Request, key: string): string {
    // A deterministic fallback keeps same-key retries replayable even when the
    // client omitted a correlation header.
    return normalizeCorrelationId(req.header('X-Correlation-Id'), `case-${key.slice(0, 48)}`);
}

function openingPayload(input: CaseCreateInput, context: CaseCreateContext): Record<string, unknown> {
    return {
        title: input.title,
        description: input.description,
        category: input.category ?? null,
        status: 'open',
        stage: 'intake',
        priority: input.priority,
        propertyId: input.propertyId,
        unitId: input.unitId,
        openedByMembershipId: context.membershipId,
        legacyReportId: input.legacyReportId ?? null,
        evidence: input.evidence ?? null,
    };
}

export function openingCommandHash(
    input: CaseCreateInput,
    context: CaseCreateContext,
): string {
    const payload = openingPayload(input, context);
    const command = canonicalizeJson({
        actorMembershipId: context.membershipId,
        actorType: 'member',
        correlationId: input.correlationId,
        eventType: 'case_opened',
        payload,
    }, 'command');
    return sha256(command);
}

export async function findExistingOpeningEvent(
    client: Pick<CaseEventDatabase, 'query'> | TransactionClient,
    organizationId: number,
    key: string,
): Promise<ExistingOpeningEvent | null> {
    const result = await client.query<CaseEventRow & {
        legacy_report_id: number | null;
    }>(
        `SELECT e.id, e.organization_id, e.case_id, e.sequence, e.event_type,
                e.schema_version, e.reducer_version, e.actor_type, e.actor_membership_id,
                e.idempotency_key, e.command_hash, e.payload_hash, e.projection_patch_json,
                e.payload_json, e.correlation_id, e.created_at, c.legacy_report_id
           FROM case_events e
           JOIN maintenance_cases c
             ON c.organization_id = e.organization_id AND c.id = e.case_id
          WHERE e.organization_id = $1 AND e.idempotency_key = $2
          LIMIT 1`,
        [organizationId, key],
    );
    const row = result.rows[0];
    if (!row) return null;
    return {
        event: row,
        caseId: row.case_id,
        legacyReportId: row.legacy_report_id,
    };
}

function assertExistingCommandMatches(
    existing: ExistingOpeningEvent,
    input: CaseCreateInput,
    context: CaseCreateContext,
): void {
    if (existing.event.event_type !== 'case_opened'
        || existing.event.command_hash !== openingCommandHash(input, context)) {
        throw new CaseEventError('idempotency_conflict', 'Idempotency key was already used with a different command');
    }
}

/**
 * Create the projection row and append its opening event on an existing
 * transaction client. CaseEventService receives a transaction-backed adapter,
 * so it cannot accidentally open a nested transaction.
 */
export async function createCaseInTransaction(
    client: TransactionClient,
    input: CaseCreateInput,
    context: CaseCreateContext,
): Promise<CaseCreateResult> {
    if (!positiveId(context.organizationId) || !positiveId(context.membershipId)) {
        throw new CaseRouteError('authorization_unavailable', 503, 'A resolved organization membership is required');
    }
    if (input.expectedVersion !== 0) {
        throw new CaseEventError('version_conflict', 'A new maintenance case must start at version 0');
    }

    const existing = await findExistingOpeningEvent(client, context.organizationId, input.idempotencyKey);
    const payload = openingPayload(input, context);
    const service = new CaseEventService(transactionDatabase(client));

    if (existing) {
        assertExistingCommandMatches(existing, input, context);
        return service.append({
            organizationId: context.organizationId,
            caseId: existing.caseId,
            eventType: 'case_opened',
            actorType: 'member',
            actorMembershipId: context.membershipId,
            idempotencyKey: input.idempotencyKey,
            correlationId: input.correlationId,
            expectedVersion: 0,
            payload,
        });
    }

    const inserted = await client.query<{ id: number }>(
        `INSERT INTO maintenance_cases (
            organization_id, property_id, unit_id, opened_by_membership_id,
            legacy_report_id, title, status, stage, priority, version
         ) VALUES ($1, $2, $3, $4, $5, $6, 'open', 'intake', $7, 0)
         RETURNING id`,
        [
            context.organizationId,
            input.propertyId,
            input.unitId,
            context.membershipId,
            input.legacyReportId ?? null,
            input.title,
            input.priority,
        ],
    );
    const caseId = Number(inserted.rows[0]?.id);
    if (!positiveId(caseId)) {
        throw new CaseRouteError('invalid_state', 500, 'Created case could not be read back');
    }

    return service.append({
        organizationId: context.organizationId,
        caseId,
        eventType: 'case_opened',
        actorType: 'member',
        actorMembershipId: context.membershipId,
        idempotencyKey: input.idempotencyKey,
        correlationId: input.correlationId,
        expectedVersion: 0,
        payload,
    });
}

export async function resolveCaseAuthorization(
    options: CaseRouterOptions,
    req: Request,
    input: CreateCasePayload,
): Promise<CaseCreateContext> {
    if (!options.authorizationResolver) {
        throw new CaseRouteError('authorization_unavailable', 503, 'Case authorization is not configured');
    }
    const bodyHint = input.organization_id;
    const headerValue = req.header('X-Organization-Id');
    let headerHint: number | undefined;
    if (headerValue !== undefined) {
        if (!/^\d+$/.test(headerValue) || !positiveId(Number(headerValue))) {
            throw new CaseRouteError('invalid_input', 422, 'X-Organization-Id must be a positive integer');
        }
        headerHint = Number(headerValue);
    }
    if (bodyHint !== undefined && headerHint !== undefined && bodyHint !== headerHint) {
        throw new CaseRouteError('forbidden', 403, 'The requester is not authorized to create a case');
    }
    const organizationHint = bodyHint ?? headerHint;
    const result = await options.authorizationResolver({
        req,
        action: 'contribute',
        organizationHint: positiveId(organizationHint) ? organizationHint : undefined,
        input,
    });
    if (!result?.allowed || !positiveId(result.organizationId) || !positiveId(result.membershipId)) {
        throw new CaseRouteError('forbidden', 403, 'The requester is not authorized to create a case');
    }
    if (positiveId(organizationHint) && result.organizationId !== organizationHint) {
        throw new CaseRouteError('forbidden', 403, 'The requester is not authorized to create a case');
    }
    const requestUserId = Number(req.user?.id);
    if (result.userId !== undefined && result.userId !== requestUserId) {
        throw new CaseRouteError('forbidden', 403, 'Authorization principal does not match the requester');
    }
    return {
        organizationId: result.organizationId,
        membershipId: result.membershipId,
        userId: result.userId ?? (positiveId(requestUserId) ? requestUserId : undefined),
    };
}

function normalizeInput(req: Request): CreateCasePayload {
    const parsed = createCaseSchema.safeParse(req.body);
    if (!parsed.success) {
        throw new CaseRouteError('invalid_input', 422, 'Request body is invalid', parsed.error.flatten());
    }
    return parsed.data;
}

function toCreateInput(req: Request, body: CreateCasePayload): CaseCreateInput {
    const key = idempotencyKey(req, body);
    return {
        title: body.title,
        description: body.description,
        category: body.category,
        priority: body.priority,
        propertyId: body.property_id ?? null,
        unitId: body.unit_id ?? null,
        evidence: body.evidence,
        expectedVersion: expectedVersion(req, body),
        idempotencyKey: key,
        correlationId: correlationId(req, key),
    };
}

function sendError(res: Response, error: unknown): void {
    if (error instanceof CaseRouteError) {
        res.status(error.status).json({
            error: { code: error.code, message: error.message, details: error.details },
        });
        return;
    }
    if (error instanceof CaseEventError) {
        const status = error.code === 'version_conflict' || error.code === 'idempotency_conflict'
            ? 409
            : error.code === 'not_found' ? 404
                : error.code === 'invalid_input' || error.code === 'invalid_json' ? 422
                    : 500;
        res.status(status).json({ error: { code: error.code, message: error.message } });
        return;
    }
    res.status(500).json({ error: { code: 'internal_error', message: 'Unable to create maintenance case' } });
}

export function createCasesRouter(options: CaseRouterOptions = {}): Router {
    const router = express.Router();
    const database = options.database ?? defaultDatabase();
    router.use(options.authenticate ?? authenticate);
    router.post('/', async (req, res) => {
        try {
            const body = normalizeInput(req);
            const context = await resolveCaseAuthorization(options, req, body);
            const input = toCreateInput(req, body);
            const result = await database.withTransaction((client) =>
                createCaseInTransaction(client, input, context));
            const data = {
                ...result.projection,
                description: input.description,
                category: input.category ?? null,
                evidence: input.evidence ?? null,
            };
            res.status(result.replayed ? 200 : 201).json({
                data,
                meta: { replayed: result.replayed, version: result.projection.version },
            });
        } catch (error) {
            if (error instanceof CaseRouteError || error instanceof CaseEventError) {
                sendError(res, error);
                return;
            }
            console.error('[case-api] unexpected create failure', error);
            sendError(res, new CaseRouteError(
                'internal_error',
                500,
                'Unable to create maintenance case',
            ));
        }
    });
    return router;
}

export default createCasesRouter;
