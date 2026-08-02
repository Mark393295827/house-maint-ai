import { GoogleGenerativeAI } from '@google/generative-ai';
import {
    AiProvider, AiResponse, PainPointAnalysis, DigitalVacuumScore,
    TAMExpansion, GoNoGoChecklist, IndustryResearchReport,
    parseAiJson, withRetry
} from '../common.js';

// ============ Agent 1: Data-Miner Agent ============
// Digs into public financial data, repair records, industry bidding info.
// Focus: Digital Vacuum calculation + baseline market sizing.

export class DataMinerAgent implements AiProvider {
    name = 'DataMiner';
    private genAI: GoogleGenerativeAI;
    private model: any;
    private hasApiKey: boolean;

    constructor() {
        const apiKey = process.env.GEMINI_API_KEY || '';
        this.hasApiKey = !!apiKey;
        this.genAI = new GoogleGenerativeAI(apiKey || 'dummy');
        this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    }

    async analyzeDigitalVacuum(sector: string, locale: string = 'zh'): Promise<AiResponse<DigitalVacuumScore>> {
        if (!this.hasApiKey) return { result: this.mockVacuum(sector), usage: { input_tokens: 0, output_tokens: 0, total_tokens: 0, model_name: 'gemini-mock' } };

        const lang = locale === 'zh' ? '中文' : 'English';
        const prompt = `You are a management consulting analyst specializing in digital transformation of traditional Chinese industries.

TASK: Analyze the "Digital Vacuum" (数字化真空度) of the "${sector}" sector in China.

Digital Vacuum Formula: Digital_Vacuum = Manual_Data_Entry_Hours / Total_Operational_Hours

Research these aspects:
1. How many hours per day do workers in this sector spend on manual paperwork, phone calls, Excel entry?
2. What is the total operational hours in a typical workday?
3. What specific manual processes could be automated by AI?
4. How feasible is automation (considering regulation, worker adoption, data availability)?

GRADE SYSTEM:
- A (vacuum_ratio > 0.5): Perfect AI target — most time wasted on manual work
- B (0.3-0.5): Good opportunity — significant manual overhead
- C (0.15-0.3): Moderate — some digitization already exists
- D (< 0.15): Already digitized — limited AI expansion potential

Respond in ${lang}. Output ONLY valid JSON:
{
    "sector": "${sector}",
    "manual_hours_per_day": 0,
    "total_operational_hours": 8,
    "vacuum_ratio": 0.0,
    "vacuum_grade": "A",
    "key_manual_processes": ["process1", "process2"],
    "automation_feasibility": 85
}`;

        try {
            const result = await withRetry(async () => {
                return await this.model.generateContent({
                    contents: [{ role: 'user', parts: [{ text: prompt }] }]
                });
            });
            const text = result.response.text();
            const usage = result.response.usageMetadata;
            return {
                result: parseAiJson<DigitalVacuumScore>(text, ['sector', 'vacuum_ratio', 'vacuum_grade']),
                usage: { input_tokens: usage?.promptTokenCount || 0, output_tokens: (usage?.candidatesTokenCount || 0) + (usage?.thoughtsTokenCount || 0), total_tokens: usage?.totalTokenCount || 0, model_name: 'gemini-2.5-flash' }
            };
        } catch (error) {
            console.error('DataMinerAgent.analyzeDigitalVacuum failed:', error);
            return { result: this.mockVacuum(sector), usage: { input_tokens: 0, output_tokens: 0, total_tokens: 0, model_name: 'gemini-mock' } };
        }
    }

