import { Request, Response, NextFunction } from 'express';
import { aiUsageService } from '../services/aiUsage.js';
import { AiUsage } from '../agents/common.js';

/**
 * Middleware to track AI request costs and usage
 * Expects (req as any).aiUsage to be set by route handlers
 */
export const trackAiCost = async (req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();

    res.on('finish', async () => {
        const usage = (req as any).aiUsage as AiUsage;

        if (usage) {
            const userId = (req as any).user?.id;
            const durationMs = Date.now() - start;

            await aiUsageService.logUsage({
                userId,
                usage,
                endpoint: req.originalUrl,
                durationMs
            });
        }
    });

    next();
};
