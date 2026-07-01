export type SupportedLocale = 'en' | 'zh';

type LocalizedText = Record<SupportedLocale, string>;

export interface OperatingStage {
    id: 'intake' | 'diagnosis' | 'deflection' | 'dispatch' | 'verification' | 'reporting';
    icon: string;
    ownerAgentId: string;
    gate: 'auto' | 'confidence' | 'human';
    metric: LocalizedText;
    title: LocalizedText;
    description: LocalizedText;
    details: LocalizedText[];
}

export interface OperatingStageCopy {
    id: OperatingStage['id'];
    icon: string;
    ownerAgentId: string;
    gate: OperatingStage['gate'];
    metric: string;
    title: string;
    description: string;
    details: string[];
}

export const OPERATING_STAGES: OperatingStage[] = [
    {
        id: 'intake',
        icon: 'forum',
        ownerAgentId: 'intake',
        gate: 'auto',
        metric: { en: 'Receipt in 6 seconds', zh: '6 秒内确认收到' },
        title: { en: '24/7 WeChat intake', zh: '24/7 微信接入' },
        description: {
            en: 'Tenants report through Mini Program, Official Account, or WeChat groups. AI identifies the sender, property, history, and likely responsibility boundary.',
            zh: '租客用小程序、公众号或微信群发送照片、语音、视频，AI 自动识别住户、房源、历史工单和责任边界。',
        },
        details: [
            { en: 'Classifies tenant, owner, and manager roles', zh: '识别租客/业主/物业角色' },
            { en: 'Extracts unit, appliance, location, and issue', zh: '提取房号、设备、故障位置' },
            { en: 'Keeps a complete audit record', zh: '保留完整审计记录' },
        ],
    },
    {
        id: 'diagnosis',
        icon: 'camera_enhance',
        ownerAgentId: 'diagnosis',
        gate: 'confidence',
        metric: { en: '85%+ target on top categories', zh: 'Top 10 品类目标 85%+' },
        title: { en: 'AI diagnosis and liability gate', zh: 'AI 诊断与责任判断' },
        description: {
            en: 'Gemini and DeepSeek classify issue type, severity, landlord-vs-tenant responsibility, and the next best action.',
            zh: 'Gemini/DeepSeek 多模型判断故障类型、严重等级、是否房东责任，并输出可读的处理建议。',
        },
        details: [
            { en: 'Plumbing, electrical, HVAC, and appliance first', zh: '漏水、电路、空调、家电优先覆盖' },
            { en: 'Critical issues escalate automatically', zh: '高危事件自动升级' },
            { en: 'Evidence packs are archived', zh: '证据包自动归档' },
        ],
    },
    {
        id: 'deflection',
        icon: 'self_improvement',
        ownerAgentId: 'deflection',
        gate: 'confidence',
        metric: { en: '20%+ deflection target', zh: '20%+ 分流目标' },
        title: { en: 'DIY deflection', zh: 'DIY 分流' },
        description: {
            en: 'Low-risk cases receive in-WeChat guides before dispatch, reducing unnecessary truck rolls and wasted free estimates.',
            zh: '低风险问题先发送微信内图文/视频指引，让租客自助解决，避免无效上门和免费估价浪费。',
        },
        details: [
            { en: 'Breaker reset, filter cleaning, and simple fixes', zh: '断路器复位、滤网清洗等标准化' },
            { en: 'Tenant confirmation closes the loop', zh: '租客确认后自动关闭' },
            { en: 'Failed attempts move to dispatch', zh: '失败再进入派单' },
        ],
    },
    {
        id: 'dispatch',
        icon: 'near_me',
        ownerAgentId: 'dispatch',
        gate: 'confidence',
        metric: { en: '5-minute acceptance target', zh: '5 分钟内接单目标' },
        title: { en: 'Geo-ranked worker dispatch', zh: '师傅智能派单' },
        description: {
            en: 'Nearby workers receive structured leads ranked by skill fit, distance, rating, response speed, required parts, and pricing band.',
            zh: '根据技能、距离、评分、响应速度、材料需求和报价区间，向附近师傅推送结构化订单。',
        },
        details: [
            { en: 'One-tap job acceptance', zh: '一键接单' },
            { en: 'Tools and materials checklist', zh: '带工具/材料清单' },
            { en: 'Ready for WeChat Pay escrow', zh: '微信支付托管准备' },
        ],
    },
    {
        id: 'verification',
        icon: 'fact_check',
        ownerAgentId: 'verification',
        gate: 'auto',
        metric: { en: '0 manual chasing', zh: '0 人工追单' },
        title: { en: 'Repair verification', zh: '维修验收回访' },
        description: {
            en: 'After completion photos are uploaded, AI checks with the tenant, follows up if they go quiet, and only closes once the fix is confirmed.',
            zh: '师傅上传完工照片后，AI 自动询问租客是否修好，沉默时继续追问，确认有效后再关闭工单。',
        },
        details: [
            { en: 'Photo and invoice archive', zh: '完工照片和发票归档' },
            { en: 'Tenant repair confirmation', zh: '租客确认修复' },
            { en: 'Auto-reopen on relapse', zh: '复发自动重开' },
        ],
    },
    {
        id: 'reporting',
        icon: 'analytics',
        ownerAgentId: 'reporting',
        gate: 'auto',
        metric: { en: 'Owner-ready reporting', zh: '业主可读报表' },
        title: { en: 'Owner reports and SLA', zh: '业主报表和 SLA' },
        description: {
            en: 'Managers and absentee owners see one source of truth: cost, response time, deflection, worker quality, and data compliance status.',
            zh: '物业经理和外地业主看到同一套事实：费用、响应速度、分流率、师傅表现和数据合规状态。',
        },
        details: [
            { en: 'PIPL-aware data boundaries', zh: 'PIPL 数据边界' },
            { en: 'Monthly owner reports', zh: '月度业主报告' },
            { en: 'Worker whitelist scoring', zh: '师傅白名单评分' },
        ],
    },
];

