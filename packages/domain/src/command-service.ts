import {
    CaseCommandEnvelopeSchema,
    EffectiveScopeSchema,
    type AgentArtifactAdoption,
    type CaseCommandEnvelope,
    type CaseEventEnvelope,
    type CaseProjection,
    type EffectiveScope,
} from '@house-maint/contracts';
import { commandFingerprint } from './canonical-json.js';
import { CaseDomainError } from './errors.js';
import { reduceCaseEvent } from './reducer.js';
import {
    CANONICAL_CASE_WRITER,
    type CaseCommandRepository,
    type CaseCommandResult,
    type ExecuteCaseCommandInput,
} from './types.js';

type CommandType = CaseCommandEnvelope['body']['type'];

const allowedActions: Record<CommandType, ReadonlyArray<EffectiveScope['actions'][number]>> = {
    open_case: ['contribute', 'manage'],
    diagnose_and_plan: ['contribute', 'manage'],
    update_case: ['contribute', 'manage'],
    resolve_case: ['verify', 'manage'],
    close_case: ['verify', 'manage'],
    cancel_case: ['manage'],
    reopen_case: ['manage'],
};

function artifactAdoption(command: CaseCommandEnvelope): AgentArtifactAdoption | null {
    if (command.body.type !== 'update_case'
        || !('agent_artifact_adoption' in command.body.payload)) return null;
    return command.body.payload.agent_artifact_adoption;
}

function parseInput(input: ExecuteCaseCommandInput): {
    command: CaseCommandEnvelope;
    scope: EffectiveScope;
} {
    const command = CaseCommandEnvelopeSchema.safeParse(input.command);
    const scope = EffectiveScopeSchema.safeParse(input.scope);
    if (!command.success || !scope.success) {
        throw new CaseDomainError('invalid_input', 'Command and scope must satisfy their v1 contracts');
    }
    return { command: command.data, scope: scope.data };
}

function authorize(command: CaseCommandEnvelope, scope: EffectiveScope, now: string): void {
    if (scope.organization_id !== command.organization_id
        || scope.principal.organization_id !== command.organization_id) {
        throw new CaseDomainError('forbidden', 'The resolved scope belongs to another organization');
    }
    if (Date.parse(scope.expires_at) <= Date.parse(now)
        || Date.parse(scope.expires_at) <= Date.parse(command.requested_at)) {
        throw new CaseDomainError('scope_expired', 'The resolved scope is expired for this command');
    }
    const adoption = artifactAdoption(command);
    const requiredActions = adoption ? (['verify'] as const) : allowedActions[command.body.type];
    if (!requiredActions.some((action) => scope.actions.includes(action))) {
        throw new CaseDomainError('forbidden', 'The resolved scope does not grant this case command');
    }
    if (adoption) {
        if (scope.principal.actor_kind !== 'system' || scope.scope_kind !== 'case'
            || scope.case_id !== command.case_id) {
            throw new CaseDomainError('forbidden', 'Artifact adoption requires a case-scoped system principal');
        }
        if (adoption.artifact.scope_id !== scope.scope_id
            || adoption.artifact.policy_version !== scope.policy_version) {
            throw new CaseDomainError('forbidden', 'Artifact scope and policy must match the resolved system scope');
        }
        if (!scope.data_classes.includes(adoption.artifact.data_class)
            || adoption.artifact.retention_days > scope.retention_days) {
            throw new CaseDomainError('forbidden', 'Artifact data handling exceeds the resolved system scope');
        }
    }
    if (command.body.type === 'open_case') {
        if (scope.scope_kind === 'case') {
            throw new CaseDomainError('forbidden', 'An existing-case scope cannot open another case');
        }
        const propertyId = command.body.payload.property_id ?? null;
        const unitId = command.body.payload.unit_id ?? null;
        if (scope.property_id !== undefined && propertyId !== scope.property_id) {
            throw new CaseDomainError('forbidden', 'The command property is outside the resolved scope');
        }
        if (scope.unit_id !== undefined && unitId !== scope.unit_id) {
            throw new CaseDomainError('forbidden', 'The command unit is outside the resolved scope');
        }
        return;
    }
    if (scope.case_id !== undefined && scope.case_id !== command.case_id) {
        throw new CaseDomainError('not_found', 'The case is not visible in the resolved scope');
    }
    if (scope.scope_kind === 'case' && scope.case_id !== command.case_id) {
        throw new CaseDomainError('not_found', 'The case is not visible in the resolved scope');
    }
}

