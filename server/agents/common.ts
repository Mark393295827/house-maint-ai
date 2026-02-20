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

export interface ChatMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

export interface AiProvider {
    name: string;
}
