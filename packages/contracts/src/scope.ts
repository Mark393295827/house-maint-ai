import { z } from 'zod';
import {
    CapabilityIdSchema,
    DataClassSchema,
    InstantSchema,
    OpaqueIdSchema,
    PolicyVersionSchema,
    PositiveIdSchema,
} from './primitives.js';

export const PrincipalSchema = z.object({
    principal_id: OpaqueIdSchema,
    actor_kind: z.enum(['member', 'system', 'integration']),
    organization_id: PositiveIdSchema,
    membership_id: PositiveIdSchema.optional(),
    user_id: PositiveIdSchema.optional(),
    role: z.enum(['owner', 'admin', 'manager', 'resident', 'worker', 'auditor', 'system', 'integration']),
    authenticated_at: InstantSchema,
}).strict().superRefine((value, context) => {
    if (value.actor_kind === 'member' && (!value.membership_id || !value.user_id)) {
        context.addIssue({ code: 'custom', message: 'Member principals require membership_id and user_id' });
    }
    if (value.actor_kind !== 'member' && (value.membership_id || value.user_id)) {
        context.addIssue({ code: 'custom', message: 'Non-member principals cannot claim membership or user identity' });
    }
    if (value.actor_kind !== 'member' && value.role !== value.actor_kind) {
        context.addIssue({ code: 'custom', path: ['role'], message: 'System and integration roles must match actor_kind' });
    }
});

export const ScopeKindSchema = z.enum([
    'personal',
    'case',
    'property',
    'organization',
    'channel',
    'admin',
]);

export const EffectiveScopeSchema = z.object({
    schema: z.literal('effective-scope/v1'),
    scope_id: OpaqueIdSchema,
    scope_kind: ScopeKindSchema,
    organization_id: PositiveIdSchema,
    case_id: PositiveIdSchema.optional(),
    property_id: PositiveIdSchema.optional(),
    unit_id: PositiveIdSchema.optional(),
    channel_id: OpaqueIdSchema.optional(),
    principal: PrincipalSchema,
    actions: z.array(z.enum(['read', 'contribute', 'manage', 'message', 'media', 'dispatch', 'verify', 'report']))
        .min(1).max(16),
    data_classes: z.array(DataClassSchema).min(1).max(8),
    capabilities: z.array(CapabilityIdSchema).max(32),
    tool_grants: z.array(OpaqueIdSchema).max(32),
    purposes: z.array(z.string().min(2).max(80)).min(1).max(12),
    region: z.string().min(2).max(32),
    retention_days: z.number().int().nonnegative().max(3650),
    policy_version: PolicyVersionSchema,
    resolved_at: InstantSchema,
    expires_at: InstantSchema,
}).strict().superRefine((value, context) => {
    if (value.scope_kind === 'case' && !value.case_id) {
        context.addIssue({ code: 'custom', path: ['case_id'], message: 'Case scope requires case_id' });
    }
    if (value.unit_id && !value.property_id) {
        context.addIssue({ code: 'custom', path: ['unit_id'], message: 'unit_id requires property_id' });
    }
    if (value.principal.organization_id !== value.organization_id) {
        context.addIssue({ code: 'custom', path: ['organization_id'], message: 'Scope and principal organizations must match' });
    }
    if (Date.parse(value.expires_at) <= Date.parse(value.resolved_at)) {
        context.addIssue({ code: 'custom', path: ['expires_at'], message: 'Scope expiry must follow resolution' });
    }
});

export type Principal = z.infer<typeof PrincipalSchema>;
export type EffectiveScope = z.infer<typeof EffectiveScopeSchema>;
