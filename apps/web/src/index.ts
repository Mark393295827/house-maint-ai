import {
    ArtifactEnvelopeSchema,
    CaseCommandEnvelopeSchema,
    CaseProgressSchema,
    CaseProjectionSchema,
    EffectiveScopeSchema,
    type ArtifactEnvelope,
    type CaseCommandEnvelope,
    type CaseProgress,
    type CaseProjection,
    type EffectiveScope,
} from '@house-maint/contracts';

export type SurfaceAudience = 'resident' | 'worker' | 'enterprise' | 'payment' | 'review';
export type SurfaceLocale = 'zh-CN' | 'en-US' | 'bilingual';
export type ResidentInputSource = 'text' | 'voice' | 'camera' | 'photo' | 'manual' | 'emergency';

export const WEB_COMPATIBILITY = [
    { legacy_surface: 'resident-diagnosis', audience: 'resident', fallback: 'manual' },
    { legacy_surface: 'worker-job', audience: 'worker', fallback: 'manual' },
    { legacy_surface: 'enterprise-operations', audience: 'enterprise', fallback: 'manual' },
    { legacy_surface: 'payment-callback-status', audience: 'payment', fallback: 'manual_refresh' },
    { legacy_surface: 'service-review', audience: 'review', fallback: 'manual' },
].map((entry) => ({
    ...entry,
    session_contract: 'surface-session/v1' as const,
    progress_contract: 'case-progress/v1' as const,
    command_contract: 'case-command/v1' as const,
}));

export interface SurfaceSessionSnapshot {
    schema: 'surface-session/v1';
    session_id: string;
    scope: EffectiveScope | unknown;
    case: CaseProjection | unknown;
    progress: CaseProgress | unknown;
    artifacts: Array<ArtifactEnvelope | unknown>;
    captured_at: string;
}

export interface SurfaceViewModel {
    schema: 'surface-view/v1';
    session_id: string;
    audience: SurfaceAudience;
    layout: 'mobile' | 'desktop';
    locale: SurfaceLocale;
    title: { zh_cn: string; en_us: string };
    case_id: number;
    case_version: number;
    stage: CaseProgress['stage'];
    status: string;
    progress_percent: number;
    next_action: { kind: CaseProgress['next_action']['kind']; zh_cn: string; en_us: string };
    artifacts: Array<{ artifact_id: string; kind: string; payload: Record<string, unknown>; created_at: string }>;
    controls: string[];
}

type ResidentSubmission = {
    scope: EffectiveScope | unknown;
    source: ResidentInputSource;
    description: string;
    confirmed: boolean;
    idempotency_key: string;
    correlation_id: string;
    requested_at: string;
    title?: string;
    category?: 'plumbing' | 'electrical' | 'hvac' | 'appliance' | 'structural' | 'carpentry' | 'painting' | 'other';
    artifact_id?: string;
    consent_receipt_id?: string;
};

const audienceTitles: Record<SurfaceAudience, { zh_cn: string; en_us: string }> = {
    resident: { zh_cn: '维修进度', en_us: 'Case progress' },
    worker: { zh_cn: '工单进度', en_us: 'Job progress' },
    enterprise: { zh_cn: '运营进度', en_us: 'Operations progress' },
    payment: { zh_cn: '支付状态', en_us: 'Payment status' },
    review: { zh_cn: '验收评价', en_us: 'Service review' },
};

const audienceControls: Record<SurfaceAudience, string[]> = {
    resident: ['text', 'voice', 'camera', 'photo', 'manual', 'emergency'],
    worker: ['job', 'message', 'manual', 'emergency'],
    enterprise: ['operations', 'review', 'manual', 'emergency'],
    payment: ['payment_status', 'manual_refresh', 'manual'],
    review: ['review', 'photo', 'manual'],
};

function concise(value: string, maximum = 180): string {
    const normalized = value.trim().replace(/\s+/g, ' ');
    return normalized.length <= maximum ? normalized : `${normalized.slice(0, maximum - 1)}…`;
}

