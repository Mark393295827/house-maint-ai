import { OPENAI_API_KEY, OPENAI_BASE_URL, OPENAI_CODEX_MODEL } from '../../config/secrets.js';
import { AiProvider, AiResponse, parseAiJson, withRetry } from '../common.js';

export type ProblemSolvingStageId = 'intake' | 'diagnosis' | 'deflection' | 'dispatch' | 'verification' | 'reporting';
export type ProblemSeverity = 'critical' | 'moderate' | 'low';

export interface ProblemSolvingDemand {
    projectType?: string;
    area?: string;
    scope?: string;
    budget?: string;
    timeline?: string;
    severity?: ProblemSeverity;
    specialRequirements?: string;
    hasPhoto?: boolean;
}

export interface ProblemSolvingInput {
    demand: ProblemSolvingDemand;
    image?: string;
    mimeType?: string;
    locale?: string;
    context?: Record<string, unknown>;
}

export interface ProblemSolvingStageSummary {
    stageId: ProblemSolvingStageId;
    title: string;
    status: 'complete' | 'ready' | 'blocked';
    ownerAgentId: string;
    gate: 'auto' | 'confidence' | 'human';
    summary: string;
    touchpoints: string[];
    evidenceRequired: string[];
}

export interface CostEstimate {
    min: number;
    max: number;
    currency: 'CNY' | 'USD';
    basis: string;
}

export interface ProblemSolvingLoopResult {
    loopVersion: 'codex-six-stage-v1';
    provider: 'openai-responses' | 'mock-codex-loop';
    modelName: string;
    stages: ProblemSolvingStageSummary[];
    diagnosis: {
        issueType: string;
        category: string;
        severity: ProblemSeverity;
        confidence: number;
        responsibility: 'landlord' | 'tenant' | 'shared' | 'undetermined';
        rootCauseSummary: string;
        urgencyScore: number;
        safetyWarnings: string[];
    };
    deflection: {
        eligible: boolean;
        safetyGate: string;
        selfServeSteps: string[];
        escalationTriggers: string[];
    };
    dispatch: {
        recommendedSkill: string;
        requiredTools: string[];
        requiredParts: string[];
        estimatedCost: CostEstimate;
        sla: string;
        acceptanceCriteria: string[];
    };
    verification: {
        checklist: string[];
        photoRequirements: string[];
        followUpWindow: string;
    };
    reporting: {
        ownerSummary: string;
        metrics: string[];
        archiveTags: string[];
    };
    nextActions: string[];
}

const stageIds: ProblemSolvingStageId[] = ['intake', 'diagnosis', 'deflection', 'dispatch', 'verification', 'reporting'];

