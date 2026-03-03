import { GoogleGenerativeAI } from '@google/generative-ai';
import { AiProvider, AiResponse, DiagnosisResult, parseAiJson, withRetry, ChatMessage } from '../common.js';

// Gemini Provider for Multimodal (CLAW 1) — 8-Step Diagnostic Methodology
export class DiagnosisAgent implements AiProvider {
    name = 'Diagnosis-Claw-1';
    private genAI: GoogleGenerativeAI;
    private model: any;
    private hasApiKey: boolean;

    constructor() {
        const apiKey = process.env.GEMINI_API_KEY || '';
        this.genAI = new GoogleGenerativeAI(apiKey);
        this.model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        this.hasApiKey = !!apiKey;
    }

    // ──────── Helpers ────────

    private buildParts(image?: string, mimeType?: string, text?: string): any[] {
        const parts: any[] = [];
        if (text) parts.push(text);
        if (image) parts.push({ inlineData: { data: image, mimeType: mimeType || 'image/jpeg' } });
        return parts;
    }

    private async callModel(systemPrompt: string, parts: any[]): Promise<{ text: string; usage: any }> {
        // [ECC Cost-Aware Pipeline] 
        // Inject ephemeral cache tags on the repetitive system instruction to slash token burn
        const systemInstruction = {
            role: "system",
            parts: [{ text: systemPrompt }],
            cache_control: { type: "ephemeral" } // Anthropic/Gemini Cache-Control pattern
        };

        const modelWithSystem = this.genAI.getGenerativeModel({
            model: "gemini-1.5-flash",
            systemInstruction: systemInstruction as any
        });
        const result = await modelWithSystem.generateContent(parts);
        const text = result.response.text();
        const usage = result.response.usageMetadata || { promptTokenCount: 0, candidatesTokenCount: 0, totalTokenCount: 0 };
        return { text, usage };
    }

    private mapUsage(usage: any) {
        return {
            input_tokens: usage.promptTokenCount || 0,
            output_tokens: usage.candidatesTokenCount || 0,
            total_tokens: usage.totalTokenCount || 0,
            model_name: 'gemini-1.5-flash'
        };
    }

    // ──────── Step 1: Initial Diagnosis (existing) ────────

    async diagnose(image?: string, mimeType?: string, text?: string): Promise<AiResponse<DiagnosisResult>> {
        if (!this.hasApiKey) {
            return { result: this.mockDiagnosis(), usage: { input_tokens: 0, output_tokens: 0, total_tokens: 0, model_name: 'mock' } };
        }
        const prompt = `Diagnose this home maintenance issue. Return JSON only with keys: diagnosis (issue_type, severity, diagnosis_summary, confidence_score, category, urgency_score, safety_warning), solution (can_diy, steps, required_parts, tools_needed), worker_matching_criteria (required_skill, urgency, estimated_man_hours).`;
        const parts = [prompt, ...this.buildParts(image, mimeType, text)];
        return withRetry(async () => {
            const { text: responseText, usage } = await this.callModel(
                'You are an expert home maintenance diagnostic AI. Return only valid JSON.',
                parts
            );
            return { result: parseAiJson<DiagnosisResult>(responseText, ['diagnosis']), usage: this.mapUsage(usage) };
        });
    }

    // ──────── Step 2: MECE Analysis ────────

