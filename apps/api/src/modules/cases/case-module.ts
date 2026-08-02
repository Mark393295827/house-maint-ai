import {
    ErrorEnvelopeSchema,
    type CaseEventEnvelope,
    type CaseProjection,
    type EffectiveScope,
} from '@house-maint/contracts';
import {
    CaseDomainError,
    codedError,
    selectSingleCaseWriter,
    type CaseCommandResult,
    type CaseCommandService,
    type CaseWriterMode,
} from '@house-maint/domain';

export interface CaseAuthority {
    execute: CaseCommandService['execute'];
    getCase: CaseCommandService['getCase'];
    getTimeline: CaseCommandService['getTimeline'];
}

export interface CaseModuleRequest {
    /** Parsed by CaseCommandService; organization identifiers never resolve scope. */
    command: unknown;
    /** Must be supplied by a server-side principal/scope resolver. */
    resolvedScope: EffectiveScope | unknown;
}

export interface CaseModuleResponse<T> {
    status: number;
    body: T;
}

export interface CaseWriterConfiguration {
    canonicalCommand: boolean;
    legacyReport: boolean;
    legacyCase: boolean;
}

interface ErrorBody {
    schema: 'error/v1';
    error: {
        code: string;
        message: string;
        retryable: boolean;
        correlation_id: string;
    };
}

function correlationId(rawCommand: unknown): string {
    if (rawCommand && typeof rawCommand === 'object') {
        const value = (rawCommand as { correlation_id?: unknown }).correlation_id;
        if (typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9._:-]{0,63}$/.test(value)) return value;
    }
    return 'case-command';
}

function errorResponse(error: unknown, correlation: string): CaseModuleResponse<ErrorBody> {
    const coded = error instanceof CaseDomainError ? error : codedError(error);
    const rawCode = coded?.code ?? 'internal_error';
    const code = rawCode === 'invalid_event' ? 'invalid_input'
        : rawCode === 'invalid_state' ? 'internal_error'
            : rawCode === 'writer_conflict' ? 'temporarily_unavailable'
                : rawCode;
    const status = code === 'invalid_input' ? 422
        : code === 'unauthenticated' ? 401
            : code === 'forbidden' || code === 'scope_expired' ? 403
                : code === 'not_found' ? 404
                    : code === 'version_conflict' || code === 'idempotency_conflict' ? 409
                        : code === 'temporarily_unavailable' ? 503 : 500;
    const candidate = {
        schema: 'error/v1' as const,
        error: {
            code,
            message: status === 500 ? 'Unable to process case command' : coded?.message ?? 'Unable to process case command',
            retryable: coded?.retryable ?? status === 503,
            correlation_id: correlation,
        },
    };
    return { status, body: ErrorEnvelopeSchema.parse(candidate) as ErrorBody };
}

/**
 * Headless API boundary. HTTP routers/plugins adapt into this class after
 * authentication and server-side scope resolution; the class exposes no
 * repository or alternate mutation entrance.
 */
export class CanonicalCasesModule {
    readonly writerMode: CaseWriterMode;

    constructor(
        private readonly authority: CaseAuthority,
        writerConfiguration: CaseWriterConfiguration,
    ) {
        this.writerMode = selectSingleCaseWriter(writerConfiguration);
        if (this.writerMode !== 'canonical-command') {
            throw new CaseDomainError('writer_conflict', 'Canonical cases module requires the sole canonical command writer');
        }
    }

    async command(request: CaseModuleRequest): Promise<CaseModuleResponse<{
        data: CaseProjection;
        meta: { replayed: boolean; version: number; event: CaseEventEnvelope };
    } | ErrorBody>> {
        const correlation = correlationId(request.command);
        try {
            const result: CaseCommandResult = await this.authority.execute({
                command: request.command,
                scope: request.resolvedScope,
            });
            const isOpen = request.command !== null && typeof request.command === 'object'
                && (request.command as { body?: { type?: unknown } }).body?.type === 'open_case';
            return {
                status: isOpen && !result.replayed ? 201 : 200,
                body: {
                    data: result.projection,
                    meta: { replayed: result.replayed, version: result.projection.version, event: result.event },
                },
            };
        } catch (error) {
            return errorResponse(error, correlation);
        }
    }

    async read(resolvedScope: EffectiveScope | unknown, caseId: number): Promise<CaseModuleResponse<{
        data: CaseProjection;
    } | ErrorBody>> {
        try {
            return { status: 200, body: { data: await this.authority.getCase(resolvedScope, caseId) } };
        } catch (error) {
            return errorResponse(error, 'case-read');
        }
    }

    async timeline(resolvedScope: EffectiveScope | unknown, caseId: number): Promise<CaseModuleResponse<{
        data: CaseEventEnvelope[];
    } | ErrorBody>> {
        try {
            return { status: 200, body: { data: await this.authority.getTimeline(resolvedScope, caseId) } };
        } catch (error) {
            return errorResponse(error, 'case-timeline');
        }
    }
}
