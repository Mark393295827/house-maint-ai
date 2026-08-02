import { z } from 'zod';
import {
    DataClassSchema,
    InstantSchema,
    OpaqueIdSchema,
    PolicyVersionSchema,
    PositiveIdSchema,
    SafeArtifactPayloadSchema,
    Sha256Schema,
} from './primitives.js';

export const ArtifactEnvelopeSchema = z.object({
    schema: z.literal('agent-artifact/v1'),
    artifact_id: OpaqueIdSchema,
    schema_name: z.string().regex(/^[a-z][a-z0-9._-]*\/v[1-9][0-9]*$/),
    scope_id: OpaqueIdSchema,
    organization_id: PositiveIdSchema,
    case_id: PositiveIdSchema,
    case_version: z.number().int().nonnegative(),
    producer_run_id: OpaqueIdSchema,
    producer_task_id: OpaqueIdSchema,
    input_hashes: z.array(Sha256Schema).max(64),
    payload_hash: Sha256Schema,
    payload: SafeArtifactPayloadSchema,
    policy_version: PolicyVersionSchema,
    data_class: DataClassSchema,
    retention_days: z.number().int().nonnegative().max(3650),
    evaluation_state: z.enum(['pending', 'accepted', 'rejected', 'superseded']),
    supersedes_artifact_id: OpaqueIdSchema.nullable(),
    created_at: InstantSchema,
}).strict();

export type ArtifactEnvelope = z.infer<typeof ArtifactEnvelopeSchema>;
