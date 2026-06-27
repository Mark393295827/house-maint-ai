import * as Sentry from '@sentry/node';

// ============ Retry & Validation Helpers ============

/**
 * Retry an async function with exponential backoff
 */
export async function withRetry<T>(
    fn: () => Promise<T>,
    maxAttempts: number = 3,
    baseDelayMs: number = 1000
): Promise<T> {
    let lastError: Error | undefined;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));
            if (attempt < maxAttempts) {
                const delay = baseDelayMs * Math.pow(2, attempt - 1);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }
    throw lastError;
}

/**
 * Safely parse AI JSON response and validate expected fields
 */
export function parseAiJson<T>(raw: string, requiredFields: string[]): T {
    const cleaned = raw.replace(/```json/g, '').replace(/```/g, '').trim();
    let parsed: T;
    try {
        parsed = JSON.parse(cleaned);
    } catch {
        throw new Error(`Invalid JSON from AI: ${cleaned.substring(0, 200)}`);
    }
    for (const field of requiredFields) {
        if (!(field in (parsed as Record<string, unknown>))) {
            throw new Error(`AI response missing required field: ${field}`);
        }
    }
    return parsed;
}

function asRecord(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object' ? value as Record<string, unknown> : {};
}

function firstString(...values: unknown[]): string | undefined {
    for (const value of values) {
        if (typeof value === 'string' && value.trim()) return value.trim();
    }
    return undefined;
}

function normalizeConfidenceScore(value: unknown): number {
    const raw = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
    if (!Number.isFinite(raw)) return 0.7;
    if (raw > 10) return Math.min(1, Math.max(0, raw / 100));
    if (raw > 1) return Math.min(1, Math.max(0, raw / 10));
    return Math.min(1, Math.max(0, raw));
}

function normalizeUrgencyScore(value: unknown, severity: DiagnosisResult['diagnosis']['severity']): number {
    const raw = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
    if (Number.isFinite(raw)) return Math.min(10, Math.max(0, Math.round(raw)));
    if (severity === 'critical') return 10;
    if (severity === 'moderate') return 5;
    return 2;
}

function normalizeSeverity(value: unknown): DiagnosisResult['diagnosis']['severity'] {
    const severity = String(value || '').trim().toLowerCase();
    if (['critical', 'severe', 'high', 'urgent', 'emergency', 'immediate'].includes(severity)) return 'critical';
    if (['low', 'minor', 'cosmetic', 'not_applicable', 'none'].includes(severity)) return 'cosmetic';
    return 'moderate';
}

function normalizeCategory(value: unknown): string {
    const category = String(value || '').trim().toLowerCase();
    if (!category) return 'other';

    const aliases: Record<string, string> = {
        plumbing: 'plumbing',
        pipe: 'plumbing',
        water: 'plumbing',
        leak: 'plumbing',
        electrical: 'electrical',
        electric: 'electrical',
        outlet: 'electrical',
        hvac: 'hvac',
        ac: 'hvac',
        aircon: 'hvac',
        appliance: 'appliance',
        appliances: 'appliance',
        structural: 'structural',
        wall: 'structural',
        ceiling: 'structural',
        painting: 'painting',
        paint: 'painting',
        carpentry: 'carpentry',
        woodwork: 'carpentry',
    };

    return aliases[category] || category;
}

function normalizeStringArray(value: unknown): string[] {
    if (!Array.isArray(value)) return [];
    return value.filter((item): item is string => typeof item === 'string' && !!item.trim()).map(item => item.trim());
}

/**
 * Coerce varied Gemini outputs into the stable nested diagnosis contract used by
 * the rest of the pipeline. This protects downstream matching from model drift
 * such as `confidence_score: 5`, title-cased severity, or flat JSON responses.
 */
