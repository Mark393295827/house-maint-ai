import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { approvalRequestHash } from '@house-maint/policy';
import type { OutboxEntry } from '../../../packages/persistence/src/outbox/index.js';
import { EffectGate, ScopedRealtimePublisher, type DecisionSnapshotPort } from '../../../apps/worker/src/index.js';

const now = '2026-08-09T06:00:00.000Z';
const later = '2026-08-09T07:00:00.000Z';
const clock = { now: () => new Date(now) };
const digest = (value: string): string => createHash('sha256').update(value).digest('hex');

function entry(): OutboxEntry {
    return {
        effect_key: 'message:123:7', effect_kind: 'message', run_id: 'run:1',
        scope_id: 'case:123', policy_version: 'policy-1', action: 'external_message',
        proposal_hash: digest('proposal'), max_attempts: 3, state: 'ready', attempts: 0,
        next_attempt_at: now, lease_owner: null, lease_token: null, lease_expires_at: null,
        terminal_reason: null, created_at: now, updated_at: now,
        envelope: {
            schema: 'delivery/v1', delivery_id: 'delivery:1', organization_id: 7,
            case_id: 123, case_version: 7, destination_binding_id: 'binding:1',
            channel: 'web', payload_artifact_id: 'artifact:proposal', required_approval_id: 'approval:1',
            correlation_id: 'corr:1', expires_at: later,
        },
    };
}

function snapshot(overrides: Partial<Awaited<ReturnType<DecisionSnapshotPort['load']>>> = {}) {
    return {
        organization_id: 7, scope_id: 'case:123', case_id: 123, case_version: 7,
        policy_version: 'policy-1', decision_valid: true, delivery_kill_switch: false,
        destination: {
            binding_id: 'binding:1', organization_id: 7, scope_id: 'case:123', case_id: 123, active: true,
        },
        ...overrides,
    };
}

describe('coordination effect and scope guards', () => {
    it('denies stale case and policy decisions before a delivery adapter can run', async () => {
        const staleCase = new EffectGate({ load: async () => snapshot({ case_version: 8 }) }, clock);
        const stalePolicy = new EffectGate({ load: async () => snapshot({ policy_version: 'policy-2' }) }, clock);
        expect(await staleCase.revalidate(entry())).toEqual({ allowed: false, code: 'stale_case_version' });
        expect(await stalePolicy.revalidate(entry())).toEqual({ allowed: false, code: 'stale_policy' });
    });

    it('revalidates a revocation that arrived after approval', async () => {
        const request = {
            schema: 'approval-request/v1' as const, approval_id: 'approval:1', organization_id: 7,
            case_id: 123, case_version: 7, action: 'external_message' as const,
            proposal_artifact_id: 'artifact:proposal', proposal_hash: digest('proposal'),
            requested_by_run_id: 'run:1', expires_at: later,
        };
        const requestHash = approvalRequestHash(request);
        const gate = new EffectGate({
            load: async () => snapshot({
                approval: {
                    request,
                    receipt: {
                        schema: 'approval-receipt/v1', approval_id: 'approval:1', request_hash: requestHash,
                        decision: 'approved', decided_by_principal_id: 'member:9', reason_code: 'reviewed',
                        decided_at: '2026-08-09T05:59:00.000Z',
                    },
                    revocations: [{ approvalId: 'approval:1', requestHash, revokedAt: '2026-08-09T05:59:30.000Z' }],
                    max_decision_age_ms: 300_000,
                },
            }),
        }, clock);
        expect(await gate.revalidate(entry())).toEqual({ allowed: false, code: 'approval_revoked' });
    });

    it('publishes realtime progress only to the exact organization/case scope', async () => {
        const published: unknown[] = [];
        const publisher = new ScopedRealtimePublisher({
            publish: async (target, progress) => { published.push({ target, progress }); },
        });
        const progress = {
            schema: 'case-progress/v1' as const, organization_id: 7, case_id: 123, case_version: 7,
            stage: 'diagnosis' as const,
            run: { run_id: 'run:1', status: 'working' as const, progress_percent: 50 },
            next_action: {
                kind: 'wait' as const, display: { zh_cn: '正在处理', en_us: 'Working' }, artifact_id: null,
            },
            updated_at: now,
        };
        await expect(publisher.publish({
            organization_id: 8, scope_id: 'case:123', case_id: 123, principal_ids: ['member:9'],
        }, progress)).rejects.toThrow('scope mismatch');
        expect(published).toHaveLength(0);
        await publisher.publish({
            organization_id: 7, scope_id: 'case:123', case_id: 123, principal_ids: ['member:9'],
        }, progress);
        expect(published).toHaveLength(1);
    });

    it('keeps claims atomic, receipts immutable, and capability ports effect-free by structure', () => {
        const runsSql = fs.readFileSync(path.resolve(process.cwd(), 'packages/persistence/src/runs/postgres-run-store.ts'), 'utf8');
        const reducerCompat = fs.readFileSync(path.resolve(process.cwd(), 'packages/persistence/src/runs/000_case_event_reducer_v2_compat.postgres.sql'), 'utf8');
        const outboxSql = fs.readFileSync(path.resolve(process.cwd(), 'packages/persistence/src/outbox/postgres-outbox-store.ts'), 'utf8');
        const schema = fs.readFileSync(path.resolve(process.cwd(), 'packages/persistence/src/outbox/001_transactional_outbox.postgres.sql'), 'utf8');
        const ports = fs.readFileSync(path.resolve(process.cwd(), 'apps/worker/src/ports.ts'), 'utf8');
        expect(runsSql).toContain('FOR UPDATE OF t SKIP LOCKED');
        expect(reducerCompat).toContain("conrelid = 'case_events'::regclass");
        expect(reducerCompat).toContain("~ 'reducer_version[^)]*= 1'");
        expect(reducerCompat).toContain("data_type = 'timestamp without time zone'");
        expect(reducerCompat).toContain("TYPE timestamptz");
        expect(reducerCompat).not.toMatch(/DROP\s+TRIGGER/i);
        expect(outboxSql).toContain('FOR UPDATE SKIP LOCKED');
        expect(schema).toContain('effect_key TEXT NOT NULL UNIQUE');
        expect(schema).toContain('PRIMARY KEY (delivery_id, attempt)');
        const capability = ports.slice(ports.indexOf('export interface ArtifactCapabilityPort'), ports.indexOf('export interface AuthoritativeDecisionSnapshot'));
        expect(capability).not.toMatch(/outbox|deliver|notification|assignment|repository/i);
        expect(capability).toContain('task: AgentTaskEnvelope');
        expect(capability).toContain('signal: AbortSignal');
    });
});
