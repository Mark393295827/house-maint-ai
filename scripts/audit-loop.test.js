import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  classifyPreviousState,
  fingerprintFailures,
  parseContract,
  resolveProfile,
  validateContract,
} from './audit-loop.mjs';

const contractPath = path.resolve('docs/agent-audit/loop-contract.md');

describe('audit loop contract', () => {
  it('accepts the repository contract with all bounded control fields', () => {
    const source = readFileSync(contractPath, 'utf8');
    const result = validateContract(source);

    expect(result.valid).toBe(true);
    expect(parseContract(source).topology).toBe('manager-workers');
  });

  it('rejects a contract without an independent verifier', () => {
    const source = readFileSync(contractPath, 'utf8').replace(/^- Verifier:.*$/m, '');
    const result = validateContract(source);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('missing or empty field: verifier');
  });
});

describe('audit loop execution planning', () => {
  it('keeps the quick profile bounded and the full profile exhaustive', () => {
    expect(resolveProfile('quick')).toEqual([
      'generated-artifacts',
      'frontend-build',
      'backend-build',
      'unit-tests',
    ]);
    expect(resolveProfile('full')).toContain('e2e');
  });

  it('fingerprints a repeated failure independent of result order', () => {
    const first = fingerprintFailures([
      { name: 'unit-tests', passed: false, exitCode: 1 },
      { name: 'frontend-build', passed: false, exitCode: 2 },
    ]);
    const second = fingerprintFailures([
      { name: 'frontend-build', passed: false, exitCode: 2 },
      { name: 'unit-tests', passed: false, exitCode: 1 },
    ]);

    expect(first).toBe(second);
  });

  it('requires an explicit reset after a terminal stop state', () => {
    expect(classifyPreviousState({ status: 'verify_failed' }, false)).toBe('resume');
    expect(classifyPreviousState({ status: 'no_progress' }, false)).toBe('stopped');
    expect(classifyPreviousState({ status: 'budget_stop' }, false)).toBe('stopped');
    expect(classifyPreviousState({ status: 'no_progress' }, true)).toBe('new');
  });
});