const resultSchema = {
    type: 'object',
    additionalProperties: false,
    required: ['loopVersion', 'provider', 'modelName', 'stages', 'diagnosis', 'deflection', 'dispatch', 'verification', 'reporting', 'nextActions'],
    properties: {
        loopVersion: { type: 'string', enum: ['codex-six-stage-v1'] },
        provider: { type: 'string', enum: ['openai-responses', 'mock-codex-loop'] },
        modelName: { type: 'string' },
        stages: {
            type: 'array',
            minItems: 6,
            maxItems: 6,
            items: {
                type: 'object',
                additionalProperties: false,
                required: ['stageId', 'title', 'status', 'ownerAgentId', 'gate', 'summary', 'touchpoints', 'evidenceRequired'],
                properties: {
                    stageId: { type: 'string', enum: stageIds },
                    title: { type: 'string' },
                    status: { type: 'string', enum: ['complete', 'ready', 'blocked'] },
                    ownerAgentId: { type: 'string' },
                    gate: { type: 'string', enum: ['auto', 'confidence', 'human'] },
                    summary: { type: 'string' },
                    touchpoints: { type: 'array', items: { type: 'string' } },
                    evidenceRequired: { type: 'array', items: { type: 'string' } },
                },
            },
        },
        diagnosis: {
            type: 'object',
            additionalProperties: false,
            required: ['issueType', 'category', 'severity', 'confidence', 'responsibility', 'rootCauseSummary', 'urgencyScore', 'safetyWarnings'],
            properties: {
                issueType: { type: 'string' },
                category: { type: 'string' },
                severity: { type: 'string', enum: ['critical', 'moderate', 'low'] },
                confidence: { type: 'number' },
                responsibility: { type: 'string', enum: ['landlord', 'tenant', 'shared', 'undetermined'] },
                rootCauseSummary: { type: 'string' },
                urgencyScore: { type: 'number' },
                safetyWarnings: { type: 'array', items: { type: 'string' } },
            },
        },
        deflection: {
            type: 'object',
            additionalProperties: false,
            required: ['eligible', 'safetyGate', 'selfServeSteps', 'escalationTriggers'],
            properties: {
                eligible: { type: 'boolean' },
                safetyGate: { type: 'string' },
                selfServeSteps: { type: 'array', items: { type: 'string' } },
                escalationTriggers: { type: 'array', items: { type: 'string' } },
            },
        },
        dispatch: {
            type: 'object',
            additionalProperties: false,
            required: ['recommendedSkill', 'requiredTools', 'requiredParts', 'estimatedCost', 'sla', 'acceptanceCriteria'],
            properties: {
                recommendedSkill: { type: 'string' },
                requiredTools: { type: 'array', items: { type: 'string' } },
                requiredParts: { type: 'array', items: { type: 'string' } },
                estimatedCost: {
                    type: 'object',
                    additionalProperties: false,
                    required: ['min', 'max', 'currency', 'basis'],
                    properties: {
                        min: { type: 'number' },
                        max: { type: 'number' },
                        currency: { type: 'string', enum: ['CNY', 'USD'] },
                        basis: { type: 'string' },
                    },
                },
                sla: { type: 'string' },
                acceptanceCriteria: { type: 'array', items: { type: 'string' } },
            },
        },
        verification: {
            type: 'object',
            additionalProperties: false,
            required: ['checklist', 'photoRequirements', 'followUpWindow'],
            properties: {
                checklist: { type: 'array', items: { type: 'string' } },
                photoRequirements: { type: 'array', items: { type: 'string' } },
                followUpWindow: { type: 'string' },
            },
        },
        reporting: {
            type: 'object',
            additionalProperties: false,
            required: ['ownerSummary', 'metrics', 'archiveTags'],
            properties: {
                ownerSummary: { type: 'string' },
                metrics: { type: 'array', items: { type: 'string' } },
                archiveTags: { type: 'array', items: { type: 'string' } },
            },
        },
        nextActions: { type: 'array', items: { type: 'string' } },
    },
};

function normalizeLocale(locale?: string) {
    return locale === 'zh' ? 'zh' : 'en';
}

function normalizeSeverity(severity?: string): ProblemSeverity {
    if (severity === 'critical') return 'critical';
    if (severity === 'low') return 'low';
    return 'moderate';
}

function normalizeCategory(projectType?: string): string {
    const value = String(projectType || '').toLowerCase();
    if (['plumbing', 'electrical', 'hvac', 'appliance', 'structural', 'carpentry', 'painting'].includes(value)) return value;
    if (value.includes('水') || value.includes('pipe') || value.includes('plumb')) return 'plumbing';
    if (value.includes('电') || value.includes('electric')) return 'electrical';
    if (value.includes('墙') || value.includes('wall') || value.includes('struct')) return 'structural';
    if (value.includes('paint') || value.includes('粉刷')) return 'painting';
    return 'other';
}

function parseBudgetNumbers(budget?: string): number[] {
    const matches = String(budget || '').match(/\d+(?:\.\d+)?/g) || [];
    return matches.map(Number).filter(Number.isFinite);
}

function estimateCost(demand: ProblemSolvingDemand): CostEstimate {
    const explicit = parseBudgetNumbers(demand.budget);
    if (explicit.length >= 2) {
        return {
            min: Math.min(explicit[0], explicit[1]),
            max: Math.max(explicit[0], explicit[1]),
            currency: 'CNY',
            basis: 'User-stated budget range',
        };
    }

    const severity = normalizeSeverity(demand.severity);
    const category = normalizeCategory(demand.projectType);
    if (severity === 'critical') return { min: 800, max: 2500, currency: 'CNY', basis: 'Emergency dispatch and repair allowance' };
    if (category === 'electrical') return { min: 200, max: 900, currency: 'CNY', basis: 'Electrician inspection plus minor materials' };
    if (category === 'painting' || category === 'structural') return { min: 300, max: 1200, currency: 'CNY', basis: 'Wall/baseboard repair and finish materials' };
    if (severity === 'low') return { min: 60, max: 300, currency: 'CNY', basis: 'DIY materials or small-job callout' };
    return { min: 300, max: 1000, currency: 'CNY', basis: 'Standard local maintenance repair range' };
}

