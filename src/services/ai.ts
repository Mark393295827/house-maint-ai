
/**
 * AI Service for House Maint AI
 * Integrates with Backend /api/v1/ai/diagnose for analysis
 */
import { getCsrfToken } from './api';

const API_BASE = '/api/v1';
const API_BASE_URL = `${API_BASE}/ai`;

export type ProblemSolvingStageId = 'intake' | 'diagnosis' | 'deflection' | 'dispatch' | 'verification' | 'reporting';

export interface ProblemSolvingLoop {
    loopVersion: 'codex-six-stage-v1';
    provider: 'openai-responses' | 'mock-codex-loop';
    modelName: string;
    stages: Array<{
        stageId: ProblemSolvingStageId;
        title: string;
        status: 'complete' | 'ready' | 'blocked';
        ownerAgentId: string;
        gate: 'auto' | 'confidence' | 'human';
        summary: string;
        touchpoints: string[];
        evidenceRequired: string[];
    }>;
    diagnosis: {
        issueType: string;
        category: string;
        severity: 'critical' | 'moderate' | 'low';
        confidence: number;
        responsibility: 'landlord' | 'tenant' | 'shared' | 'undetermined';
        rootCauseSummary: string;
        urgencyScore: number;
        safetyWarnings: string[];
    };
    deflection: {
        eligible: boolean;
        safetyGate: string;
        selfServeSteps: string[];
        escalationTriggers: string[];
    };
    dispatch: {
        recommendedSkill: string;
        requiredTools: string[];
        requiredParts: string[];
        estimatedCost: {
            min: number;
            max: number;
            currency: 'CNY' | 'USD';
            basis: string;
        };
        sla: string;
        acceptanceCriteria: string[];
    };
    verification: {
        checklist: string[];
        photoRequirements: string[];
        followUpWindow: string;
    };
    reporting: {
        ownerSummary: string;
        metrics: string[];
        archiveTags: string[];
    };
    nextActions: string[];
}

export interface PhotoDiagnosis {
    detected: boolean;
    issueName: string;
    category: string;
    severity: 'critical' | 'moderate' | 'cosmetic';
    confidence: number;
    summary: string;
    urgencyScore: number;
    safetyWarning: string | null;
    canDiy: boolean;
    steps: string[];
    requiredParts: Array<{
        name: string;
        spec: string;
        estimatedPrice: string;
    }>;
    toolsNeeded: string[];
}

/**
 * Convert image file to base64
 */