function parseSnapshot(raw: SurfaceSessionSnapshot, now: string) {
    if (!raw || raw.schema !== 'surface-session/v1' || !Array.isArray(raw.artifacts)
        || typeof raw.session_id !== 'string' || typeof raw.captured_at !== 'string') {
        throw new Error('Surface session contract is invalid');
    }
    const parsedScope = EffectiveScopeSchema.safeParse(raw.scope);
    const parsedCase = CaseProjectionSchema.safeParse(raw.case);
    const parsedProgress = CaseProgressSchema.safeParse(raw.progress);
    const parsedArtifacts = raw.artifacts.map((item) => ArtifactEnvelopeSchema.safeParse(item));
    if (!parsedScope.success || !parsedCase.success || !parsedProgress.success
        || parsedArtifacts.some((item) => !item.success)
        || Date.parse(parsedScope.data.expires_at) <= Date.parse(now)) {
        throw new Error('Surface session scope or contract is invalid');
    }
    const scope = parsedScope.data;
    const caseProjection = parsedCase.data;
    const progress = parsedProgress.data;
    const artifacts = parsedArtifacts.map((item) => {
        if (!item.success) throw new Error('Surface artifact contract is invalid');
        return item.data;
    });
    if (caseProjection.organization_id !== scope.organization_id
        || (scope.case_id !== undefined && caseProjection.id !== scope.case_id)
        || (scope.property_id !== undefined && caseProjection.property_id !== scope.property_id)
        || (scope.unit_id !== undefined && caseProjection.unit_id !== scope.unit_id)
        || progress.organization_id !== caseProjection.organization_id
        || progress.case_id !== caseProjection.id
        || progress.case_version !== caseProjection.version
        || artifacts.some((artifact) => artifact.organization_id !== scope.organization_id
            || artifact.case_id !== caseProjection.id || artifact.scope_id !== scope.scope_id
            || artifact.case_version > caseProjection.version
            || artifact.policy_version !== scope.policy_version
            || !scope.data_classes.includes(artifact.data_class)
            || artifact.retention_days > scope.retention_days)) {
        throw new Error('Surface session data is outside the resolved scope');
    }
    return { scope, caseProjection, progress, artifacts };
}

export function createSurfaceViewModel(
    snapshot: SurfaceSessionSnapshot,
    options: { audience: SurfaceAudience; locale: SurfaceLocale; viewport_width: number; now: string },
): SurfaceViewModel {
    if (!Object.hasOwn(audienceTitles, options.audience)
        || !['zh-CN', 'en-US', 'bilingual'].includes(options.locale)
        || !Number.isFinite(options.viewport_width) || options.viewport_width < 240) {
        throw new Error('Surface view options are invalid');
    }
    const { caseProjection, progress, artifacts } = parseSnapshot(snapshot, options.now);
    const visibleArtifacts = artifacts.filter((artifact) => artifact.evaluation_state === 'accepted'
        && caseProjection.accepted_artifact_ids.includes(artifact.artifact_id));
    return {
        schema: 'surface-view/v1', session_id: snapshot.session_id,
        audience: options.audience, layout: options.viewport_width < 768 ? 'mobile' : 'desktop',
        locale: options.locale, title: audienceTitles[options.audience],
        case_id: caseProjection.id, case_version: caseProjection.version,
        stage: progress.stage, status: progress.run?.status ?? caseProjection.status,
        progress_percent: progress.run?.progress_percent ?? (caseProjection.status === 'closed' ? 100 : 0),
        next_action: {
            kind: progress.next_action.kind,
            zh_cn: concise(progress.next_action.display.zh_cn),
            en_us: concise(progress.next_action.display.en_us),
        },
        artifacts: visibleArtifacts.map((artifact) => ({
            artifact_id: artifact.artifact_id, kind: artifact.schema_name,
            payload: structuredClone(artifact.payload), created_at: artifact.created_at,
        })),
        controls: [...audienceControls[options.audience]],
    };
}