export function normalizeDiagnosisResult(raw: unknown): DiagnosisResult {
    const root = asRecord(raw);
    const diagnosis = asRecord(root.diagnosis);
    const source = Object.keys(diagnosis).length > 0 ? diagnosis : root;
    const solution = asRecord(root.solution);
    const workerCriteria = asRecord(root.worker_matching_criteria);

    const severity = normalizeSeverity(source.severity);
    const category = normalizeCategory(firstString(source.category, source.issue_category) || 'other');
    const recommendedAction = firstString(root.recommended_next_action, solution.recommended_next_action);
    const steps = normalizeStringArray(solution.steps);

    return {
        diagnosis: {
            issue_type: firstString(source.issue_type, source.issue_identified, root.issue_type) || 'Unknown issue',
            severity,
            diagnosis_summary: firstString(source.diagnosis_summary, source.summary, root.diagnosis_summary) || 'No diagnosis summary provided.',
            confidence_score: normalizeConfidenceScore(source.confidence_score ?? root.confidence_score),
            category,
            urgency_score: normalizeUrgencyScore(source.urgency_score ?? root.urgency_score, severity),
            safety_warning: firstString(source.safety_warning, root.safety_warning) || null,
        },
        solution: {
            can_diy: typeof solution.can_diy === 'boolean'
                ? solution.can_diy
                : typeof root.can_diy === 'boolean'
                    ? root.can_diy
                    : false,
            steps: steps.length > 0 ? steps : recommendedAction ? [recommendedAction] : [],
            required_parts: Array.isArray(solution.required_parts) ? solution.required_parts as DiagnosisResult['solution']['required_parts'] : [],
            tools_needed: normalizeStringArray(solution.tools_needed),
        },
        worker_matching_criteria: {
            required_skill: firstString(workerCriteria.required_skill, workerCriteria.skill, category) || 'general',
            urgency: firstString(workerCriteria.urgency) || (severity === 'critical' ? 'immediate' : 'flexible'),
            estimated_man_hours: firstString(workerCriteria.estimated_man_hours) || 'unknown',
        },
    };
}

// ============ Common Interfaces ============

// OpenClaw v1.0 - CLAW 1: DIAGNOSTICS (Perception Layer)
export interface DiagnosisResult {
    diagnosis: {
        issue_type: string;
        severity: 'critical' | 'moderate' | 'cosmetic';
        diagnosis_summary: string;
        confidence_score: number; // 0.0 - 1.0
        // Legacy fields for UI compatibility (can be mapped)
        category?: string;
        urgency_score?: number; // 0-10
        safety_warning?: string | null;
    };
    solution: {
        can_diy: boolean;
        steps: string[];
        required_parts: Array<{ name: string; spec: string; estimated_price: string }>;
        tools_needed: string[];
    };
    worker_matching_criteria: {
        required_skill: string;
        urgency: string;
        estimated_man_hours: string;
    };
}

export interface RepairPattern {
    problem_type: string;
    context_signature: string; // e.g., "samsung, fridge, cooling, relay"
    solution: {
        steps: string[];
        parts_spec: string[];
        estimated_cost_range?: string;
    };
}

// ============ Blue Ocean Agent Interfaces (S1/S2/S3) ============

// S1: Material & Cost Prediction Agent
export interface MaterialBOM {
    parts: Array<{
        name: string;           // "P-TRAP 管弯" 
        specification: string;  // "PVC 50mm"
        quantity: number;
        estimated_price_cny: number;
        search_query: string;   // Taobao/JD search query
    }>;
    tools_needed: string[];
    total_estimated_cost: { min: number; max: number };
    confidence_score: number;   // 0.0-1.0
    notes: string;              // Installation tips, brand recommendations
}

// S2: Fault Attribution Agent (责任判定)
export interface FaultAttribution {
    attribution: 'landlord' | 'tenant' | 'shared' | 'undetermined';
    confidence_score: number;   // 0.0-1.0
    evidence: string[];         // List of visual/contextual evidence points
    reasoning: string;          // Detailed explanation  
    wear_indicators: string[];  // Signs of normal wear vs. damage
    sanya_climate_factors: string[]; // Salt corrosion, humidity-related wear
    legal_reference: string;    // Relevant Chinese rental law
}

