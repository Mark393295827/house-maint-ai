/**
 * src/store/proactive.ts
 * 
 * Manages proactive AI insights and suggestions.
 * Following the project's localStorage pattern.
 */

export interface ProactiveInsight {
    id: string;
    titleKey: string;
    bodyKey: string;
    type: 'maintenance' | 'safety' | 'efficiency';
    actionLabelKey: string;
    actionPath: string;
    createdAt: string;
}

const STORAGE_KEY = 'proactive_insights';

const SEED: ProactiveInsight[] = [
    {
        id: 'initial-1',
        titleKey: 'proactive.insight1.title',
        bodyKey: 'proactive.insight1.body',
        type: 'efficiency',
        actionLabelKey: 'proactive.action',
        actionPath: '/diagnosis',
        createdAt: new Date().toISOString(),
    }
];

export function getInsights(): ProactiveInsight[] {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) return JSON.parse(raw) as ProactiveInsight[];
    } catch { /* ignore */ }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED));
    return SEED;
}

export function addInsight(insight: Omit<ProactiveInsight, 'id' | 'createdAt'>): void {
    const all = getInsights();
    const newInsight: ProactiveInsight = {
        ...insight,
        id: `ins_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        createdAt: new Date().toISOString(),
    };
    all.unshift(newInsight);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));

    // Dispatch custom event for reactive updates in components
    window.dispatchEvent(new Event('proactive-update'));
}

export function clearInsights(): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
    window.dispatchEvent(new Event('proactive-update'));
}