    async analyzeMECE(image?: string, mimeType?: string, text?: string, locale: string = 'zh'): Promise<AiResponse<any>> {
        if (!this.hasApiKey) {
            return {
                result: {
                    categories: [
                        { id: 'plumbing', name: locale === 'zh' ? '管道/水路' : 'Plumbing', icon: 'plumbing', confidence: 0.75, description: locale === 'zh' ? '水管、排水、龙头相关' : 'Pipes, drains, faucets' },
                        { id: 'electrical', name: locale === 'zh' ? '电气/线路' : 'Electrical', icon: 'bolt', confidence: 0.15, description: locale === 'zh' ? '开关、线路、灯具相关' : 'Switches, wiring, lights' },
                        { id: 'structural', name: locale === 'zh' ? '结构/墙面' : 'Structural', icon: 'wall', confidence: 0.10, description: locale === 'zh' ? '墙壁、天花板、地板相关' : 'Walls, ceiling, floors' }
                    ],
                    primary_category: 'plumbing',
                    summary: locale === 'zh' ? '根据照片初步判断，此问题属于管道/水路类别。' : 'Based on the photo, this issue appears to be plumbing-related.'
                },
                usage: { input_tokens: 0, output_tokens: 0, total_tokens: 0, model_name: 'mock' }
            };
        }

        const lang = locale === 'zh' ? 'Chinese' : 'English';
        const systemPrompt = `You are a MECE analysis expert for home maintenance. Analyze the image and classify the issue into Mutually Exclusive, Collectively Exhaustive categories.
Return JSON only:
{
  "categories": [{ "id": "short_id", "name": "Category Name in ${lang}", "icon": "material_icon_name", "confidence": 0.0-1.0, "description": "Brief in ${lang}" }],
  "primary_category": "id of highest confidence",
  "summary": "Brief summary in ${lang}"
}
Include 3-5 possible categories. Confidence scores must sum to 1.0.`;

        const parts = ['Classify this home issue using MECE framework.', ...this.buildParts(image, mimeType, text)];
        return withRetry(async () => {
            const { text: responseText, usage } = await this.callModel(systemPrompt, parts);
            return { result: JSON.parse(responseText.replace(/```json/g, '').replace(/```/g, '').trim()), usage: this.mapUsage(usage) };
        });
    }

    // ──────── Step 3: Hypothesis Generation ────────

    async generateHypotheses(category: string, image?: string, mimeType?: string, text?: string, locale: string = 'zh'): Promise<AiResponse<any>> {
        if (!this.hasApiKey) {
            return {
                result: {
                    hypotheses: [
                        { id: 'h1', title: locale === 'zh' ? '管道接头漏水' : 'Pipe Joint Leak', probability: 0.60, reasoning: locale === 'zh' ? '接头处老化导致密封失效' : 'Aging joint causing seal failure', evidence_needed: locale === 'zh' ? ['检查接头处是否有水迹', '触摸管道是否潮湿'] : ['Check joints for water marks', 'Feel pipe for moisture'] },
                        { id: 'h2', title: locale === 'zh' ? '管道腐蚀破裂' : 'Pipe Corrosion', probability: 0.25, reasoning: locale === 'zh' ? '金属管道长期使用腐蚀穿孔' : 'Metal pipe corroded over time', evidence_needed: locale === 'zh' ? ['检查管道表面是否有锈迹', '水质是否发黄'] : ['Check pipe surface for rust', 'Is water discolored?'] },
                        { id: 'h3', title: locale === 'zh' ? '排水管堵塞' : 'Drain Blockage', probability: 0.15, reasoning: locale === 'zh' ? '异物积累导致排水不畅' : 'Debris accumulation causing slow drain', evidence_needed: locale === 'zh' ? ['排水速度是否变慢', '是否有异味'] : ['Is drainage slow?', 'Any odor?'] }
                    ]
                },
                usage: { input_tokens: 0, output_tokens: 0, total_tokens: 0, model_name: 'mock' }
            };
        }

        const lang = locale === 'zh' ? 'Chinese' : 'English';
        const systemPrompt = `You are a root-cause analysis expert. Given a ${category} issue, generate 2-4 hypotheses about the root cause.
Return JSON only:
{
  "hypotheses": [{
    "id": "h1",
    "title": "Hypothesis in ${lang}",
    "probability": 0.0-1.0,
    "reasoning": "Why this might be the cause in ${lang}",
    "evidence_needed": ["What to check in ${lang}"]
  }]
}
Order by probability descending. Probabilities should sum to ~1.0.`;

        const parts = [`Category: ${category}. Generate root-cause hypotheses.`, ...this.buildParts(image, mimeType, text)];
        return withRetry(async () => {
            const { text: responseText, usage } = await this.callModel(systemPrompt, parts);
            return { result: JSON.parse(responseText.replace(/```json/g, '').replace(/```/g, '').trim()), usage: this.mapUsage(usage) };
        });
    }