// S3: Vacation Rental Turnover Agent (度假房交接)
export interface TurnoverReport {
    overall_condition: 'excellent' | 'good' | 'fair' | 'damaged';
    damage_items: Array<{
        location: string;       // "客厅沙发左扶手" 
        description: string;    // "明显划痕，约15cm长"
        severity: 'minor' | 'moderate' | 'major';
        estimated_repair_cost: number;
        is_new_damage: boolean; // vs. pre-existing
    }>;
    missing_items: string[];
    cleanliness_score: number;  // 1-10
    summary: string;            // One-paragraph summary for dispute filing
    evidence_timestamps: string; // ISO date
}

// ============ Executive Agent Interfaces (CFO/COO) ============

export interface StrategyAlert {
    severity: 'info' | 'warning' | 'critical';
    dimension: 'tam' | 'tenx' | 'team' | 'financials';
    rule_triggered: string;     // Which CORE_STRATEGY rule fired
    metric_name: string;        // e.g., "daily_ai_spend"
    metric_value: number;
    threshold: number;
    recommended_action: string;
    requires_human_approval: boolean;
}

export interface ExecutiveInsight {
    agent: 'cfo' | 'coo' | 'cmo';
    period: string;             // "2026-03" 
    kpis: Record<string, number>;
    alerts: StrategyAlert[];
    narrative: string;          // AI-generated executive summary
}

// ============ Research Swarm Interfaces (调研代理群) ============

export interface PainPointAnalysis {
    sector: string;
    top_complaints: Array<{
        keyword: string;          // "修不好", "乱报价", "工人不来"
        frequency_score: number;  // 1-10 relative frequency
        source: string;           // "小红书", "抖音", "行业论坛"
        implication: string;      // What 10X opportunity this reveals
    }>;
    pain_density_score: number;   // 0-100, higher = more pain = more opportunity
    primary_bottleneck: 'communication' | 'scheduling' | 'pricing' | 'quality' | 'trust';
    ai_intervention_point: string; // Where AI has the highest leverage
}

export interface DigitalVacuumScore {
    sector: string;
    manual_hours_per_day: number;
    total_operational_hours: number;
    vacuum_ratio: number;         // manual/total, 0.0-1.0
    vacuum_grade: 'A' | 'B' | 'C' | 'D'; // A=perfect target, D=already digitized
    key_manual_processes: string[];
    automation_feasibility: number; // 0-100
}

export interface TAMExpansion {
    sector: string;
    current_tam_cny: number;
    ai_cost_reduction_pct: number; // e.g. 90 = 90% cost reduction
    suppressed_demand_multiplier: number; // e.g. 3.0 = 3x more customers unlocked
    expanded_tam_cny: number;     // current_tam * (1 + suppressed_demand)
    long_tail_segments: string[]; // New customer categories unlocked by AI
    timeline_to_capture: string;  // "6 months", "2 years"
}

export interface IndustryResearchReport {
    sector: string;
    generated_at: string;
    pain_points: PainPointAnalysis;
    digital_vacuum: DigitalVacuumScore;
    tam_expansion: TAMExpansion;
    go_no_go: GoNoGoChecklist;
    executive_summary: string;    // AI-generated one-paragraph verdict
    confidence_score: number;     // 0-100
}

export interface GoNoGoChecklist {
    incremental_demand: { pass: boolean; evidence: string };
    tenx_possibility: { pass: boolean; evidence: string };
    competitive_moat: { pass: boolean; evidence: string };
    overall_verdict: 'GO' | 'NO_GO' | 'NEEDS_MORE_DATA';
}

export interface ChatMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

export interface AiProvider {
    name: string;
}

export interface AiUsage {
    input_tokens: number;
    output_tokens: number;
    total_tokens: number;
    model_name?: string;
}

export interface AiResponse<T> {
    result: T;
    usage: AiUsage;
}
