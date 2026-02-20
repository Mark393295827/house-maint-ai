import db from '../config/database.js';
import { MIXPANEL_TOKEN } from '../config/secrets.js';
import Mixpanel from 'mixpanel';
import { AiUsage } from '../agents/common.js';
import * as Sentry from '@sentry/node';

// Pricing per token (USD)
const PRICING: Record<string, { input: number, output: number }> = {
    'gemini-1.5-flash': { input: 0.000000075, output: 0.0000003 },
    'deepseek-reasoner': { input: 0.00000055, output: 0.00000219 },
    'default': { input: 0.0000005, output: 0.0000015 }
};

class AiUsageService {
    private mixpanel: Mixpanel.Mixpanel | null = null;

    constructor() {
        if (MIXPANEL_TOKEN) {
            this.mixpanel = Mixpanel.init(MIXPANEL_TOKEN);
        }
    }

    calculateCost(usage: AiUsage): number {
        const model = usage.model_name || 'default';
        const pricing = PRICING[model] || PRICING['default'];
        return (usage.input_tokens * pricing.input) + (usage.output_tokens * pricing.output);
    }

    async logUsage(params: {
        userId?: number;
        usage: AiUsage;
        endpoint?: string;
        durationMs?: number;
    }) {
        const { userId, usage, endpoint, durationMs } = params;
        const costUsd = this.calculateCost(usage);

        try {
            // 1. Log to Database
            await db.query(`
                INSERT INTO ai_usage_logs (
                    user_id, model_name, input_tokens, output_tokens, total_tokens, cost_usd, endpoint, duration_ms
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            `, [
                userId || null,
                usage.model_name || 'unknown',
                usage.input_tokens,
                usage.output_tokens,
                usage.total_tokens,
                costUsd,
                endpoint || 'background',
                durationMs || 0
            ]);

            // 2. Track in Mixpanel
            if (this.mixpanel) {
                this.mixpanel.track('ai_request', {
                    distinct_id: userId ? `user_${userId}` : 'system',
                    model: usage.model_name,
                    tokens: usage.total_tokens,
                    cost_usd: costUsd,
                    endpoint: endpoint,
                    duration_ms: durationMs
                });
            }

            // 3. Check Budget
            await this.checkBudget();

        } catch (error) {
            console.error('Failed to log AI usage:', error);
            Sentry.captureException(error);
        }
    }

    async checkBudget() {
        try {
            // Calculate today's spend
            const { rows } = await db.query(`
                SELECT SUM(cost_usd) as total_spend 
                FROM ai_usage_logs 
                WHERE created_at >= date('now', 'start of day')
            `);

            const totalSpend = rows[0].total_spend || 0;

            // Get daily budget limit
            const { rows: settings } = await db.query("SELECT value FROM ai_settings WHERE key = 'daily_budget_usd'");
            const dailyLimit = parseFloat(settings[0]?.value || '10.0');

            if (totalSpend >= dailyLimit) {
                const msg = `⚠️ AI BUDGET EXCEEDED: Daily spend $${totalSpend.toFixed(4)} exceeds limit $${dailyLimit}`;
                console.warn(msg);
                Sentry.captureMessage(msg, 'warning');
            } else if (totalSpend >= dailyLimit * 0.8) {
                const msg = `🔔 AI BUDGET ALERT: Daily spend $${totalSpend.toFixed(4)} reached 80% of limit $${dailyLimit}`;
                console.warn(msg);
            }
        } catch (error) {
            console.error('Budget check failed:', error);
        }
    }
}

export const aiUsageService = new AiUsageService();
