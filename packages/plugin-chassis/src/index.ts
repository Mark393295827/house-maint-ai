import { createHash, verify as verifySignature } from 'node:crypto';
import {
    CaseCommandEnvelopeSchema,
    DeliveryEnvelopeSchema,
    EffectiveScopeSchema,
    type CaseCommandEnvelope,
    type DataClass,
    type EffectiveScope,
} from '@house-maint/contracts';

type JsonRecord = Record<string, unknown>;
type DeliveryEnvelope = ReturnType<typeof DeliveryEnvelopeSchema.parse>;
type ScopeKind = EffectiveScope['scope_kind'];
type ScopeAction = EffectiveScope['actions'][number];
export type PluginChannel = DeliveryEnvelope['channel'];

export interface PluginGrants {
    capabilities: string[];
    data_classes: DataClass[];
    scope_kinds: ScopeKind[];
    actions: ScopeAction[];
    purposes: string[];
    retention_days: number;
}

export interface PluginManifest {
    schema: 'surface-plugin-manifest/v1';
    plugin_id: string;
    version: string;
    key_id: string;
    issued_at: string;
    expires_at: string;
    channel: PluginChannel;
    core_contract: 'surface-plugin-core/v1';
    grants: PluginGrants;
    signature: { algorithm: 'ed25519'; value: string };
}

declare const verifiedManifest: unique symbol;
export type VerifiedPluginManifest = PluginManifest & { readonly [verifiedManifest]: true };

export interface ExternalIdentityBinding {
    schema: 'external-identity-binding/v1';
    binding_id: string;
    plugin_id: string;
    channel: PluginChannel;
    external_subject_hash: string;
    principal_id: string;
    organization_id: number;
    scope_id: string;
    issued_at: string;
    expires_at: string;
}

export interface PluginIngressEnvelope {
    schema: 'plugin-ingress/v1';
    ingress_id: string;
    plugin_id: string;
    binding_id: string;
    organization_id: number;
    scope_id: string;
    idempotency_key: string;
    command: CaseCommandEnvelope | unknown;
    received_at: string;
}

export interface PluginDeliveryEnvelope {
    schema: 'plugin-delivery/v1';
    plugin_id: string;
    binding_id: string;
    idempotency_key: string;
    delivery: DeliveryEnvelope | unknown;
}

export interface NormalizedIdempotentEnvelope<T> {
    schema: 'normalized-plugin-envelope/v1';
    kind: 'ingress' | 'delivery';
    idempotency_address: string;
    fingerprint: string;
    payload: T;
}

export type AtomicIdempotencyClaim = (
    address: string,
    fingerprint: string,
) => 'accepted' | 'duplicate' | 'conflict';

type PluginErrorCode =
    | 'invalid_manifest'
    | 'signature_invalid'
    | 'manifest_expired'
    | 'policy_denied'
    | 'identity_denied'
    | 'invalid_envelope'
    | 'idempotency_conflict';

export class PluginBoundaryError extends Error {
    constructor(public readonly code: PluginErrorCode, message: string) {
        super(message);
        this.name = 'PluginBoundaryError';
    }
}

const manifestKeys = [
    'schema', 'plugin_id', 'version', 'key_id', 'issued_at', 'expires_at',
    'channel', 'core_contract', 'grants', 'signature',
] as const;
const grantKeys = ['capabilities', 'data_classes', 'scope_kinds', 'actions', 'purposes', 'retention_days'] as const;
const signatureKeys = ['algorithm', 'value'] as const;
const channels: PluginChannel[] = ['web', 'worker_portal', 'wechat', 'email', 'sms', 'internal_ops'];
const scopeKinds: ScopeKind[] = ['personal', 'case', 'property', 'organization', 'channel', 'admin'];
const actions: ScopeAction[] = ['read', 'contribute', 'manage', 'message', 'media', 'dispatch', 'verify', 'report'];
const dataClasses: DataClass[] = ['public', 'internal', 'personal', 'sensitive_media', 'financial', 'legal_advisory'];
const forbiddenKey = /^(?:provider|provider_name|model|model_name|credential|credentials|secret|api_?key|password|access_?token|refresh_?token|hidden_?reasoning)$/i;
const opaqueId = /^[A-Za-z][A-Za-z0-9._:-]{2,127}$/;
const sha256 = /^[a-f0-9]{64}$/;
const verifiedManifests = new WeakSet<object>();

