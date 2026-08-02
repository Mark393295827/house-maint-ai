type BilingualText = {
    zh: string;
    en: string;
};

export interface ClientMaintenancePlan {
    summary: BilingualText;
    requiredSkills: BilingualText[];
    requiredTools: BilingualText[];
    estimatedHours: number | null;
    costRange: {
        min: number | null;
        max: number | null;
        currency: string;
    };
    priority: 'immediate' | 'batch';
    steps: BilingualText[];
    safetyNotes: BilingualText[];
}

interface MaintenancePlanCardProps {
    plan: ClientMaintenancePlan;
    provider?: string;
}

type JsonRecord = Record<string, unknown>;

const SKILL_TRANSLATIONS: Record<string, string> = {
    plumber: '水管工',
    electrician: '电工',
    'hvac technician': '暖通空调技师',
    carpenter: '木工',
    painter: '油漆工',
    'appliance technician': '家电维修技师',
    'general maintenance technician': '综合维修技师',
};

const TOOL_TRANSLATIONS: Record<string, string> = {
    'pipe wrench': '管钳',
    "plumber's tape": '水管密封带',
    'plumbers tape': '水管密封带',
    'replacement pipe or coupling': '替换管段或接头',
    'adjustable wrench': '活动扳手',
    bucket: '水桶',
    flashlight: '手电筒',
    'safety gloves': '防护手套',
    screwdriver: '螺丝刀',
    'voltage tester': '验电笔',
};

const STEP_TRANSLATIONS: Record<string, string> = {
    'shut off water supply to the kitchen sink': '关闭厨房水槽的供水。',
    'drain remaining water from pipes': '排空管道中的余水。',
    'inspect the leak area and determine the cause (loose joint, crack, etc.)': '检查漏水区域并确定原因，例如接头松动或管道裂缝。',
    'replace or repair the damaged section (tighten joints, replace cracked pipe, etc.)': '维修或更换受损管段，例如拧紧接头或更换开裂管道。',
    'turn water supply back on and test for leaks': '恢复供水并检查是否仍有渗漏。',
    'clean up the work area and dispose of damaged materials': '清理施工区域并妥善处理损坏材料。',
};

function asRecord(value: unknown): JsonRecord | null {
    return value && typeof value === 'object' && !Array.isArray(value)
        ? value as JsonRecord
        : null;
}