/**
 * Resource ancestry is deliberately checked against the loaded canonical
 * projection, rather than trusting a case id to imply property or unit access.
 * Visibility failures use not_found so a narrower scope cannot enumerate
 * maintenance cases outside its resolved ancestry.
 */
function assertProjectionInScope(scope: EffectiveScope, projection: CaseProjection): void {
    if (projection.organization_id !== scope.organization_id
        || (scope.case_id !== undefined && projection.id !== scope.case_id)
        || (scope.property_id !== undefined && projection.property_id !== scope.property_id)
        || (scope.unit_id !== undefined && projection.unit_id !== scope.unit_id)) {
        throw new CaseDomainError('not_found', 'The case is not visible in the resolved scope');
    }
}

function eventPayload(command: CaseCommandEnvelope, hash: string): {
    eventType: CaseEventEnvelope['event_type'];
    payload: Record<string, unknown>;
} {
    switch (command.body.type) {
        case 'open_case':
            return {
                eventType: 'case_opened',
                payload: {
                    title: command.body.payload.title,
                    description: command.body.payload.description,
                    category: command.body.payload.category ?? null,
                    priority: command.body.payload.priority,
                    property_id: command.body.payload.property_id ?? null,
                    unit_id: command.body.payload.unit_id ?? null,
                    evidence: command.body.payload.evidence,
                },
            };
        case 'diagnose_and_plan':
            return {
                eventType: 'agent_run_requested',
                payload: {
                    run_id: `run:${hash.slice(0, 48)}`,
                    requested_capability: command.body.payload.requested_capability,
                    confirmed_input_artifact_ids: command.body.payload.confirmed_input_artifact_ids,
                    locale: command.body.payload.locale,
                },
            };
        case 'update_case':
            if ('agent_artifact_adoption' in command.body.payload) {
                const adoption = command.body.payload.agent_artifact_adoption;
                return {
                    eventType: 'agent_artifact_accepted',
                    payload: {
                        artifact_id: adoption.artifact.artifact_id,
                        artifact_schema_name: adoption.artifact.schema_name,
                        artifact_payload_hash: adoption.artifact.payload_hash,
                        artifact_case_version: adoption.artifact.case_version,
                        evaluation_id: adoption.evaluation.evaluation_id,
                        evaluation_decision: adoption.evaluation.decision,
                        independent_route: adoption.evaluation.independent_route,
                        policy_version: adoption.artifact.policy_version,
                        producer_run_id: adoption.artifact.producer_run_id,
                        producer_task_id: adoption.artifact.producer_task_id,
                        producer_route_id: adoption.producer_route_id,
                        evaluator_route_id: adoption.evaluator_route_id,
                    },
                };
            }
            return { eventType: 'case_updated', payload: { ...command.body.payload } };
        case 'resolve_case':
            return { eventType: 'case_resolved', payload: { ...command.body.payload } };
        case 'close_case':
            return { eventType: 'case_closed', payload: { ...command.body.payload } };
        case 'cancel_case':
            return { eventType: 'case_cancelled', payload: { ...command.body.payload } };
        case 'reopen_case':
            return { eventType: 'case_reopened', payload: { ...command.body.payload } };
    }
}

function actor(scope: EffectiveScope): Pick<CaseEventEnvelope, 'actor_type' | 'actor_membership_id'> {
    return {
        actor_type: scope.principal.actor_kind,
        actor_membership_id: scope.principal.membership_id ?? null,
    };
}

export class CaseCommandService {
    constructor(
        private readonly repository: CaseCommandRepository,
        private readonly clock: () => string = () => new Date().toISOString(),
    ) {}

