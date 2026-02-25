
/**
 * AI Service for House Maint AI
 * Integrates with Backend /api/v1/ai/diagnose for analysis
 */

const API_BASE = '/api/v1';
const API_BASE_URL = `${API_BASE}/ai`;

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

/**
 * Analyze image using Backend API
 * @param {string} imageBase64 - Base64 encoded image
 * @param {string} mimeType - Image MIME type (e.g., 'image/jpeg')
 * @returns {Promise<object>} Analysis result
 */
export async function analyzeImage(imageBase64?: string, mimeType = 'image/jpeg', text?: string) {
    try {
        const response = await fetch(`${API_BASE_URL}/diagnose`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
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

        // Map new backend structure to old frontend structure for compatibility
        // Backend: { diagnosis: { issue_identified, category, severity_score, ... }, solution: { ... }, ... }
        // Frontend expects: { detected, issue_name, severity, description, ... }

        const diagnosis = data.diagnosis;
        const severityScore = diagnosis.severity_score || 1;

        let severity = 'low';
        if (severityScore >= 4) severity = 'critical';
        else if (severityScore === 3) severity = 'high';
        else if (severityScore === 2) severity = 'medium';

        return {
            // New structure preservation
            raw_response: data,

            // Backward compatibility
            detected: diagnosis.issue_identified !== 'UNCERTAIN' && diagnosis.issue_identified !== 'None',
            issue_name: diagnosis.issue_identified,
            issue_name_en: diagnosis.issue_identified, // Fallback
            confidence: 90, // AI prompt doesn't return confidence, default to 90
            severity: severity,
            description: diagnosis.description,
            description_en: diagnosis.description,
            possible_causes: [diagnosis.description], // Simplified
            recommended_actions: data.solution?.steps || [],
            diy_difficulty: data.solution?.can_diy ? 'easy' : 'hard',
            estimated_cost: data.solution?.required_parts?.map((p: any) => p.estimated_price).join(', ') || 'Unknown',
            urgency: data.worker_matching_criteria?.urgency === 'immediate' ? '立即处理' : '可以等待',

            // Extra fields for logic
            steps: data.solution?.steps || [],
            safety_warning: diagnosis.safety_warning
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
        const response = await fetch(`${API_BASE_URL}/diagnose/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
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

// ──── 8-Step Diagnostic Flow API ────

async function callStepAPI(endpoint: string, body: Record<string, any>) {
    const response = await fetch(`${API_BASE_URL}/diagnose/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });
    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.details || err.error || `Step ${endpoint} failed`);
    }
    return response.json();
}

/** Step 2: MECE Category Analysis */
export async function callMECE(image: string | null, mimeType: string, text: string, locale: string) {
    return callStepAPI('mece', { image: image || undefined, mimeType: image ? mimeType : undefined, text, locale });
}

/** Step 3: Hypothesis Generation */
export async function callHypothesis(category: string, image: string | null, mimeType: string, locale: string) {
    return callStepAPI('hypothesis', { category, image: image || undefined, mimeType: image ? mimeType : undefined, locale });
}

/** Step 4: Data Collection Checklist */
export async function callChecklist(hypothesis: string, image: string | null, mimeType: string, locale: string) {
    return callStepAPI('checklist', { hypothesis, image: image || undefined, mimeType: image ? mimeType : undefined, locale });
}

/** Step 5: 5-Why Dialog */
export async function callFiveWhy(
    history: Array<{ role: 'user' | 'assistant'; content: string }>,
    context: Record<string, any>,
    image: string | null,
    mimeType: string,
    locale: string
) {
    return callStepAPI('five-why', { history, context, image: image || undefined, mimeType: image ? mimeType : undefined, locale });
}

/** Step 6: Solution Generation */
export async function callSolution(rootCause: string, context: Record<string, any>, locale: string) {
    return callStepAPI('solution', { rootCause, context, locale });
}

export { blobUrlToBase64, imageToBase64 };

export default {
    analyzeImage,
    analyzeImageFile,
    analyzeImageFromUrl,
    generateRepairSteps,
    chatWithDiagnosis,
    callMECE,
    callHypothesis,
    callChecklist,
    callFiveWhy,
    callSolution,
};
