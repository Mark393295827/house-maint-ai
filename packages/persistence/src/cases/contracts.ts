import type { CaseEventEnvelope, CaseProjection } from '@house-maint/contracts';

export const CANONICAL_CASE_WRITER = 'case-command-service/v1' as const;

export interface StoreTransaction {
    writerAuthority: typeof CANONICAL_CASE_WRITER;
    organizationId: number;
    requestedCaseId: number | null;
    expectedVersion: number;
    idempotencyKey: string;
    commandHash: string;
    occurredAt: string;
}

export interface StoreMutationContext {
    caseId: number;
    current: CaseProjection | null;
    occurredAt: string;
}

export interface StoreMutationDecision {
    event: CaseEventEnvelope;
    projection: CaseProjection;
}

export interface StoreCommandResult extends StoreMutationDecision {
    replayed: boolean;
    commandHash: string;
}

export type StoreDecider = (context: StoreMutationContext) => StoreMutationDecision;

export class CaseStoreError extends Error {
    constructor(public readonly code: string, message: string) {
        super(message);
        this.name = 'CaseStoreError';
    }
}