    async execute(input: ExecuteCaseCommandInput): Promise<CaseCommandResult> {
        const { command, scope } = parseInput(input);
        const occurredAt = this.clock();
        authorize(command, scope, occurredAt);
        if (command.body.type === 'open_case' && command.expected_version !== 0) {
            throw new CaseDomainError('version_conflict', 'A new case must start at expected_version 0');
        }
        if (command.body.type !== 'open_case') {
            // The stores intentionally check idempotency and expected version
            // early. Resolve visibility first so neither a receipt hit nor a
            // version conflict becomes an ancestry side channel; the locked
            // projection is checked again by the transaction decider below.
            const caseId = command.case_id;
            if (caseId === undefined) {
                throw new CaseDomainError('invalid_input', 'Existing-case commands require a case id');
            }
            const projection = await this.repository.load(command.organization_id, caseId);
            if (!projection) throw new CaseDomainError('not_found', 'Maintenance case was not found');
            assertProjectionInScope(scope, projection);
        }
        const hash = commandFingerprint(command);
        const result = await this.repository.execute({
            writerAuthority: CANONICAL_CASE_WRITER,
            organizationId: command.organization_id,
            requestedCaseId: command.case_id ?? null,
            expectedVersion: command.expected_version,
            idempotencyKey: command.idempotency_key,
            commandHash: hash,
            occurredAt,
        }, ({ caseId, current }) => {
            if (command.body.type === 'open_case' && current) {
                throw new CaseDomainError('invalid_state', 'open_case received an existing projection');
            }
            if (command.body.type !== 'open_case' && !current) {
                throw new CaseDomainError('not_found', 'Maintenance case was not found');
            }
            if (current) assertProjectionInScope(scope, current);
            if ((current?.version ?? 0) !== command.expected_version) {
                throw new CaseDomainError('version_conflict', 'Maintenance case version is stale');
            }
            const planned = eventPayload(command, hash);
            const sequence = (current?.version ?? 0) + 1;
            const event: CaseEventEnvelope = {
                schema: 'case-event/v1',
                event_id: `event:${hash.slice(0, 48)}`,
                organization_id: command.organization_id,
                case_id: caseId,
                sequence,
                case_version: sequence,
                event_type: planned.eventType,
                ...actor(scope),
                idempotency_key: command.idempotency_key,
                correlation_id: command.correlation_id,
                payload: planned.payload,
                occurred_at: occurredAt,
            };
            const projection = reduceCaseEvent(current, event);
            assertProjectionInScope(scope, projection);
            return { event, projection };
        });
        // Stores intentionally resolve idempotency receipts before current state,
        // so an open receipt's projection is historical. Treat its case id only
        // as identity and authorize the separately loaded canonical projection
        // before any receipt data leaves this service.
        if (command.body.type === 'open_case') {
            const current = await this.repository.load(command.organization_id, result.projection.id);
            if (!current) throw new CaseDomainError('not_found', 'Maintenance case was not found');
            assertProjectionInScope(scope, current);
        }
        assertProjectionInScope(scope, result.projection);
        return result;
    }

    async getCase(rawScope: EffectiveScope | unknown, caseId: number): Promise<CaseCommandResult['projection']> {
        const scope = EffectiveScopeSchema.safeParse(rawScope);
        if (!scope.success || !Number.isInteger(caseId) || caseId <= 0) {
            throw new CaseDomainError('invalid_input', 'A valid scope and positive case id are required');
        }
        this.authorizeRead(scope.data, caseId);
        const projection = await this.repository.load(scope.data.organization_id, caseId);
        if (!projection) throw new CaseDomainError('not_found', 'Maintenance case was not found');
        assertProjectionInScope(scope.data, projection);
        return projection;
    }

    async getTimeline(rawScope: EffectiveScope | unknown, caseId: number): Promise<CaseEventEnvelope[]> {
        const scope = EffectiveScopeSchema.safeParse(rawScope);
        if (!scope.success || !Number.isInteger(caseId) || caseId <= 0) {
            throw new CaseDomainError('invalid_input', 'A valid scope and positive case id are required');
        }
        this.authorizeRead(scope.data, caseId);
        const projection = await this.repository.load(scope.data.organization_id, caseId);
        if (!projection) throw new CaseDomainError('not_found', 'Maintenance case was not found');
        assertProjectionInScope(scope.data, projection);
        const events = await this.repository.timeline(scope.data.organization_id, caseId);
        if (events.length === 0) throw new CaseDomainError('not_found', 'Maintenance case was not found');
        return events;
    }

    private authorizeRead(scope: EffectiveScope, caseId: number): void {
        const now = this.clock();
        if (Date.parse(scope.expires_at) <= Date.parse(now)) {
            throw new CaseDomainError('scope_expired', 'The resolved scope is expired');
        }
        if (!scope.actions.some((action) => action === 'read' || action === 'manage')) {
            throw new CaseDomainError('forbidden', 'The resolved scope does not grant case reads');
        }
        if (scope.case_id !== undefined && scope.case_id !== caseId) {
            throw new CaseDomainError('not_found', 'The case is not visible in the resolved scope');
        }
    }
}
