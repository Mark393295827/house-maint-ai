export type RuntimeErrorCode =
    | 'budget_exceeded'
    | 'cancelled'
    | 'capability_unavailable'
    | 'evaluation_rejected'
    | 'idempotency_conflict'
    | 'invalid_artifact'
    | 'invalid_claim'
    | 'invalid_state'
    | 'lease_expired'
    | 'scope_mismatch'
    | 'temporarily_unavailable';

export class RuntimeFault extends Error {
    constructor(
        public readonly code: RuntimeErrorCode,
        message: string,
        public readonly retryable = false,
    ) {
        super(message);
        this.name = 'RuntimeFault';
    }
}

