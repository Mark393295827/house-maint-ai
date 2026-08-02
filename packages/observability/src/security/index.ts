import { createHash } from 'node:crypto';

export const REDACTED = '[REDACTED]';
const GENESIS_HASH = '0'.repeat(64);
const SENSITIVE_KEY = /(?:authorization|cookie|credential|secret|password|passphrase|api[-_]?key|access[-_]?token|refresh[-_]?token|private[-_]?key|raw[-_]?(?:content|prompt|media)|body|url|uri|email|phone)/i;
const TOKEN_VALUE = /(?:Bearer\s+[A-Za-z0-9._~+/-]+=*|sk-[A-Za-z0-9_-]{12,})/gi;
const EMAIL_VALUE = /\b[^\s@]+@[^\s@]+\.[^\s@]+\b/g;
const PHONE_VALUE = /(?<!\d)(?:\+?\d[\d ()-]{7,}\d)(?!\d)/g;

const stableJson = (value: unknown): string => {
    if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
    if (value && typeof value === 'object') {
        return `{${Object.entries(value as Record<string, unknown>)
            .sort(([left], [right]) => left.localeCompare(right))
            .map(([key, child]) => `${JSON.stringify(key)}:${stableJson(child)}`).join(',')}}`;
    }
    return JSON.stringify(value);
};

const sha256 = (value: unknown): string =>
    createHash('sha256').update(stableJson(value)).digest('hex');

const normalizeSecrets = (values: Iterable<string>): string[] => [...new Set([...values]
    .filter((value) => typeof value === 'string' && value.length >= 4))]
    .sort((left, right) => right.length - left.length);

function redactString(value: string, secrets: readonly string[]): string {
    let output = value;
    for (const secret of secrets) output = output.split(secret).join(REDACTED);
    output = output.replace(TOKEN_VALUE, REDACTED)
        .replace(EMAIL_VALUE, REDACTED)
        .replace(PHONE_VALUE, REDACTED);
    return output.length > 256 ? `${output.slice(0, 253)}...` : output;
}

/** Recursively removes secret/contact/private-content fields before persistence. */
export function redactSecurityValue(
    value: unknown,
    knownSecretValues: Iterable<string> = [],
    depth = 0,
): unknown {
    const secrets = normalizeSecrets(knownSecretValues);
    if (depth > 8) return '[TRUNCATED]';
    if (typeof value === 'string') return redactString(value, secrets);
    if (typeof value === 'number' || typeof value === 'boolean' || value === null) return value;
    if (Array.isArray(value)) {
        return value.slice(0, 64).map((item) => redactSecurityValue(item, secrets, depth + 1));
    }
    if (!value || typeof value !== 'object') return String(value);
    return Object.fromEntries(Object.entries(value as Record<string, unknown>)
        .slice(0, 64)
        .map(([key, child]) => [
            key.slice(0, 80),
            SENSITIVE_KEY.test(key) ? REDACTED : redactSecurityValue(child, secrets, depth + 1),
        ]));
}

export function containsSecretValue(value: unknown, knownSecretValues: Iterable<string>): boolean {
    const serialized = stableJson(value);
    return normalizeSecrets(knownSecretValues).some((secret) => serialized.includes(secret));
}

export type SecurityAuditCategory =
    | 'scope_resolution'
    | 'policy_decision'
    | 'model_route'
    | 'tool_call'
    | 'artifact'
    | 'evaluator'
    | 'approval'
    | 'case_event'
    | 'delivery'
    | 'kill_switch';

export interface SecurityAuditInput {
    occurredAt: string;
    organizationId: number;
    principalId: string;
    scopeId: string;
    correlationId: string;
    category: SecurityAuditCategory;
    outcome: 'allowed' | 'denied' | 'recorded';
    reasonCode: string;
    details?: unknown;
}

export interface SecurityAuditRecord extends SecurityAuditInput {
    schema: 'security-audit/v1';
    sequence: number;
    previousHash: string;
    details: unknown;
    recordHash: string;
}

export interface AppendOnlySecurityAuditSink {
    append(record: Readonly<SecurityAuditRecord>): void;
}

function deepFreeze<T>(value: T): Readonly<T> {
    if (value && typeof value === 'object') {
        Object.freeze(value);
        for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child);
    }
    return value;
}

const recordBase = (record: SecurityAuditRecord): Omit<SecurityAuditRecord, 'recordHash'> => {
    return Object.fromEntries(Object.entries(record)
        .filter(([key]) => key !== 'recordHash')) as Omit<SecurityAuditRecord, 'recordHash'>;
};

/** Hash-chained writer with no update/delete surface. */
export class AppendOnlySecurityAuditLog {
    private sequence = 0;
    private previousHash = GENESIS_HASH;
    private readonly secrets: string[];

    constructor(
        private readonly sink: AppendOnlySecurityAuditSink,
        knownSecretValues: Iterable<string> = [],
    ) {
        this.secrets = normalizeSecrets(knownSecretValues);
    }

    append(input: SecurityAuditInput): Readonly<SecurityAuditRecord> {
        const occurredAt = Date.parse(input.occurredAt);
        if (!Number.isFinite(occurredAt) || !Number.isInteger(input.organizationId)
            || input.organizationId <= 0 || !input.principalId || !input.scopeId
            || !/^[A-Za-z0-9][A-Za-z0-9._:-]{0,63}$/.test(input.correlationId)) {
            throw new Error('invalid_security_audit_input');
        }
        const base = {
            schema: 'security-audit/v1' as const,
            sequence: this.sequence + 1,
            previousHash: this.previousHash,
            occurredAt: new Date(occurredAt).toISOString(),
            organizationId: input.organizationId,
            principalId: input.principalId.slice(0, 128),
            scopeId: input.scopeId.slice(0, 128),
            correlationId: input.correlationId,
            category: input.category,
            outcome: input.outcome,
            reasonCode: input.reasonCode.slice(0, 80),
            details: redactSecurityValue(input.details ?? {}, this.secrets),
        };
        if (containsSecretValue(base, this.secrets)) throw new Error('secret_redaction_failed');
        const record = deepFreeze({ ...base, recordHash: sha256(base) }) as Readonly<SecurityAuditRecord>;
        this.sink.append(record);
        this.sequence = record.sequence;
        this.previousHash = record.recordHash;
        return record;
    }
}

export class InMemorySecurityAuditSink implements AppendOnlySecurityAuditSink {
    #records: Readonly<SecurityAuditRecord>[] = [];

    append(record: Readonly<SecurityAuditRecord>): void {
        const expectedPrevious = this.#records.at(-1)?.recordHash ?? GENESIS_HASH;
        if (record.sequence !== this.#records.length + 1 || record.previousHash !== expectedPrevious) {
            throw new Error('audit_chain_conflict');
        }
        this.#records.push(record);
    }

    snapshot(): readonly Readonly<SecurityAuditRecord>[] {
        return Object.freeze([...this.#records]);
    }
}

export function verifySecurityAuditChain(records: readonly SecurityAuditRecord[]): boolean {
    let previousHash = GENESIS_HASH;
    for (let index = 0; index < records.length; index += 1) {
        const record = records[index];
        if (record.sequence !== index + 1 || record.previousHash !== previousHash
            || record.recordHash !== sha256(recordBase(record))) return false;
        previousHash = record.recordHash;
    }
    return true;
}
