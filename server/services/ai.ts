import { GoogleGenerativeAI } from '@google/generative-ai';
import { DEEPSEEK_API_KEY } from '../config/secrets.js';
import * as Sentry from '@sentry/node';

// Define common interfaces
export interface DiagnosisResult {
    diagnosis: {
        issue_identified: string;
        description: string;
        category: string;
        severity_score: number;
        safety_warning: string | null;
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

export interface ChatMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

// Provider Interface
interface AiProvider {
    name: string;
}

// Gemini Provider for Multimodal
class GeminiProvider implements AiProvider {
    name = 'Gemini';
    private genAI: GoogleGenerativeAI;
    private model: any;

    private systemPrompt = `1. 系统角色定位 (System Persona)
你是一位拥有 20 年经验的专家级全能房屋维修技师和产品工程师。你的目标是接收用户上传的故障图片或文字描述，并返回极其精确、具备安全警示且结构化的诊断建议。

2. 诊断逻辑框架 (Diagnostic Framework)
在处理任何请求时，必须遵循以下 MECE 原则 进行思考：

安全优先级： 首先判断是否存在触电、漏气、结构性坍塌或溢水风险。

故障分类： 精确归类至 Plumbing（水暖）、Electrical（电气）、HVAC（暖通）、Structural（结构）、Appliance（家电）等。

严重程度评分： 1（低）至 5（极高/需立即切断总闸）。

物料需求 (BOM)： 列出修复该问题可能需要的具体零件、型号及工具。

3. 强制输出 Schema (Output JSON Schema)
必须且仅能返回如下 JSON 格式，不要包含任何 Markdown 格式化标签（如 \`\`\`json）：

JSON
{
  "diagnosis": {
    "issue_identified": "简短的故障名称",
    "description": "详细的故障原因分析",
    "category": "Plumbing | Electrical | HVAC | Structural | Other",
    "severity_score": 1-5,
    "safety_warning": "明确的安全警示，如果没有则为 null"
  },
  "solution": {
    "can_diy": true/false,
    "steps": ["步骤1", "步骤2", "步骤3"],
    "required_parts": [
      {"name": "零件名称", "spec": "可能的规格型号", "estimated_price": "预估价格范围"}
    ],
    "tools_needed": ["工具1", "工具2"]
  },
  "worker_matching_criteria": {
    "required_skill": "所需的具体工种技能",
    "urgency": "immediate | flexible",
    "estimated_man_hours": "预估工时"
  }
}
🛡️ 安全防御指令 (Safety Guardrails)
在 Prompt 中必须加入以下硬性约束，以符合生产级应用的安全标准：

断点提醒： 如果 severity_score >= 4（如涉及配电箱打火、燃气味），必须在 safety_warning 中第一行加粗提示用户：“请立即关闭总闸/总阀并撤离，不要尝试 DIY！”

不确定性处理： 如果上传的图片过于模糊无法判断，JSON 中的 issue_identified 应返回 UNCERTAIN，并在 description 中要求用户从特定角度重新拍照。`;

    constructor() {
        // Fallback for dev environment if env var is missing (should be set in production)
        const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || '';
        this.genAI = new GoogleGenerativeAI(apiKey);
        this.model = this.genAI.getGenerativeModel({
            model: "gemini-1.5-flash",
            systemInstruction: this.systemPrompt
        });
        this.hasApiKey = !!apiKey;
    }

    private hasApiKey: boolean;

    async diagnose(image?: string, mimeType?: string, text?: string): Promise<DiagnosisResult> {
        // Demo fallback when no API key is configured
        if (!this.hasApiKey) {
            console.warn('[AI] No GEMINI_API_KEY set — returning demo diagnosis');
            return {
                diagnosis: {
                    issue_identified: "吊扇异响 / Ceiling Fan Noise",
                    description: "吊扇运行时发出异常噪音，可能由轴承磨损、叶片不平衡或螺丝松动导致。建议检查固定螺丝和叶片平衡状态。(Demo Mode — set GEMINI_API_KEY for real AI diagnosis)",
                    category: "Electrical",
                    severity_score: 2,
                    safety_warning: "操作前请关闭吊扇电源开关，确保叶片完全停止旋转再进行检查。"
                },
                solution: {
                    can_diy: true,
                    steps: [
                        "关闭吊扇电源开关，等待叶片完全停止",
                        "使用梯子安全地靠近吊扇，检查所有固定螺丝是否松动",
                        "逐一检查每个叶片，确认是否有裂痕或变形",
                        "使用平衡夹测试叶片平衡，调整至均等",
                        "清洁叶片表面灰尘，润滑轴承部位",
                        "重新拧紧所有螺丝，开启电源测试运行"
                    ],
                    required_parts: [
                        { name: "吊扇平衡夹", spec: "通用型", estimated_price: "¥5-15" },
                        { name: "轴承润滑油", spec: "WD-40 或同类", estimated_price: "¥15-30" }
                    ],
                    tools_needed: ["十字螺丝刀", "梯子", "抹布", "润滑油"]
                },
                worker_matching_criteria: {
                    required_skill: "Electrical",
                    urgency: "flexible",
                    estimated_man_hours: "0.5-1小时"
                }
            };
        }

        const promptParts: any[] = [
            "请诊断这张图片中的家居维修问题，并按要求返回 JSON。"
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

        const result = await this.model.generateContent(promptParts);
        const responseText = result.response.text();
        const jsonStr = responseText.replace(/```json/g, '').replace(/```/g, '').trim();

        return JSON.parse(jsonStr);
    }
}

// DeepSeek Provider for Reasoning
class DeepSeekProvider implements AiProvider {
    name = 'DeepSeek';
    private apiKey: string;
    private baseUrl = 'https://api.deepseek.com'; // Standard DeepSeek API URL

    constructor() {
        this.apiKey = DEEPSEEK_API_KEY;
    }

    async chat(messages: ChatMessage[]): Promise<string> {
        // Mock fallback if no API key
        if (!this.apiKey) {
            console.warn('DeepSeek API Key missing. Using mock response.');
            return "I am the DeepSeek R1 AI assistant. Since my API key is not configured, I am providing this mock response. In a real scenario, I would analyze your request using advanced reasoning.";
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

            const data = await response.json() as any;
            return data.choices[0].message.content;
        } catch (error) {
            console.error('DeepSeek Call Failed:', error);
            throw error;
        }
    }

    async generatePlan(issueDetails: any): Promise<string> {
        const messages: ChatMessage[] = [
            {
                role: 'system',
                content: `You are a Senior Implementation Engineer. Analyze the following maintenance issue and generate a detailed, step-by-step repair plan. 
                Use your "Chain of Thought" reasoning to anticipate potential complications.
                Output Format: Markdown.`
            },
            {
                role: 'user',
                content: JSON.stringify(issueDetails)
            }
        ];
        return this.chat(messages);
    }
}

// Unified AI Service
class AiService {
    private gemini: GeminiProvider;
    private deepseek: DeepSeekProvider;

    constructor() {
        this.gemini = new GeminiProvider();
        this.deepseek = new DeepSeekProvider();
    }

    /**
     * Diagnose a maintenance issue using Multimodal AI (Gemini)
     */
    async diagnoseIssue(image?: string, mimeType?: string, text?: string): Promise<DiagnosisResult> {
        try {
            return await this.gemini.diagnose(image, mimeType, text);
        } catch (error) {
            console.error('Diagnosis Failed:', error);
            Sentry.captureException(error);
            throw new Error('AI Diagnosis service unavailable');
        }
    }

    /**
     * Generate a detailed repair plan using Reasoning AI (DeepSeek R1)
     */
    async generateRepairPlan(issueDetails: any): Promise<string> {
        try {
            return await this.deepseek.generatePlan(issueDetails);
        } catch (error) {
            console.error('Plan Generation Failed:', error);
            // Fallback to Gemini if DeepSeek fails? Or just error out?
            // For now, let's return a basic plan or error.
            return "Unable to generate detailed plan at this time. Please consult a professional.";
        }
    }

    /**
     * Chat with an expert AI
     */
    async chatWithExpert(messages: ChatMessage[]): Promise<string> {
        try {
            return await this.deepseek.chat(messages);
        } catch (error) {
            console.error('Expert Chat Failed:', error);
            return "I'm having trouble connecting to my knowledge base right now. Please try again later.";
        }
    }
}

export const aiService = new AiService();
