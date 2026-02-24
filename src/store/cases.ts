/**
 * src/store/cases.ts — Single source of truth for case data
 * 
 * All case reads/writes go through these functions.
 * Backed by localStorage today; swap for an API later.
 */

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

const STORAGE_KEY = 'cases';

const SEED: CaseRecord[] = [
    { id: 'c001', title: '厨房水管漏水', titleEn: 'Kitchen Pipe Leak', status: 'active', step: 5, severity: 'moderate', date: '2026-02-22', category: 'plumbing' },
    { id: 'c002', title: '卧室空调不制冷', titleEn: 'Bedroom AC Not Cooling', status: 'active', step: 4, severity: 'moderate', date: '2026-02-21', category: 'hvac' },
    { id: 'c003', title: '浴室瓷砖裂缝', titleEn: 'Bathroom Tile Crack', status: 'archived', step: 8, severity: 'low', date: '2026-02-18', category: 'structural' },
    { id: 'c004', title: '客厅灯泡频繁烧断', titleEn: 'Living Room Bulb Burnout', status: 'active', step: 6, severity: 'critical', date: '2026-02-20', category: 'electrical' },
];

/** Read all cases from localStorage (seeds if empty) */
export function getCases(): CaseRecord[] {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) return JSON.parse(raw) as CaseRecord[];
    } catch { /* ignore */ }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED));
    return SEED;
}

/** Get only active cases */
export function getActiveCases(): CaseRecord[] {
    return getCases().filter(c => c.status === 'active');
}

/** Get only archived cases */
export function getArchivedCases(): CaseRecord[] {
    return getCases().filter(c => c.status === 'archived');
}

/** Count active cases (used by BottomNav badge) */
export function getActiveCaseCount(): number {
    return getActiveCases().length;
}

/** Add a new case (e.g. from wizard completion) */
export function addCase(c: CaseRecord): void {
    const all = getCases();
    all.unshift(c);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
}

/** Update an existing case by id */
export function updateCase(id: string, partial: Partial<CaseRecord>): void {
    const all = getCases().map(c => c.id === id ? { ...c, ...partial } : c);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
}

/** Generate a unique case id */
export function generateCaseId(): string {
    return `case_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}
