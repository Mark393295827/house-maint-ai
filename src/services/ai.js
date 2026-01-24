/**
 * AI Service for House Maint AI
 * Integrates with Google Gemini Vision API for image analysis
 */

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

/**
 * Convert image file to base64
 */
async function imageToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            // Remove data URL prefix to get pure base64
            const base64 = reader.result.split(',')[1];
            resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

/**
 * Convert blob URL to base64
 */
async function blobUrlToBase64(blobUrl) {
    const response = await fetch(blobUrl);
    const blob = await response.blob();
    return imageToBase64(blob);
}

/**
 * Analyze image using Gemini Vision API
 * @param {string} imageBase64 - Base64 encoded image
 * @param {string} mimeType - Image MIME type (e.g., 'image/jpeg')
 * @returns {Promise<object>} Analysis result
 */
export async function analyzeImage(imageBase64, mimeType = 'image/jpeg') {
    if (!GEMINI_API_KEY) {
        console.warn('Gemini API key not configured, using mock response');
        return getMockAnalysis();
    }

    const systemPrompt = `你是一个专业的房屋维修诊断专家。请分析用户上传的图片，识别其中可能存在的房屋维修问题。

请以 JSON 格式返回分析结果，包含以下字段：
{
  "detected": true/false,  // 是否检测到问题
  "issue_name": "问题名称",  // 例如：墙体裂缝、水管漏水、电路故障
  "issue_name_en": "Issue name in English",
  "confidence": 0-100,  // 置信度百分比
  "severity": "low/medium/high/critical",  // 严重程度
  "description": "问题描述",
  "description_en": "Description in English",
  "possible_causes": ["可能原因1", "可能原因2"],
  "recommended_actions": ["建议措施1", "建议措施2"],
  "diy_difficulty": "easy/medium/hard",  // DIY难度
  "estimated_cost": "预估费用范围",
  "urgency": "可以等待/尽快处理/立即处理"
}

如果图片中没有明显的房屋维修问题，返回 detected: false 并说明原因。`;

    try {
        const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [
                        { text: systemPrompt },
                        {
                            inline_data: {
                                mime_type: mimeType,
                                data: imageBase64
                            }
                        }
                    ]
                }],
                generationConfig: {
                    temperature: 0.4,
                    topK: 32,
                    topP: 1,
                    maxOutputTokens: 2048,
                }
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || 'API request failed');
        }

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!text) {
            throw new Error('No response from AI');
        }

        // Parse JSON from response (handle markdown code blocks)
        const jsonMatch = text.match(/```json\n?([\s\S]*?)\n?```/) || text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const jsonStr = jsonMatch[1] || jsonMatch[0];
            return JSON.parse(jsonStr);
        }

        throw new Error('Failed to parse AI response');
    } catch (error) {
        console.error('AI analysis error:', error);
        throw error;
    }
}

/**
 * Analyze image from file input
 */
export async function analyzeImageFile(file) {
    const base64 = await imageToBase64(file);
    return analyzeImage(base64, file.type);
}

/**
 * Analyze image from blob URL (e.g., from camera capture)
 */
export async function analyzeImageFromUrl(blobUrl, mimeType = 'image/jpeg') {
    const base64 = await blobUrlToBase64(blobUrl);
    return analyzeImage(base64, mimeType);
}

/**
 * Generate repair steps based on diagnosis
 */
export async function generateRepairSteps(diagnosis) {
    if (!GEMINI_API_KEY) {
        return getMockRepairSteps(diagnosis);
    }

    const prompt = `基于以下房屋维修诊断结果，请提供详细的维修步骤指南：

问题: ${diagnosis.issue_name}
严重程度: ${diagnosis.severity}
描述: ${diagnosis.description}

请以 JSON 格式返回：
{
  "title": "维修指南标题",
  "title_en": "Repair Guide Title",
  "steps": [
    {
      "step_number": 1,
      "title": "步骤标题",
      "title_en": "Step Title",
      "description": "详细说明",
      "description_en": "Detailed description",
      "duration": "预估时间",
      "tools_needed": ["工具1", "工具2"],
      "tips": ["提示1", "提示2"],
      "warnings": ["警告1"]
    }
  ],
  "total_duration": "总时间",
  "materials_needed": ["材料1", "材料2"],
  "safety_notes": ["安全提示1", "安全提示2"],
  "when_to_call_pro": "何时需要请专业人员"
}`;

    try {
        const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: prompt }]
                }],
                generationConfig: {
                    temperature: 0.3,
                    maxOutputTokens: 4096,
                }
            })
        });

        if (!response.ok) {
            throw new Error('Failed to generate repair steps');
        }

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

        const jsonMatch = text.match(/```json\n?([\s\S]*?)\n?```/) || text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const jsonStr = jsonMatch[1] || jsonMatch[0];
            return JSON.parse(jsonStr);
        }

        throw new Error('Failed to parse repair steps');
    } catch (error) {
        console.error('Generate repair steps error:', error);
        return getMockRepairSteps(diagnosis);
    }
}