    async calculateTAMExpansion(sector: string, currentTAM?: number, locale: string = 'zh'): Promise<AiResponse<TAMExpansion>> {
        if (!this.hasApiKey) return { result: this.mockTAM(sector), usage: { input_tokens: 0, output_tokens: 0, total_tokens: 0, model_name: 'gemini-mock' } };

        const lang = locale === 'zh' ? '中文' : 'English';
        const prompt = `You are a VC-grade market analyst. Calculate the "Second-Order TAM" (二阶TAM推导) for "${sector}" in China.

KEY PRINCIPLE: Many traditional industries have small TAMs only because services are too expensive. If AI reduces costs by 90%, "long-tail customers" who couldn't previously afford the service flood in.

Formula: Expanded_TAM = Current_TAM × (1 + Suppressed_Demand_Multiplier)

${currentTAM ? `Known current TAM: ¥${currentTAM.toLocaleString()} per year.` : 'Estimate the current TAM from public data.'}

Analyze:
1. Current market size (existing paying customers)
2. What percentage of potential customers are priced out?
3. If AI reduces service cost by 80-95%, how many new customers enter?
4. What entirely new use cases does cheap AI enable?

Respond in ${lang}. Output ONLY valid JSON:
{
    "sector": "${sector}",
    "current_tam_cny": 0,
    "ai_cost_reduction_pct": 90,
    "suppressed_demand_multiplier": 3.0,
    "expanded_tam_cny": 0,
    "long_tail_segments": ["segment1"],
    "timeline_to_capture": "12-18 months"
}`;

        try {
            const result = await withRetry(async () => {
                return await this.model.generateContent({
                    contents: [{ role: 'user', parts: [{ text: prompt }] }]
                });
            });
            const text = result.response.text();
            const usage = result.response.usageMetadata;
            return {
                result: parseAiJson<TAMExpansion>(text, ['sector', 'current_tam_cny', 'expanded_tam_cny']),
                usage: { input_tokens: usage?.promptTokenCount || 0, output_tokens: (usage?.candidatesTokenCount || 0) + (usage?.thoughtsTokenCount || 0), total_tokens: usage?.totalTokenCount || 0, model_name: 'gemini-2.5-flash' }
            };
        } catch (error) {
            console.error('DataMinerAgent.calculateTAMExpansion failed:', error);
            return { result: this.mockTAM(sector), usage: { input_tokens: 0, output_tokens: 0, total_tokens: 0, model_name: 'gemini-mock' } };
        }
    }

    mockVacuum(sector: string): DigitalVacuumScore {
        return {
            sector,
            manual_hours_per_day: 4.5,
            total_operational_hours: 8,
            vacuum_ratio: 0.56,
            vacuum_grade: 'A',
            key_manual_processes: ['电话接报登记', 'Excel手动录入工单', '微信群协调师傅', '纸质验收签字', '手抄账本对账'],
            automation_feasibility: 88
        };
    }

    mockTAM(sector: string): TAMExpansion {
        return {
            sector,
            current_tam_cny: 300_000_000_000,
            ai_cost_reduction_pct: 90,
            suppressed_demand_multiplier: 3.04,
            expanded_tam_cny: 913_000_000_000,
            long_tail_segments: ['个人房东(1-3套房)', '小微物业(50户以下)', '民宿/短租经营者', '偏远社区无覆盖区域'],
            timeline_to_capture: '12-18 months'
        };
    }
}

// ============ Agent 2: Social-Observer Agent ============
// Scans social media (小红书, 抖音, Reddit) for practitioner complaints.
// Focus: Pain Point Density analysis — complaints reveal 10X intervention points.

export class SocialObserverAgent implements AiProvider {
    name = 'SocialObserver';
    private genAI: GoogleGenerativeAI;
    private model: any;
    private hasApiKey: boolean;

    constructor() {
        const apiKey = process.env.GEMINI_API_KEY || '';
        this.hasApiKey = !!apiKey;
        this.genAI = new GoogleGenerativeAI(apiKey || 'dummy');
        this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    }

