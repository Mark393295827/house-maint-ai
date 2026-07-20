#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_PATH = fileURLToPath(import.meta.url);
const PROJECT_ROOT = path.resolve(path.dirname(SCRIPT_PATH), '..');
const DEFAULT_CONTRACT_PATH = path.join(PROJECT_ROOT, 'docs', 'agent-audit', 'loop-contract.md');
const DEFAULT_STATE_PATH = path.join(PROJECT_ROOT, 'output', 'agent-audit', 'state.json');
const DEFAULT_ARTIFACTS_PATH = path.join(PROJECT_ROOT, 'output', 'agent-audit', 'runs');

const REQUIRED_FIELDS = [
  'objective',
  'mode',
  'trigger',
  'scope',
  'non-goals',
  'owner',
  'inputs',
  'artifacts path',
  'state path',
  'work clock',
  'success metric',
  'evidence',
  'verifier',
  'topology',
  'max iterations',
  'time limit',
  'budget',
  'review budget',
  'stop condition',
  'write-back',
  'permission boundary',
  'recovery',
];

const PROFILES = {
  quick: [
    'generated-artifacts',
    'frontend-build',
    'backend-build',
    'unit-tests',
  ],
  full: [
    'generated-artifacts',
    'frontend-build',
    'backend-build',
    'unit-tests',
    'lint',
    'e2e',
  ],
};