    // ──────── Step 4: Data Collection Checklist ────────

    async generateChecklist(hypothesis: string, image?: string, mimeType?: string, text?: string, locale: string = 'zh'): Promise<AiResponse<any>> {
        if (!this.hasApiKey) {
            return {
                result: {
                    checklist: [
                        { id: 'c1', question: locale === 'zh' ? '问题区域是否有明显的水渍或潮湿？' : 'Is there visible water staining or moisture?', type: 'boolean', icon: 'water_drop' },
                        { id: 'c2', question: locale === 'zh' ? '问题持续了多长时间？' : 'How long has this been happening?', type: 'choice', options: locale === 'zh' ? ['刚发现', '几天', '几周', '超过一个月'] : ['Just noticed', 'A few days', 'A few weeks', 'Over a month'], icon: 'schedule' },
                        { id: 'c3', question: locale === 'zh' ? '是否听到异常声响（滴水、流水声）？' : 'Do you hear any unusual sounds (dripping, running water)?', type: 'boolean', icon: 'hearing' },
                        { id: 'c4', question: locale === 'zh' ? '问题在特定时间加重吗（如用水后）？' : 'Does it worsen at specific times (e.g., after using water)?', type: 'boolean', icon: 'timer' },
                        { id: 'c5', question: locale === 'zh' ? '受影响区域面积有多大？' : 'How large is the affected area?', type: 'choice', options: locale === 'zh' ? ['小于手掌', '手掌到A4大小', '大于A4纸', '整面墙/地板'] : ['Smaller than a hand', 'Hand to A4 size', 'Larger than A4', 'Entire wall/floor'], icon: 'square_foot' },
                    ]
                },
                usage: { input_tokens: 0, output_tokens: 0, total_tokens: 0, model_name: 'mock' }
            };
        }

        const lang = locale === 'zh' ? 'Chinese' : 'English';
        const systemPrompt = `You are a diagnostic data collection expert. Generate a checklist of 4-6 observations the homeowner should verify.
Return JSON only:
{
  "checklist": [{
    "id": "c1",
    "question": "Question in ${lang}",
    "type": "boolean" | "choice",
    "options": ["Only if type=choice, options in ${lang}"],
    "icon": "material_icon_name"
  }]
}
Questions should help confirm or deny the hypothesis. Use clear, non-technical language.`;

        const parts = [`Hypothesis: ${hypothesis}. Generate data collection checklist.`, ...this.buildParts(image, mimeType, text)];
        return withRetry(async () => {
            const { text: responseText, usage } = await this.callModel(systemPrompt, parts);
            return { result: JSON.parse(responseText.replace(/```json/g, '').replace(/```/g, '').trim()), usage: this.mapUsage(usage) };
        });
    }

    // ──────── Step 5: 5-Why Dialog ────────