async function imageToBase64(file: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            // Remove data URL prefix to get pure base64
            const result = reader.result as string;
            const base64 = result.split(',')[1];
            resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

/**
 * Convert blob URL to base64
 */
async function blobUrlToBase64(blobUrl: string): Promise<string> {
    const response = await fetch(blobUrl);
    const blob = await response.blob();
    return imageToBase64(blob);
}

function normalizePhotoDiagnosis(data: any): PhotoDiagnosis {
    const diagnosis = data?.diagnosis || {};
    const solution = data?.solution || {};
    const issueName = String(diagnosis.issue_type || diagnosis.issue_identified || 'UNCERTAIN').trim();
    const summary = String(diagnosis.diagnosis_summary || diagnosis.description || '').trim();
    const category = String(diagnosis.category || 'other').trim().toLowerCase();
    const rawConfidence = Number(diagnosis.confidence_score);
    const confidence = Number.isFinite(rawConfidence)
        ? Math.min(1, Math.max(0, rawConfidence > 1 ? rawConfidence / 100 : rawConfidence))
        : 0;
    const rawSeverity = String(diagnosis.severity || '').trim().toLowerCase();
    const severity: PhotoDiagnosis['severity'] = ['critical', 'high', 'severe', 'urgent'].includes(rawSeverity)
        ? 'critical'
        : ['cosmetic', 'low', 'minor', 'none'].includes(rawSeverity)
            ? 'cosmetic'
            : 'moderate';
    const uncertainLabels = ['uncertain', 'none', 'no issue', 'no maintenance issue', 'unknown issue'];
    const normalizedIssueName = issueName.toLowerCase();
    const detected = confidence >= 0.35
        && !uncertainLabels.some(label => normalizedIssueName === label || normalizedIssueName.startsWith(`${label} `));

    return {
        detected,
        issueName,
        category,
        severity,
        confidence,
        summary,
        urgencyScore: Number.isFinite(Number(diagnosis.urgency_score))
            ? Math.min(10, Math.max(0, Math.round(Number(diagnosis.urgency_score))))
            : severity === 'critical' ? 10 : severity === 'moderate' ? 5 : 2,
        safetyWarning: typeof diagnosis.safety_warning === 'string' && diagnosis.safety_warning.trim()
            ? diagnosis.safety_warning.trim()
            : null,
        canDiy: solution.can_diy === true,
        steps: Array.isArray(solution.steps)
            ? solution.steps.filter((step: unknown): step is string => typeof step === 'string' && !!step.trim()).map((step: string) => step.trim())
            : [],
        requiredParts: Array.isArray(solution.required_parts)
            ? solution.required_parts.map((part: any) => ({
                name: String(part?.name || ''),
                spec: String(part?.spec || ''),
                estimatedPrice: String(part?.estimated_price || ''),
            })).filter((part: { name: string }) => !!part.name)
            : [],
        toolsNeeded: Array.isArray(solution.tools_needed)
            ? solution.tools_needed.filter((tool: unknown): tool is string => typeof tool === 'string' && !!tool.trim()).map((tool: string) => tool.trim())
            : [],
    };
}

/**
 * Send a captured or uploaded photo through the backend's multimodal diagnosis
 * contract and normalize provider output into a stable UI shape.
 */
export async function diagnosePhoto(
    imageBase64: string,
    mimeType = 'image/jpeg',
    text?: string
): Promise<PhotoDiagnosis> {
    try {
        const csrfToken = await getCsrfToken();
        const response = await fetch(`${API_BASE_URL}/diagnose`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-Token': csrfToken,
            },
            credentials: 'include',
            body: JSON.stringify({
                image: imageBase64,
                mimeType: mimeType,
                text: text
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.details || error.error || 'Diagnosis failed');
        }

        const data = await response.json();
        return normalizePhotoDiagnosis(data);
    } catch (error) {
        console.error('Photo diagnosis error:', error);
        throw error;
    }
}

/**
 * Backward-compatible image analysis shape used by the legacy repair guide.
 */
export async function analyzeImage(imageBase64?: string, mimeType = 'image/jpeg', text?: string) {
    try {
        if (!imageBase64) {
            throw new Error('An image is required for visual diagnosis');
        }
        const diagnosis = await diagnosePhoto(imageBase64, mimeType, text);
        return {
            raw_response: {
                diagnosis: {
                    issue_type: diagnosis.issueName,
                    category: diagnosis.category,
                    severity: diagnosis.severity,
                    diagnosis_summary: diagnosis.summary,
                    confidence_score: diagnosis.confidence,
                    urgency_score: diagnosis.urgencyScore,
                    safety_warning: diagnosis.safetyWarning,
                },
                solution: {
                    can_diy: diagnosis.canDiy,
                    steps: diagnosis.steps,
                    required_parts: diagnosis.requiredParts.map(part => ({
                        name: part.name,
                        spec: part.spec,
                        estimated_price: part.estimatedPrice,
                    })),
                    tools_needed: diagnosis.toolsNeeded,
                },
            },
            detected: diagnosis.detected,
            issue_name: diagnosis.issueName,
            issue_name_en: diagnosis.issueName,
            confidence: Math.round(diagnosis.confidence * 100),
            severity: diagnosis.severity === 'moderate' ? 'medium' : diagnosis.severity === 'cosmetic' ? 'low' : 'critical',
            description: diagnosis.summary,
            description_en: diagnosis.summary,
            possible_causes: diagnosis.summary ? [diagnosis.summary] : [],
            recommended_actions: diagnosis.steps,
            diy_difficulty: diagnosis.canDiy ? 'easy' : 'hard',
            estimated_cost: diagnosis.requiredParts.map(part => part.estimatedPrice).filter(Boolean).join(', ') || 'Unknown',
            urgency: diagnosis.urgencyScore >= 8 ? '立即处理' : '可以等待',
            steps: diagnosis.steps,
            safety_warning: diagnosis.safetyWarning
        };
    } catch (error) {
        console.error('AI analysis error:', error);
        throw error;
    }
}

/**
 * Analyze image from file input
 */
export async function analyzeImageFile(file: File) {
    const base64 = await imageToBase64(file);
    return analyzeImage(base64, file.type);
}

/**
 * Analyze image from blob URL (e.g., from camera capture)
 */
export async function analyzeImageFromUrl(blobUrl: string, mimeType = 'image/jpeg') {
    const base64 = await blobUrlToBase64(blobUrl);
    return analyzeImage(base64, mimeType);
}

/**
 * Generate repair steps based on diagnosis
 * (Now just extracts from the already-fetched AI response if available)
 */
export async function generateRepairSteps(diagnosis: any) {
    // If we have the raw response or steps from the new backend, use them
    if (diagnosis.steps && diagnosis.steps.length > 0) {
        return {
            title: `${diagnosis.issue_name} 修复指南`,
            title_en: `${diagnosis.issue_name_en} Repair Guide`,
            steps: diagnosis.steps.map((step: string, index: number) => ({
                step_number: index + 1,
                title: `Step ${index + 1}`,
                title_en: `Step ${index + 1}`,
                description: step,
                description_en: step,
                duration: 'See guide',
                tools_needed: diagnosis.raw_response?.solution?.tools_needed || [],
                tips: [],
                warnings: diagnosis.safety_warning ? [diagnosis.safety_warning] : []
            })),
            total_duration: 'Variable',
            materials_needed: diagnosis.raw_response?.solution?.required_parts?.map((p: any) => p.name) || [],
            safety_notes: diagnosis.safety_warning ? [diagnosis.safety_warning] : [],
            when_to_call_pro: diagnosis.diy_difficulty === 'hard' ? 'Recommended' : 'Optional'
        };
    }

    // Fallback
    return {
        title: 'Repair Guide',
        steps: []
    };
}

/**
 * Continue a diagnostic conversation with follow-up Q&A
 * Sends the image context + chat history to get either follow-up questions or a solution.
 */
export async function chatWithDiagnosis(
    imageBase64: string | null,
    mimeType: string,
    history: Array<{ role: 'user' | 'assistant'; content: string }>
) {
    try {
        const csrfToken = await getCsrfToken();
        const response = await fetch(`${API_BASE_URL}/diagnose/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-Token': csrfToken,
            },
            credentials: 'include',
            body: JSON.stringify({
                image: imageBase64 || undefined,
                mimeType: imageBase64 ? mimeType : undefined,
                history
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.details || error.error || 'Diagnosis chat failed');
        }

        return await response.json();
    } catch (error) {
        console.error('Diagnosis chat error:', error);
        throw error;
    }
}

// ──── Structured diagnostic helper APIs ────

async function callStepAPI(endpoint: string, body: Record<string, any>) {
    const csrfToken = await getCsrfToken();
    const response = await fetch(`${API_BASE_URL}/diagnose/${endpoint}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': csrfToken,
        },
        credentials: 'include',
        body: JSON.stringify(body)
    });
    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.details || err.error || `${endpoint} diagnosis helper failed`);
    }
    return response.json();
}

