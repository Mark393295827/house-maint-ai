/**
 * Pattern Cache Service
 * 
 * Stores and retrieves learned patterns for the tree-of-thoughts agent.
 * Patterns are cached to avoid re-learning solutions to similar problems.
 */

export interface Pattern {
    id: string;
    type: string;
    context: string;
    solution: string;
    successRate: number;
    usageCount: number;
    createdAt: Date;
    updatedAt: Date;
}

export interface PatternMatch {
    pattern: Pattern;
    confidence: number;
}

class PatternCacheService {
    private patterns: Map<string, Pattern> = new Map();
    private storageKey = 'pattern_cache';

    /**
     * Initialize cache from localStorage (browser) or file (Node.js)
     */
    async initialize(): Promise<void> {
        try {
            if (typeof localStorage !== 'undefined') {
                const stored = localStorage.getItem(this.storageKey);
                if (stored) {
                    const data = JSON.parse(stored);
                    for (const pattern of data) {
                        this.patterns.set(pattern.id, {
                            ...pattern,
                            createdAt: new Date(pattern.createdAt),
                            updatedAt: new Date(pattern.updatedAt),
                        });
                    }
                }
            }
        } catch (error) {
            console.warn('Failed to load pattern cache:', error);
        }
    }

    /**
     * Save cache to storage
     */
    async persist(): Promise<void> {
        try {
            if (typeof localStorage !== 'undefined') {
                const data = Array.from(this.patterns.values());
                localStorage.setItem(this.storageKey, JSON.stringify(data));
            }
        } catch (error) {
            console.warn('Failed to persist pattern cache:', error);
        }
    }

    /**
     * Get a pattern by ID
     */
    async get(id: string): Promise<Pattern | null> {
        return this.patterns.get(id) || null;
    }

    /**
     * Set or update a pattern
     */
    async set(pattern: Omit<Pattern, 'id' | 'createdAt' | 'updatedAt'>): Promise<Pattern> {
        const id = this.generateId(pattern.type, pattern.context);
        const now = new Date();

        const existing = this.patterns.get(id);
        const newPattern: Pattern = {
            ...pattern,
            id,
            createdAt: existing?.createdAt || now,
            updatedAt: now,
            usageCount: (existing?.usageCount || 0) + 1,
        };

        this.patterns.set(id, newPattern);
        await this.persist();

        return newPattern;
    }

    /**
     * Find patterns matching a context
     */
    async findMatches(context: string, type?: string): Promise<PatternMatch[]> {
        const matches: PatternMatch[] = [];
        const contextWords = context.toLowerCase().split(/\s+/);

        for (const pattern of this.patterns.values()) {
            if (type && pattern.type !== type) continue;

            const patternWords = pattern.context.toLowerCase().split(/\s+/);
            const commonWords = contextWords.filter(w => patternWords.includes(w));
            const confidence = commonWords.length / Math.max(contextWords.length, 1);

            if (confidence > 0.3) {
                matches.push({ pattern, confidence });
            }
        }

        return matches.sort((a, b) => b.confidence - a.confidence);
    }

    /**
     * Record pattern success or failure
     */
    async recordOutcome(id: string, success: boolean): Promise<void> {
        const pattern = this.patterns.get(id);
        if (!pattern) return;

        const totalAttempts = pattern.usageCount;
        const currentSuccesses = pattern.successRate * (totalAttempts - 1);
        const newSuccesses = currentSuccesses + (success ? 1 : 0);

        pattern.successRate = newSuccesses / totalAttempts;
        pattern.updatedAt = new Date();

        await this.persist();
    }

    /**
     * Get cache statistics
     */
    getStats(): { total: number; avgSuccessRate: number; topTypes: string[] } {
        const patterns = Array.from(this.patterns.values());
        const total = patterns.length;
        const avgSuccessRate = patterns.reduce((sum, p) => sum + p.successRate, 0) / Math.max(total, 1);

        const typeCounts = new Map<string, number>();
        for (const p of patterns) {
            typeCounts.set(p.type, (typeCounts.get(p.type) || 0) + 1);
        }

        const topTypes = Array.from(typeCounts.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([type]) => type);

        return { total, avgSuccessRate, topTypes };
    }

    /**
     * Clear all patterns
     */
    async clear(): Promise<void> {
        this.patterns.clear();
        await this.persist();
    }

    private generateId(type: string, context: string): string {
        const hash = context.split('').reduce((acc, char) => {
            return ((acc << 5) - acc) + char.charCodeAt(0);
        }, 0);
        return `${type}_${Math.abs(hash).toString(36)}`;
    }
}

// Singleton instance
export const patternCache = new PatternCacheService();
