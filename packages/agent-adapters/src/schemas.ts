import {
    CAPABILITY_IDS,
    type BilingualText,
    type CapabilityId,
    type CriticCheck,
    type CriticPayload,
    type StrictPayloadSchema,
} from './types.js';

type UnknownRecord = Record<string, unknown>;

function record(value: unknown, path: string): UnknownRecord {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        throw new TypeError(`${path} must be an object`);
    }
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
        throw new TypeError(`${path} must be a plain object`);
    }
    return value as UnknownRecord;
}

function strict(value: unknown, path: string, keys: readonly string[]): UnknownRecord {
    const parsed = record(value, path);
    const allowed = new Set(keys);
    const unexpected = Object.keys(parsed).find((key) => !allowed.has(key));
    if (unexpected) throw new TypeError(`${path}.${unexpected} is not allowed`);
    for (const key of keys) {
        if (!(key in parsed)) throw new TypeError(`${path}.${key} is required`);
    }
    return parsed;
}

function text(value: unknown, path: string, maximum = 500): string {
    if (typeof value !== 'string') throw new TypeError(`${path} must be a string`);
    const normalized = value.trim();
    if (normalized.length < 1 || normalized.length > maximum) {
        throw new TypeError(`${path} must contain 1-${maximum} characters`);
    }
    return normalized;
}

function optionalText(value: unknown, path: string, maximum = 500): string | null {
    return value === null ? null : text(value, path, maximum);
}

function boolean(value: unknown, path: string): boolean {
    if (typeof value !== 'boolean') throw new TypeError(`${path} must be a boolean`);
    return value;
}

function literal<T extends string | boolean>(value: unknown, expected: T, path: string): T {
    if (value !== expected) throw new TypeError(`${path} must equal ${String(expected)}`);
    return expected;
}

function finiteNumber(value: unknown, path: string, minimum: number, maximum: number): number {
    if (typeof value !== 'number' || !Number.isFinite(value) || value < minimum || value > maximum) {
        throw new TypeError(`${path} must be between ${minimum} and ${maximum}`);
    }
    return value;
}

function integer(value: unknown, path: string, minimum: number, maximum: number): number {
    const parsed = finiteNumber(value, path, minimum, maximum);
    if (!Number.isInteger(parsed)) throw new TypeError(`${path} must be an integer`);
    return parsed;
}

function oneOf<T extends string>(value: unknown, path: string, values: readonly T[]): T {
    if (typeof value !== 'string' || !values.includes(value as T)) {
        throw new TypeError(`${path} has an unsupported value`);
    }
    return value as T;
}

function list<T>(
    value: unknown,
    path: string,
    parseItem: (item: unknown, itemPath: string) => T,
    maximum: number,
    minimum = 0,
): T[] {
    if (!Array.isArray(value) || value.length < minimum || value.length > maximum) {
        throw new TypeError(`${path} must contain ${minimum}-${maximum} items`);
    }
    return value.map((item, index) => parseItem(item, `${path}[${index}]`));
}

function stringList(value: unknown, path: string, maximum: number, itemMaximum = 240): string[] {
    return list(value, path, (item, itemPath) => text(item, itemPath, itemMaximum), maximum);
}

function bilingual(value: unknown, path: string): BilingualText {
    const parsed = strict(value, path, ['zh_cn', 'en_us']);
    return {
        zh_cn: text(parsed.zh_cn, `${path}.zh_cn`, 240),
        en_us: text(parsed.en_us, `${path}.en_us`, 360),
    };
}

function nullableBilingual(value: unknown, path: string): BilingualText | null {
    return value === null ? null : bilingual(value, path);
}

function range(value: unknown, path: string, maximum = 10_000_000): { min: number; max: number } {
    const parsed = strict(value, path, ['min', 'max']);
    const min = finiteNumber(parsed.min, `${path}.min`, 0, maximum);
    const max = finiteNumber(parsed.max, `${path}.max`, 0, maximum);
    if (max < min) throw new TypeError(`${path}.max must be greater than or equal to min`);
    return { min, max };
}

function nullableIntegerRange(value: unknown, path: string): { min: number; max: number } | null {
    if (value === null) return null;
    const parsed = range(value, path, 100_800);
    if (!Number.isInteger(parsed.min) || !Number.isInteger(parsed.max)) {
        throw new TypeError(`${path} values must be integers`);
    }
    return parsed;
}

function schema<T extends Record<string, unknown>>(parse: (value: unknown) => T): StrictPayloadSchema<T> {
    return Object.freeze({ parse });
}