/** MECE category analysis */
export async function callMECE(image: string | null, mimeType: string, text: string, locale: string) {
    return callStepAPI('mece', { image: image || undefined, mimeType: image ? mimeType : undefined, text, locale });
}

/** Hypothesis generation */
export async function callHypothesis(category: string, image: string | null, mimeType: string, locale: string) {
    return callStepAPI('hypothesis', { category, image: image || undefined, mimeType: image ? mimeType : undefined, locale });
}

/** Data collection checklist */
export async function callChecklist(hypothesis: string, image: string | null, mimeType: string, locale: string) {
    return callStepAPI('checklist', { hypothesis, image: image || undefined, mimeType: image ? mimeType : undefined, locale });
}

/** 5-Why dialog */
export async function callFiveWhy(
    history: Array<{ role: 'user' | 'assistant'; content: string }>,
    context: Record<string, any>,
    image: string | null,
    mimeType: string,
    locale: string
) {
    return callStepAPI('five-why', { history, context, image: image || undefined, mimeType: image ? mimeType : undefined, locale });
}

/** Solution generation */
export async function callSolution(rootCause: string, context: Record<string, any>, locale: string) {
    return callStepAPI('solution', { rootCause, context, locale });
}

/**
 * Progressive inquiry conversation — AI asks targeted questions to gather project info.
 * Returns { type: 'question' | 'summary', message, questions?, quickReplies?, progress, demandSummary? }
 */
export async function inquiryChat(
    history: Array<{ role: 'user' | 'assistant'; content: string }>,
    imageBase64?: string,
    mimeType?: string,
    locale?: string
) {
    try {
        const csrfToken = await getCsrfToken();
        const response = await fetch(`${API_BASE_URL}/diagnose/inquiry`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-Token': csrfToken,
            },
            credentials: 'include',
            body: JSON.stringify({
                history,
                image: imageBase64 || undefined,
                mimeType: imageBase64 ? (mimeType || 'image/jpeg') : undefined,
                locale: locale || 'zh'
            })
        });
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.details || err.error || 'Inquiry failed');
        }
        return await response.json();
    } catch (error) {
        console.error('Inquiry chat error:', error);
        throw error;
    }
}

/**
 * Run the unified six-stage problem-solving loop. The backend uses OpenAI /
 * Codex-grade reasoning when configured and a deterministic mock locally.
 */
export async function solveProblem(
    demand: Record<string, any>,
    imageBase64?: string | null,
    mimeType?: string,
    locale?: string
): Promise<ProblemSolvingLoop> {
    try {
        const csrfToken = await getCsrfToken();
        const response = await fetch(`${API_BASE_URL}/problem-solving`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-Token': csrfToken,
            },
            credentials: 'include',
            body: JSON.stringify({
                demand,
                image: imageBase64 || undefined,
                mimeType: imageBase64 ? (mimeType || 'image/jpeg') : undefined,
                locale: locale || 'zh',
            }),
        });
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.details || err.error || 'Problem-solving loop failed');
        }
        return await response.json();
    } catch (error) {
        console.error('Problem-solving loop error:', error);
        throw error;
    }
}

export { blobUrlToBase64, imageToBase64 };

export default {
    analyzeImage,
    analyzeImageFile,
    analyzeImageFromUrl,
    generateRepairSteps,
    chatWithDiagnosis,
    diagnosePhoto,
    inquiryChat,
    callMECE,
    callHypothesis,
    callChecklist,
    callFiveWhy,
    callSolution,
    solveProblem,
};
