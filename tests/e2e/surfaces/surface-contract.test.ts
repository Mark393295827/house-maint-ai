import fs from 'node:fs';
import path from 'node:path';
import { generateKeyPairSync, sign } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
    ArtifactEnvelopeSchema,
    CaseCommandEnvelopeSchema,
    CaseProgressSchema,
    CaseProjectionSchema,
    EffectiveScopeSchema,
    type EffectiveScope,
} from '@house-maint/contracts';
import {
    PluginBoundaryError,
    acceptIdempotent,
    authorizePlugin,
    bindExternalIdentity,
    manifestSigningPayload,
    normalizeDelivery,
    normalizeIngress,
    verifyPluginManifest,
    type AtomicIdempotencyClaim,
    type ExternalIdentityBinding,
    type PluginManifest,
    type VerifiedPluginManifest,
} from '../../../packages/plugin-chassis/src/index.js';
import {
    WEB_COMPATIBILITY,
    createDiagnoseAndPlanCommand,
    createSurfaceViewModel,
    normalizeResidentSubmission,
} from '../../../apps/web/src/index.js';
import {
    MINIPROGRAM_COMPATIBILITY,
    mapMiniProgramSubmission,
} from '../../../apps/miniprogram/src/index.js';

const NOW = '2026-08-02T06:00:00.000Z';

function scope(input: Partial<EffectiveScope> = {}): EffectiveScope {
    return EffectiveScopeSchema.parse({
        schema: 'effective-scope/v1',
        scope_id: 'case:42',
        scope_kind: 'case',
        organization_id: 1,
        case_id: 42,
        property_id: 10,
        unit_id: 100,
        principal: {
            principal_id: 'principal:resident:1',
            actor_kind: 'member',
            organization_id: 1,
            membership_id: 101,
            user_id: 201,
            role: 'resident',
            authenticated_at: '2026-08-02T05:50:00.000Z',
        },
        actions: ['read', 'contribute', 'manage', 'verify', 'message', 'media', 'report'],
        data_classes: ['personal', 'sensitive_media', 'financial'],
        capabilities: ['maintenance.diagnose-and-plan.v1'],
        tool_grants: [],
        purposes: ['maintenance-case'],
        region: 'cn-east',
        retention_days: 30,
        policy_version: 'policy:test:v1',
        resolved_at: '2026-08-02T05:55:00.000Z',
        expires_at: '2026-08-02T07:00:00.000Z',
        ...input,
    });
}

function snapshot() {
    const effectiveScope = scope();
    return {
        schema: 'surface-session/v1' as const,
        session_id: 'session:42',
        scope: effectiveScope,
        case: CaseProjectionSchema.parse({
            schema: 'case-projection/v1', id: 42, organization_id: 1,
            property_id: 10, unit_id: 100, title: 'Kitchen leak', status: 'open',
            stage: 'diagnosis', priority: 'urgent', version: 7, active_run_id: 'run:42',
            accepted_artifact_ids: ['artifact:diagnosis:1'], created_at: NOW,
            updated_at: NOW, closed_at: null,
        }),
        progress: CaseProgressSchema.parse({
            schema: 'case-progress/v1', organization_id: 1, case_id: 42,
            case_version: 7, stage: 'diagnosis',
            run: { run_id: 'run:42', status: 'working', progress_percent: 55 },
            next_action: {
                kind: 'review_plan',
                display: {
                    zh_cn: '请查看维修建议；如闻到燃气味，请离开现场并联系紧急服务。',
                    en_us: 'Review the repair guidance. Leave and contact emergency services if you smell gas.',
                },
                artifact_id: 'artifact:diagnosis:1',
            },
            updated_at: NOW,
        }),
        artifacts: [
            ArtifactEnvelopeSchema.parse({
                schema: 'agent-artifact/v1', artifact_id: 'artifact:diagnosis:1',
                schema_name: 'maintenance.diagnosis/v1', scope_id: effectiveScope.scope_id,
                organization_id: 1, case_id: 42, case_version: 7,
                producer_run_id: 'run:42', producer_task_id: 'task:diagnosis:1',
                input_hashes: [], payload_hash: 'a'.repeat(64),
                payload: { summary: 'Visible pipe joint leak', confidence: 0.91 },
                policy_version: effectiveScope.policy_version, data_class: 'personal',
                retention_days: 30, evaluation_state: 'accepted',
                supersedes_artifact_id: null, created_at: NOW,
            }),
            ArtifactEnvelopeSchema.parse({
                schema: 'agent-artifact/v1', artifact_id: 'artifact:rejected:1',
                schema_name: 'maintenance.diagnosis/v1', scope_id: effectiveScope.scope_id,
                organization_id: 1, case_id: 42, case_version: 7,
                producer_run_id: 'run:42', producer_task_id: 'task:diagnosis:2',
                input_hashes: [], payload_hash: 'b'.repeat(64), payload: { summary: 'Rejected' },
                policy_version: effectiveScope.policy_version, data_class: 'personal',
                retention_days: 30, evaluation_state: 'rejected',
                supersedes_artifact_id: null, created_at: NOW,
            }),
        ],
        captured_at: NOW,
    };
}