const diagnosisSchema = schema((value) => {
    const parsed = strict(value, 'diagnosis', [
        'category', 'severity', 'issue_summary', 'confidence', 'observations',
        'uncertainty', 'emergency', 'safety_warnings',
    ]);
    return {
        category: oneOf(parsed.category, 'diagnosis.category', [
            'plumbing', 'electrical', 'hvac', 'appliance', 'structural', 'carpentry', 'painting', 'other',
        ] as const),
        severity: oneOf(parsed.severity, 'diagnosis.severity', ['critical', 'moderate', 'cosmetic', 'uncertain'] as const),
        issue_summary: text(parsed.issue_summary, 'diagnosis.issue_summary'),
        confidence: finiteNumber(parsed.confidence, 'diagnosis.confidence', 0, 1),
        observations: stringList(parsed.observations, 'diagnosis.observations', 12),
        uncertainty: optionalText(parsed.uncertainty, 'diagnosis.uncertainty'),
        emergency: boolean(parsed.emergency, 'diagnosis.emergency'),
        safety_warnings: stringList(parsed.safety_warnings, 'diagnosis.safety_warnings', 8),
    };
});

const clarificationSchema = schema((value) => {
    const parsed = strict(value, 'clarification', [
        'status', 'canonical_intent', 'question', 'answer_kind', 'options', 'missing_evidence',
    ]);
    const status = oneOf(parsed.status, 'clarification.status', ['complete', 'needs_input'] as const);
    const question = nullableBilingual(parsed.question, 'clarification.question');
    if (status === 'needs_input' && question === null) throw new TypeError('clarification.question is required when input is needed');
    if (status === 'complete' && question !== null) throw new TypeError('clarification.question must be null when complete');
    return {
        status,
        canonical_intent: optionalText(parsed.canonical_intent, 'clarification.canonical_intent'),
        question,
        answer_kind: oneOf(parsed.answer_kind, 'clarification.answer_kind', ['boolean', 'single_choice', 'free_text', 'media'] as const),
        options: list(parsed.options, 'clarification.options', (item, path) => {
            const option = strict(item, path, ['value', 'label']);
            return { value: text(option.value, `${path}.value`, 80), label: bilingual(option.label, `${path}.label`) };
        }, 6),
        missing_evidence: stringList(parsed.missing_evidence, 'clarification.missing_evidence', 8, 80),
    };
});

const hypothesisSchema = schema((value) => {
    const parsed = strict(value, 'hypothesis', ['hypotheses', 'unresolved_questions']);
    const hypotheses = list(parsed.hypotheses, 'hypothesis.hypotheses', (item, path) => {
        const hypothesis = strict(item, path, [
            'id', 'label', 'probability', 'evidence_for', 'evidence_against', 'evidence_needed',
        ]);
        return {
            id: text(hypothesis.id, `${path}.id`, 40),
            label: text(hypothesis.label, `${path}.label`, 240),
            probability: finiteNumber(hypothesis.probability, `${path}.probability`, 0, 1),
            evidence_for: stringList(hypothesis.evidence_for, `${path}.evidence_for`, 8),
            evidence_against: stringList(hypothesis.evidence_against, `${path}.evidence_against`, 8),
            evidence_needed: stringList(hypothesis.evidence_needed, `${path}.evidence_needed`, 8),
        };
    }, 5, 1);
    const total = hypotheses.reduce((sum, item) => sum + item.probability, 0);
    if (total > 1.001) throw new TypeError('hypothesis probabilities cannot exceed 1');
    for (let index = 1; index < hypotheses.length; index += 1) {
        if (hypotheses[index].probability > hypotheses[index - 1].probability) {
            throw new TypeError('hypotheses must be ordered by descending probability');
        }
    }
    return {
        hypotheses,
        unresolved_questions: stringList(parsed.unresolved_questions, 'hypothesis.unresolved_questions', 8),
    };
});

const repairPlanSchema = schema((value) => {
    const parsed = strict(value, 'repair_plan', [
        'summary', 'steps', 'safety_notes', 'professional_required', 'duration_minutes',
    ]);
    const steps = list(parsed.steps, 'repair_plan.steps', (item, path) => {
        const step = strict(item, path, ['order', 'instruction', 'safety_critical']);
        return {
            order: integer(step.order, `${path}.order`, 1, 8),
            instruction: bilingual(step.instruction, `${path}.instruction`),
            safety_critical: boolean(step.safety_critical, `${path}.safety_critical`),
        };
    }, 8, 1);
    if (steps.some((step, index) => step.order !== index + 1)) {
        throw new TypeError('repair_plan.steps must use contiguous order values');
    }
    return {
        summary: bilingual(parsed.summary, 'repair_plan.summary'),
        steps,
        safety_notes: list(parsed.safety_notes, 'repair_plan.safety_notes', bilingual, 8),
        professional_required: boolean(parsed.professional_required, 'repair_plan.professional_required'),
        duration_minutes: nullableIntegerRange(parsed.duration_minutes, 'repair_plan.duration_minutes'),
    };
});