function record(value: unknown, message: string): JsonRecord {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        throw new PluginBoundaryError('invalid_manifest', message);
    }
    return value as JsonRecord;
}

function exactKeys(value: JsonRecord, allowed: readonly string[], message: string): void {
    const actual = Object.keys(value).sort();
    const expected = [...allowed].sort();
    if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
        throw new PluginBoundaryError('invalid_manifest', message);
    }
}

function instant(value: unknown, label: string): string {
    if (typeof value !== 'string' || !Number.isFinite(Date.parse(value))) {
        throw new PluginBoundaryError('invalid_manifest', `${label} must be an instant`);
    }
    return value;
}

function strings(value: unknown, label: string): string[] {
    if (!Array.isArray(value) || value.some((item) => typeof item !== 'string') || new Set(value).size !== value.length) {
        throw new PluginBoundaryError('invalid_manifest', `${label} must contain unique strings`);
    }
    return [...value] as string[];
}

function assertNoForbiddenKeys(value: unknown): void {
    if (Array.isArray(value)) {
        value.forEach(assertNoForbiddenKeys);
        return;
    }
    if (!value || typeof value !== 'object') return;
    for (const [key, child] of Object.entries(value as JsonRecord)) {
        if (forbiddenKey.test(key)) {
            throw new PluginBoundaryError('invalid_manifest', 'Plugin manifests cannot carry runtime routes or secrets');
        }
        assertNoForbiddenKeys(child);
    }
}

function parseManifest(raw: unknown): PluginManifest {
    assertNoForbiddenKeys(raw);
    const value = record(raw, 'Plugin manifest must be an object');
    exactKeys(value, manifestKeys, 'Plugin manifest contains missing or unknown fields');
    const grants = record(value.grants, 'Plugin grants must be an object');
    const signature = record(value.signature, 'Plugin signature must be an object');
    exactKeys(grants, grantKeys, 'Plugin grants contain missing or unknown fields');
    exactKeys(signature, signatureKeys, 'Plugin signature contains missing or unknown fields');
    if (value.schema !== 'surface-plugin-manifest/v1'
        || value.core_contract !== 'surface-plugin-core/v1'
        || typeof value.plugin_id !== 'string' || !opaqueId.test(value.plugin_id)
        || typeof value.key_id !== 'string' || !opaqueId.test(value.key_id)
        || typeof value.version !== 'string' || !/^[1-9][0-9]*\.[0-9]+\.[0-9]+$/.test(value.version)
        || !channels.includes(value.channel as PluginChannel)
        || signature.algorithm !== 'ed25519'
        || typeof signature.value !== 'string' || !/^[A-Za-z0-9_-]+$/.test(signature.value)) {
        throw new PluginBoundaryError('invalid_manifest', 'Plugin manifest identity, version, channel, or signature is invalid');
    }
    const issuedAt = instant(value.issued_at, 'issued_at');
    const expiresAt = instant(value.expires_at, 'expires_at');
    if (Date.parse(expiresAt) <= Date.parse(issuedAt)) {
        throw new PluginBoundaryError('invalid_manifest', 'Plugin expiry must follow issuance');
    }
    const capabilities = strings(grants.capabilities, 'capabilities');
    const declaredDataClasses = strings(grants.data_classes, 'data_classes');
    const declaredScopeKinds = strings(grants.scope_kinds, 'scope_kinds');
    const declaredActions = strings(grants.actions, 'actions');
    const purposes = strings(grants.purposes, 'purposes');
    if (capabilities.some((item) => !/^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)+\.v[1-9][0-9]*$/.test(item))
        || declaredDataClasses.some((item) => !dataClasses.includes(item as DataClass))
        || declaredScopeKinds.some((item) => !scopeKinds.includes(item as ScopeKind))
        || declaredActions.some((item) => !actions.includes(item as ScopeAction))
        || purposes.some((item) => item.length < 2 || item.length > 80)
        || !Number.isInteger(grants.retention_days) || Number(grants.retention_days) < 0 || Number(grants.retention_days) > 3650) {
        throw new PluginBoundaryError('invalid_manifest', 'Plugin grants are invalid');
    }
    return {
        schema: 'surface-plugin-manifest/v1', plugin_id: value.plugin_id,
        version: value.version, key_id: value.key_id, issued_at: issuedAt,
        expires_at: expiresAt, channel: value.channel as PluginChannel,
        core_contract: 'surface-plugin-core/v1',
        grants: {
            capabilities, data_classes: declaredDataClasses as DataClass[],
            scope_kinds: declaredScopeKinds as ScopeKind[], actions: declaredActions as ScopeAction[],
            purposes, retention_days: Number(grants.retention_days),
        },
        signature: { algorithm: 'ed25519', value: signature.value },
    };
}