    async driveFiveWhy(history: ChatMessage[], context: any, image?: string, mimeType?: string, locale: string = 'zh'): Promise<AiResponse<any>> {
        if (!this.hasApiKey) {
            const userMsgCount = history.filter(m => m.role === 'user').length;
            if (userMsgCount < 3) {
                const whyNum = userMsgCount + 1;
                return {
                    result: {
                        type: 'why_question',
                        why_number: whyNum,
                        message: locale === 'zh'
                            ? `根据您的回答，我来进行第 ${whyNum} 层"为什么"分析：`
                            : `Based on your answer, let me ask Why #${whyNum}:`,
                        question: locale === 'zh'
                            ? ['为什么会出现这个现象？可能的根本原因是什么？', '为什么之前没有注意到这个问题？', '为什么会在这个位置出现问题？'][userMsgCount]
                            : ['Why is this happening? What could be the root cause?', 'Why wasn\'t this noticed earlier?', 'Why is it occurring in this specific location?'][userMsgCount],
                        insight: locale === 'zh'
                            ? '通过逐层追问，我们正在接近问题的根本原因。'
                            : 'Through iterative questioning, we\'re approaching the root cause.',
                        quick_replies: locale === 'zh'
                            ? ['不太确定', '可能是老化', '最近装修过']
                            : ['Not sure', 'Possibly aging', 'Recent renovation']
                    },
                    usage: { input_tokens: 0, output_tokens: 0, total_tokens: 0, model_name: 'mock' }
                };
            }
            return {
                result: {
                    type: 'root_cause',
                    message: locale === 'zh'
                        ? '经过5层"为什么"分析，我找到了根本原因：'
                        : 'After 5-Why analysis, I\'ve identified the root cause:',
                    root_cause: locale === 'zh'
                        ? '管道接头处的密封胶在长期使用后老化失效，加上水压偶尔波动导致微漏逐渐扩大。'
                        : 'The sealant at the pipe joint degraded over time, combined with occasional water pressure fluctuations causing micro-leaks to expand.',
                    confidence: 0.85,
                    contributing_factors: locale === 'zh'
                        ? ['密封材料老化', '水压不稳定', '缺乏定期检查']
                        : ['Sealant aging', 'Unstable water pressure', 'Lack of regular inspection']
                },
                usage: { input_tokens: 0, output_tokens: 0, total_tokens: 0, model_name: 'mock' }
            };
        }

        const lang = locale === 'zh' ? 'Chinese' : 'English';
        const systemPrompt = `You are a 5-Why root cause analysis expert for home maintenance.
You are conducting an iterative "5-Why" analysis with a homeowner.

Context: ${JSON.stringify(context)}

RULES:
- Ask ONE "Why" question at a time to drill deeper into the root cause.
- After 3-5 rounds, conclude with the root cause.
- Respond in ${lang}.

When asking a Why question, return JSON:
{
  "type": "why_question",
  "why_number": 1-5,
  "message": "Analysis of previous answer in ${lang}",
  "question": "The Why question in ${lang}",
  "insight": "What this tells us in ${lang}",
  "quick_replies": ["Suggested answer 1", "Suggested answer 2"]
}

When concluding the root cause, return JSON:
{
  "type": "root_cause",
  "message": "Summary in ${lang}",
  "root_cause": "Detailed root cause in ${lang}",
  "confidence": 0.0-1.0,
  "contributing_factors": ["Factor 1", "Factor 2"]
}`;

        const conversationText = history.map(m => `${m.role === 'user' ? 'Homeowner' : 'Analyst'}: ${m.content}`).join('\n');
        const parts = [...this.buildParts(image, mimeType), `Conversation:\n${conversationText}\n\nProvide the next step in the 5-Why analysis. Return JSON only.`];
        return withRetry(async () => {
            const { text: responseText, usage } = await this.callModel(systemPrompt, parts);
            return { result: JSON.parse(responseText.replace(/```json/g, '').replace(/```/g, '').trim()), usage: this.mapUsage(usage) };
        });
    }

    // ──────── Step 6: Solution Generation ────────

