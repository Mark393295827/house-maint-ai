import type { Request, Response, NextFunction } from 'express';
import { PIPL_ANONYMIZER_TOKEN, PIPL_ANONYMIZER_URL } from '../config/secrets.js';

interface ImageRef {
    image: string;
    mimeType?: string;
    set: (image: string, mimeType?: string) => void;
}

class PiplAnonymizerError extends Error {
    constructor(message: string, readonly statusCode: number) {
        super(message);
    }
}

function collectImageRefs(body: Record<string, unknown>): ImageRef[] {
    const refs: ImageRef[] = [];

    if (typeof body.image === 'string' && body.image.length > 0) {
        refs.push({
            image: body.image,
            mimeType: typeof body.mimeType === 'string' ? body.mimeType : undefined,
            set: (image, mimeType) => {
                body.image = image;
                if (mimeType) body.mimeType = mimeType;
            }
        });
    }

    for (const key of ['beforeImages', 'afterImages']) {
        const value = body[key];
        if (!Array.isArray(value)) continue;

        for (const item of value) {
            if (!item || typeof item !== 'object') continue;
            const image = item as Record<string, unknown>;
            if (typeof image.data !== 'string' || image.data.length === 0) continue;

            refs.push({
                image: image.data,
                mimeType: typeof image.mimeType === 'string' ? image.mimeType : undefined,
                set: (anonymizedImage, anonymizedMimeType) => {
                    image.data = anonymizedImage;
                    if (anonymizedMimeType) image.mimeType = anonymizedMimeType;
                }
            });
        }
    }

    return refs;
}

async function anonymizeImage(image: string, mimeType?: string): Promise<{ image: string; mimeType?: string }> {
    if (!PIPL_ANONYMIZER_URL) {
        throw new PiplAnonymizerError('PIPL anonymizer is not configured', 503);
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);

    try {
        const headers: Record<string, string> = {
            'Content-Type': 'application/json'
        };

        if (PIPL_ANONYMIZER_TOKEN) {
            headers.Authorization = `Bearer ${PIPL_ANONYMIZER_TOKEN}`;
        }

        const response = await fetch(PIPL_ANONYMIZER_URL, {
            method: 'POST',
            headers,
            body: JSON.stringify({ image, mimeType }),
            signal: controller.signal
        });

        if (!response.ok) {
            throw new PiplAnonymizerError('PIPL anonymizer rejected the image', 502);
        }

        const payload = await response.json() as { image?: unknown; mimeType?: unknown };
        if (typeof payload.image !== 'string' || payload.image.length === 0) {
            throw new PiplAnonymizerError('PIPL anonymizer returned an invalid payload', 502);
        }

        return {
            image: payload.image,
            mimeType: typeof payload.mimeType === 'string' ? payload.mimeType : mimeType
        };
    } catch (error) {
        if (error instanceof PiplAnonymizerError) {
            throw error;
        }

        throw new PiplAnonymizerError('PIPL anonymizer failed', 502);
    } finally {
        clearTimeout(timeout);
    }
}

/**
 * Fail-closed image anonymization middleware.
 *
 * Residential images must be anonymized by a configured internal service before
 * any request body is forwarded to an LLM provider. Text-only AI requests pass
 * through without calling the anonymizer.
 */
export const anonymizeImagePayload = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const refs = collectImageRefs(req.body ?? {});
        if (refs.length === 0) {
            return next();
        }

        const allowDevelopmentBypass = process.env.NODE_ENV !== 'production'
            && process.env.PIPL_ANONYMIZER_BYPASS === 'true';
        if (!PIPL_ANONYMIZER_URL && allowDevelopmentBypass) {
            req.body.piplAnonymized = false;
            req.body.piplAnonymizationBypassed = true;
            console.warn(`[PIPL] Development-only anonymization bypass used for ${refs.length} image(s)`);
            return next();
        }

        for (const ref of refs) {
            const anonymized = await anonymizeImage(ref.image, ref.mimeType);
            ref.set(anonymized.image, anonymized.mimeType);
        }

        req.body.piplAnonymized = true;
        req.body.piplAnonymizedCount = refs.length;
        next();
    } catch (error) {
        const statusCode = error instanceof PiplAnonymizerError ? error.statusCode : 500;
        console.error('[PIPL] Image anonymization failed');
        res.status(statusCode).json({
            error: 'Privacy compliance error'
        });
    }
};