function normalize(value) {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function parseContract(source) {
  const fields = {};
  const fieldPattern = /^\s*(?:[-*+]\s+)?(?:\*\*)?([^:*]+?)(?:\*\*)?\s*:\s*(.+?)\s*$/;

  for (const line of source.split(/\r?\n/)) {
    const match = line.match(fieldPattern);
    if (!match) continue;
    const key = normalize(match[1]);
    fields[key] = fields[key] ? `${fields[key]}; ${match[2].trim()}` : match[2].trim();
  }

  return fields;
}

export function validateContract(source) {
  const fields = parseContract(source);
  const errors = REQUIRED_FIELDS
    .filter((field) => !fields[field] || /^(?:-|n\/a|none|tbd|todo|unknown)$/i.test(fields[field]))
    .map((field) => `missing or empty field: ${field}`);

  if (fields.mode && !['goal', 'loop', 'automation', 'autoresearch'].includes(normalize(fields.mode))) {
    errors.push('mode must be Goal, Loop, Automation, or AutoResearch');
  }
  if (fields.topology && !['single-agent', 'maker-checker', 'manager-workers'].includes(normalize(fields.topology))) {
    errors.push('topology must be single-agent, maker-checker, or manager-workers');
  }
  for (const field of ['max iterations', 'time limit', 'budget', 'review budget']) {
    if (fields[field] && !/\d/.test(fields[field])) {
      errors.push(`${field} must contain a finite numeric cap`);
    }
  }

  return { valid: errors.length === 0, errors, fields };
}

export function resolveProfile(profile, only = []) {
  if (!Object.hasOwn(PROFILES, profile)) {
    throw new Error(`Unknown profile: ${profile}`);
  }
  const gates = PROFILES[profile];
  if (only.length === 0) return [...gates];

  const unknown = only.filter((gate) => !gates.includes(gate));
  if (unknown.length > 0) {
    throw new Error(`Gates are not available in the ${profile} profile: ${unknown.join(', ')}`);
  }
  return gates.filter((gate) => only.includes(gate));
}

export function fingerprintFailures(results) {
  const failures = results
    .filter((result) => !result.passed)
    .map((result) => `${result.name}:${result.exitCode ?? 'spawn-error'}`)
    .sort();
  return createHash('sha256').update(failures.join('|')).digest('hex').slice(0, 16);
}

export function classifyPreviousState(previous, reset) {
  if (!previous || reset || previous.status === 'complete') {
    return 'new';
  }
  if (previous.status === 'verify_failed') {
    return 'resume';
  }
  return 'stopped';
}

function parseOptions(argv) {
  const options = {
    profile: 'quick',
    only: [],
    maxIterations: 3,
    repeatLimit: 2,
    contractPath: DEFAULT_CONTRACT_PATH,
    statePath: DEFAULT_STATE_PATH,
    artifactsPath: DEFAULT_ARTIFACTS_PATH,
    dryRun: false,
    json: false,
    reset: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    const [flag, inlineValue] = argument.split('=', 2);
    const consumeValue = () => inlineValue ?? argv[++index];

    if (flag === '--profile') options.profile = consumeValue();
    else if (flag === '--only') options.only = consumeValue().split(',').filter(Boolean);
    else if (flag === '--max-iterations') options.maxIterations = Number(consumeValue());
    else if (flag === '--repeat-limit') options.repeatLimit = Number(consumeValue());
    else if (flag === '--contract') options.contractPath = path.resolve(consumeValue());
    else if (flag === '--state') options.statePath = path.resolve(consumeValue());
    else if (flag === '--artifacts') options.artifactsPath = path.resolve(consumeValue());
    else if (flag === '--dry-run') options.dryRun = true;
    else if (flag === '--json') options.json = true;
    else if (flag === '--reset') options.reset = true;
    else throw new Error(`Unknown argument: ${argument}`);
  }

  for (const [name, value] of [
    ['max iterations', options.maxIterations],
    ['repeat limit', options.repeatLimit],
  ]) {
    if (!Number.isInteger(value) || value < 1) {
      throw new Error(`${name} must be a positive integer`);
    }
  }

  return options;
}

function gateDefinitions() {
  const npmGate = (args, cwd) => process.platform === 'win32'
    ? {
        command: process.env.ComSpec || 'cmd.exe',
        args: ['/d', '/s', '/c', ['npm', ...args].join(' ')],
        cwd,
      }
    : { command: 'npm', args, cwd };

  return {
    'generated-artifacts': npmGate(['run', 'check:artifacts'], PROJECT_ROOT),
    'frontend-build': npmGate(['run', 'build'], PROJECT_ROOT),
    'backend-build': npmGate(['run', 'build'], path.join(PROJECT_ROOT, 'server')),
    'unit-tests': npmGate(['test'], PROJECT_ROOT),
    lint: npmGate(['run', 'lint'], PROJECT_ROOT),
    e2e: npmGate(['run', 'test:e2e'], PROJECT_ROOT),
  };
}

function safeRunId(timestamp) {
  return timestamp.replace(/[:.]/g, '-');
}

function readJson(filePath) {
  if (!existsSync(filePath)) return null;
  try {
    return JSON.parse(readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

function writeJsonAtomic(filePath, value) {
  mkdirSync(path.dirname(filePath), { recursive: true });
  const temporaryPath = `${filePath}.${process.pid}.tmp`;
  writeFileSync(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  renameSync(temporaryPath, filePath);
}

function runGate(name, definition, receiptDirectory) {
  const startedAt = new Date().toISOString();
  const started = Date.now();
  const execution = spawnSync(definition.command, definition.args, {
    cwd: definition.cwd,
    encoding: 'utf8',
    env: { ...process.env, CI: process.env.CI || '1' },
    maxBuffer: 20 * 1024 * 1024,
    shell: false,
  });
  const exitCode = execution.status;
  const result = {
    name,
    command: [definition.command, ...definition.args].join(' '),
    cwd: path.relative(PROJECT_ROOT, definition.cwd) || '.',
    passed: exitCode === 0 && !execution.error,
    exitCode,
    startedAt,
    durationMs: Date.now() - started,
    error: execution.error?.message ?? null,
  };

  writeFileSync(path.join(receiptDirectory, `${name}.stdout.log`), execution.stdout || '', 'utf8');
  writeFileSync(path.join(receiptDirectory, `${name}.stderr.log`), execution.stderr || '', 'utf8');
  return result;
}

function printResult(value, json) {
  if (json) {
    process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
    return;
  }

  process.stdout.write(`Audit loop: ${value.status}\n`);
  if (value.runId) process.stdout.write(`Run: ${value.runId}, iteration ${value.attempt}\n`);
  for (const gate of value.gates || []) {
    process.stdout.write(`- ${gate.passed ? 'PASS' : 'FAIL'} ${gate.name}${gate.durationMs ? ` (${gate.durationMs}ms)` : ''}\n`);
  }
  if (value.nextAction) process.stdout.write(`Next action: ${value.nextAction}\n`);
}

export function main(argv = process.argv.slice(2)) {
  let options;
  try {
    options = parseOptions(argv);
  } catch (error) {
    printResult({ status: 'needs_input', nextAction: error.message, gates: [] }, argv.includes('--json'));
    return 2;
  }

  if (!existsSync(options.contractPath)) {
    printResult({ status: 'needs_input', nextAction: `Contract not found: ${options.contractPath}`, gates: [] }, options.json);
    return 2;
  }

  const contract = validateContract(readFileSync(options.contractPath, 'utf8'));
  if (!contract.valid) {
    printResult({ status: 'needs_input', errors: contract.errors, nextAction: 'Repair the loop contract before execution.', gates: [] }, options.json);
    return 2;
  }

  let selectedGates;
  try {
    selectedGates = resolveProfile(options.profile, options.only);
  } catch (error) {
    printResult({ status: 'needs_input', nextAction: error.message, gates: [] }, options.json);
    return 2;
  }

  if (options.dryRun) {
    printResult({
      status: 'ready',
      profile: options.profile,
      contract: path.relative(PROJECT_ROOT, options.contractPath),
      gates: selectedGates.map((name) => ({ name, passed: true })),
      nextAction: 'Run without --dry-run to create an evidence-bearing iteration.',
    }, options.json);
    return 0;
  }

  const previous = readJson(options.statePath);
  const previousState = classifyPreviousState(previous, options.reset);
  if (previousState === 'stopped') {
    printResult({
      status: previous.status,
      runId: previous.run_id,
      attempt: previous.attempt,
      gates: [],
      nextAction: `${previous.next_action || 'The previous run is terminal.'} Use --reset only after changing the diagnosis, scope, or strategy.`,
    }, options.json);
    return 2;
  }
  const resumable = previousState === 'resume';
  const now = new Date().toISOString();
  const runId = resumable ? previous.run_id : safeRunId(now);
  const attempt = resumable ? previous.attempt + 1 : 1;

  if (attempt > options.maxIterations) {
    const stopped = {
      ...previous,
      status: 'budget_stop',
      last_error: `Maximum iteration count (${options.maxIterations}) reached`,
      next_action: 'Review receipts and start a new run with --reset only after changing the diagnosis or scope.',
      updated_at: now,
    };
    writeJsonAtomic(options.statePath, stopped);
    printResult({ status: stopped.status, runId, attempt: previous.attempt, gates: [], nextAction: stopped.next_action }, options.json);
    return 2;
  }

  const receiptDirectory = path.join(options.artifactsPath, runId, `iteration-${attempt}`);
  mkdirSync(receiptDirectory, { recursive: true });
  const definitions = gateDefinitions();
  const gateResults = [];

  for (const name of selectedGates) {
    const result = runGate(name, definitions[name], receiptDirectory);
    gateResults.push(result);
    if (!result.passed) break;
  }

  const failed = gateResults.filter((result) => !result.passed);
  const signature = failed.length > 0 ? fingerprintFailures(gateResults) : null;
  const priorHistory = resumable ? previous.failure_history || [] : [];
  const failureHistory = signature ? [...priorHistory, signature] : [];
  const repeatedCount = signature
    ? failureHistory.slice().reverse().findIndex((value) => value !== signature)
    : -1;
  const sameSignatureCount = signature
    ? repeatedCount === -1 ? failureHistory.length : repeatedCount
    : 0;

  let status = failed.length === 0 ? 'complete' : 'verify_failed';
  if (failed.length > 0 && sameSignatureCount >= options.repeatLimit) status = 'no_progress';
  else if (failed.length > 0 && attempt >= options.maxIterations) status = 'budget_stop';

  const firstFailure = failed[0];
  const nextAction = status === 'complete'
    ? 'Close the run or promote newly proven checks after human review.'
    : status === 'no_progress'
      ? 'Stop retrying this signature; change the diagnosis, owner, scope, or repair strategy before --reset.'
      : status === 'budget_stop'
        ? 'Review receipts and start a new run only after changing the diagnosis or scope.'
        : `Inspect ${firstFailure.name} receipts, repair the smallest evidenced defect, then rerun the loop.`;

  const summary = {
    contractVersion: 1,
    runId,
    attempt,
    status,
    profile: options.profile,
    startedAt: gateResults[0]?.startedAt ?? now,
    completedAt: new Date().toISOString(),
    gates: gateResults,
    failureSignature: signature,
    nextAction,
  };
  const summaryPath = path.join(receiptDirectory, 'summary.json');
  writeJsonAtomic(summaryPath, summary);

  const state = {
    contract_version: 1,
    run_id: runId,
    status,
    attempt,
    budget: {
      max_iterations: options.maxIterations,
      repeat_limit: options.repeatLimit,
      profile: options.profile,
    },
    evidence: [...(resumable ? previous.evidence || [] : []), path.relative(PROJECT_ROOT, summaryPath)],
    unknowns: [],
    last_error: firstFailure ? `${firstFailure.name} exited with ${firstFailure.exitCode ?? 'a spawn error'}` : null,
    next_action: nextAction,
    failure_history: failureHistory,
    permission_boundary: 'local repository and local test data only',
    recovery_point: 'preserve pre-existing worktree changes; reject failed integration with a scoped inverse patch',
    updated_at: summary.completedAt,
  };
  writeJsonAtomic(options.statePath, state);
  printResult(summary, options.json);
  return status === 'complete' ? 0 : 1;
}

if (path.resolve(process.argv[1] || '') === path.resolve(SCRIPT_PATH)) {
  process.exitCode = main();
}