export const getOperatingStageCopies = (locale: SupportedLocale): OperatingStageCopy[] =>
    OPERATING_STAGES.map((stage) => ({
        id: stage.id,
        icon: stage.icon,
        ownerAgentId: stage.ownerAgentId,
        gate: stage.gate,
        metric: stage.metric[locale],
        title: stage.title[locale],
        description: stage.description[locale],
        details: stage.details.map((detail) => detail[locale]),
    }));

export const getProofMetrics = (locale: SupportedLocale) => [
    { value: '30s', label: locale === 'zh' ? '多模态诊断出报告' : 'multimodal triage report' },
    { value: '20%+', label: locale === 'zh' ? '目标 DIY 工单分流率' : 'target DIY ticket deflection' },
    { value: locale === 'zh' ? '¥10' : 'RMB10', label: locale === 'zh' ? '每门每月 SaaS 标杆价' : 'per-door monthly SaaS benchmark' },
    { value: '0', label: locale === 'zh' ? '租客额外下载 App' : 'extra apps for tenants' },
];

export const getOperationalResults = (locale: SupportedLocale) => [
    { value: '30s', label: locale === 'zh' ? '租客提交到结构化工单' : 'tenant report to structured ticket' },
    { value: '85%+', label: locale === 'zh' ? 'Top 10 故障诊断准确率目标' : 'target accuracy across top 10 issue types' },
    { value: '20%+', label: locale === 'zh' ? 'DIY 分流率 P0 指标' : 'P0 DIY deflection metric' },
    { value: '100%', label: locale === 'zh' ? '微信内完成主要用户流程' : 'primary flows inside WeChat' },
];

export const calculatePortfolioImpact = ({
    doors,
    managers,
    salary,
}: {
    doors: number;
    managers: number;
    salary: number;
}) => {
    const annualCoordinationValue = managers * salary * 0.38;
    const deflectedJobs = Math.round(doors * 0.7 * 12 * 0.22);
    const deflectionValue = deflectedJobs * 160;
    const hoursBack = Math.round((doors * 0.028 + managers * 1.4) * 10) / 10;
    const addedDoors = Math.max(0, Math.round(managers * 180 - doors));

    return {
        annualValue: Math.round(annualCoordinationValue + deflectionValue),
        deflectedJobs,
        hoursBack,
        addedDoors,
    };
};

export const getReportOperatingStageId = (status: string): OperatingStage['id'] => {
    switch (status) {
        case 'pending':
            return 'intake';
        case 'matching':
            return 'diagnosis';
        case 'matched':
            return 'dispatch';
        case 'in_progress':
            return 'verification';
        case 'completed':
            return 'reporting';
        default:
            return 'intake';
    }
};
