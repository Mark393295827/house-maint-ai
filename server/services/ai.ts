import { diagnosisAgent } from '../agents/diagnosis/agent.js';
import { planningAgent } from '../agents/planning/agent.js';
import { DiagnosisResult, RepairPattern, ChatMessage, withRetry } from '../agents/common.js';
import * as Sentry from '@sentry/node';

// Unified AI Service (Facade)
// Keeps the same interface for backward compatibility, but delegates to specialized agents.
class AiService {

    /**
     * Diagnose a maintenance issue using Multimodal AI (Gemini)
     */
    async diagnoseIssue(image?: string, mimeType?: string, text?: string): Promise<DiagnosisResult> {
        try {
            return await diagnosisAgent.diagnose(image, mimeType, text);
        } catch (error) {
            Sentry.captureException(error);
            throw new Error('AI Diagnosis service unavailable');
        }
    }

    /**
     * Generate a detailed repair plan using Reasoning AI (DeepSeek R1)
     */
    async generateRepairPlan(title: string, description: string, diagnosis: any): Promise<any> {
        try {
            const result = await withRetry(() => planningAgent.generatePlan({ title, description, diagnosis }));
            // Parse the result if it's a JSON string, or wrap it if it's raw text
            try {
                // If DeepSeek returns markdown with JSON, clean it
                const cleaned = result.replace(/```json/g, '').replace(/```/g, '').trim();
                return JSON.parse(cleaned);
            } catch {
                // Fallback: structured object from text
                return {
                    steps: [], // We might want to parse steps from text by newline if needed
                    raw_text: result
                };
            }
        } catch (error) {
            Sentry.captureException(error);
            return { error: "Unable to generate plan" };
        }
    }

    /**
     * Chat with an expert AI
     */
    async chatWithExpert(messages: ChatMessage[]): Promise<string> {
        try {
            return await withRetry(() => planningAgent.chat(messages), 2);
        } catch (error) {
            Sentry.captureException(error);
            return "I'm having trouble connecting to my knowledge base right now. Please try again later.";
        }
    }

    /**
     * Extract generalized repair pattern from a completed report
     */
    async extractRepairPattern(reportTitle: string, reportDescription: string, resolutionDetails: any): Promise<RepairPattern> {
        const prompt = `
            Analyze this completed repair job and abstract it into a generalizable repair pattern.
            
            ISSUE:
            Title: ${reportTitle}
            Description: ${reportDescription}
            
            RESOLUTION:
            ${JSON.stringify(resolutionDetails)}
            
            OUTPUT JSON format only (no markdown):
            {
                "problem_type": "Standardized canonical name for the problem (e.g. 'Refrigerator Compressor Start Failure')",
                "context_signature": "comma-separated keywords describing the symptoms and equipment (e.g. 'samsung, fridge, not cooling, clicking sound')",
                "solution": {
                    "steps": ["Generalized step 1", "Generalized step 2"],
                    "parts_spec": ["Generic part name/spec (e.g. 'Start Relay 4.7 Ohm')"],
                    "estimated_cost_range": "e.g. $20-$50"
                }
            }
        `;

        try {
            return await diagnosisAgent.extractPattern(prompt);
        } catch (error) {
            console.error('Extraction failed:', error);
            throw error;
        }
    }
}

export const aiService = new AiService();