    async generateSolution(rootCause: string, context: any, locale: string = 'zh'): Promise<AiResponse<any>> {
        if (!this.hasApiKey) {
            return {
                result: {
                    issue_name: locale === 'zh' ? '管道接头密封失效' : 'Pipe Joint Seal Failure',
                    severity: 'moderate',
                    root_cause: rootCause,
                    steps: [
                        { step: 1, action: locale === 'zh' ? '关闭总水阀' : 'Shut Off Main Water', detail: locale === 'zh' ? '找到并关闭该区域的水阀或总水阀' : 'Locate and close the area valve or main shutoff' },
                        { step: 2, action: locale === 'zh' ? '清理接头' : 'Clean the Joint', detail: locale === 'zh' ? '用干布擦干接头处，清除老旧密封胶' : 'Dry the joint area and remove old sealant' },
                        { step: 3, action: locale === 'zh' ? '重新涂抹密封' : 'Apply New Sealant', detail: locale === 'zh' ? '使用生料带缠绕接头螺纹，再涂管道密封胶' : 'Wrap thread tape around joint threads, then apply pipe sealant' },
                        { step: 4, action: locale === 'zh' ? '测试验收' : 'Test & Verify', detail: locale === 'zh' ? '打开水阀，观察30分钟确认无漏水' : 'Turn water back on, observe for 30 min to confirm no leaks' }
                    ],
                    required_parts: [
                        { name: locale === 'zh' ? '管道密封胶' : 'Pipe Sealant', spec: locale === 'zh' ? '防水型' : 'Waterproof', estimated_price: locale === 'zh' ? '¥15-30' : '$5-10' },
                        { name: locale === 'zh' ? '生料带' : 'Thread Tape', spec: locale === 'zh' ? '标准型' : 'Standard PTFE', estimated_price: locale === 'zh' ? '¥5-10' : '$2-5' }
                    ],
                    tools_needed: locale === 'zh' ? ['扳手', '干布', '手电筒'] : ['Wrench', 'Dry cloth', 'Flashlight'],
                    estimated_cost: locale === 'zh' ? '¥20-40' : '$7-15',
                    estimated_time: locale === 'zh' ? '30-60分钟' : '30-60 minutes',
                    can_diy: true,
                    diy_difficulty: 'easy',
                    safety_warnings: [locale === 'zh' ? '操作前务必关闭水阀' : 'Always shut off water before working'],
                    when_to_call_pro: locale === 'zh' ? '如果重新密封后仍漏水，或管道本身损坏，请联系专业水管工' : 'Contact a plumber if leak persists after re-sealing or if pipe is damaged',
                    prevention_tips: [locale === 'zh' ? '每年检查一次管道接头' : 'Inspect pipe joints annually', locale === 'zh' ? '注意水费突然增高的预警信号' : 'Watch for sudden water bill increases']
                },
                usage: { input_tokens: 0, output_tokens: 0, total_tokens: 0, model_name: 'mock' }
            };
        }

        const lang = locale === 'zh' ? 'Chinese' : 'English';
        const systemPrompt = `You are a home repair solution expert. Generate a comprehensive repair solution.
All text must be in ${lang}.
Return JSON only:
{
  "issue_name": "Name", "severity": "critical|moderate|cosmetic", "root_cause": "Details",
  "steps": [{"step": 1, "action": "Title", "detail": "Instructions"}],
  "required_parts": [{"name": "Part", "spec": "Spec", "estimated_price": "Price"}],
  "tools_needed": ["Tool"], "estimated_cost": "Range", "estimated_time": "Duration",
  "can_diy": boolean, "diy_difficulty": "easy|medium|hard",
  "safety_warnings": ["Warning"], "when_to_call_pro": "Description", "prevention_tips": ["Tip"]
}`;

        const parts = [`Root cause: ${rootCause}\nContext: ${JSON.stringify(context)}\nGenerate solution.`];
        return withRetry(async () => {
            const { text: responseText, usage } = await this.callModel(systemPrompt, parts);
            return { result: JSON.parse(responseText.replace(/```json/g, '').replace(/```/g, '').trim()), usage: this.mapUsage(usage) };
        });
    }

    // ──────── Active Inquiry Conversation ────────

