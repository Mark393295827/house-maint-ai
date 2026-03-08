import db from '../config/database.js';
import { StrategyAlert, ExecutiveInsight } from '../agents/common.js';
import * as Sentry from '@sentry/node';

/**
 * Executive Agent Service (CFO + COO)
 * 
 * Implements the CORE_STRATEGY executable business rules from MASTER_STRATEGY.md.
 * All agents are advisory-only — they generate StrategyAlerts but never execute
 * financial operations without human approval (Human-in-the-Loop gates).
 * 
 * Rule 1: Budget Auto-Stop (CFO)
 * Rule 2: Supply-Demand Rebalance (COO) 
 * Rule 3: Accuracy Circuit Breaker (COO)
 * Rule 4: Unit Economics Health Check (CFO)
 */

class ExecutiveAgentService {

    // ============ CFO Agent: Budget & Unit Economics ============

    /**
     * Rule 1: Check daily AI budget and generate alerts
     * Already partially implemented in aiUsageService.checkBudget()
     * This extends it with structured StrategyAlert output
     */
    async checkBudgetHealth(): Promise<StrategyAlert[]> {
        const alerts: StrategyAlert[] = [];

        try {
            // Calculate today's spend
            const { rows } = await db.query(`
                SELECT 
                    SUM(cost_usd) as total_spend,
                    COUNT(*) as total_calls,
                    AVG(cost_usd) as avg_cost_per_call
                FROM ai_usage_logs 
                WHERE created_at >= date('now', 'start of day')
            `);

            const totalSpend = parseFloat(rows[0]?.total_spend || '0');
            const totalCalls = parseInt(rows[0]?.total_calls || '0');

            // Get daily budget limit
            const { rows: settings } = await db.query(
                "SELECT value FROM ai_settings WHERE key = 'daily_budget_usd'"
            );
            const dailyLimit = parseFloat(settings[0]?.value || '10.0');

            // Budget threshold alerts
            if (totalSpend >= dailyLimit) {
                alerts.push({
                    severity: 'critical',
                    dimension: 'financials',
                    rule_triggered: 'Rule 1: Budget Auto-Stop',
                    metric_name: 'daily_ai_spend_usd',
                    metric_value: totalSpend,
                    threshold: dailyLimit,
                    recommended_action: `日预算已超出 ($${totalSpend.toFixed(4)} / $${dailyLimit}). 建议冻结非核心AI端点，或审批增加预算。`,
                    requires_human_approval: true
                });
            } else if (totalSpend >= dailyLimit * 0.8) {
                alerts.push({
                    severity: 'warning',
                    dimension: 'financials',
                    rule_triggered: 'Rule 1: Budget Alert (80%)',
                    metric_name: 'daily_ai_spend_usd',
                    metric_value: totalSpend,
                    threshold: dailyLimit * 0.8,
                    recommended_action: `日预算已使用80% ($${totalSpend.toFixed(4)} / $${dailyLimit}). 关注Token消耗趋势。`,
                    requires_human_approval: false
                });
            }

            // Anomaly detection: cost per call spike
            const avgCost = parseFloat(rows[0]?.avg_cost_per_call || '0');
            if (avgCost > 0.05 && totalCalls > 10) { // $0.05/call threshold for flash model
                alerts.push({
                    severity: 'warning',
                    dimension: 'financials',
                    rule_triggered: 'Rule 4: Unit Cost Anomaly',
                    metric_name: 'avg_cost_per_ai_call',
                    metric_value: avgCost,
                    threshold: 0.05,
                    recommended_action: `平均每次AI调用成本异常偏高 ($${avgCost.toFixed(4)}). 检查是否有Prompt过长或模型选择错误。`,
                    requires_human_approval: false
                });
            }
        } catch (error) {
            console.error('CFO Agent: Budget check failed:', error);
            Sentry.captureException(error);
        }

        return alerts;
    }

    /**
     * Rule 4: Monthly unit economics health check
     */
    async checkUnitEconomics(): Promise<ExecutiveInsight> {
        try {
            // Monthly token costs
            const { rows: costs } = await db.query(`
                SELECT 
                    SUM(cost_usd) as monthly_token_cost,
                    COUNT(*) as monthly_ai_calls
                FROM ai_usage_logs 
                WHERE created_at >= date('now', 'start of month')
            `);

            // Monthly revenue (from orders)
            const { rows: revenue } = await db.query(`
                SELECT 
                    SUM(amount) as monthly_revenue,
                    COUNT(*) as monthly_orders
                FROM orders 
                WHERE status = 'paid' 
                AND created_at >= date('now', 'start of month')
            `);

            const tokenCost = parseFloat(costs[0]?.monthly_token_cost || '0');
            const totalRevenue = parseFloat(revenue[0]?.monthly_revenue || '0');
            const grossMargin = totalRevenue > 0 ? ((totalRevenue - tokenCost) / totalRevenue) * 100 : 0;

            const alerts: StrategyAlert[] = [];
            if (grossMargin < 50 && totalRevenue > 0) {
                alerts.push({
                    severity: 'critical',
                    dimension: 'financials',
                    rule_triggered: 'Rule 4: Gross Margin Degradation',
                    metric_name: 'gross_margin_pct',
                    metric_value: grossMargin,
                    threshold: 50,
                    recommended_action: `毛利率低于50% (${grossMargin.toFixed(1)}%). 需要优化Prompt减少Token消耗或提高客单价。`,
                    requires_human_approval: true
                });
            }

            return {
                agent: 'cfo',
                period: new Date().toISOString().slice(0, 7),
                kpis: {
                    monthly_token_cost_usd: tokenCost,
                    monthly_revenue_cny: totalRevenue,
                    monthly_ai_calls: parseInt(costs[0]?.monthly_ai_calls || '0'),
                    monthly_orders: parseInt(revenue[0]?.monthly_orders || '0'),
                    gross_margin_pct: grossMargin
                },
                alerts,
                narrative: `本月AI调用${costs[0]?.monthly_ai_calls || 0}次，Token成本$${tokenCost.toFixed(4)}。`
                    + (totalRevenue > 0 ? ` 营收¥${totalRevenue.toFixed(2)}，毛利率${grossMargin.toFixed(1)}%。` : ' 本月暂无营收。')
            };
        } catch (error) {
            console.error('CFO Agent: Unit economics check failed:', error);
            Sentry.captureException(error);
            return {
                agent: 'cfo',
                period: new Date().toISOString().slice(0, 7),
                kpis: {},
                alerts: [],
                narrative: 'CFO Agent: 数据查询失败，请检查数据库连接。'
            };
        }
    }

