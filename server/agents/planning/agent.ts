import { DEEPSEEK_API_KEY } from '../../config/secrets.js';
import { AiProvider, AiResponse, ChatMessage, withRetry } from '../common.js';

// DeepSeek Provider for Reasoning (CLAW 2)
export class PlanningAgent implements AiProvider {
    name = 'Planning-Claw-2';
    private apiKey: string;
    private baseUrl = 'https://api.deepseek.com';

    constructor() {
        this.apiKey = DEEPSEEK_API_KEY;
    }

    async chat(messages: ChatMessage[]): Promise<AiResponse<string>> {
        // Mock fallback if no API key
        if (!this.apiKey) {
            console.warn('DeepSeek API Key missing. Using mock response.');
            return {
                result: "Mock DeepSeek Response: Detailed plan would be here.",
                usage: { input_tokens: 0, output_tokens: 0, total_tokens: 0, model_name: 'deepseek-reasoner-mock' }
            };
        }

        try {
            const response = await fetch(`${this.baseUrl}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`
                },
                body: JSON.stringify({
                    model: "deepseek-reasoner", // R1 model
                    messages: messages,
                    stream: false
                })
            });

            if (!response.ok) {
                const error = await response.text();
                throw new Error(`DeepSeek API Error: ${response.status} - ${error}`);
            }

            const data = await response.json() as {
                choices: { message: { content: string } }[],
                usage: { prompt_tokens: number, completion_tokens: number, total_tokens: number }
            };

            if (!data.choices?.[0]?.message?.content) {
                throw new Error('DeepSeek returned empty response');
            }

            return {
                result: data.choices[0].message.content,
                usage: {
                    input_tokens: data.usage.prompt_tokens,
                    output_tokens: data.usage.completion_tokens,
                    total_tokens: data.usage.total_tokens,
                    model_name: 'deepseek-reasoner'
                }
            };
        } catch (error) {
            console.error('DeepSeek Call Failed:', error);
            throw error;
        }
    }

    async generatePlan(issueDetails: any): Promise<AiResponse<string>> {
        const messages: ChatMessage[] = [
            {
                role: 'system',
                content: `You are OpenClaw's Planning Layer (Claw 2).
                
                Core Task:
                - Generate a complete repair plan (resolution_plan)
                - Determine 'priority_protocol' based on rules.
                
                Priority Protocol Decision Rules:
                IF issue_type IN [water_leak, fire_hazard, no_heat, gas_leak, burst_pipe, flood]
                  → priority_protocol = "immediate"
                ELSE
                  → priority_protocol = "batch"

                Output JSON ONLY:
                {
                    "required_skills": ["skill1", "skill2"],
                    "required_tools": ["tool1"],
                    "estimated_hours": 1.5,
                    "cost_range": {"min": 100, "max": 200},
                    "priority_protocol": "immediate" | "batch",
                    "steps": ["Step 1", "Step 2"],
                    "explanation": "Brief reasoning"
                }`
            },
            {
                role: 'user',
                content: JSON.stringify(issueDetails, null, 2)
            }
        ];
        return this.chat(messages);
    }
}

export const planningAgent = new PlanningAgent();

