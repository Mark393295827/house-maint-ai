import {
    CaseEventEnvelopeSchema,
    CaseProjectionSchema,
    type CaseEventEnvelope,
    type CaseProjection,
} from '@house-maint/contracts';
import {
    CANONICAL_CASE_WRITER,
    CaseStoreError,
    type StoreCommandResult,
    type StoreDecider,
    type StoreTransaction,
} from './contracts.js';

interface StoredProjection {
    authority: typeof CANONICAL_CASE_WRITER;
    projection: CaseProjection;
}

export interface CaseWriteAuditEntry {
    writer: typeof CANONICAL_CASE_WRITER;
    organizationId: number;
    caseId: number;
    version: number;
    targets: readonly ['maintenance_cases', 'case_events', 'case_command_receipts'];
}

function clone<T>(value: T): T {
    return structuredClone(value);
}

function caseKey(organizationId: number, caseId: number): string {
    return `${organizationId}:${caseId}`;
}

function receiptKey(organizationId: number, idempotencyKey: string): string {
    return `${organizationId}:${idempotencyKey}`;
}

function validateDecision(transaction: StoreTransaction, decision: StoreCommandResult): void {
    const event = CaseEventEnvelopeSchema.safeParse(decision.event);
    const projection = CaseProjectionSchema.safeParse(decision.projection);
    if (!event.success || !projection.success
        || event.data.organization_id !== transaction.organizationId
        || projection.data.organization_id !== transaction.organizationId
        || event.data.case_id !== projection.data.id
        || event.data.case_version !== projection.data.version) {
        throw new CaseStoreError('invalid_state', 'Command decider returned an invalid mutation');
    }
}

/**
 * Deterministic transactional fake. It intentionally models only canonical
 * tables: there is no reports/cases write surface to accidentally call.
 */
export class InMemoryCaseCommandRepository {
    private readonly projections = new Map<string, StoredProjection>();
    private readonly events = new Map<string, CaseEventEnvelope[]>();
    private readonly receipts = new Map<string, StoreCommandResult>();
    private readonly audit: CaseWriteAuditEntry[] = [];
    private nextCaseId = 1;

    async execute(
        transaction: StoreTransaction,
        decide: StoreDecider,
    ): Promise<StoreCommandResult> {
        if (transaction.writerAuthority !== CANONICAL_CASE_WRITER) {
            throw new CaseStoreError('writer_conflict', 'Canonical case mutation requires CaseCommandService authority');
        }
        const idempotency = receiptKey(transaction.organizationId, transaction.idempotencyKey);
        const previousReceipt = this.receipts.get(idempotency);
        if (previousReceipt) {
            if (previousReceipt.commandHash !== transaction.commandHash) {
                throw new CaseStoreError('idempotency_conflict', 'Idempotency key was reused with a different command');
            }
            return { ...clone(previousReceipt), replayed: true };
        }

        const caseId = transaction.requestedCaseId ?? this.allocateCaseId();
        const key = caseKey(transaction.organizationId, caseId);
        const stored = this.projections.get(key);
        if (stored && stored.authority !== CANONICAL_CASE_WRITER) {
            throw new CaseStoreError('writer_conflict', 'Case is not owned by the canonical command writer');
        }
        const current = stored ? clone(stored.projection) : null;
        if (transaction.requestedCaseId !== null && current === null) {
            throw new CaseStoreError('not_found', 'Maintenance case was not found');
        }
        if ((current?.version ?? 0) !== transaction.expectedVersion) {
            throw new CaseStoreError('version_conflict', 'Maintenance case version is stale');
        }

        const mutation = decide({ caseId, current, occurredAt: transaction.occurredAt });
        const result: StoreCommandResult = {
            event: mutation.event,
            projection: mutation.projection,
            replayed: false,
            commandHash: transaction.commandHash,
        };
        validateDecision(transaction, result);
        if (result.projection.id !== caseId) {
            throw new CaseStoreError('invalid_state', 'Command decider changed its allocated case id');
        }

        this.projections.set(key, {
            authority: CANONICAL_CASE_WRITER,
            projection: clone(result.projection),
        });
        this.events.set(key, [...(this.events.get(key) ?? []), clone(result.event)]);
        this.receipts.set(idempotency, clone(result));
        this.audit.push({
            writer: CANONICAL_CASE_WRITER,
            organizationId: transaction.organizationId,
            caseId,
            version: result.projection.version,
            targets: ['maintenance_cases', 'case_events', 'case_command_receipts'],
        });
        return clone(result);
    }

    async load(organizationId: number, caseId: number): Promise<CaseProjection | null> {
        const stored = this.projections.get(caseKey(organizationId, caseId));
        return stored?.authority === CANONICAL_CASE_WRITER ? clone(stored.projection) : null;
    }

    async timeline(organizationId: number, caseId: number): Promise<CaseEventEnvelope[]> {
        return clone(this.events.get(caseKey(organizationId, caseId)) ?? []);
    }

    getWriteAudit(): CaseWriteAuditEntry[] {
        return clone(this.audit);
    }

    private allocateCaseId(): number {
        const allocated = this.nextCaseId;
        this.nextCaseId += 1;
        return allocated;
    }
}
