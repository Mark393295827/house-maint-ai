import { diagnosisAgent } from '../agents/diagnosis/agent.js';
import { planningAgent } from '../agents/planning/agent.js';
import { DiagnosisResult, RepairPattern, ChatMessage, withRetry, AiResponse } from '../agents/common.js';
import * as Sentry from '@sentry/node';

// Unified AI Service (Facade)
// Keeps the same interface for backward compatibility, but delegates to specialized agents.
class AiService {

    /**
     * Diagnose a maintenance issue using Multimodal AI (Gemini)
     */
    async diagnoseIssue(image?: string, mimeType?: string, text?: string): Promise<AiResponse<DiagnosisResult>> {
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
    async generateRepairPlan(params: { title: string, description: string, diagnosis: any }): Promise<AiResponse<any>> {
        try {
            const { title, description, diagnosis } = params;
            const response = await withRetry(() => planningAgent.generatePlan({ title, description, diagnosis }));
            const { result, usage } = response;

            // Parse the result if it's a JSON string, or wrap it if it's raw text
            try {
                // If DeepSeek returns markdown with JSON, clean it
                const cleaned = result.replace(/```json/g, '').replace(/```/g, '').trim();
                return { result: JSON.parse(cleaned), usage };
            } catch {
                // Fallback: structured object from text
                return {
                    result: {
                        steps: [], // We might want to parse steps from text by newline if needed
                        raw_text: result
                    },
                    usage
                };
            }
        } catch (error) {
            Sentry.captureException(error);
            return {
                result: { error: "Unable to generate plan" },
                usage: { input_tokens: 0, output_tokens: 0, total_tokens: 0 }
            };
        }
    }

    /**
     * Continue a multi-turn diagnostic conversation (legacy compat)
     */
    async continueDiagnosis(history: ChatMessage[], image?: string, mimeType?: string): Promise<AiResponse<any>> {
        try {
            return await diagnosisAgent.continueConversation(history, image, mimeType);
        } catch (error) {
            Sentry.captureException(error);
            throw new Error('AI Diagnosis conversation service unavailable');
        }
    }

    /** Step 2: MECE category analysis */
    async meceAnalysis(image?: string, mimeType?: string, text?: string, locale?: string): Promise<AiResponse<any>> {
        try {
            return await diagnosisAgent.analyzeMECE(image, mimeType, text, locale);
        } catch (error) { Sentry.captureException(error); throw new Error('MECE analysis failed'); }
    }

    /** Step 3: Hypothesis generation */
    async hypothesisGeneration(category: string, image?: string, mimeType?: string, text?: string, locale?: string): Promise<AiResponse<any>> {
        try {
            return await diagnosisAgent.generateHypotheses(category, image, mimeType, text, locale);
        } catch (error) { Sentry.captureException(error); throw new Error('Hypothesis generation failed'); }
    }

    /** Step 4: Data collection checklist */
    async checklistGeneration(hypothesis: string, image?: string, mimeType?: string, text?: string, locale?: string): Promise<AiResponse<any>> {
        try {
            return await diagnosisAgent.generateChecklist(hypothesis, image, mimeType, text, locale);
        } catch (error) { Sentry.captureException(error); throw new Error('Checklist generation failed'); }
    }

    /** Step 5: 5-Why dialog analysis */
    async fiveWhyAnalysis(history: ChatMessage[], context: any, image?: string, mimeType?: string, locale?: string): Promise<AiResponse<any>> {
        try {
            return await diagnosisAgent.driveFiveWhy(history, context, image, mimeType, locale);
        } catch (error) { Sentry.captureException(error); throw new Error('5-Why analysis failed'); }
    }

    /** Step 6: Solution generation */
    async solutionGeneration(rootCause: string, context: any, locale?: string): Promise<AiResponse<any>> {
        try {
            return await diagnosisAgent.generateSolution(rootCause, context, locale);
        } catch (error) { Sentry.captureException(error); throw new Error('Solution generation failed'); }
    }

    /** Active Inquiry: progressive question gathering */
    async inquiryConversation(history: ChatMessage[], image?: string, mimeType?: string, locale?: string): Promise<AiResponse<any>> {
        try {
            return await diagnosisAgent.inquiryConversation(history, image, mimeType, locale);
        } catch (error) { Sentry.captureException(error); throw new Error('Inquiry conversation failed'); }
    }

    /**
     * Chat with an expert AI
     */
    async chatWithExpert(messages: ChatMessage[]): Promise<AiResponse<string>> {
        try {
            return await withRetry(() => planningAgent.chat(messages), 2);
        } catch (error) {
            Sentry.captureException(error);
            return {
                result: "I'm having trouble connecting to my knowledge base right now. Please try again later.",
                usage: { input_tokens: 0, output_tokens: 0, total_tokens: 0 }
            };
        }
    }

    /**
     * Extract generalized repair pattern from a completed report
     */
    async extractRepairPattern(reportTitle: string, reportDescription: string, resolutionDetails: any): Promise<AiResponse<RepairPattern>> {
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