function signedManifest(overrides: Record<string, unknown> = {}) {
    const { publicKey, privateKey } = generateKeyPairSync('ed25519');
    const unsigned = {
        schema: 'surface-plugin-manifest/v1', plugin_id: 'plugin:test:web', version: '1.0.0',
        key_id: 'key:test:1', issued_at: '2026-08-02T05:00:00.000Z',
        expires_at: '2026-08-02T07:00:00.000Z', channel: 'web',
        core_contract: 'surface-plugin-core/v1',
        grants: {
            capabilities: ['maintenance.diagnose-and-plan.v1'], data_classes: ['personal'],
            scope_kinds: ['case'], actions: ['read', 'contribute'],
            purposes: ['maintenance-case'], retention_days: 30,
        },
        ...overrides,
    };
    const signature = sign(null, Buffer.from(manifestSigningPayload(unsigned)), privateKey).toString('base64url');
    const manifest = { ...unsigned, signature: { algorithm: 'ed25519', value: signature } };
    const trustedKeys = new Map([[
        String(unsigned.key_id),
        publicKey.export({ type: 'spki', format: 'pem' }).toString(),
    ]]);
    return { manifest, trustedKeys };
}

function binding(pluginId = 'plugin:test:web'): ExternalIdentityBinding {
    return {
        schema: 'external-identity-binding/v1', binding_id: 'binding:web:1', plugin_id: pluginId,
        channel: 'web', external_subject_hash: 'c'.repeat(64),
        principal_id: 'principal:resident:1', organization_id: 1, scope_id: 'case:42',
        issued_at: '2026-08-02T05:50:00.000Z', expires_at: '2026-08-02T06:30:00.000Z',
    };
}

