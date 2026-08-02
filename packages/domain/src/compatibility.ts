import { CaseProjectionSchema, type CaseProjection } from '@house-maint/contracts';
import { canonicalJson, sha256 } from './canonical-json.js';
import { CaseDomainError } from './errors.js';

export const LEGACY_REPORT_STATUSES = [
    'pending', 'analyzed', 'planned', 'matching', 'broadcasted', 'matched',
    'in_progress', 'completed', 'cancelled', 'failed_analysis',
    'failed_planning', 'flagged_for_review',
] as const;

export type LegacyReportStatus = typeof LEGACY_REPORT_STATUSES[number];

export interface LegacyReportSnapshot {
    id: number;
    organization_id: number;
    title: string;
    description: string;
    category: string | null;
    status: LegacyReportStatus;
    urgency_score: number;
    property_id?: number | null;
    unit_id?: number | null;
    created_at: string;
    updated_at: string;
}

export interface LegacyReportView {
    id: number;
    title: string;
    status: LegacyReportStatus;
    urgency_score: number;
    created_at: string;
    updated_at: string;
}

export interface ShadowMismatch {
    field: 'title' | 'status' | 'stage' | 'priority' | 'property_id' | 'unit_id';
    canonical: unknown;
    legacy_mapped: unknown;
}

export interface ReportShadowComparison {
    schema: 'case-report-shadow/v1';
    mapping_version: 'legacy-report-map/v1';
    organization_id: number;
    case_id: number;
    legacy_report_id: number;
    canonical_hash: string;
    legacy_mapped_hash: string;
    parity: boolean;
    mismatches: ShadowMismatch[];
}

const legacyLifecycle: Record<LegacyReportStatus, Pick<CaseProjection, 'status' | 'stage'>> = {
    pending: { status: 'open', stage: 'intake' },
    analyzed: { status: 'open', stage: 'diagnosis' },
    planned: { status: 'open', stage: 'resolution' },
    matching: { status: 'open', stage: 'dispatch' },
    broadcasted: { status: 'open', stage: 'dispatch' },
    matched: { status: 'open', stage: 'dispatch' },
    in_progress: { status: 'open', stage: 'repair' },
    completed: { status: 'resolved', stage: 'verification' },
    cancelled: { status: 'cancelled', stage: 'closed' },
    failed_analysis: { status: 'open', stage: 'diagnosis' },
    failed_planning: { status: 'open', stage: 'resolution' },
    flagged_for_review: { status: 'open', stage: 'diagnosis' },
};

export function priorityFromUrgency(score: number): CaseProjection['priority'] {
    if (!Number.isFinite(score) || score < 0 || score > 10) {
        throw new CaseDomainError('invalid_input', 'Legacy urgency_score must be between 0 and 10');
    }
    if (score >= 9) return 'emergency';
    if (score >= 7) return 'urgent';
    if (score <= 2) return 'low';
    return 'normal';
}

export function mapLegacyReportToCase(
    report: LegacyReportSnapshot,
    caseId: number,
    version = 1,
): CaseProjection {
    const lifecycle = legacyLifecycle[report.status];
    if (!lifecycle || !Number.isInteger(report.id) || report.id <= 0
        || !Number.isInteger(report.organization_id) || report.organization_id <= 0) {
        throw new CaseDomainError('invalid_input', 'Legacy report snapshot is invalid');
    }
    const result = CaseProjectionSchema.safeParse({
        schema: 'case-projection/v1',
        id: caseId,
        organization_id: report.organization_id,
        property_id: report.property_id ?? null,
        unit_id: report.unit_id ?? null,
        title: report.title,
        ...lifecycle,
        priority: priorityFromUrgency(report.urgency_score),
        version,
        active_run_id: null,
        accepted_artifact_ids: [],
        created_at: new Date(report.created_at).toISOString(),
        updated_at: new Date(report.updated_at).toISOString(),
        closed_at: report.status === 'cancelled' ? new Date(report.updated_at).toISOString() : null,
    });
    if (!result.success) throw new CaseDomainError('invalid_input', 'Legacy report cannot map to case-projection/v1');
    return result.data;
}

export function mapCaseToLegacyReport(caseProjection: CaseProjection, legacyReportId: number): LegacyReportView {
    const projection = CaseProjectionSchema.parse(caseProjection);
    let status: LegacyReportStatus;
    if (projection.status === 'cancelled') status = 'cancelled';
    else if (projection.status === 'resolved' || projection.status === 'closed') status = 'completed';
    else if (projection.stage === 'intake') status = 'pending';
    else if (projection.stage === 'diagnosis') status = 'analyzed';
    else if (projection.stage === 'resolution') status = 'planned';
    else if (projection.stage === 'dispatch') status = 'matching';
    else if (projection.stage === 'repair') status = 'in_progress';
    else status = 'completed';
    const urgency_score = projection.priority === 'emergency' ? 10
        : projection.priority === 'urgent' ? 8
            : projection.priority === 'low' ? 2 : 5;
    return {
        id: legacyReportId,
        title: projection.title,
        status,
        urgency_score,
        created_at: projection.created_at,
        updated_at: projection.updated_at,
    };
}

export function compareLegacyReportShadow(
    report: LegacyReportSnapshot,
    canonical: CaseProjection,
): ReportShadowComparison {
    if (report.organization_id !== canonical.organization_id) {
        throw new CaseDomainError('forbidden', 'Cross-organization shadow comparison is forbidden');
    }
    const mapped = mapLegacyReportToCase(report, canonical.id, canonical.version);
    const mismatches: ShadowMismatch[] = [];
    const fields: ShadowMismatch['field'][] = [
        'title', 'status', 'stage', 'priority', 'property_id', 'unit_id',
    ];
    for (const field of fields) {
        if (canonical[field] !== mapped[field]) {
            mismatches.push({ field, canonical: canonical[field], legacy_mapped: mapped[field] });
        }
    }
    return {
        schema: 'case-report-shadow/v1',
        mapping_version: 'legacy-report-map/v1',
        organization_id: canonical.organization_id,
        case_id: canonical.id,
        legacy_report_id: report.id,
        canonical_hash: sha256(canonicalJson(canonical)),
        legacy_mapped_hash: sha256(canonicalJson(mapped)),
        parity: mismatches.length === 0,
        mismatches,
    };
}

export type CaseWriterMode = 'canonical-command' | 'legacy-report' | 'legacy-case' | 'read-only';

export function selectSingleCaseWriter(input: {
    canonicalCommand: boolean;
    legacyReport: boolean;
    legacyCase: boolean;
}): CaseWriterMode {
    const enabled: CaseWriterMode[] = [];
    if (input.canonicalCommand) enabled.push('canonical-command');
    if (input.legacyReport) enabled.push('legacy-report');
    if (input.legacyCase) enabled.push('legacy-case');
    if (enabled.length > 1) {
        throw new CaseDomainError('writer_conflict', 'Only one case lifecycle writer may be enabled');
    }
    return enabled[0] ?? 'read-only';
}

export const CANONICAL_CASE_WRITE_TOPOLOGY = Object.freeze({
    writer: 'case-command-service/v1',
    projection: 'maintenance_cases',
    history: 'case_events',
    idempotency: 'case_command_receipts',
    reports: 'read-only compatibility facade',
    cases: 'read-only pending retirement',
});