    // ============ COO Agent: Supply/Demand & Quality ============

    /**
     * Rule 2: Check worker supply vs. ticket demand ratio
     */
    async checkSupplyDemand(): Promise<StrategyAlert[]> {
        const alerts: StrategyAlert[] = [];

        try {
            // Active tickets (not completed/cancelled)
            const { rows: tickets } = await db.query(`
                SELECT COUNT(*) as active_tickets 
                FROM reports 
                WHERE status NOT IN ('completed', 'cancelled')
            `);

            // Available workers
            const { rows: workers } = await db.query(`
                SELECT COUNT(*) as available_workers 
                FROM workers 
                WHERE available = 1
            `);

            const activeTickets = parseInt(tickets[0]?.active_tickets || '0');
            const availableWorkers = parseInt(workers[0]?.available_workers || '0');
            const ratio = availableWorkers > 0 ? activeTickets / availableWorkers : Infinity;

            if (ratio > 5) {
                alerts.push({
                    severity: 'critical',
                    dimension: 'team',
                    rule_triggered: 'Rule 2: Worker Shortage',
                    metric_name: 'ticket_worker_ratio',
                    metric_value: ratio,
                    threshold: 5,
                    recommended_action: `活跃工单/可用师傅比例过高 (${ratio.toFixed(1)}:1). 需在该区域招募更多师傅。建议生成招聘微信模板消息。`,
                    requires_human_approval: true
                });
            } else if (ratio > 3) {
                alerts.push({
                    severity: 'warning',
                    dimension: 'team',
                    rule_triggered: 'Rule 2: Supply Tightening',
                    metric_name: 'ticket_worker_ratio',
                    metric_value: ratio,
                    threshold: 3,
                    recommended_action: `供需比趋紧 (${ratio.toFixed(1)}:1). 关注未来一周趋势。`,
                    requires_human_approval: false
                });
            }
        } catch (error) {
            console.error('COO Agent: Supply/demand check failed:', error);
            Sentry.captureException(error);
        }

        return alerts;
    }

    /**
     * Rule 3: Check AI diagnosis accuracy (circuit breaker)
     */
    async checkDiagnosisAccuracy(): Promise<StrategyAlert[]> {
        const alerts: StrategyAlert[] = [];

        try {
            // Reports where worker confirmed diagnosis was wrong
            const { rows } = await db.query(`
                SELECT 
                    COUNT(CASE WHEN diagnosis_correct = 0 THEN 1 END) as incorrect,
                    COUNT(CASE WHEN diagnosis_correct IS NOT NULL THEN 1 END) as total_reviewed
                FROM reports 
                WHERE created_at >= date('now', '-30 days')
            `);

            const incorrect = parseInt(rows[0]?.incorrect || '0');
            const totalReviewed = parseInt(rows[0]?.total_reviewed || '0');
            const errorRate = totalReviewed > 0 ? (incorrect / totalReviewed) * 100 : 0;

            if (errorRate > 15 && totalReviewed >= 10) {
                alerts.push({
                    severity: 'critical',
                    dimension: 'tenx',
                    rule_triggered: 'Rule 3: Accuracy Circuit Breaker',
                    metric_name: 'diagnosis_error_rate_pct',
                    metric_value: errorRate,
                    threshold: 15,
                    recommended_action: `AI诊断错误率 ${errorRate.toFixed(1)}% 超过15%阈值 (${incorrect}/${totalReviewed}). 建议暂停AI自动分诊，启用人工审核模式。`,
                    requires_human_approval: true
                });
            }
        } catch (error) {
            console.error('COO Agent: Accuracy check failed:', error);
            Sentry.captureException(error);
        }

        return alerts;
    }

    /**
     * Generate full executive dashboard insight
     */
    async generateExecutiveDashboard(): Promise<{
        cfo: ExecutiveInsight;
        coo_alerts: StrategyAlert[];
    }> {
        const [cfo, budgetAlerts, supplyAlerts, accuracyAlerts] = await Promise.all([
            this.checkUnitEconomics(),
            this.checkBudgetHealth(),
            this.checkSupplyDemand(),
            this.checkDiagnosisAccuracy()
        ]);

        // Merge all alerts into CFO insight
        cfo.alerts = [...cfo.alerts, ...budgetAlerts];

        return {
            cfo,
            coo_alerts: [...supplyAlerts, ...accuracyAlerts]
        };
    }
}

export const executiveAgentService = new ExecutiveAgentService();