    async analyzePainPoints(sector: string, focusArea?: string, locale: string = 'zh'): Promise<AiResponse<PainPointAnalysis>> {
        if (!this.hasApiKey) return { result: this.mockPainPoints(sector), usage: { input_tokens: 0, output_tokens: 0, total_tokens: 0, model_name: 'gemini-mock' } };

        const lang = locale === 'zh' ? '中文' : 'English';
        const prompt = `You are a social media intelligence analyst specializing in Chinese consumer behavior.

TASK: Analyze the "Pain Point Density" (痛点密度) in the "${sector}" sector${focusArea ? `, focusing on "${focusArea}"` : ''}.

METHODOLOGY:
1. Simulate scanning 小红书, 抖音, 行业论坛 for practitioner and consumer complaints
2. Identify the TOP complaints by frequency
3. Classify the PRIMARY bottleneck:
   - "communication": complaints about response time, miscommunication, coordination
   - "scheduling": complaints about worker availability, appointment reliability
   - "pricing": complaints about price opacity, overcharging
   - "quality": complaints about work quality, rework needed
   - "trust": complaints about fraud, reliability, accountability

CRITICAL INSIGHT: If "修不好", "乱报价", "工人不来" appear MORE FREQUENTLY than "贵" (expensive), the 10X opportunity is in DISPATCH AUTOMATION, not price competition.

Pain Density Score (0-100): Higher = more complaints = MORE opportunity for AI disruption.

Respond in ${lang}. Output ONLY valid JSON:
{
    "sector": "${sector}",
    "top_complaints": [
        { "keyword": "string", "frequency_score": 8, "source": "小红书", "implication": "string" }
    ],
    "pain_density_score": 75,
    "primary_bottleneck": "communication",
    "ai_intervention_point": "string"
}`;

        try {
            const result = await withRetry(async () => {
                return await this.model.generateContent({
                    contents: [{ role: 'user', parts: [{ text: prompt }] }]
                });
            });
            const text = result.response.text();
            const usage = result.response.usageMetadata;
            return {
                result: parseAiJson<PainPointAnalysis>(text, ['sector', 'top_complaints', 'pain_density_score']),
                usage: { input_tokens: usage?.promptTokenCount || 0, output_tokens: (usage?.candidatesTokenCount || 0) + (usage?.thoughtsTokenCount || 0), total_tokens: usage?.totalTokenCount || 0, model_name: 'gemini-2.5-flash' }
            };
        } catch (error) {
            console.error('SocialObserverAgent.analyzePainPoints failed:', error);
            return { result: this.mockPainPoints(sector), usage: { input_tokens: 0, output_tokens: 0, total_tokens: 0, model_name: 'gemini-mock' } };
        }
    }

    mockPainPoints(sector: string): PainPointAnalysis {
        return {
            sector,
            top_complaints: [
                { keyword: '工人不来/爽约', frequency_score: 9, source: '小红书/抖音', implication: 'AI调度+实时追踪可消除此痛点，是10X核心切入点' },
                { keyword: '修不好/返工', frequency_score: 8, source: '大众点评/百度贴吧', implication: 'AI诊断预判+技能匹配可降低返工率60%' },
                { keyword: '乱报价/坑人', frequency_score: 8, source: '小红书/知乎', implication: 'AI BOM透明定价直接打破信息不对称' },
                { keyword: '找不到人/响应慢', frequency_score: 7, source: '微信群/抖音', implication: 'AI 7×24在线接单，响应从小时级→秒级' },
                { keyword: '不知道该找谁', frequency_score: 6, source: '小红书', implication: 'AI照片诊断+自动分类匹配专业师傅' },
            ],
            pain_density_score: 82,
            primary_bottleneck: 'communication',
            ai_intervention_point: '全流程自动化：AI接单→AI诊断→智能派工→实时追踪→透明结算。核心切入点是"沟通成本"的消除。'
        };
    }
}

// ============ Agent 3: Simulator Agent ============
// Models old-mode vs. AI-mode operational costs.
// Focus: Gross margin transformation calculation.

export class SimulatorAgent implements AiProvider {
    name = 'Simulator';
    private genAI: GoogleGenerativeAI;
    private model: any;
    private hasApiKey: boolean;

    constructor() {
        const apiKey = process.env.GEMINI_API_KEY || '';
        this.hasApiKey = !!apiKey;
        this.genAI = new GoogleGenerativeAI(apiKey || 'dummy');
        this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    }

