import type {
    CaseCommandEnvelope,
    CaseEventEnvelope,
    CaseProjection,
    EffectiveScope,
} from '@house-maint/contracts';

export const CANONICAL_CASE_WRITER = 'case-command-service/v1' as const;

export interface CaseCommandTransaction {
    writerAuthority: typeof CANONICAL_CASE_WRITER;
    organizationId: number;
    requestedCaseId: number | null;
    expectedVersion: number;
    idempotencyKey: string;
    commandHash: string;
    occurredAt: string;
}

export interface CaseMutationContext {
    caseId: number;
    current: CaseProjection | null;
    occurredAt: string;
}

export interface CaseMutationDecision {
    event: CaseEventEnvelope;
    projection: CaseProjection;
}

export interface CaseCommandResult extends CaseMutationDecision {
    replayed: boolean;
    commandHash: string;
}

export interface CaseCommandRepository {
    execute(
        transaction: CaseCommandTransaction,
        decide: (context: CaseMutationContext) => CaseMutationDecision,
    ): Promise<CaseCommandResult>;
    load(organizationId: number, caseId: number): Promise<CaseProjection | null>;
    timeline(organizationId: number, caseId: number): Promise<CaseEventEnvelope[]>;
}

export interface ExecuteCaseCommandInput {
    command: CaseCommandEnvelope | unknown;
    scope: EffectiveScope | unknown;
}