function asString(value: unknown): string | null {
    return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function normalizeLookupKey(value: string): string {
    return value
        .trim()
        .toLowerCase()
        .replace(/[。.!]+$/g, '')
        .replace(/\s+/g, ' ');
}

function unwrapPlan(value: unknown): JsonRecord | null {
    let current = value;

    for (let depth = 0; depth < 5; depth += 1) {
        if (typeof current === 'string') {
            const cleaned = current.replace(/```json/gi, '').replace(/```/g, '').trim();
            try {
                current = JSON.parse(cleaned);
                continue;
            } catch {
                return null;
            }
        }

        const record = asRecord(current);
        if (!record) return null;

        if (record.result !== undefined) {
            current = record.result;
            continue;
        }
        if (record.plan !== undefined) {
            current = record.plan;
            continue;
        }
        if (record.resolution_plan !== undefined) {
            current = record.resolution_plan;
            continue;
        }

        return record;
    }

    return asRecord(current);
}

function toNumber(value: unknown): number | null {
    const number = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(number) ? number : null;
}

function toBilingualText(
    value: unknown,
    translations: Record<string, string> = {},
    fallbackZh = '该项需由维修人员现场确认。'
): BilingualText | null {
    const record = asRecord(value);
    if (record) {
        const zh = asString(record.zh) || asString(record.chinese) || asString(record.cn);
        const en = asString(record.en) || asString(record.english);
        if (zh && en) return { zh, en };
        if (en) {
            return {
                zh: translations[normalizeLookupKey(en)] || fallbackZh,
                en,
            };
        }
        if (zh) {
            return {
                zh,
                en: 'Please follow the corresponding Chinese instruction.',
            };
        }
        return null;
    }

    const text = asString(value);
    if (!text) return null;
    if (/[\u3400-\u9fff]/u.test(text)) {
        return {
            zh: text,
            en: 'Please follow the corresponding Chinese instruction.',
        };
    }

    return {
        zh: translations[normalizeLookupKey(text)] || fallbackZh,
        en: text,
    };
}

function toBilingualList(
    value: unknown,
    translations: Record<string, string>,
    fallbackZh: string
): BilingualText[] {
    if (!Array.isArray(value)) return [];
    return value
        .map(item => toBilingualText(item, translations, fallbackZh))
        .filter((item): item is BilingualText => item !== null);
}

export function normalizeMaintenancePlan(value: unknown): ClientMaintenancePlan | null {
    const raw = unwrapPlan(value);
    if (!raw || asString(raw.error)) return null;

    const cost = asRecord(raw.cost_range) || asRecord(raw.estimated_cost_range) || {};
    const requiredSkills = toBilingualList(
        raw.required_skills,
        SKILL_TRANSLATIONS,
        '专业维修技能'
    );
    const requiredTools = toBilingualList(
        raw.required_tools,
        TOOL_TRANSLATIONS,
        '专业维修工具'
    );
    const steps = toBilingualList(
        raw.steps,
        STEP_TRANSLATIONS,
        '该步骤需由维修人员结合现场情况确认。'
    );
    const safetyNotes = toBilingualList(
        raw.safety_notes,
        {},
        '请在确保现场安全后再开始操作。'
    );
    const summary = toBilingualText(
        raw.customer_summary || raw.summary,
        {},
        '按照以下步骤完成维修，并在恢复使用前进行安全检查。'
    ) || {
        zh: '按照以下步骤完成维修，并在恢复使用前进行安全检查。',
        en: asString(raw.explanation)
            || 'Complete the repair using the steps below and perform a safety check before restoring service.',
    };

    const hasPlanContent = steps.length > 0
        || requiredSkills.length > 0
        || requiredTools.length > 0
        || asString(raw.customer_summary) !== null
        || asRecord(raw.customer_summary) !== null;
    if (!hasPlanContent) return null;

    return {
        summary,
        requiredSkills,
        requiredTools,
        estimatedHours: toNumber(raw.estimated_hours),
        costRange: {
            min: toNumber(cost.min),
            max: toNumber(cost.max),
            currency: asString(cost.currency) || 'CNY',
        },
        priority: asString(raw.priority_protocol)?.toLowerCase() === 'immediate'
            ? 'immediate'
            : 'batch',
        steps,
        safetyNotes,
    };
}

function formatCost(plan: ClientMaintenancePlan): string {
    const { min, max, currency } = plan.costRange;
    if (min === null && max === null) return '现场确认 / On-site quote';

    const symbol = currency.toUpperCase() === 'CNY'
        ? '¥'
        : currency.toUpperCase() === 'USD'
            ? '$'
            : `${currency.toUpperCase()} `;
    if (min !== null && max !== null) return `${symbol}${min}–${symbol}${max}`;
    return `${symbol}${min ?? max}`;
}

const MaintenancePlanCard = ({ plan, provider = 'DeepSeek R1' }: MaintenancePlanCardProps) => {
    const priority = plan.priority === 'immediate'
        ? { zh: '立即处理', en: 'Immediate', className: 'bg-red-50 text-red-700 ring-red-100' }
        : { zh: '计划处理', en: 'Scheduled', className: 'bg-amber-50 text-amber-700 ring-amber-100' };

    return (
        <article
            aria-label="客户维修方案 / Client Maintenance Plan"
            className="overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-sm dark:border-blue-900/40 dark:bg-gray-900"
        >
            <header className="border-b border-gray-100 bg-gradient-to-r from-blue-50 to-white px-5 py-4 dark:border-gray-800 dark:from-blue-950/40 dark:to-gray-900">
                <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined rounded-xl bg-blue-600 p-2 text-[20px] text-white" aria-hidden="true">
                            home_repair_service
                        </span>
                        <div>
                            <h3 className="text-[16px] font-black text-gray-900 dark:text-white">
                                客户维修方案
                            </h3>
                            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-blue-700 dark:text-blue-300">
                                Client Maintenance Plan
                            </p>
                        </div>
                    </div>
                    <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-[10px] font-bold text-gray-500 ring-1 ring-gray-100 dark:bg-gray-800 dark:ring-gray-700">
                        {provider}
                    </span>
                </div>
            </header>

            <div className="space-y-5 p-5">
                <section aria-labelledby="plan-summary-heading">
                    <h4 id="plan-summary-heading" className="text-[11px] font-black uppercase tracking-wider text-gray-500">
                        方案概述 / Plan summary
                    </h4>
                    <p className="mt-2 text-[14px] font-semibold leading-6 text-gray-900 dark:text-gray-100">
                        {plan.summary.zh}
                    </p>
                    <p lang="en" className="mt-1 text-[12px] leading-5 text-gray-500 dark:text-gray-400">
                        {plan.summary.en}
                    </p>
                </section>

                <dl className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    <div className="rounded-xl bg-gray-50 p-3 dark:bg-gray-800">
                        <dt className="text-[10px] font-bold text-gray-500">优先级 / Priority</dt>
                        <dd className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-[11px] font-black ring-1 ${priority.className}`}>
                            {priority.zh} / {priority.en}
                        </dd>
                    </div>
                    <div className="rounded-xl bg-gray-50 p-3 dark:bg-gray-800">
                        <dt className="text-[10px] font-bold text-gray-500">预计工时 / Duration</dt>
                        <dd className="mt-2 text-[13px] font-black text-gray-900 dark:text-white">
                            {plan.estimatedHours === null
                                ? '现场确认 / On-site'
                                : `${plan.estimatedHours} 小时 / ${plan.estimatedHours} hr`}
                        </dd>
                    </div>
                    <div className="rounded-xl bg-gray-50 p-3 dark:bg-gray-800">
                        <dt className="text-[10px] font-bold text-gray-500">预算 / Estimate</dt>
                        <dd className="mt-2 text-[13px] font-black text-gray-900 dark:text-white">
                            {formatCost(plan)}
                        </dd>
                    </div>
                </dl>

                {(plan.requiredSkills.length > 0 || plan.requiredTools.length > 0) && (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        {plan.requiredSkills.length > 0 && (
                            <section>
                                <h4 className="text-[11px] font-black text-gray-500">所需技能 / Required skills</h4>
                                <div className="mt-2 flex flex-wrap gap-2">
                                    {plan.requiredSkills.map((skill, index) => (
                                        <span key={`${skill.en}-${index}`} className="rounded-lg bg-blue-50 px-2.5 py-1.5 text-[11px] font-bold text-blue-800 dark:bg-blue-950/40 dark:text-blue-200">
                                            {skill.zh} / {skill.en}
                                        </span>
                                    ))}
                                </div>
                            </section>
                        )}
                        {plan.requiredTools.length > 0 && (
                            <section>
                                <h4 className="text-[11px] font-black text-gray-500">工具材料 / Tools & materials</h4>
                                <div className="mt-2 flex flex-wrap gap-2">
                                    {plan.requiredTools.map((tool, index) => (
                                        <span key={`${tool.en}-${index}`} className="rounded-lg bg-gray-100 px-2.5 py-1.5 text-[11px] font-bold text-gray-700 dark:bg-gray-800 dark:text-gray-200">
                                            {tool.zh} / {tool.en}
                                        </span>
                                    ))}
                                </div>
                            </section>
                        )}
                    </div>
                )}

                {plan.steps.length > 0 && (
                    <section aria-labelledby="work-steps-heading">
                        <h4 id="work-steps-heading" className="text-[11px] font-black uppercase tracking-wider text-gray-500">
                            施工步骤 / Work steps
                        </h4>
                        <ol className="mt-3 space-y-3">
                            {plan.steps.map((step, index) => (
                                <li key={`${step.en}-${index}`} className="flex gap-3 rounded-xl border border-gray-100 p-3 dark:border-gray-800">
                                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-600 text-[11px] font-black text-white">
                                        {index + 1}
                                    </span>
                                    <div className="min-w-0">
                                        <p className="text-[13px] font-bold leading-5 text-gray-900 dark:text-gray-100">{step.zh}</p>
                                        <p lang="en" className="mt-1 text-[11px] leading-5 text-gray-500 dark:text-gray-400">{step.en}</p>
                                    </div>
                                </li>
                            ))}
                        </ol>
                    </section>
                )}

                {plan.safetyNotes.length > 0 && (
                    <section className="rounded-xl bg-amber-50 p-3 text-amber-900 ring-1 ring-amber-100 dark:bg-amber-950/30 dark:text-amber-100 dark:ring-amber-900/50">
                        <h4 className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider">
                            <span className="material-symbols-outlined text-[17px]" aria-hidden="true">warning</span>
                            安全提示 / Safety
                        </h4>
                        {plan.safetyNotes.map((note, index) => (
                            <div key={`${note.en}-${index}`} className="mt-2">
                                <p className="text-[12px] font-bold leading-5">{note.zh}</p>
                                <p lang="en" className="text-[11px] leading-5 opacity-75">{note.en}</p>
                            </div>
                        ))}
                    </section>
                )}

                <p className="border-t border-gray-100 pt-4 text-[10px] leading-4 text-gray-400 dark:border-gray-800">
                    AI 初步方案，仅供客户确认；开工前由维修人员核实现场条件、价格和安全措施。
                    <span lang="en" className="mt-1 block">
                        AI-generated preliminary plan for client review. The technician must confirm site conditions, price, and safety measures before work begins.
                    </span>
                </p>
            </div>
        </article>
    );
};

export default MaintenancePlanCard;