    async inquiryConversation(history: ChatMessage[], image?: string, mimeType?: string, locale: string = 'zh'): Promise<AiResponse<any>> {
        if (!this.hasApiKey) {
            // Mock: simulate progressive question gathering
            const userMsgCount = history.filter(m => m.role === 'user').length;
            if (userMsgCount === 0) {
                return {
                    result: {
                        type: 'question',
                        message: locale === 'zh'
                            ? '您好！我是您的智能家居维修顾问。请告诉我您需要什么类型的服务？'
                            : 'Hello! I\'m your smart home maintenance advisor. What type of service do you need?',
                        questions: locale === 'zh'
                            ? ['请选择或描述您的问题类型']
                            : ['Please select or describe your issue type'],
                        quickReplies: locale === 'zh'
                            ? ['水管/管道', '电气/线路', '暖通空调', '墙面/结构', '粉刷/装饰', '其他']
                            : ['Plumbing', 'Electrical', 'HVAC', 'Structural', 'Painting', 'Other'],
                        progress: 10,
                        collectedFields: {}
                    },
                    usage: { input_tokens: 0, output_tokens: 0, total_tokens: 0, model_name: 'mock' }
                };
            } else if (userMsgCount === 1) {
                return {
                    result: {
                        type: 'question',
                        message: locale === 'zh'
                            ? '好的，已记录问题类型。请问具体是哪个区域/房间发生了问题？'
                            : 'Got it. Which area or room is the issue in?',
                        questions: locale === 'zh'
                            ? ['请选择或描述问题所在区域']
                            : ['Please select or describe the area'],
                        quickReplies: locale === 'zh'
                            ? ['厨房', '卫生间', '卧室', '客厅', '阳台', '外墙']
                            : ['Kitchen', 'Bathroom', 'Bedroom', 'Living Room', 'Balcony', 'Exterior'],
                        progress: 30,
                        collectedFields: { projectType: history[history.length - 1]?.content || '' }
                    },
                    usage: { input_tokens: 0, output_tokens: 0, total_tokens: 0, model_name: 'mock' }
                };
            } else if (userMsgCount === 2) {
                return {
                    result: {
                        type: 'question',
                        message: locale === 'zh'
                            ? '明白了。能否详细描述一下具体的问题症状？比如什么时候开始的、严重程度如何？'
                            : 'Understood. Can you describe the specific symptoms? When did it start and how severe is it?',
                        questions: locale === 'zh'
                            ? ['请详细描述问题现象和症状']
                            : ['Please describe the issue details and symptoms'],
                        quickReplies: locale === 'zh'
                            ? ['刚发现的', '已经持续几天', '越来越严重', '时好时坏']
                            : ['Just noticed', 'A few days now', 'Getting worse', 'Intermittent'],
                        progress: 50,
                        collectedFields: { projectType: history[1]?.content || '', area: history[history.length - 1]?.content || '' }
                    },
                    usage: { input_tokens: 0, output_tokens: 0, total_tokens: 0, model_name: 'mock' }
                };
            } else if (userMsgCount === 3) {
                return {
                    result: {
                        type: 'question',
                        message: locale === 'zh'
                            ? '感谢您的描述！请问您的预算范围大概是多少？以及您希望什么时间完成？'
                            : 'Thanks for the details! What\'s your approximate budget range? And when do you need this done?',
                        questions: locale === 'zh'
                            ? ['预算范围', '时间要求']
                            : ['Budget range', 'Timeline'],
                        quickReplies: locale === 'zh'
                            ? ['500元以内', '500-2000元', '2000-5000元', '5000元以上', '紧急处理', '本周内', '不急，灵活']
                            : ['Under ¥500', '¥500-2000', '¥2000-5000', 'Over ¥5000', 'Emergency', 'This week', 'Flexible'],
                        progress: 70,
                        collectedFields: {
                            projectType: history[1]?.content || '',
                            area: history[3]?.content || '',
                            scope: history[history.length - 1]?.content || ''
                        }
                    },
                    usage: { input_tokens: 0, output_tokens: 0, total_tokens: 0, model_name: 'mock' }
                };
            } else {
                // After 4+ user messages, return summary
                return {
                    result: {
                        type: 'summary',
                        message: locale === 'zh'
                            ? '✅ 信息收集完毕！以下是您的需求清单：'
                            : '✅ Information collected! Here\'s your demand summary:',
                        progress: 100,
                        demandSummary: {
                            projectType: locale === 'zh' ? '水管/管道' : 'Plumbing',
                            area: locale === 'zh' ? '厨房' : 'Kitchen',
                            scope: locale === 'zh' ? '水管接头漏水，已持续数天，逐渐加重' : 'Pipe joint leak, ongoing for days, getting worse',
                            budget: locale === 'zh' ? '500-2000元' : '¥500-2000',
                            timeline: locale === 'zh' ? '本周内' : 'This week',
                            severity: 'moderate',
                            specialRequirements: locale === 'zh' ? '无特殊要求' : 'No special requirements',
                            hasPhoto: !!image,
                        }
                    },
                    usage: { input_tokens: 0, output_tokens: 0, total_tokens: 0, model_name: 'mock' }
                };
            }
        }

        const lang = locale === 'zh' ? 'Chinese' : 'English';
        const systemPrompt = `You are an expert home maintenance inquiry assistant. Your job is to PROGRESSIVELY GATHER key information from the homeowner through targeted questions. Ask ONE category of question at a time.

INFORMATION TO COLLECT:
1. Project Type (plumbing, electrical, HVAC, structural, painting, other)
2. Area/Room (kitchen, bathroom, bedroom, living room, balcony, exterior, etc.)
3. Scope/Description (specific symptoms, when it started, how severe)
4. Budget Range (optional)
5. Timeline/Urgency (emergency, this week, flexible)
6. Special Requirements (optional, free text)

RULES:
- Ask ONE question category at a time
- Analyze the conversation history to determine which fields are already collected
- Provide 4-7 quick reply suggestions for each question
- Calculate a progress percentage (0-100) based on info collected
- Respond in ${lang}

When still collecting info, return JSON:
{
  "type": "question",
  "message": "Analysis + next question in ${lang}",
  "questions": ["The specific question"],
  "quickReplies": ["Reply option 1", "Reply option 2"],
  "progress": 0-100,
  "collectedFields": { "projectType": "...", "area": "...", etc (only fields already collected) }
}

When ALL key information (at least projectType, area, scope) is collected, return JSON:
{
  "type": "summary",
  "message": "Completion message in ${lang}",
  "progress": 100,
  "demandSummary": {
    "projectType": "Classified category",
    "area": "Room/area",
    "scope": "Consolidated problem description",
    "budget": "Budget range or 'Not specified'",
    "timeline": "Timeline or 'Flexible'",
    "severity": "critical|moderate|low",
    "specialRequirements": "Any special notes or 'None'",
    "hasPhoto": boolean
  }
}`;

        const conversationText = history.map(m => `${m.role === 'user' ? 'Homeowner' : 'Advisor'}: ${m.content}`).join('\n');
        const parts = [...this.buildParts(image, mimeType), `Conversation so far:\n${conversationText}\n\nProvide the next step in the inquiry. Return JSON only.`];
        return withRetry(async () => {
            const { text: responseText, usage } = await this.callModel(systemPrompt, parts);
            return { result: JSON.parse(responseText.replace(/```json/g, '').replace(/```/g, '').trim()), usage: this.mapUsage(usage) };
        });
    }

