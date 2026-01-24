
import { Router } from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { z } from 'zod';

const router = Router();

// Initialize Gemini API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY);

const systemPrompt = `1. 系统角色定位 (System Persona)
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

// Schema for validation
const analyzeSchema = z.object({
    image: z.string().optional(), // base64
    mimeType: z.string().optional(),
    text: z.string().optional()
});

router.post('/diagnose', async (req, res) => {
    try {
        const { image, mimeType, text } = analyzeSchema.parse(req.body);

        if (!process.env.GEMINI_API_KEY && !process.env.VITE_GEMINI_API_KEY) {
            throw new Error('Server missing GEMINI_API_KEY');
        }

        const model = genAI.getGenerativeModel({
            model: "gemini-1.5-flash",
            systemInstruction: systemPrompt
        });

        const promptParts = [
            "请诊断这张图片中的家居维修问题，并按要求返回 JSON。"
        ];

        if (text) {
            promptParts.push(text);
        }

        if (image) {
            promptParts.push({
                inlineData: {
                    data: image,
                    mimeType: mimeType || "image/jpeg"
                }
            });
        }

        const result = await model.generateContent(promptParts);
        const responseText = result.response.text();

        // Clean up markdown if present (though prompt says don't use it, AI sometimes ignores)
        const jsonStr = responseText.replace(/```json/g, '').replace(/```/g, '').trim();

        const responseData = JSON.parse(jsonStr);
        res.json(responseData);

    } catch (error) {
        console.error('AI Diagnosis Error:', error);
        res.status(500).json({
            error: 'Diagnosis failed',
            details: error.message
        });
    }
});

export default router;
