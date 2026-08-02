export type CaseDomainErrorCode =
    | 'invalid_input'
    | 'unauthenticated'
    | 'forbidden'
    | 'not_found'
    | 'version_conflict'
    | 'idempotency_conflict'
    | 'scope_expired'
    | 'invalid_event'
    | 'invalid_state'
    | 'writer_conflict';

export class CaseDomainError extends Error {
    constructor(
        public readonly code: CaseDomainErrorCode,
        message: string,
        public readonly retryable = false,
    ) {
        super(message);
        this.name = 'CaseDomainError';
    }
}

export function codedError(value: unknown): { code: string; message: string; retryable?: boolean } | null {
    if (!value || typeof value !== 'object') return null;
    const candidate = value as { code?: unknown; message?: unknown; retryable?: unknown };
    if (typeof candidate.code !== 'string' || typeof candidate.message !== 'string') return null;
    return {
        code: candidate.code,
        message: candidate.message,
        retryable: typeof candidate.retryable === 'boolean' ? candidate.retryable : undefined,
    };
}
