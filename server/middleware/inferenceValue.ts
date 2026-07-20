import { Request, Response, NextFunction } from 'express';

/**
 * ============================================================
 * DIMENSION 2: MODEL ECONOMICS — Inference-to-Value Ratio (IVR)
 * ============================================================
 *
 * VC Metric: Inference-to-Value Ratio = Token Cost / Business Value Created
 *
 * Goal: Prove that every ¥0.01 spent on AI tokens generates ≥¥1.00 in business value.
 * This middleware enriches every AI call with economic metadata that feeds into
 * the Cost Dashboard and VC reporting.
 *
 * Model Routing Rules:
 *   - High-frequency, low-value tasks → Gemini Flash (cheapest)
 *   - High-value decision tasks → OpenAI/Codex or DeepSeek reasoning models
 *   - Batch/offline tasks → queued for off-peak pricing
 */

// ─── Cost Table (per 1M tokens, in USD) ───
const MODEL_COSTS: Record<string, { input: number; output: number }> = {
    'gemini-1.5-flash': { input: 0.075, output: 0.30 },
    'gemini-2.0-flash': { input: 0.10, output: 0.40 },
    'gemini-1.5-pro': { input: 1.25, output: 5.00 },
    'deepseek-r1': { input: 0.55, output: 2.19 },
    'deepseek-reasoner': { input: 0.55, output: 2.19 },
    'deepseek-v3': { input: 0.27, output: 1.10 },
    'gpt-5.5': { input: 5.00, output: 30.00 },
    'gpt-5.3-codex': { input: 1.75, output: 14.00 },
    'gemini-mock': { input: 0, output: 0 },
    'gpt-5.5-mock': { input: 0, output: 0 },
    'algorithmic': { input: 0, output: 0 },
    'research-swarm': { input: 0.225, output: 0.90 }, // 3x Flash calls
};

// ─── Business Value Estimates (per successful call, in CNY) ───
const BUSINESS_VALUE: Record<string, number> = {
    '/api/ai/diagnose': 50,    // Saves 1 wasted trip (¥50 avg)
    '/api/ai/multi-diagnose': 150,   // Batch saves multiple trips
    '/api/ai/generate-scheme': 200,   // Replaces 2h expert consultation (¥200)
    '/api/ai/problem-solving': 300,    // Full loop avoids wasted dispatch + owner coordination
    '/api/ai/material-bom': 100,   // Prevents wrong-material purchase (¥100 avg)
    '/api/ai/fault-attribution': 500,   // Avoids 2-4 week legal dispute (¥500+)
    '/api/ai/turnover-compare': 300,   // Documents damage, protects deposit (¥300 avg)
    '/api/ai/research-market': 2000,  // Replaces ¥2000+ market research consulting
    '/api/ai/chat': 20,    // General assistance value
};

export interface InferenceEconomics {
    endpoint: string;
    modelName: string;
    tokenCostUsd: number;
    tokenCostCny: number;
    businessValueCny: number;
    ivr: number;              // Inference-to-Value Ratio (lower = better, e.g. 0.01 = 100x ROI)
    roi: number;              // Return on Inference: businessValue / tokenCost
    tier: 'excellent' | 'good' | 'marginal' | 'negative'; // Economic classification
}

export function calculateInferenceEconomics(
    endpoint: string,
    modelName: string,
    inputTokens: number,
    outputTokens: number,
    usdToCnyRate: number = 7.2
): InferenceEconomics {
    const costs = modelName.endsWith('-mock')
        ? { input: 0, output: 0 }
        : MODEL_COSTS[modelName] || MODEL_COSTS['gemini-1.5-flash'];
    const tokenCostUsd = (inputTokens * costs.input + outputTokens * costs.output) / 1_000_000;
    const tokenCostCny = tokenCostUsd * usdToCnyRate;

    // Normalize endpoint (strip query params)
    const normalizedEndpoint = endpoint.split('?')[0].replace(/^\/api\/v1/, '/api');
    const businessValueCny = BUSINESS_VALUE[normalizedEndpoint] || 10;

    const ivr = businessValueCny > 0 ? tokenCostCny / businessValueCny : 1;
    const roi = tokenCostCny > 0 ? businessValueCny / tokenCostCny : Infinity;

    let tier: InferenceEconomics['tier'];
    if (roi >= 100) tier = 'excellent';       // 100x+ ROI
    else if (roi >= 10) tier = 'good';        // 10x+ ROI
    else if (roi >= 1) tier = 'marginal';     // Positive but thin
    else tier = 'negative';                    // Losing money

    return {
        endpoint: normalizedEndpoint,
        modelName,
        tokenCostUsd,
        tokenCostCny,
        businessValueCny,
        ivr,
        roi,
        tier,
    };
}

/**
 * Model Router: Selects the optimal model based on task value and complexity.
 * VC Pitch: "We spend the cheapest token on the cheapest task."
 */
export function routeModel(endpoint: string, complexity: 'low' | 'medium' | 'high' = 'low'): string {
    const normalizedEndpoint = endpoint.split('?')[0].replace(/^\/api\/v1/, '/api');
    const highValueEndpoints = ['/api/ai/generate-scheme', '/api/ai/fault-attribution', '/api/ai/problem-solving'];
    const isHighValue = highValueEndpoints.includes(normalizedEndpoint);

    if (isHighValue || complexity === 'high') {
        return process.env.OPENAI_CODEX_MODEL || 'deepseek-r1';       // High-value decisions need best reasoning
    }
    return 'gemini-1.5-flash';      // Everything else uses cheapest model
}

/**
 * Enhanced cost tracking middleware with IVR calculation.
 * Adds `req.inferenceEconomics` for downstream logging.
 */
export const trackInferenceValue = (req: Request, res: Response, next: NextFunction) => {
    res.on('finish', () => {
        const usage = (req as any).aiUsage;
        if (!usage) return;

        const economics = calculateInferenceEconomics(
            req.originalUrl,
            usage.model_name || 'gemini-1.5-flash',
            usage.input_tokens || 0,
            usage.output_tokens || 0,
        );

        (req as any).inferenceEconomics = economics;

        // Log IVR for monitoring
        const emoji = economics.tier === 'excellent' ? '🟢' : economics.tier === 'good' ? '🟡' : economics.tier === 'marginal' ? '🟠' : '🔴';
        console.log(
            `[IVR] ${emoji} ${economics.endpoint} | Model: ${economics.modelName} | Cost: ¥${economics.tokenCostCny.toFixed(4)} | Value: ¥${economics.businessValueCny} | ROI: ${economics.roi === Infinity ? '∞' : economics.roi.toFixed(0) + 'x'} | Tier: ${economics.tier}`
        );
    });

    next();
};