    // ──────── Legacy: continueConversation (for backward compat) ────────

    async continueConversation(history: ChatMessage[], image?: string, mimeType?: string): Promise<AiResponse<any>> {
        return this.driveFiveWhy(history, {}, image, mimeType);
    }

    // ──────── Pattern Extraction ────────

    async extractPattern(prompt: string): Promise<AiResponse<any>> {
        if (!this.hasApiKey) {
            return { result: { problem_type: "Demo", context_signature: "demo", solution: { steps: [], parts_spec: [] } }, usage: { input_tokens: 0, output_tokens: 0, total_tokens: 0, model_name: 'mock' } };
        }
        return withRetry(async () => {
            const { text: responseText, usage } = await this.callModel('Extract repair pattern from completed job. Return JSON only.', [prompt]);
            return { result: JSON.parse(responseText.replace(/```json/g, '').replace(/```/g, '').trim()), usage: this.mapUsage(usage) };
        });
    }

    // ──────── Mock Data ────────

    private mockDiagnosis(): DiagnosisResult {
        return {
            diagnosis: { issue_type: "Pipe Joint Leak", severity: "moderate", diagnosis_summary: "Water seepage at pipe joint due to sealant degradation.", confidence_score: 0.92, category: "Plumbing", urgency_score: 5, safety_warning: null },
            solution: { can_diy: true, steps: ["Shut off water", "Clean joint", "Apply sealant", "Test"], required_parts: [{ name: "Pipe Sealant", spec: "Waterproof", estimated_price: "$8" }], tools_needed: ["Wrench", "Cloth"] },
            worker_matching_criteria: { required_skill: "Plumbing", urgency: "flexible", estimated_man_hours: "1h" }
        };
    }
}

export const diagnosisAgent = new DiagnosisAgent();
