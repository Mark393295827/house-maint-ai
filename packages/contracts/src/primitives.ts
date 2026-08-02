import { z } from 'zod';

export const ContractVersionSchema = z.string()
    .regex(/^[a-z][a-z0-9.-]*\/v[1-9][0-9]*$/, 'Expected a versioned contract identifier');

export const OpaqueIdSchema = z.string()
    .min(3)
    .max(128)
    .regex(/^[A-Za-z][A-Za-z0-9._:-]*$/);

export const PositiveIdSchema = z.number().int().positive();
export const NonNegativeVersionSchema = z.number().int().nonnegative();
export const InstantSchema = z.string().datetime({ offset: true });
export const Sha256Schema = z.string().regex(/^[a-f0-9]{64}$/);
export const IdempotencyKeySchema = z.string().trim().min(1).max(128);
export const CorrelationIdSchema = z.string().regex(/^[A-Za-z0-9][A-Za-z0-9._:-]{0,63}$/);
export const CapabilityIdSchema = z.string()
    .min(3)
    .max(128)
    .regex(/^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)+\.v[1-9][0-9]*$/);
export const PolicyVersionSchema = z.string().min(3).max(128);

export const DataClassSchema = z.enum([
    'public',
    'internal',
    'personal',
    'sensitive_media',
    'financial',
    'legal_advisory',
]);

const forbiddenArtifactKey = /^(?:provider|provider_name|model|model_name|credential|credentials|secret|api_?key|password|access_?token|refresh_?token|chain_?of_?thought|hidden_?reasoning|raw_?prompt)$/i;

function findForbiddenKey(value: unknown, path: string[] = []): string[] | null {
    if (Array.isArray(value)) {
        for (let index = 0; index < value.length; index += 1) {
            const found = findForbiddenKey(value[index], [...path, String(index)]);
            if (found) return found;
        }
        return null;
    }
    if (!value || typeof value !== 'object') return null;
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
        if (forbiddenArtifactKey.test(key)) return [...path, key];
        const found = findForbiddenKey(child, [...path, key]);
        if (found) return found;
    }
    return null;
}

export const SafeArtifactPayloadSchema = z.record(z.string(), z.unknown()).superRefine((value, context) => {
    const path = findForbiddenKey(value);
    if (path) {
        context.addIssue({
            code: 'custom',
            path,
            message: 'Artifact payload contains a forbidden authority, credential, route, or hidden-reasoning field',
        });
    }
});

export type DataClass = z.infer<typeof DataClassSchema>;