export function canonicalJson(value: unknown): string {
    if (value === null || typeof value === 'string' || typeof value === 'boolean') return JSON.stringify(value);
    if (typeof value === 'number' && Number.isFinite(value)) return JSON.stringify(value);
    if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
    if (value && typeof value === 'object') {
        const entries = Object.entries(value as JsonRecord).sort(([left], [right]) => left.localeCompare(right));
        return `{${entries.map(([key, child]) => `${JSON.stringify(key)}:${canonicalJson(child)}`).join(',')}}`;
    }
    throw new PluginBoundaryError('invalid_manifest', 'Signed payload must be canonical JSON');
}

export function manifestSigningPayload(raw: unknown): string {
    const value = record(raw, 'Plugin manifest must be an object');
    const unsigned = { ...value };
    delete unsigned.signature;
    return canonicalJson(unsigned);
}

export function verifyPluginManifest(
    raw: unknown,
    trustedKeys: ReadonlyMap<string, string>,
    now: string,
): VerifiedPluginManifest {
    const manifest = parseManifest(raw);
    const publicKey = trustedKeys.get(manifest.key_id);
    if (!publicKey || !verifySignature(
        null,
        Buffer.from(manifestSigningPayload(manifest), 'utf8'),
        publicKey,
        Buffer.from(manifest.signature.value, 'base64url'),
    )) {
        throw new PluginBoundaryError('signature_invalid', 'Plugin signature is invalid or untrusted');
    }
    const nowMs = Date.parse(instant(now, 'now'));
    if (nowMs < Date.parse(manifest.issued_at) || nowMs >= Date.parse(manifest.expires_at)) {
        throw new PluginBoundaryError('manifest_expired', 'Plugin manifest is expired or not yet active');
    }
    verifiedManifests.add(manifest);
    return manifest as VerifiedPluginManifest;
}

export function authorizePlugin(
    manifest: VerifiedPluginManifest,
    rawScope: EffectiveScope | unknown,
    now: string,
): PluginGrants {
    if (!manifest || typeof manifest !== 'object' || !verifiedManifests.has(manifest)) {
        throw new PluginBoundaryError('policy_denied', 'Plugin manifest must be verified at this boundary');
    }
    const parsed = EffectiveScopeSchema.safeParse(rawScope);
    if (!parsed.success || Date.parse(parsed.data.expires_at) <= Date.parse(now)) {
        throw new PluginBoundaryError('policy_denied', 'Plugin policy denied an invalid or expired scope');
    }
    const current = parsed.data;
    const grants = manifest.grants;
    const subset = <T>(requested: readonly T[], allowed: readonly T[]) => requested.every((item) => allowed.includes(item));
    if (Date.parse(manifest.expires_at) <= Date.parse(now)
        || !grants.scope_kinds.includes(current.scope_kind)
        || !subset(grants.capabilities, current.capabilities)
        || !subset(grants.data_classes, current.data_classes)
        || !subset(grants.actions, current.actions)
        || !subset(grants.purposes, current.purposes)
        || grants.retention_days > current.retention_days) {
        throw new PluginBoundaryError('policy_denied', 'Plugin policy grants cannot broaden the effective scope');
    }
    return structuredClone(grants);
}

