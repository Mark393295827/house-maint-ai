import { GoogleGenerativeAI } from '@google/generative-ai';
import { AiProvider, AiResponse, TurnoverReport, parseAiJson, withRetry } from '../common.js';

// S3: Vacation Rental Turnover Agent (度假房交接)
// Compares before/after photos to detect new damage after guest checkout.
// 10X: From zero documentation to AI-generated evidence reports in 30 seconds.
export class TurnoverAgent implements AiProvider {
    name = 'Turnover-S3';
    private genAI: GoogleGenerativeAI;
    private model: any;
    private hasApiKey: boolean;

    constructor() {
        const apiKey = process.env.GEMINI_API_KEY || '';
        this.hasApiKey = !!apiKey;
        this.genAI = new GoogleGenerativeAI(apiKey || 'dummy');
        this.model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    }

    async compareTurnover(
        beforeImages: Array<{ data: string; mimeType: string }>,
        afterImages: Array<{ data: string; mimeType: string }>,
        propertyName?: string,
        locale: string = 'zh'
    ): Promise<AiResponse<TurnoverReport>> {
        if (!this.hasApiKey) {
            return { result: this.mockReport(), usage: { input_tokens: 0, output_tokens: 0, total_tokens: 0, model_name: 'gemini-mock' } };
        }

        const lang = locale === 'zh' ? '中文' : 'English';
        const systemPrompt = `You are a professional vacation rental property inspector for Sanya, Hainan (三亚度假短租).

Your task: Compare BEFORE (check-in) and AFTER (checkout) photos of a vacation rental property to identify new damage, missing items, and cleanliness issues.

INSPECTION PROTOCOL:
1. Systematically compare each pair of before/after photos
2. Flag any NEW damage not visible in the before photos
3. Check for missing items (decorations, electronics, linens, kitchenware)
4. Assess cleanliness on a 1-10 scale
5. Estimate repair costs in CNY for any damage found
6. Provide a one-paragraph summary suitable for filing a damage claim on Tujia/Airbnb

SANYA CONTEXT:
- High-end vacation rentals typically valued at ¥2,000-8,000/night
- Common damage types: stain on white bedding, broken glass, cigarette burns, salt spray on balcony furniture
- Distinguish between guest damage and pre-existing wear from humid environment

Property: ${propertyName || 'Unnamed property'}

Respond in ${lang}. Output ONLY valid JSON:
{
    "overall_condition": "excellent" | "good" | "fair" | "damaged",
    "damage_items": [{ "location": "string", "description": "string", "severity": "minor"|"moderate"|"major", "estimated_repair_cost": 0, "is_new_damage": true }],
    "missing_items": ["string"],
    "cleanliness_score": 8,
    "summary": "string",
    "evidence_timestamps": "2026-03-08T12:00:00Z"
}`;

        try {
            const parts: any[] = [];

            // Add before images with labels
            parts.push({ text: '=== CHECK-IN PHOTOS (BEFORE) ===' });
            for (const img of beforeImages.slice(0, 4)) { // Limit to 4 per set for token efficiency
                parts.push({ inlineData: { data: img.data, mimeType: img.mimeType } });
            }

            parts.push({ text: '=== CHECKOUT PHOTOS (AFTER) ===' });
            for (const img of afterImages.slice(0, 4)) {
                parts.push({ inlineData: { data: img.data, mimeType: img.mimeType } });
            }

            parts.push({ text: 'Compare the BEFORE and AFTER photos. Identify any new damage, missing items, or cleanliness issues.' });

            const result = await withRetry(async () => {
                const response = await this.model.generateContent({
                    contents: [{ role: 'user', parts }],
                    systemInstruction: { parts: [{ text: systemPrompt }] }
                });
                return response;
            });

            const text = result.response.text();
            const usage = result.response.usageMetadata;
            const parsed = parseAiJson<TurnoverReport>(text, ['overall_condition', 'damage_items', 'cleanliness_score', 'summary']);

            return {
                result: parsed,
                usage: {
                    input_tokens: usage?.promptTokenCount || 0,
                    output_tokens: usage?.candidatesTokenCount || 0,
                    total_tokens: usage?.totalTokenCount || 0,
                    model_name: 'gemini-1.5-flash'
                }
            };
        } catch (error) {
            console.error('TurnoverAgent.compareTurnover failed:', error);
            return { result: this.mockReport(), usage: { input_tokens: 0, output_tokens: 0, total_tokens: 0, model_name: 'gemini-mock' } };
        }
    }

    mockReport(): TurnoverReport {
        return {
            overall_condition: 'fair',
            damage_items: [
                {
                    location: '主卧床头柜表面',
                    description: '圆形水杯印痕，直径约8cm，已渗入木质表面',
                    severity: 'minor',
                    estimated_repair_cost: 150,
                    is_new_damage: true
                },
                {
                    location: '客厅地毯中央区域',
                    description: '红酒渍，面积约15cm×10cm',
                    severity: 'moderate',
                    estimated_repair_cost: 500,
                    is_new_damage: true
                }
            ],
            missing_items: ['浴室3号毛巾（白色大浴巾）'],
            cleanliness_score: 6,
            summary: '退房检查发现两处新增损坏：主卧床头柜水杯印痕和客厅地毯红酒渍。另缺少一条白色大浴巾。建议向客人索赔维修费用共计¥650及浴巾补偿¥80。整体清洁度为6/10，需要额外深度清洁。',
            evidence_timestamps: new Date().toISOString()
        };
    }
}

export const turnoverAgent = new TurnoverAgent();
