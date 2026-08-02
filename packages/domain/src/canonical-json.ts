import { createHash } from 'node:crypto';
import { CaseDomainError } from './errors.js';

type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

function normalize(value: unknown, path: string): JsonValue {
    if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
    if (typeof value === 'number') {
        if (!Number.isFinite(value)) {
            throw new CaseDomainError('invalid_input', `Non-finite number at ${path}`);
        }
        return value;
    }
    if (Array.isArray(value)) {
        return value.map((entry, index) => normalize(entry, `${path}[${index}]`));
    }
    if (typeof value === 'object') {
        const result: Record<string, JsonValue> = {};
        for (const key of Object.keys(value as Record<string, unknown>).sort()) {
            const entry = (value as Record<string, unknown>)[key];
            if (entry === undefined || typeof entry === 'function' || typeof entry === 'symbol') {
                throw new CaseDomainError('invalid_input', `Unsupported value at ${path}.${key}`);
            }
            result[key] = normalize(entry, `${path}.${key}`);
        }
        return result;
    }
    throw new CaseDomainError('invalid_input', `Unsupported value at ${path}`);
}

export function canonicalJson(value: unknown): string {
    return JSON.stringify(normalize(value, '$'));
}

export function sha256(value: string): string {
    return createHash('sha256').update(value, 'utf8').digest('hex');
}

export function commandFingerprint(value: unknown): string {
    return sha256(canonicalJson(value));
}
