/**
 * src/store/cases.ts — Bridge to backend reports API
 * 
 * Provides a standardized CaseRecord format for legacy components and skills.
 * Now fully backed by the backend API.
 */

import api from '../services/api';
import { Report } from '../types';
import { getOperatingStageCopies, getReportOperatingStageId } from '../constants/operatingModel';

export interface CaseRecord {
    id: string;
    title: string;
    titleEn: string;
    status: 'active' | 'archived';
    step: number;
    severity: 'low' | 'moderate' | 'critical';
    date: string;           // ISO date e.g. '2026-02-22'
    category?: string;
    rootCause?: string;
    solution?: string;
}

/** Map backend Report to frontend CaseRecord */
function mapReportToCase(r: Report): CaseRecord {
    const isArchived = r.status === 'completed' || r.status === 'cancelled';
    
    const operatingStages = getOperatingStageCopies('en');
    const stageId = getReportOperatingStageId(r.status);
    const step = Math.max(1, operatingStages.findIndex((stage) => stage.id === stageId) + 1);

    // Mapping urgency_score (0-10) to severity
    const severity: 'low' | 'moderate' | 'critical' = 
        (r.urgency_score || 0) >= 8 ? 'critical' 
        : (r.urgency_score || 0) >= 4 ? 'moderate' 
        : 'low';

    return {
        id: String(r.id),
        title: r.title,
        titleEn: r.title, // Backend currently only supports one title
        status: isArchived ? 'archived' : 'active',
        step,
        severity,
        date: new Date(r.created_at).toISOString().split('T')[0],
        category: r.category,
        rootCause: (r as any).resolution_details?.root_cause || '',
        solution: (r as any).resolution_details?.solution || '',
    };
}

/** Fetch all cases from the API */
export async function getCases(): Promise<CaseRecord[]> {
    try {
        const { reports } = await api.getReports();
        return reports.map(mapReportToCase);
    } catch (err) {
        console.error('[Store] Failed to fetch cases from backend:', err);
        return [];
    }
}

/** Get only active cases */
export async function getActiveCases(): Promise<CaseRecord[]> {
    const all = await getCases();
    return all.filter(c => c.status === 'active');
}

/** Get only archived cases */
export async function getArchivedCases(): Promise<CaseRecord[]> {
    const all = await getCases();
    return all.filter(c => c.status === 'archived');
}

/** Count active cases */
export async function getActiveCaseCount(): Promise<number> {
    const active = await getActiveCases();
    return active.length;
}

/** 
 * Add a new case (now redirects to API createReport) 
 * @deprecated Use useCreateReport hook instead
 */
export async function addCase(c: Partial<CaseRecord>): Promise<void> {
    const reportData: Partial<Report> = {
        title: c.title || 'Untitled',
        description: c.title || 'No description provided',
        category: c.category,
        urgency_score: c.severity === 'critical' ? 9 : c.severity === 'moderate' ? 6 : 3
    };
    await api.createReport(reportData);
}

/** 
 * Update an existing case by id 
 * @deprecated Use useUpdateReport hook instead
 */
export async function updateCase(id: string, partial: Partial<CaseRecord>): Promise<void> {
    const data: Partial<Report> = {};
    if (partial.category) data.category = partial.category;
    if (partial.severity) {
        data.urgency_score = partial.severity === 'critical' ? 9 : partial.severity === 'moderate' ? 6 : 3;
    }
    await api.updateReport(id, data);
}

/** Generate a unique case id */
export function generateCaseId(): string {
    return `case_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}
