import { GoogleGenerativeAI } from '@google/generative-ai';
import { AiProvider, AiResponse, DiagnosisResult, parseAiJson, withRetry } from '../common.js';

// Gemini Provider for Multimodal (CLAW 1)
export class DiagnosisAgent implements AiProvider {
    name = 'Diagnosis-Claw-1';
    private genAI: GoogleGenerativeAI;
    private model: any;
    private hasApiKey: boolean;

    // OpenClaw v1.0 System Prompt
    private systemPrompt = `You are OpenClaw — an AI-native property maintenance operating system.
You are not a chatbot. You are the command center of a self-evolving digital ant colony.

### CLAW 1 — DIAGNOSTICS (Perception Layer)
Role: The system's eyes and ears.

Core Task:
- Classify problem type (issue_type)
- Assess severity (severity: critical / moderate / cosmetic)
- Generate a structured diagnostic summary
- Assign confidence score (0.0-1.0)

Operating Rules:
- When uncertain, auto-escalate severity by one level (false positive is safer than false negative).
- Only output the exact JSON structure below.
- Never explain reasoning.

JSON Schema:
{
  "diagnosis": {
    "issue_type": "Specific classification string",
    "severity": "critical" | "moderate" | "cosmetic",
    "diagnosis_summary": "Concise technical summary",
    "confidence_score": 0.0-1.0,
    "category": "Plumbing|Electrical|HVAC|Structural|Appliance|Other",
    "urgency_score": 0-10,
    "safety_warning": "Nullable string for immediate safety risks"
  },
  "solution": {
    "can_diy": boolean,
    "steps": ["Step 1", "Step 2"],
    "required_parts": [{"name": "Name", "spec": "Spec", "estimated_price": "Price"}],
    "tools_needed": ["Tool 1"]
  },
  "worker_matching_criteria": {
    "required_skill": "Skill Tag",
    "urgency": "immediate | flexible",
    "estimated_man_hours": "e.g. 2h"
  }
}`;

    constructor() {
        // Fallback for dev environment if env var is missing (should be set in production)
        const apiKey = process.env.GEMINI_API_KEY || '';
        this.genAI = new GoogleGenerativeAI(apiKey);
        this.model = this.genAI.getGenerativeModel({
            model: "gemini-1.5-flash",
            systemInstruction: this.systemPrompt
        });
        this.hasApiKey = !!apiKey;
    }

    async diagnose(image?: string, mimeType?: string, text?: string): Promise<AiResponse<DiagnosisResult>> {
        // Demo fallback when no API key is configured
        if (!this.hasApiKey) {
            console.warn('[AI] No GEMINI_API_KEY set — returning demo diagnosis');
            return {
                result: {
                    diagnosis: {
                        issue_type: "Ceiling Fan Noise",
                        severity: "moderate",
                        diagnosis_summary: "Abnormal noise likely due to bearing wear or imbalance.",
                        confidence_score: 0.95,
                        category: "Electrical",
                        urgency_score: 3,
                        safety_warning: "Ensure power is off before inspection."
                    },
                    solution: {
                        can_diy: true,
                        steps: ["Turn off power", "Check screws", "Check balance"],
                        required_parts: [{ name: "Balance Kit", spec: "Universal", estimated_price: "$5" }],
                        tools_needed: ["Screwdriver", "Ladder"]
                    },
                    worker_matching_criteria: {
                        required_skill: "Electrical",
                        urgency: "flexible",
                        estimated_man_hours: "1h"
                    }
                },
                usage: { input_tokens: 0, output_tokens: 0, total_tokens: 0, model_name: 'gemini-1.5-flash-mock' }
            };
        }

        const promptParts: any[] = [
            "Diagnose this issue based on the OpenClaw v1.0 protocol. Return JSON only."
        ];

        if (text) promptParts.push(text);
        if (image) {
            promptParts.push({
                inlineData: {
                    data: image,
                    mimeType: mimeType || "image/jpeg"
                }
            });
        }

        return withRetry(async () => {
            const result = await this.model.generateContent(promptParts);
            const responseText = result.response.text();
            const usage = result.response.usageMetadata || { promptTokenCount: 0, candidatesTokenCount: 0, totalTokenCount: 0 };

            return {
                result: parseAiJson<DiagnosisResult>(responseText, ['diagnosis']),
                usage: {
                    input_tokens: usage.promptTokenCount,
                    output_tokens: usage.candidatesTokenCount,
                    total_tokens: usage.totalTokenCount,
                    model_name: 'gemini-1.5-flash'
                }
            };
        });
    }

    // Pattern Extraction Capability (Proprietary Data Moat)
    async extractPattern(prompt: string): Promise<AiResponse<any>> {
        // This is a special capability of Claw 1
        if (!this.hasApiKey) {
            // Mock return
            return {
                result: {
                    problem_type: "Demo Pattern",
                    context_signature: "demo",
                    solution: { steps: [], parts_spec: [] }
                },
                usage: { input_tokens: 0, output_tokens: 0, total_tokens: 0, model_name: 'gemini-1.5-flash-mock' }
            };
        }
        return withRetry(async () => {
            const result = await this.model.generateContent([prompt]);
            const responseText = result.response.text();
            const usage = result.response.usageMetadata || { promptTokenCount: 0, candidatesTokenCount: 0, totalTokenCount: 0 };

            return {
                result: JSON.parse(responseText.replace(/```json/g, '').replace(/```/g, '').trim()),
                usage: {
                    input_tokens: usage.promptTokenCount,
                    output_tokens: usage.candidatesTokenCount,
                    total_tokens: usage.totalTokenCount,
                    model_name: 'gemini-1.5-flash'
                }
            };
        });
    }
}

export const diagnosisAgent = new DiagnosisAgent();

