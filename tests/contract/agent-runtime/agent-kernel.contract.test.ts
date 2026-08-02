import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { AgentKernel, InMemoryAgentStore, RuntimeFault } from '../../../packages/agent-core/src/index.js';
import { ManualClock, runtimeBudget, runtimeScope, runtimeTask } from '../../../packages/testkit/src/agent-runtime/index.js';

function configuredKernel() {
    const clock = new ManualClock();
    const store = new InMemoryAgentStore(clock);
    const kernel = new AgentKernel(store, clock);
    const scope = runtimeScope();
    kernel.openSession({ session_id: 'session:101', scope, idempotency_key: 'session:101' });
    kernel.createRun({
        run_id: 'run:101', session_id: 'session:101', command_id: 'command:diagnose:101',
        case_id: 101, case_version: 3, budget: runtimeBudget(), policy_version: 'policy:v1',
        idempotency_key: 'run:101:v3',
    });
    return { clock, store, kernel, scope };
}

describe('agent kernel contract boundary', () => {
    it('binds tasks to the server-resolved session scope, policy, and exact case version', () => {
        const { kernel } = configuredKernel();
        for (const task of [
            runtimeTask({ organization_id: 8 }),
            runtimeTask({ case_ref: { id: 101, version: 4 } }),
            runtimeTask({ policy_version: 'policy:v2' }),
            runtimeTask({ capability: 'planning.structured.v1' }),
        ]) {
            expect(() => kernel.enqueueTask(task)).toThrowError(expect.objectContaining({ code: 'scope_mismatch' }));
        }
    });

    it('rejects expired scopes and stale scheduling windows before mutation', () => {
        const clock = new ManualClock();
        const kernel = new AgentKernel(new InMemoryAgentStore(clock), clock);
        expect(() => kernel.openSession({
            session_id: 'session:expired', scope: runtimeScope({ expires_at: '2026-08-02T05:59:59.000Z' }),
            idempotency_key: 'expired',
        })).toThrowError(expect.objectContaining({ code: 'scope_mismatch' }));

        const active = configuredKernel();
        expect(() => active.kernel.enqueueTask(runtimeTask({ expires_at: '2026-08-02T05:59:59.000Z' })))
            .toThrowError(expect.objectContaining({ code: 'invalid_state' }));
    });

    it('makes session, run, and task idempotency convergent and conflict detecting', () => {
        const { kernel, scope } = configuredKernel();
        const duplicateSession = kernel.openSession({ session_id: 'session:101', scope, idempotency_key: 'session:101' });
        expect(duplicateSession.session_id).toBe('session:101');
        expect(() => kernel.openSession({ session_id: 'session:different', scope, idempotency_key: 'session:101' }))
            .toThrowError(expect.objectContaining({ code: 'idempotency_conflict' }));

        const first = kernel.enqueueTask(runtimeTask());
        expect(kernel.enqueueTask(runtimeTask())).toEqual(first);
        expect(() => kernel.enqueueTask(runtimeTask({ task_id: 'task:other:101' })))
            .toThrowError(expect.objectContaining({ code: 'idempotency_conflict' }));
    });

    it('contains no provider, server, domain repository, payment, dispatch, or messaging imports', () => {
        const sourceRoot = join(process.cwd(), 'packages', 'agent-core', 'src');
        const imports = readdirSync(sourceRoot).filter((name) => name.endsWith('.ts'))
            .flatMap((name) => readFileSync(join(sourceRoot, name), 'utf8').match(/^import[^;]+;/gm) ?? [])
            .join('\n');
        expect(imports).not.toMatch(/openai|gemini|deepseek|anthropic|stripe|server[\\/]|domain[\\/].*repository|dispatch|messag/i);
        expect(imports).toMatch(/contracts[\\/]src/);
    });

    it('exposes typed runtime faults rather than leaking mutable store internals', () => {
        const { store } = configuredKernel();
        const run = store.getRun('run:101')!;
        run.status = 'failed';
        expect(store.getRun('run:101')?.status).toBe('pending');
        expect(new RuntimeFault('invalid_state', 'fixture')).toMatchObject({ code: 'invalid_state', retryable: false });
    });
});