function parseBinding(raw: ExternalIdentityBinding | unknown): ExternalIdentityBinding {
    const value = record(raw, 'External identity binding must be an object');
    const expected = [
        'schema', 'binding_id', 'plugin_id', 'channel', 'external_subject_hash',
        'principal_id', 'organization_id', 'scope_id', 'issued_at', 'expires_at',
    ];
    exactKeys(value, expected, 'External identity binding contains missing or unknown fields');
    if (value.schema !== 'external-identity-binding/v1'
        || typeof value.binding_id !== 'string' || !opaqueId.test(value.binding_id)
        || typeof value.plugin_id !== 'string' || !opaqueId.test(value.plugin_id)
        || !channels.includes(value.channel as PluginChannel)
        || typeof value.external_subject_hash !== 'string' || !sha256.test(value.external_subject_hash)
        || typeof value.principal_id !== 'string' || !opaqueId.test(value.principal_id)
        || !Number.isInteger(value.organization_id) || Number(value.organization_id) <= 0
        || typeof value.scope_id !== 'string' || !opaqueId.test(value.scope_id)) {
        throw new PluginBoundaryError('identity_denied', 'External identity binding is invalid');
    }
    return {
        schema: 'external-identity-binding/v1', binding_id: value.binding_id,
        plugin_id: value.plugin_id, channel: value.channel as PluginChannel,
        external_subject_hash: value.external_subject_hash, principal_id: value.principal_id,
        organization_id: Number(value.organization_id), scope_id: value.scope_id,
        issued_at: instant(value.issued_at, 'binding issued_at'),
        expires_at: instant(value.expires_at, 'binding expires_at'),
    };
}

export function bindExternalIdentity(
    manifest: VerifiedPluginManifest,
    rawScope: EffectiveScope | unknown,
    rawBinding: ExternalIdentityBinding | unknown,
    externalIdentity: { channel: PluginChannel; external_subject_hash: string },
    now: string,
): ExternalIdentityBinding {
    authorizePlugin(manifest, rawScope, now);
    const parsedScope = EffectiveScopeSchema.parse(rawScope);
    const binding = parseBinding(rawBinding);
    if (Date.parse(binding.issued_at) > Date.parse(now) || Date.parse(binding.expires_at) <= Date.parse(now)
        || binding.plugin_id !== manifest.plugin_id || binding.channel !== manifest.channel
        || externalIdentity.channel !== binding.channel
        || externalIdentity.external_subject_hash !== binding.external_subject_hash
        || binding.organization_id !== parsedScope.organization_id
        || binding.scope_id !== parsedScope.scope_id
        || binding.principal_id !== parsedScope.principal.principal_id) {
        throw new PluginBoundaryError('identity_denied', 'External identity is not bound to this internal scope');
    }
    return structuredClone(binding);
}

function digest(value: unknown): string {
    return createHash('sha256').update(canonicalJson(value), 'utf8').digest('hex');
}

function hasCommandGrant(command: CaseCommandEnvelope, granted: readonly ScopeAction[]): boolean {
    if (command.body.type === 'resolve_case' || command.body.type === 'close_case') {
        return granted.includes('verify') && granted.includes('manage');
    }
    if (command.body.type === 'cancel_case' || command.body.type === 'reopen_case'
        || command.body.type === 'update_case') {
        return granted.includes('manage');
    }
    return granted.includes('contribute') || granted.includes('manage');
}