function extractOutputText(data: any): string {
    if (typeof data.output_text === 'string') return data.output_text;
    if (Array.isArray(data.output)) {
        const chunks: string[] = [];
        for (const item of data.output) {
            if (!Array.isArray(item?.content)) continue;
            for (const content of item.content) {
                if (typeof content?.text === 'string') chunks.push(content.text);
            }
        }
        if (chunks.length > 0) return chunks.join('\n');
    }
    throw new Error('OpenAI response did not include output text');
}

function mapOpenAiUsage(usage: any, modelName: string) {
    const inputTokens = usage?.input_tokens ?? usage?.prompt_tokens ?? 0;
    const outputTokens = usage?.output_tokens ?? usage?.completion_tokens ?? 0;
    return {
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        total_tokens: usage?.total_tokens ?? inputTokens + outputTokens,
        model_name: modelName,
    };
}

function normalizeLoop(raw: ProblemSolvingLoopResult, provider: ProblemSolvingLoopResult['provider'], modelName: string): ProblemSolvingLoopResult {
    return {
        ...raw,
        loopVersion: 'codex-six-stage-v1',
        provider,
        modelName,
        stages: stageIds.map((stageId) => raw.stages.find((stage) => stage.stageId === stageId)).filter(Boolean) as ProblemSolvingStageSummary[],
    };
}

export class ProblemSolvingAgent implements AiProvider {
    name = 'Codex-Problem-Solving-Loop';
    private apiKey = OPENAI_API_KEY;
    private baseUrl = OPENAI_BASE_URL.replace(/\/$/, '');
    private modelName = OPENAI_CODEX_MODEL;
    private hasApiKey = !!OPENAI_API_KEY;