/**
 * Mock analysis for development/demo
 */
function getMockAnalysis() {
    return {
        detected: true,
        issue_name: '墙体裂缝',
        issue_name_en: 'Wall Crack',
        confidence: 85,
        severity: 'medium',
        description: '检测到墙面存在细微裂缝，可能由于温度变化或建筑沉降导致。',
        description_en: 'Detected hairline cracks on the wall, possibly caused by temperature changes or building settlement.',
        possible_causes: [
            '温度变化导致的热胀冷缩',
            '建筑沉降',
            '墙体材料老化'
        ],
        recommended_actions: [
            '观察裂缝是否继续扩大',
            '使用填缝剂修补',
            '如裂缝扩大需请专业人员检查'
        ],
        diy_difficulty: 'easy',
        estimated_cost: '50-200元',
        urgency: '尽快处理'
    };
}

/**
 * Mock repair steps for development/demo
 */
function getMockRepairSteps(diagnosis) {
    return {
        title: `${diagnosis?.issue_name || '墙体裂缝'}修复指南`,
        title_en: `${diagnosis?.issue_name_en || 'Wall Crack'} Repair Guide`,
        steps: [
            {
                step_number: 1,
                title: '清洁准备',
                title_en: 'Clean and Prepare',
                description: '用刷子或吸尘器清除裂缝周围的灰尘和松散材料。',
                description_en: 'Use a brush or vacuum to remove dust and loose material around the crack.',
                duration: '10分钟',
                tools_needed: ['刷子', '吸尘器'],
                tips: ['确保表面干燥'],
                warnings: []
            },
            {
                step_number: 2,
                title: '填充裂缝',
                title_en: 'Fill the Crack',
                description: '使用填缝剂均匀填充裂缝，确保填充完整。',
                description_en: 'Apply filler evenly into the crack, ensuring complete coverage.',
                duration: '15分钟',
                tools_needed: ['填缝剂', '刮刀'],
                tips: ['从裂缝底部向上填充'],
                warnings: ['避免接触眼睛']
            },
            {
                step_number: 3,
                title: '等待干燥',
                title_en: 'Allow to Dry',
                description: '等待填缝剂完全干燥，通常需要24小时。',
                description_en: 'Wait for the filler to completely dry, usually takes 24 hours.',
                duration: '24小时',
                tools_needed: [],
                tips: ['保持通风'],
                warnings: []
            },
            {
                step_number: 4,
                title: '打磨平整',
                title_en: 'Sand Smooth',
                description: '使用砂纸将修复处打磨平整，与周围墙面齐平。',
                description_en: 'Use sandpaper to smooth the repaired area flush with the surrounding wall.',
                duration: '10分钟',
                tools_needed: ['细砂纸', '打磨海绵'],
                tips: ['使用圆周运动打磨'],
                warnings: ['佩戴口罩防尘']
            },
            {
                step_number: 5,
                title: '重新粉刷',
                title_en: 'Repaint',
                description: '涂上底漆后，用与墙面相同颜色的油漆覆盖修复区域。',
                description_en: 'Apply primer, then paint with matching wall color.',
                duration: '30分钟',
                tools_needed: ['底漆', '油漆', '刷子/滚筒'],
                tips: ['先涂一层底漆效果更好'],
                warnings: ['保持通风']
            }
        ],
        total_duration: '约1-2天（含干燥时间）',
        materials_needed: ['填缝剂', '细砂纸', '底漆', '墙面漆'],
        safety_notes: [
            '修复前确保区域通风良好',
            '处理填缝剂时佩戴手套',
            '打磨时佩戴防尘口罩'
        ],
        when_to_call_pro: '如果裂缝宽度超过3mm或持续扩大，建议请专业人员检查结构安全。'
    };
}

export default {
    analyzeImage,
    analyzeImageFile,
    analyzeImageFromUrl,
    generateRepairSteps,
};