export function normalizeIngress(input: {
    manifest: VerifiedPluginManifest;
    scope: EffectiveScope | unknown;
    binding: ExternalIdentityBinding | unknown;
    external_identity: { channel: PluginChannel; external_subject_hash: string };
    envelope: PluginIngressEnvelope | unknown;
    now: string;
}): NormalizedIdempotentEnvelope<CaseCommandEnvelope> {
    const grants = authorizePlugin(input.manifest, input.scope, input.now);
    const parsedScope = EffectiveScopeSchema.parse(input.scope);
    const bound = bindExternalIdentity(input.manifest, parsedScope, input.binding, input.external_identity, input.now);
    const envelope = record(input.envelope, 'Plugin ingress must be an object');
    exactKeys(envelope, [
        'schema', 'ingress_id', 'plugin_id', 'binding_id', 'organization_id',
        'scope_id', 'idempotency_key', 'command', 'received_at',
    ], 'Plugin ingress contains missing or unknown fields');
    const command = CaseCommandEnvelopeSchema.safeParse(envelope.command);
    if (envelope.schema !== 'plugin-ingress/v1' || !command.success
        || envelope.plugin_id !== input.manifest.plugin_id || envelope.binding_id !== bound.binding_id
        || envelope.organization_id !== parsedScope.organization_id || envelope.scope_id !== parsedScope.scope_id
        || envelope.idempotency_key !== command.data.idempotency_key
        || command.data.organization_id !== parsedScope.organization_id
        || (parsedScope.case_id !== undefined && command.data.case_id !== parsedScope.case_id)
        || !hasCommandGrant(command.data, grants.actions)) {
        throw new PluginBoundaryError('invalid_envelope', 'Plugin ingress is outside its bound scope or grants');
    }
    if (command.data.body.type === 'open_case') {
        const propertyId = command.data.body.payload.property_id ?? null;
        const unitId = command.data.body.payload.unit_id ?? null;
        if (parsedScope.scope_kind === 'case'
            || (parsedScope.property_id !== undefined && parsedScope.property_id !== propertyId)
            || (parsedScope.unit_id !== undefined && parsedScope.unit_id !== unitId)) {
            throw new PluginBoundaryError('invalid_envelope', 'Open-case ingress is outside its bound ancestry');
        }
    }
    if (command.data.body.type === 'diagnose_and_plan'
        && !grants.capabilities.includes(command.data.body.payload.requested_capability)) {
        throw new PluginBoundaryError('policy_denied', 'Plugin policy does not grant the requested capability');
    }
    const payload = command.data;
    return {
        schema: 'normalized-plugin-envelope/v1', kind: 'ingress',
        idempotency_address: `ingress:${parsedScope.organization_id}:${input.manifest.plugin_id}:${payload.idempotency_key}`,
        fingerprint: digest(payload), payload,
    };
}

export function normalizeDelivery(input: {
    manifest: VerifiedPluginManifest;
    scope: EffectiveScope | unknown;
    binding: ExternalIdentityBinding | unknown;
    external_identity: { channel: PluginChannel; external_subject_hash: string };
    envelope: PluginDeliveryEnvelope | unknown;
    now: string;
}): NormalizedIdempotentEnvelope<DeliveryEnvelope> {
    const grants = authorizePlugin(input.manifest, input.scope, input.now);
    const parsedScope = EffectiveScopeSchema.parse(input.scope);
    const bound = bindExternalIdentity(input.manifest, parsedScope, input.binding, input.external_identity, input.now);
    const envelope = record(input.envelope, 'Plugin delivery must be an object');
    exactKeys(envelope, ['schema', 'plugin_id', 'binding_id', 'idempotency_key', 'delivery'], 'Plugin delivery contains missing or unknown fields');
    const delivery = DeliveryEnvelopeSchema.safeParse(envelope.delivery);
    if (envelope.schema !== 'plugin-delivery/v1' || !delivery.success
        || envelope.plugin_id !== input.manifest.plugin_id || envelope.binding_id !== bound.binding_id
        || envelope.idempotency_key !== delivery.data.delivery_id
        || delivery.data.destination_binding_id !== bound.binding_id
        || delivery.data.channel !== input.manifest.channel
        || delivery.data.organization_id !== parsedScope.organization_id
        || (parsedScope.case_id !== undefined && delivery.data.case_id !== parsedScope.case_id)
        || Date.parse(delivery.data.expires_at) <= Date.parse(input.now)
        || !grants.actions.some((action) => action === 'read' || action === 'message')) {
        throw new PluginBoundaryError('invalid_envelope', 'Plugin delivery is outside its bound scope or grants');
    }
    return {
        schema: 'normalized-plugin-envelope/v1', kind: 'delivery',
        idempotency_address: `delivery:${parsedScope.organization_id}:${input.manifest.plugin_id}:${delivery.data.delivery_id}`,
        fingerprint: digest(delivery.data), payload: delivery.data,
    };
}

export function acceptIdempotent<T>(
    envelope: NormalizedIdempotentEnvelope<T>,
    claim: AtomicIdempotencyClaim,
): NormalizedIdempotentEnvelope<T> & { status: 'accepted' | 'duplicate' } {
    const status = claim(envelope.idempotency_address, envelope.fingerprint);
    if (status === 'conflict') {
        throw new PluginBoundaryError('idempotency_conflict', 'Plugin idempotency key conflicts with another payload');
    }
    return { ...envelope, status };
}