const materialsBomSchema = schema((value) => {
    const parsed = strict(value, 'materials_bom', ['items', 'tools', 'substitutions', 'note']);
    return {
        items: list(parsed.items, 'materials_bom.items', (item, path) => {
            const material = strict(item, path, ['name', 'specification', 'quantity', 'unit', 'required']);
            return {
                name: bilingual(material.name, `${path}.name`),
                specification: text(material.specification, `${path}.specification`, 240),
                quantity: finiteNumber(material.quantity, `${path}.quantity`, 0.01, 10_000),
                unit: text(material.unit, `${path}.unit`, 40),
                required: boolean(material.required, `${path}.required`),
            };
        }, 32),
        tools: list(parsed.tools, 'materials_bom.tools', bilingual, 20),
        substitutions: list(parsed.substitutions, 'materials_bom.substitutions', (item, path) => {
            const substitution = strict(item, path, ['for_item', 'alternative', 'caveat']);
            return {
                for_item: text(substitution.for_item, `${path}.for_item`, 120),
                alternative: bilingual(substitution.alternative, `${path}.alternative`),
                caveat: bilingual(substitution.caveat, `${path}.caveat`),
            };
        }, 16),
        note: nullableBilingual(parsed.note, 'materials_bom.note'),
    };
});

const estimateSchema = schema((value) => {
    const parsed = strict(value, 'estimate', [
        'currency', 'total', 'labor', 'materials', 'confidence', 'basis_codes',
        'non_binding', 'assumptions',
    ]);
    return {
        currency: literal(parsed.currency, 'CNY', 'estimate.currency'),
        total: range(parsed.total, 'estimate.total'),
        labor: range(parsed.labor, 'estimate.labor'),
        materials: range(parsed.materials, 'estimate.materials'),
        confidence: finiteNumber(parsed.confidence, 'estimate.confidence', 0, 1),
        basis_codes: stringList(parsed.basis_codes, 'estimate.basis_codes', 12, 80),
        non_binding: literal(parsed.non_binding, true, 'estimate.non_binding'),
        assumptions: list(parsed.assumptions, 'estimate.assumptions', bilingual, 12),
    };
});

const faultAttributionSchema = schema((value) => {
    const parsed = strict(value, 'fault_attribution', [
        'advisory_only', 'attribution', 'confidence', 'evidence_codes', 'basis_summary',
        'legal_decision', 'human_review_required',
    ]);
    return {
        advisory_only: literal(parsed.advisory_only, true, 'fault_attribution.advisory_only'),
        attribution: oneOf(parsed.attribution, 'fault_attribution.attribution', ['landlord', 'tenant', 'shared', 'undetermined'] as const),
        confidence: finiteNumber(parsed.confidence, 'fault_attribution.confidence', 0, 1),
        evidence_codes: stringList(parsed.evidence_codes, 'fault_attribution.evidence_codes', 16, 80),
        basis_summary: bilingual(parsed.basis_summary, 'fault_attribution.basis_summary'),
        legal_decision: literal(parsed.legal_decision, false, 'fault_attribution.legal_decision'),
        human_review_required: literal(parsed.human_review_required, true, 'fault_attribution.human_review_required'),
    };
});

const workerMatchSchema = schema((value) => {
    const parsed = strict(value, 'worker_match', [
        'required_skills', 'certifications', 'urgency', 'location_radius_km',
        'sla_minutes', 'constraints', 'assignment_permitted',
    ]);
    return {
        required_skills: list(parsed.required_skills, 'worker_match.required_skills', bilingual, 12, 1),
        certifications: stringList(parsed.certifications, 'worker_match.certifications', 12, 120),
        urgency: oneOf(parsed.urgency, 'worker_match.urgency', ['immediate', 'same_day', 'scheduled', 'flexible'] as const),
        location_radius_km: finiteNumber(parsed.location_radius_km, 'worker_match.location_radius_km', 0, 500),
        sla_minutes: integer(parsed.sla_minutes, 'worker_match.sla_minutes', 15, 10_080),
        constraints: stringList(parsed.constraints, 'worker_match.constraints', 16),
        assignment_permitted: literal(parsed.assignment_permitted, false, 'worker_match.assignment_permitted'),
    };
});