    async solve(input: ProblemSolvingInput): Promise<AiResponse<ProblemSolvingLoopResult>> {
        if (!this.hasApiKey) {
            return {
                result: this.mockLoop(input),
                usage: { input_tokens: 0, output_tokens: 0, total_tokens: 0, model_name: `${this.modelName}-mock` },
            };
        }

        return withRetry(async () => {
            const response = await fetch(`${this.baseUrl}/responses`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`,
                },
                body: JSON.stringify({
                    model: this.modelName,
                    reasoning: { effort: process.env.OPENAI_CODEX_REASONING_EFFORT || 'medium' },
                    input: [
                        {
                            role: 'system',
                            content: this.systemPrompt(normalizeLocale(input.locale)),
                        },
                        {
                            role: 'user',
                            content: JSON.stringify({
                                demand: input.demand,
                                hasImage: !!input.image,
                                mimeType: input.mimeType,
                                context: input.context || {},
                            }),
                        },
                    ],
                    text: {
                        format: {
                            type: 'json_schema',
                            name: 'maintenance_problem_solving_loop',
                            strict: true,
                            schema: resultSchema,
                        },
                    },
                }),
            });

            if (!response.ok) {
                const error = await response.text();
                throw new Error(`OpenAI Responses API error: ${response.status} - ${error}`);
            }

            const data = await response.json() as { output_text?: string; output?: unknown[]; usage?: unknown };
            const parsed = parseAiJson<ProblemSolvingLoopResult>(extractOutputText(data), ['stages', 'diagnosis', 'deflection', 'dispatch', 'verification', 'reporting', 'nextActions']);
            return {
                result: normalizeLoop(parsed, 'openai-responses', this.modelName),
                usage: mapOpenAiUsage(data.usage, this.modelName),
            };
        }, 2);
    }

    private systemPrompt(locale: 'en' | 'zh') {
        const language = locale === 'zh' ? 'Chinese' : 'English';
        return `You are the Codex-grade problem-solving engine for a home maintenance operations product.
Use the product's six-stage operating loop exactly: intake, diagnosis, deflection, dispatch, verification, reporting.
Produce practical maintenance guidance, cost estimates, safety gates, dispatch criteria, verification checks, and owner reporting.
Do not introduce an 8-step or PDCA framing. Write every human-facing string in ${language}.
If safety risk is unclear, force human/professional escalation instead of DIY closure.`;
    }

    private mockLoop(input: ProblemSolvingInput): ProblemSolvingLoopResult {
        const locale = normalizeLocale(input.locale);
        const isZh = locale === 'zh';
        const demand = input.demand || {};
        const severity = normalizeSeverity(demand.severity);
        const category = normalizeCategory(demand.projectType);
        const cost = estimateCost(demand);
        const issueType = demand.scope || demand.projectType || (isZh ? '房屋维护问题' : 'Home maintenance issue');
        const lowRisk = severity === 'low' && category !== 'electrical';
        const professionalSkill = category === 'electrical'
            ? (isZh ? '电工' : 'electrician')
            : category === 'painting' || category === 'structural'
                ? (isZh ? '墙面/综合维修师傅' : 'wall repair / handyman')
                : category === 'plumbing'
                    ? (isZh ? '水工' : 'plumber')
                    : (isZh ? '综合维修师傅' : 'general handyman');

        const stages: ProblemSolvingStageSummary[] = [
            {
                stageId: 'intake',
                title: isZh ? '接入' : 'Intake',
                status: 'complete',
                ownerAgentId: 'intake',
                gate: 'auto',
                summary: isZh ? `已记录位置：${demand.area || '未指定'}，问题：${issueType}` : `Captured area: ${demand.area || 'unspecified'} and issue: ${issueType}`,
                touchpoints: isZh ? ['保留原始描述', '确认照片/文字上下文'] : ['Preserve original report', 'Confirm photo/text context'],
                evidenceRequired: isZh ? ['用户描述', '照片或现场说明'] : ['User description', 'Photo or site notes'],
            },
            {
                stageId: 'diagnosis',
                title: isZh ? '诊断' : 'Diagnosis',
                status: 'complete',
                ownerAgentId: 'diagnosis',
                gate: 'confidence',
                summary: isZh ? `初判为 ${category} 类，风险等级 ${severity}` : `Classified as ${category} with ${severity} severity`,
                touchpoints: isZh ? ['分类', '紧急度', '责任边界'] : ['Category', 'Urgency', 'Responsibility boundary'],
                evidenceRequired: isZh ? ['故障范围', '是否潮湿/发热/异味'] : ['Affected scope', 'Moisture/heat/odor check'],
            },
            {
                stageId: 'deflection',
                title: isZh ? 'DIY 分流' : 'DIY deflection',
                status: lowRisk ? 'ready' : 'blocked',
                ownerAgentId: 'deflection',
                gate: 'confidence',
                summary: lowRisk
                    ? (isZh ? '可先执行低风险自助检查，失败后再派单。' : 'Eligible for a low-risk self-serve check before dispatch.')
                    : (isZh ? '不建议自助关闭，应保留证据并派单。' : 'Not suitable for self-serve closure; preserve evidence and dispatch.'),
                touchpoints: isZh ? ['安全检查', '自助步骤', '失败升级'] : ['Safety check', 'Self-serve steps', 'Failed-attempt escalation'],
                evidenceRequired: isZh ? ['自助前后照片', '用户确认'] : ['Before/after self-serve photos', 'Tenant confirmation'],
            },
            {
                stageId: 'dispatch',
                title: isZh ? '派单' : 'Dispatch',
                status: 'ready',
                ownerAgentId: 'dispatch',
                gate: 'confidence',
                summary: isZh ? `建议匹配${professionalSkill}，预算 ${cost.currency} ${cost.min}-${cost.max}` : `Match a ${professionalSkill}; estimated budget ${cost.currency} ${cost.min}-${cost.max}`,
                touchpoints: isZh ? ['技能匹配', '材料清单', '报价区间'] : ['Skill match', 'Material list', 'Price band'],
                evidenceRequired: isZh ? ['报价', '预计到场时间', '材料确认'] : ['Quote', 'ETA', 'Parts confirmation'],
            },
            {
                stageId: 'verification',
                title: isZh ? '验收' : 'Verification',
                status: 'ready',
                ownerAgentId: 'verification',
                gate: 'auto',
                summary: isZh ? '完工后需照片、用户确认和短期复查。' : 'Closeout requires photos, user confirmation, and short follow-up.',
                touchpoints: isZh ? ['完工照片', '租客确认', '复发重开'] : ['Completion photos', 'Tenant confirmation', 'Reopen on relapse'],
                evidenceRequired: isZh ? ['完工近景/远景', '发票或收据'] : ['Close-up/wide completion photos', 'Invoice or receipt'],
            },
            {
                stageId: 'reporting',
                title: isZh ? '报表' : 'Reporting',
                status: 'ready',
                ownerAgentId: 'reporting',
                gate: 'auto',
                summary: isZh ? '生成业主可读的费用、响应、分流和质量记录。' : 'Generate owner-ready cost, response, deflection, and quality records.',
                touchpoints: isZh ? ['费用归档', 'SLA', '复盘标签'] : ['Cost archive', 'SLA', 'Learning tags'],
                evidenceRequired: isZh ? ['最终费用', '处理时长', '满意度'] : ['Final cost', 'Cycle time', 'Satisfaction'],
            },
        ];

        return {
            loopVersion: 'codex-six-stage-v1',
            provider: 'mock-codex-loop',
            modelName: `${this.modelName}-mock`,
            stages,
            diagnosis: {
                issueType,
                category,
                severity,
                confidence: input.image ? 0.82 : 0.72,
                responsibility: 'undetermined',
                rootCauseSummary: isZh
                    ? '基于现有文字/图片只能做运营级初判，需现场验证材料老化、安装缺陷或使用损耗。'
                    : 'Current text/photo context supports an operational triage only; verify aging material, installation defect, or user wear on site.',
                urgencyScore: severity === 'critical' ? 10 : severity === 'moderate' ? 6 : 3,
                safetyWarnings: category === 'electrical'
                    ? [isZh ? '涉及电气风险，不要自行拆开插座或带电操作。' : 'Electrical risk: do not open outlets or work on live circuits.']
                    : [],
            },
            deflection: {
                eligible: lowRisk,
                safetyGate: lowRisk
                    ? (isZh ? '无漏电、燃气、大面积漏水、结构松动或霉变扩散时才可尝试。' : 'Try only if there is no electrical, gas, major leak, structural, or spreading mold risk.')
                    : (isZh ? '该问题需要专业人员确认，不能用自助流程直接关闭。' : 'Professional confirmation is required; do not close through self-serve.'),
                selfServeSteps: lowRisk
                    ? (isZh ? ['拍摄问题近景和远景', '清理表面灰尘/潮气', '按建议做一次低风险检查', '上传处理后照片并等待确认'] : ['Capture close-up and wide photos', 'Clean surface dust/moisture', 'Run one low-risk check', 'Upload after photos for confirmation'])
                    : [],
                escalationTriggers: isZh
                    ? ['发现发热、异味、漏电或持续渗水', '自助后 24 小时内复发', '费用超过预算上限']
                    : ['Heat, odor, electrical leakage, or persistent water', 'Relapse within 24 hours', 'Quote exceeds budget ceiling'],
            },
            dispatch: {
                recommendedSkill: professionalSkill,
                requiredTools: isZh ? ['手电筒', '拍照记录', '基础手工具'] : ['Flashlight', 'Photo record', 'Basic hand tools'],
                requiredParts: category === 'painting' || category === 'structural'
                    ? (isZh ? ['修补腻子', '防霉密封胶', '同色乳胶漆'] : ['Patch compound', 'Anti-mold sealant', 'Matched wall paint'])
                    : (isZh ? ['待现场确认'] : ['Confirm on site']),
                estimatedCost: cost,
                sla: severity === 'critical'
                    ? (isZh ? '2 小时内响应' : 'Respond within 2 hours')
                    : (isZh ? '当天或本周内预约' : 'Same-day or this-week booking'),
                acceptanceCriteria: isZh
                    ? ['问题区域已修复且无复发迹象', '费用与报价一致或有变更说明', '照片和收据归档']
                    : ['Issue area fixed with no relapse signs', 'Cost matches quote or has variance note', 'Photos and receipt archived'],
            },
            verification: {
                checklist: isZh
                    ? ['完工近景/远景照片齐全', '用户确认可正常使用', '24-72 小时复查无复发']
                    : ['Close-up/wide completion photos captured', 'User confirms normal use', 'No relapse at 24-72 hour follow-up'],
                photoRequirements: isZh ? ['修复前', '施工中', '完工后', '复查后'] : ['Before', 'During', 'After', 'Follow-up'],
                followUpWindow: isZh ? '24-72 小时' : '24-72 hours',
            },
            reporting: {
                ownerSummary: isZh
                    ? `${issueType} 已进入六阶段闭环：诊断、分流、派单、验收和报表均有证据节点。`
                    : `${issueType} is handled through the six-stage loop with diagnosis, deflection, dispatch, verification, and reporting evidence.`,
                metrics: isZh ? ['响应时间', '分流结果', '最终费用', '一次修复率'] : ['Response time', 'Deflection outcome', 'Final cost', 'First-time fix'],
                archiveTags: [category, severity, lowRisk ? 'deflection-candidate' : 'dispatch-required'],
            },
            nextActions: lowRisk
                ? (isZh ? ['先执行 DIY 安全检查', '失败后匹配师傅', '保留前后照片'] : ['Run DIY safety check first', 'Dispatch if it fails', 'Keep before/after photos'])
                : (isZh ? ['直接匹配专业师傅', '要求报价和材料清单', '完工后执行验收回访'] : ['Match a professional directly', 'Require quote and parts list', 'Run closeout verification']),
        };
    }
}

export const problemSolvingAgent = new ProblemSolvingAgent();