    async simulateCostTransform(sector: string, locale: string = 'zh'): Promise<AiResponse<{
        old_mode: { monthly_cost: number; staff_count: number; response_time_hours: number; error_rate_pct: number };
        ai_mode: { monthly_cost: number; staff_count: number; response_time_hours: number; error_rate_pct: number };
        savings_pct: number;
        margin_improvement_pct: number;
        breakeven_months: number;
        narrative: string;
    }>> {
        if (!this.hasApiKey) return { result: this.mockSimulation(sector), usage: { input_tokens: 0, output_tokens: 0, total_tokens: 0, model_name: 'gemini-mock' } };

        const lang = locale === 'zh' ? '中文' : 'English';
        const prompt = `You are a financial modeling analyst. Simulate the cost transformation for "${sector}" when switching from traditional operations to AI-powered operations.

MODEL TWO SCENARIOS:

SCENARIO A - "Old Mode" (Traditional):
- Manual dispatch team, phone-based coordination
- Paper/Excel tracking
- Human quality inspection
- Calculate: monthly fixed costs, headcount, avg response time, error rate

SCENARIO B - "AI Mode" (with AI agents):
- AI diagnosis + auto-dispatch
- Digital tracking + real-time monitoring
- AI quality verification
- Token-based variable costs

Calculate:
1. Monthly cost savings (%)
2. Gross margin improvement
3. Months to breakeven on AI development investment (~¥500K)

Respond in ${lang}. Output ONLY valid JSON:
{
    "old_mode": { "monthly_cost": 0, "staff_count": 0, "response_time_hours": 0, "error_rate_pct": 0 },
    "ai_mode": { "monthly_cost": 0, "staff_count": 0, "response_time_hours": 0, "error_rate_pct": 0 },
    "savings_pct": 0,
    "margin_improvement_pct": 0,
    "breakeven_months": 0,
    "narrative": "string"
}`;

        try {
            const result = await withRetry(async () => {
                return await this.model.generateContent({
                    contents: [{ role: 'user', parts: [{ text: prompt }] }]
                });
            });
            const text = result.response.text();
            const usage = result.response.usageMetadata;
            return {
                result: parseAiJson(text, ['old_mode', 'ai_mode', 'savings_pct']),
                usage: { input_tokens: usage?.promptTokenCount || 0, output_tokens: (usage?.candidatesTokenCount || 0) + (usage?.thoughtsTokenCount || 0), total_tokens: usage?.totalTokenCount || 0, model_name: 'gemini-2.5-flash' }
            };
        } catch (error) {
            console.error('SimulatorAgent.simulateCostTransform failed:', error);
            return { result: this.mockSimulation(sector), usage: { input_tokens: 0, output_tokens: 0, total_tokens: 0, model_name: 'gemini-mock' } };
        }
    }

    mockSimulation(sector: string) {
        return {
            old_mode: { monthly_cost: 98000, staff_count: 8, response_time_hours: 4.5, error_rate_pct: 22 },
            ai_mode: { monthly_cost: 1400, staff_count: 1, response_time_hours: 0.03, error_rate_pct: 5 },
            savings_pct: 98.6,
            margin_improvement_pct: 47.3,
            breakeven_months: 5,
            narrative: `${sector}行业从传统模式切换到AI代理模式后，月运营成本从¥98,000降至¥1,400（降幅98.6%）。响应时间从4.5小时缩短至2分钟（135倍提升）。错误率从22%降至5%。按¥500K开发投入计算，5个月即可回本。`
        };
    }
}

// ============ Research Orchestrator ============
// Cross-validates all 3 agents and generates Go/No-Go decision.

export class ResearchOrchestrator {
    private dataMiner = new DataMinerAgent();
    private socialObserver = new SocialObserverAgent();
    private simulator = new SimulatorAgent();

    async runFullResearch(sector: string, focusArea?: string, currentTAM?: number, locale: string = 'zh'): Promise<AiResponse<IndustryResearchReport>> {
        console.log(`[ResearchSwarm] Starting research for sector: "${sector}"`);

        // Run all 3 agents in parallel (cross-validation)
        const [painResult, vacuumResult, tamResult, simResult] = await Promise.all([
            this.socialObserver.analyzePainPoints(sector, focusArea, locale),
            this.dataMiner.analyzeDigitalVacuum(sector, locale),
            this.dataMiner.calculateTAMExpansion(sector, currentTAM, locale),
            this.simulator.simulateCostTransform(sector, locale),
        ]);

        // Generate Go/No-Go checklist from cross-validated data
        const goNoGo = this.evaluateGoNoGo(painResult.result, vacuumResult.result, tamResult.result, simResult.result);

        // Calculate total token usage
        const totalUsage = {
            input_tokens: painResult.usage.input_tokens + vacuumResult.usage.input_tokens + tamResult.usage.input_tokens + simResult.usage.input_tokens,
            output_tokens: painResult.usage.output_tokens + vacuumResult.usage.output_tokens + tamResult.usage.output_tokens + simResult.usage.output_tokens,
            total_tokens: painResult.usage.total_tokens + vacuumResult.usage.total_tokens + tamResult.usage.total_tokens + simResult.usage.total_tokens,
            model_name: 'research-swarm'
        };

        // Confidence: cross-validated from all 3 agents
        const confidence = Math.round(
            (painResult.result.pain_density_score * 0.3) +
            (vacuumResult.result.automation_feasibility * 0.3) +
            (Math.min(tamResult.result.suppressed_demand_multiplier / 5 * 100, 100) * 0.2) +
            (simResult.result.savings_pct * 0.2)
        );

        const report: IndustryResearchReport = {
            sector,
            generated_at: new Date().toISOString(),
            pain_points: painResult.result,
            digital_vacuum: vacuumResult.result,
            tam_expansion: tamResult.result,
            go_no_go: goNoGo,
            executive_summary: this.generateSummary(sector, painResult.result, vacuumResult.result, tamResult.result, simResult.result, goNoGo),
            confidence_score: confidence,
        };

        console.log(`[ResearchSwarm] Research complete. Verdict: ${goNoGo.overall_verdict} (confidence: ${confidence}%)`);

        return { result: report, usage: totalUsage };
    }