const bilingualNextActionSchema = schema((value) => {
    const parsed = strict(value, 'bilingual_next_action', [
        'kind', 'title', 'instruction', 'safety_notice', 'evidence_request', 'requires_human_action',
    ]);
    return {
        kind: oneOf(parsed.kind, 'bilingual_next_action.kind', [
            'wait', 'answer_question', 'retake_media', 'review_plan', 'contact_emergency', 'manual_service', 'none',
        ] as const),
        title: bilingual(parsed.title, 'bilingual_next_action.title'),
        instruction: bilingual(parsed.instruction, 'bilingual_next_action.instruction'),
        safety_notice: nullableBilingual(parsed.safety_notice, 'bilingual_next_action.safety_notice'),
        evidence_request: nullableBilingual(parsed.evidence_request, 'bilingual_next_action.evidence_request'),
        requires_human_action: boolean(parsed.requires_human_action, 'bilingual_next_action.requires_human_action'),
    };
});

const criticCheckNames = ['schema', 'safety', 'privacy', 'grounding', 'scope', 'cost', 'bilingual'] as const;

function criticCheck(value: unknown, path: string): CriticCheck {
    const parsed = strict(value, path, ['name', 'status', 'evidence_codes']);
    return {
        name: oneOf(parsed.name, `${path}.name`, criticCheckNames),
        status: oneOf(parsed.status, `${path}.status`, ['pass', 'fail', 'not_applicable'] as const),
        evidence_codes: stringList(parsed.evidence_codes, `${path}.evidence_codes`, 20, 80),
    };
}

const independentCriticSchema = schema<CriticPayload>((value) => {
    const parsed = strict(value, 'critic', [
        'subject_schema_name', 'subject_payload_hash', 'route_independent', 'checks',
        'decision', 'rework_fields', 'client_visibility',
    ]);
    const schemaName = text(parsed.subject_schema_name, 'critic.subject_schema_name', 128);
    if (!/^[a-z][a-z0-9._-]*\/v[1-9][0-9]*$/.test(schemaName)) {
        throw new TypeError('critic.subject_schema_name must be versioned');
    }
    const hash = text(parsed.subject_payload_hash, 'critic.subject_payload_hash', 64);
    if (!/^[a-f0-9]{64}$/.test(hash)) throw new TypeError('critic.subject_payload_hash must be a sha256 value');
    const checks = list(parsed.checks, 'critic.checks', criticCheck, 16, 1);
    const names = new Set(checks.map((check) => check.name));
    if (names.size !== checks.length) throw new TypeError('critic checks must be unique');
    const decision = oneOf(parsed.decision, 'critic.decision', ['accept', 'reject', 'rework'] as const);
    if (decision === 'accept' && checks.some((check) => check.status === 'fail')) {
        throw new TypeError('critic cannot accept a failed check');
    }
    return {
        subject_schema_name: schemaName,
        subject_payload_hash: hash,
        route_independent: literal(parsed.route_independent, true, 'critic.route_independent'),
        checks,
        decision,
        rework_fields: stringList(parsed.rework_fields, 'critic.rework_fields', 20, 80),
        client_visibility: literal(parsed.client_visibility, 'internal_only', 'critic.client_visibility'),
    };
});

export const CAPABILITY_PAYLOAD_SCHEMAS: Readonly<Record<CapabilityId, StrictPayloadSchema<Record<string, unknown>>>> = Object.freeze({
    [CAPABILITY_IDS.diagnosis]: diagnosisSchema,
    [CAPABILITY_IDS.clarification]: clarificationSchema,
    [CAPABILITY_IDS.hypothesis]: hypothesisSchema,
    [CAPABILITY_IDS.repairPlan]: repairPlanSchema,
    [CAPABILITY_IDS.materialsBom]: materialsBomSchema,
    [CAPABILITY_IDS.estimate]: estimateSchema,
    [CAPABILITY_IDS.faultAttribution]: faultAttributionSchema,
    [CAPABILITY_IDS.workerMatchCriteria]: workerMatchSchema,
    [CAPABILITY_IDS.bilingualNextAction]: bilingualNextActionSchema,
    [CAPABILITY_IDS.independentCritic]: independentCriticSchema,
});

export const BILINGUAL_NEXT_ACTION_SCHEMA = bilingualNextActionSchema;
export const INDEPENDENT_CRITIC_SCHEMA = independentCriticSchema;
