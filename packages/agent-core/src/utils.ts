import { createHash } from 'node:crypto';

export function clone<T>(value: T): T {
    return structuredClone(value);
}

function canonicalize(value: unknown, ancestors: Set<object>): unknown {
    if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
    if (typeof value === 'number') {
        if (!Number.isFinite(value)) throw new TypeError('Only finite numbers can be hashed');
        return value;
    }
    if (Array.isArray(value)) {
        if (ancestors.has(value)) throw new TypeError('Cyclic values cannot be hashed');
        const next = new Set(ancestors).add(value);
        return value.map((item) => canonicalize(item, next));
    }
    if (typeof value === 'object') {
        if (ancestors.has(value)) throw new TypeError('Cyclic values cannot be hashed');
        const next = new Set(ancestors).add(value);
        return Object.fromEntries(Object.entries(value as Record<string, unknown>)
            .sort(([left], [right]) => left.localeCompare(right))
            .map(([key, child]) => {
                if (child === undefined || typeof child === 'function' || typeof child === 'symbol') {
                    throw new TypeError(`Unsupported value at ${key}`);
                }
                return [key, canonicalize(child, next)];
            }));
    }
    throw new TypeError(`Unsupported ${typeof value} value`);
}

export function canonicalJson(value: unknown): string {
    return JSON.stringify(canonicalize(value, new Set()));
}

export function sha256(value: unknown): string {
    return createHash('sha256').update(canonicalJson(value)).digest('hex');
}