describe('headless surface adapters', () => {
    it('renders scoped mobile and desktop view models with concise bilingual output', () => {
        const mobile = createSurfaceViewModel(snapshot(), {
            audience: 'resident', locale: 'bilingual', viewport_width: 390, now: NOW,
        });
        const desktop = createSurfaceViewModel(snapshot(), {
            audience: 'enterprise', locale: 'en-US', viewport_width: 1440, now: NOW,
        });

        expect(mobile).toMatchObject({ schema: 'surface-view/v1', layout: 'mobile', progress_percent: 55 });
        expect(mobile.next_action.zh_cn.length).toBeLessThanOrEqual(180);
        expect(mobile.next_action.en_us.length).toBeLessThanOrEqual(180);
        expect(mobile.controls).toEqual(expect.arrayContaining(['text', 'voice', 'camera', 'photo', 'manual', 'emergency']));
        expect(mobile.artifacts.map((item) => item.artifact_id)).toEqual(['artifact:diagnosis:1']);
        expect(desktop).toMatchObject({ layout: 'desktop', audience: 'enterprise' });
        expect(JSON.stringify({ mobile, desktop })).not.toMatch(/provider_name|model_name|deepseek|gemini|openai/i);
    });

    it('maps text, voice, camera/photo, manual, and emergency confirmation to strict case commands', () => {
        const openScope = scope({ scope_id: 'property:10', scope_kind: 'property', case_id: undefined });
        const base = { scope: openScope, requested_at: NOW, correlation_id: 'corr:intake' };
        const submissions = [
            { ...base, source: 'text' as const, idempotency_key: 'text-1', description: 'Water is leaking under the kitchen sink.', confirmed: true },
            { ...base, source: 'voice' as const, idempotency_key: 'voice-1', description: 'Confirmed voice transcript describing the leak.', artifact_id: 'artifact:voice:1', consent_receipt_id: 'consent:voice:1', confirmed: true },
            { ...base, source: 'camera' as const, idempotency_key: 'camera-1', description: 'Confirmed camera photo of the leaking joint.', artifact_id: 'artifact:image:1', consent_receipt_id: 'consent:image:1', confirmed: true },
            { ...base, source: 'photo' as const, idempotency_key: 'photo-1', description: 'Confirmed uploaded photo of the leaking joint.', artifact_id: 'artifact:image:2', consent_receipt_id: 'consent:image:2', confirmed: true },
            { ...base, source: 'manual' as const, idempotency_key: 'manual-1', description: 'Manual support requested for an unclear problem.', confirmed: true },
            { ...base, source: 'emergency' as const, idempotency_key: 'emergency-1', description: 'Strong gas smell near the kitchen appliance.', confirmed: true },
        ];
        const normalized = submissions.map(normalizeResidentSubmission);
        normalized.forEach(({ command }) => expect(CaseCommandEnvelopeSchema.parse(command)).toEqual(command));
        expect(normalized.map((item) => item.fallback)).toEqual([null, null, null, null, 'manual', 'emergency']);
        expect(normalized.at(-1)?.command.body).toMatchObject({ payload: { priority: 'emergency' } });
        expect(() => normalizeResidentSubmission({ ...submissions[1], confirmed: false }))
            .toThrowError(/confirm/i);
        expect(() => normalizeResidentSubmission({ ...submissions[2], consent_receipt_id: undefined }))
            .toThrowError(/consent/i);
    });

    it('creates diagnose-and-plan commands and rejects cross-scope progress or artifacts', () => {
        const command = createDiagnoseAndPlanCommand({
            scope: scope(), case_version: 7, confirmed_artifact_ids: ['artifact:text:1'],
            locale: 'bilingual', idempotency_key: 'diagnose-1', correlation_id: 'corr:diagnose', requested_at: NOW,
        });
        expect(CaseCommandEnvelopeSchema.parse(command)).toEqual(command);
        expect(() => createSurfaceViewModel({ ...snapshot(), progress: { ...snapshot().progress, organization_id: 2 } }, {
            audience: 'worker', locale: 'zh-CN', viewport_width: 800, now: NOW,
        })).toThrowError(/scope/i);
    });

    it('maps worker, enterprise, payment callback, and review views to the same progress contract', () => {
        const journeys = [
            { audience: 'worker' as const, control: 'job' },
            { audience: 'enterprise' as const, control: 'operations' },
            { audience: 'payment' as const, control: 'payment_status' },
            { audience: 'review' as const, control: 'review' },
        ];
        for (const journey of journeys) {
            const view = createSurfaceViewModel(snapshot(), {
                audience: journey.audience, locale: 'bilingual', viewport_width: 1024, now: NOW,
            });
            expect(view).toMatchObject({
                schema: 'surface-view/v1', case_id: 42, case_version: 7,
                stage: 'diagnosis', status: 'working', progress_percent: 55,
            });
            expect(view.controls).toContain(journey.control);
        }
        expect(new Set(WEB_COMPATIBILITY.map((item) => item.audience))).toEqual(
            new Set(['resident', 'worker', 'enterprise', 'payment', 'review']),
        );
        expect(() => createSurfaceViewModel({
            ...snapshot(), progress: { ...snapshot().progress, callback_status: 'paid' },
        }, {
            audience: 'payment', locale: 'bilingual', viewport_width: 1024, now: NOW,
        })).toThrowError(/contract/i);
    });

    it('maps existing mini-program routes and input paths without owning execution', () => {
        expect(MINIPROGRAM_COMPATIBILITY.map((item) => item.legacy_page)).toEqual([
            'pages/report/index', 'pages/report/upload', 'pages/report/diagnosis',
        ]);
        expect(mapMiniProgramSubmission({ source: 'album', text: 'Visible leak photo', media_artifact_id: 'artifact:image:9', consent_receipt_id: 'consent:image:9' }))
            .toEqual({ source: 'photo', description: 'Visible leak photo', artifact_id: 'artifact:image:9', consent_receipt_id: 'consent:image:9' });
        expect(mapMiniProgramSubmission({ source: 'unsupported', text: '' })).toMatchObject({ source: 'manual' });
    });
});