function safeCommandSuffix(value: string): string {
    const normalized = value.replace(/[^A-Za-z0-9._:-]/g, '-').slice(0, 90);
    return normalized.length >= 1 ? normalized : 'request';
}

function ensureCommandScope(rawScope: EffectiveScope | unknown, requestedAt: string): EffectiveScope {
    const parsed = EffectiveScopeSchema.safeParse(rawScope);
    if (!parsed.success || Date.parse(parsed.data.expires_at) <= Date.parse(requestedAt)) {
        throw new Error('A current resolved scope is required');
    }
    return parsed.data;
}

export function normalizeResidentSubmission(input: ResidentSubmission): {
    command: CaseCommandEnvelope;
    fallback: 'manual' | 'emergency' | null;
    preview_required: boolean;
} {
    const scope = ensureCommandScope(input.scope, input.requested_at);
    const description = input.description.trim();
    if (!input.confirmed) throw new Error('Resident input must be confirmed before submission');
    if (scope.scope_kind === 'case' || !scope.actions.some((action) => action === 'contribute' || action === 'manage')) {
        throw new Error('Resolved scope cannot open a maintenance case');
    }
    if (description.length < 10 || description.length > 20_000) throw new Error('Confirmed description is invalid');
    const media = input.source === 'voice' ? 'voice' : input.source === 'camera' || input.source === 'photo' ? 'image' : null;
    if (media && (!input.artifact_id || !input.consent_receipt_id)) {
        throw new Error('Media input requires an opaque artifact and consent receipt');
    }
    const evidence = media ? [{
        artifact_id: input.artifact_id!, media_kind: media,
        consent_receipt_id: input.consent_receipt_id!,
    }] : input.source === 'text' && input.artifact_id ? [{
        artifact_id: input.artifact_id, media_kind: 'text' as const,
    }] : [];
    const command = CaseCommandEnvelopeSchema.parse({
        schema: 'case-command/v1',
        command_id: `command:surface:${safeCommandSuffix(input.idempotency_key)}`,
        organization_id: scope.organization_id, expected_version: 0,
        idempotency_key: input.idempotency_key, correlation_id: input.correlation_id,
        body: {
            type: 'open_case',
            payload: {
                title: concise(input.title || description, 120), description,
                category: input.category ?? 'other',
                priority: input.source === 'emergency' ? 'emergency' : 'normal',
                property_id: scope.property_id ?? null, unit_id: scope.unit_id ?? null,
                evidence,
            },
        },
        requested_at: input.requested_at,
    });
    return {
        command,
        fallback: input.source === 'manual' ? 'manual' : input.source === 'emergency' ? 'emergency' : null,
        preview_required: input.source === 'voice' || input.source === 'camera' || input.source === 'photo',
    };
}

export function createDiagnoseAndPlanCommand(input: {
    scope: EffectiveScope | unknown;
    case_version: number;
    confirmed_artifact_ids: string[];
    locale: 'zh-CN' | 'en-US' | 'bilingual';
    idempotency_key: string;
    correlation_id: string;
    requested_at: string;
}): CaseCommandEnvelope {
    const scope = ensureCommandScope(input.scope, input.requested_at);
    if (!scope.case_id || !scope.actions.some((action) => action === 'contribute' || action === 'manage')
        || !scope.capabilities.includes('maintenance.diagnose-and-plan.v1')) {
        throw new Error('Resolved case scope does not grant diagnosis');
    }
    return CaseCommandEnvelopeSchema.parse({
        schema: 'case-command/v1',
        command_id: `command:surface:${safeCommandSuffix(input.idempotency_key)}`,
        organization_id: scope.organization_id, case_id: scope.case_id,
        expected_version: input.case_version, idempotency_key: input.idempotency_key,
        correlation_id: input.correlation_id,
        body: {
            type: 'diagnose_and_plan',
            payload: {
                confirmed_input_artifact_ids: input.confirmed_artifact_ids,
                locale: input.locale,
                requested_capability: 'maintenance.diagnose-and-plan.v1',
            },
        },
        requested_at: input.requested_at,
    });
}