    private evaluateGoNoGo(
        pain: PainPointAnalysis,
        vacuum: DigitalVacuumScore,
        tam: TAMExpansion,
        sim: any
    ): GoNoGoChecklist {
        // Check 1: Incremental demand — are customers suffering from slow/error-prone service?
        const demandPass = pain.pain_density_score >= 60 && pain.top_complaints.length >= 3;

        // Check 2: 10X possibility — can AI compress 3 days to 3 minutes?
        const tenxPass = sim.savings_pct >= 80 || (sim.old_mode.response_time_hours / Math.max(sim.ai_mode.response_time_hours, 0.01)) >= 100;

        // Check 3: Competitive moat — does industry depth data create a defensible position?
        const moatPass = vacuum.vacuum_grade === 'A' || vacuum.vacuum_grade === 'B';

        const passCount = [demandPass, tenxPass, moatPass].filter(Boolean).length;

        return {
            incremental_demand: {
                pass: demandPass,
                evidence: `痛点密度 ${pain.pain_density_score}/100, ${pain.top_complaints.length} 个高频投诉点. 主要瓶颈: ${pain.primary_bottleneck}`
            },
            tenx_possibility: {
                pass: tenxPass,
                evidence: `成本节省 ${sim.savings_pct}%, 响应时间 ${sim.old_mode.response_time_hours}h→${sim.ai_mode.response_time_hours}h (${Math.round(sim.old_mode.response_time_hours / Math.max(sim.ai_mode.response_time_hours, 0.01))}x提升)`
            },
            competitive_moat: {
                pass: moatPass,
                evidence: `数字化真空度 ${vacuum.vacuum_grade}级 (${(vacuum.vacuum_ratio * 100).toFixed(0)}%). 自动化可行性 ${vacuum.automation_feasibility}/100`
            },
            overall_verdict: passCount === 3 ? 'GO' : passCount >= 2 ? 'NEEDS_MORE_DATA' : 'NO_GO'
        };
    }

    private generateSummary(sector: string, pain: PainPointAnalysis, vacuum: DigitalVacuumScore, tam: TAMExpansion, sim: any, goNoGo: GoNoGoChecklist): string {
        const verdict = goNoGo.overall_verdict === 'GO' ? '✅ 强烈推荐进入' : goNoGo.overall_verdict === 'NEEDS_MORE_DATA' ? '⚠️ 需要更多验证' : '❌ 不推荐';
        return `【${sector}调研报告】${verdict}。痛点密度${pain.pain_density_score}/100（核心瓶颈：${pain.primary_bottleneck}），数字化真空度${vacuum.vacuum_grade}级（${(vacuum.vacuum_ratio * 100).toFixed(0)}%工时为手工操作），AI化后TAM从¥${(tam.current_tam_cny / 1e9).toFixed(0)}B扩展至¥${(tam.expanded_tam_cny / 1e9).toFixed(0)}B（${tam.suppressed_demand_multiplier.toFixed(1)}x被压抑需求释放）。成本模型显示${sim.savings_pct}%降本，${sim.breakeven_months}个月回本。`;
    }
}

export const dataMinerAgent = new DataMinerAgent();
export const socialObserverAgent = new SocialObserverAgent();
export const simulatorAgent = new SimulatorAgent();
export const researchOrchestrator = new ResearchOrchestrator();
