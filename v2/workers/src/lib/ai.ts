import type { Env } from '../index';

export interface DiagnosisResult {
    issue_name: string;
    description: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    estimated_cost: { min: number; max: number };
    tools_needed: string[];
    steps: string[];
    confidence: number;
    model: 'llama3' | 'gemini';
}

export class AIService {
    constructor(private env: Env) { }

    async diagnoseIssue(imageUrl: string): Promise<DiagnosisResult> {
        // Try Llama 3 first (80% of cases)
        if (this.env.OLLAMA_URL) {
            try {
                const result = await this.diagnoseLlama(imageUrl);
                if (result.confidence >= 0.7) {
                    return { ...result, model: 'llama3' };
                }
            } catch (error) {
                console.warn('Llama diagnosis failed, falling back to Gemini:', error);
            }
        }

        // Fallback to Gemini (20% of cases or when Llama confidence is low)
        return this.diagnoseGemini(imageUrl);
    }

    private async diagnoseLlama(imageUrl: string): Promise<DiagnosisResult> {
        // Call local Ollama instance with Llama 3
        const response = await fetch(`${this.env.OLLAMA_URL}/api/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: 'llama3.2-vision',
                prompt: this.getDiagnosisPrompt(),
                images: [imageUrl],
                stream: false,
            }),
        });

        if (!response.ok) {
            throw new Error(`Ollama request failed: ${response.statusText}`);
        }

        const data = await response.json();
        return this.parseDiagnosisResponse(data.response);
    }

    private async diagnoseGemini(imageUrl: string): Promise<DiagnosisResult> {
        // Call Gemini Vision API
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${this.env.GEMINI_API_KEY}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [
                        {
                            parts: [
                                { text: this.getDiagnosisPrompt() },
                                {
                                    inlineData: {
                                        mimeType: 'image/jpeg',
                                        data: await this.fetchImageAsBase64(imageUrl),
                                    },
                                },
                            ],
                        },
                    ],
                }),
            }
        );

        if (!response.ok) {
            throw new Error(`Gemini request failed: ${response.statusText}`);
        }

        const data = await response.json();
        const text = data.candidates[0].content.parts[0].text;
        return this.parseDiagnosisResponse(text);
    }

    private getDiagnosisPrompt(): string {
        return `You are a professional home appliance repair diagnostic AI. Analyze the image and provide a detailed diagnosis in JSON format:

{
  "issue_name": "Brief name of the issue",
  "description": "Detailed description",
  "severity": "low|medium|high|critical",
  "estimated_cost": {"min": 100, "max": 500},
  "tools_needed": ["tool1", "tool2"],
  "steps": ["step1", "step2"],
  "confidence": 0.85
}

Focus on: air conditioners, refrigerators, washing machines, water heaters, and kitchen appliances.`;
    }

    private parseDiagnosisResponse(response: string): DiagnosisResult {
        // Extract JSON from response (might be wrapped in markdown code blocks)
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error('Failed to parse AI response as JSON');
        }

        const parsed = JSON.parse(jsonMatch[0]);
        return {
            issue_name: parsed.issue_name,
            description: parsed.description,
            severity: parsed.severity || 'medium',
            estimated_cost: parsed.estimated_cost || { min: 0, max: 0 },
            tools_needed: parsed.tools_needed || [],
            steps: parsed.steps || [],
            confidence: parsed.confidence || 0.5,
            model: 'llama3', // Will be overridden
        };
    }

    private async fetchImageAsBase64(url: string): Promise<string> {
        const response = await fetch(url);
        const buffer = await response.arrayBuffer();
        return btoa(String.fromCharCode(...new Uint8Array(buffer)));
    }
}
