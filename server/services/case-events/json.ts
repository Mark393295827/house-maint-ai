import { createHash } from 'node:crypto';
import { CaseEventError } from './contracts.js';

type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

function normalize(value: unknown, path: string): JsonValue {
    if (value === null || typeof value === 'string' || typeof value === 'boolean') {
        return value;
    }

    if (typeof value === 'number') {
        if (!Number.isFinite(value)) {
            throw new CaseEventError('invalid_json', `Non-finite number at ${path}`);
        }
        return value;
    }

    if (Array.isArray(value)) {
        return value.map((entry, index) => normalize(entry, `${path}[${index}]`));
    }

    if (typeof value === 'object' && value !== null) {
        const result: Record<string, JsonValue> = {};
        for (const key of Object.keys(value).sort()) {
            const entry = (value as Record<string, unknown>)[key];
            if (entry === undefined || typeof entry === 'function' || typeof entry === 'symbol') {
                throw new CaseEventError('invalid_json', `Unsupported value at ${path}.${key}`);
            }
            result[key] = normalize(entry, `${path}.${key}`);
        }
        return result;
    }

    throw new CaseEventError('invalid_json', `Unsupported value at ${path}`);
}

export function canonicalizeJson(value: unknown, label = 'value'): string {
    const normalized = normalize(value, label);
    try {
        const serialized = JSON.stringify(normalized);
        if (typeof serialized !== 'string') {
            throw new Error('JSON.stringify returned no value');
        }
        return serialized;
    } catch (error) {
        if (error instanceof CaseEventError) throw error;
        throw new CaseEventError('invalid_json', `Could not encode ${label}`);
    }
}

export function parseCanonicalJson<T>(value: string, label: string): T {
    if (typeof value !== 'string' || value.length === 0) {
        throw new CaseEventError('invalid_json', `${label} must be a non-empty JSON string`);
    }

    let parsed: unknown;
    try {
        parsed = JSON.parse(value);
    } catch {
        throw new CaseEventError('invalid_json', `${label} is malformed JSON`);
    }

    const canonical = canonicalizeJson(parsed, label);
    if (canonical !== value) {
        throw new CaseEventError('invalid_json', `${label} is not canonical JSON`);
    }
    return parsed as T;
}

export function sha256(value: string): string {
    return createHash('sha256').update(value, 'utf8').digest('hex');
}