describe('signed plugin chassis', () => {
    it('verifies a versioned Ed25519 manifest and rejects invalid or expired signatures', () => {
        const { manifest, trustedKeys } = signedManifest();
        expect(verifyPluginManifest(manifest, trustedKeys, NOW)).toMatchObject({ plugin_id: 'plugin:test:web' });
        expect(() => authorizePlugin(manifest as unknown as VerifiedPluginManifest, scope(), NOW))
            .toThrowError(/verified/i);
        expect(() => verifyPluginManifest({ ...manifest, version: '1.0.1' }, trustedKeys, NOW))
            .toThrowError(PluginBoundaryError);
        const expired = signedManifest({ expires_at: '2026-08-02T05:59:59.000Z' });
        expect(() => verifyPluginManifest(expired.manifest, expired.trustedKeys, NOW)).toThrowError(/expired/i);
    });

    it('fails closed on grant broadening and cross-organization or external-identity mismatch', () => {
        const { manifest, trustedKeys } = signedManifest();
        const verified = verifyPluginManifest(manifest, trustedKeys, NOW);
        expect(authorizePlugin(verified, scope(), NOW)).toMatchObject({ retention_days: 30 });

        const broad = signedManifest({
            grants: {
                ...(manifest as PluginManifest).grants,
                data_classes: ['personal', 'legal_advisory'], retention_days: 31,
            },
        });
        const broadVerified = verifyPluginManifest(broad.manifest, broad.trustedKeys, NOW);
        expect(() => authorizePlugin(broadVerified, scope(), NOW)).toThrowError(/policy/i);

        const verifiedBinding = bindExternalIdentity(verified, scope(), binding(), {
            channel: 'web', external_subject_hash: 'c'.repeat(64),
        }, NOW);
        expect(verifiedBinding.principal_id).toBe('principal:resident:1');
        expect(() => bindExternalIdentity(verified, scope(), binding(), {
            channel: 'web', external_subject_hash: 'd'.repeat(64),
        }, NOW)).toThrowError(/identity/i);
        expect(() => bindExternalIdentity(verified, scope({
            organization_id: 2,
            principal: { ...scope().principal, organization_id: 2 },
        }), binding(), {
            channel: 'web', external_subject_hash: 'c'.repeat(64),
        }, NOW)).toThrowError(/identity/i);
    });

    it('requires every privileged command action instead of accepting a partial grant', () => {
        const limited = signedManifest({
            grants: {
                capabilities: [], data_classes: ['personal'], scope_kinds: ['case'],
                actions: ['read', 'verify'], purposes: ['maintenance-case'], retention_days: 30,
            },
        });
        const verified = verifyPluginManifest(limited.manifest, limited.trustedKeys, NOW);
        const command = CaseCommandEnvelopeSchema.parse({
            schema: 'case-command/v1', command_id: 'command:resolve:1', organization_id: 1,
            case_id: 42, expected_version: 7, idempotency_key: 'resolve-1',
            correlation_id: 'corr:resolve', requested_at: NOW,
            body: { type: 'resolve_case', payload: { reason_code: 'repair-complete', evidence_artifact_ids: [] } },
        });
        expect(() => normalizeIngress({
            manifest: verified, scope: scope(), binding: binding(),
            external_identity: { channel: 'web', external_subject_hash: 'c'.repeat(64) }, now: NOW,
            envelope: {
                schema: 'plugin-ingress/v1', ingress_id: 'ingress:resolve:1',
                plugin_id: verified.plugin_id, binding_id: 'binding:web:1',
                organization_id: 1, scope_id: 'case:42', idempotency_key: 'resolve-1',
                command, received_at: NOW,
            },
        })).toThrowError(/grant|policy/i);
    });

    it('normalizes scoped ingress and delivery while duplicate claims converge', () => {
        const { manifest, trustedKeys } = signedManifest();
        const verified = verifyPluginManifest(manifest, trustedKeys, NOW);
        const effectiveScope = scope();
        const identity = { channel: 'web' as const, external_subject_hash: 'c'.repeat(64) };
        const command = createDiagnoseAndPlanCommand({
            scope: effectiveScope, case_version: 7, confirmed_artifact_ids: ['artifact:text:1'],
            locale: 'bilingual', idempotency_key: 'ingress-1', correlation_id: 'corr:ingress', requested_at: NOW,
        });
        const normalized = normalizeIngress({
            manifest: verified, scope: effectiveScope, binding: binding(), external_identity: identity, now: NOW,
            envelope: {
                schema: 'plugin-ingress/v1', ingress_id: 'ingress:web:1', plugin_id: verified.plugin_id,
                binding_id: 'binding:web:1', organization_id: 1, scope_id: 'case:42',
                idempotency_key: 'ingress-1', command, received_at: NOW,
            },
        });

        const claims = new Map<string, string>();
        const claim: AtomicIdempotencyClaim = (address, fingerprint) => {
            const current = claims.get(address);
            if (current === undefined) { claims.set(address, fingerprint); return 'accepted'; }
            return current === fingerprint ? 'duplicate' : 'conflict';
        };
        expect(acceptIdempotent(normalized, claim).status).toBe('accepted');
        expect(acceptIdempotent(normalized, claim).status).toBe('duplicate');
        expect(() => acceptIdempotent({ ...normalized, fingerprint: 'f'.repeat(64) }, claim))
            .toThrowError(/idempotency/i);

        const delivery = normalizeDelivery({
            manifest: verified, scope: effectiveScope, binding: binding(), external_identity: identity, now: NOW,
            envelope: {
                schema: 'plugin-delivery/v1', plugin_id: verified.plugin_id,
                binding_id: 'binding:web:1', idempotency_key: 'delivery:1',
                delivery: {
                    schema: 'delivery/v1', delivery_id: 'delivery:1', organization_id: 1,
                    case_id: 42, case_version: 7, destination_binding_id: 'binding:web:1',
                    channel: 'web', payload_artifact_id: 'artifact:diagnosis:1',
                    required_approval_id: null, correlation_id: 'corr:delivery',
                    expires_at: '2026-08-02T06:30:00.000Z',
                },
            },
        });
        expect(delivery.idempotency_address).toContain('delivery:1');
    });

    it('verifies every checked-in synthetic plugin and keeps surface source authority-free', () => {
        const trust = JSON.parse(fs.readFileSync(path.resolve('plugins/trust.json'), 'utf8')) as Record<string, string>;
        for (const plugin of ['web', 'wechat', 'notifications']) {
            const manifest = JSON.parse(fs.readFileSync(path.resolve(`plugins/${plugin}/manifest.json`), 'utf8'));
            expect(verifyPluginManifest(manifest, new Map(Object.entries(trust)), NOW)).toMatchObject({ schema: 'surface-plugin-manifest/v1' });
        }
        const source = [
            'apps/web/src/index.ts', 'apps/miniprogram/src/index.ts',
        ].map((file) => fs.readFileSync(path.resolve(file), 'utf8')).join('\n');
        expect(source).not.toMatch(/setInterval|setTimeout|fetch\s*\(|domain\/|repository|agent-core|provider_name|model_name/i);
    });
});
