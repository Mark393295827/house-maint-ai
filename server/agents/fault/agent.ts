import { GoogleGenerativeAI } from '@google/generative-ai';
import { AiProvider, AiResponse, FaultAttribution, parseAiJson, withRetry } from '../common.js';

// S2: Fault Attribution Agent (责任判定)
// Determines: landlord responsibility (natural wear) vs. tenant responsibility (damage).
// 10X: Dispute resolution from 2-4 weeks → 30 seconds.
export class FaultAgent implements AiProvider {
    name = 'Fault-S2';
    private genAI: GoogleGenerativeAI;
    private model: any;
    private hasApiKey: boolean;

    constructor() {
        const apiKey = process.env.GEMINI_API_KEY || '';
        this.hasApiKey = !!apiKey;
        this.genAI = new GoogleGenerativeAI(apiKey || 'dummy');
        this.model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    }

    async assessFault(
        image?: string,
        mimeType?: string,
        issueDescription?: string,
        propertyAgeYears?: number,
        tenancyMonths?: number,
        locale: string = 'zh'
    ): Promise<AiResponse<FaultAttribution>> {
        if (!this.hasApiKey) {
            return { result: this.mockAttribution(), usage: { input_tokens: 0, output_tokens: 0, total_tokens: 0, model_name: 'gemini-mock' } };
        }

        const lang = locale === 'zh' ? '中文' : 'English';
        const systemPrompt = `You are a professional property damage assessor specializing in Chinese rental law (《中华人民共和国民法典》合同编 租赁章节) and Sanya's tropical climate conditions.

Your task: Analyze damage photos and context to determine responsibility attribution.

ASSESSMENT FRAMEWORK:
1. NORMAL WEAR AND TEAR (房东责任 / Landlord):
   - Gradual deterioration from normal use over time
   - Climate-induced damage (Sanya: salt corrosion, humidity mold, typhoon damage)
   - Equipment reaching end of expected lifespan
   - Paint fading, minor scuff marks, carpet wear in traffic areas

2. TENANT-CAUSED DAMAGE (租户责任 / Tenant):
   - Impact damage (holes, cracks from force)
   - Stains from negligence (oil, ink, chemicals)
   - Unauthorized modifications
   - Pet damage, burn marks, broken fixtures from misuse

3. SHARED RESPONSIBILITY (共同责任):
   - Pre-existing minor issue worsened by tenant neglect to report

SANYA-SPECIFIC FACTORS:
- Average humidity: 80%+ → mold on north-facing walls is NORMAL WEAR within 6 months
- Salt air corrosion: metal fixtures corroding within 2-3 years is NORMAL WEAR
- Typhoon season damage: landlord responsibility unless tenant left windows open

Property age: ${propertyAgeYears || 'unknown'} years
Tenancy duration: ${tenancyMonths || 'unknown'} months

Respond in ${lang}. Output ONLY valid JSON:
{
    "attribution": "landlord" | "tenant" | "shared" | "undetermined",
    "confidence_score": 0.85,
    "evidence": ["Evidence point 1", "Evidence point 2"],
    "reasoning": "Detailed explanation",
    "wear_indicators": ["Indicator 1"],
    "sanya_climate_factors": ["Factor 1"],
    "legal_reference": "Relevant law citation"
}`;

        try {
            const parts: any[] = [];
            if (image && mimeType) {
                parts.push({ inlineData: { data: image, mimeType } });
            }
            parts.push({ text: `Issue description: ${issueDescription || 'See photo'}` });

            const result = await withRetry(async () => {
                const response = await this.model.generateContent({
                    contents: [{ role: 'user', parts }],
                    systemInstruction: { parts: [{ text: systemPrompt }] }
                });
                return response;
            });

            const text = result.response.text();
            const usage = result.response.usageMetadata;
            const parsed = parseAiJson<FaultAttribution>(text, ['attribution', 'confidence_score', 'evidence', 'reasoning']);

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
            console.error('FaultAgent.assessFault failed:', error);
            return { result: this.mockAttribution(), usage: { input_tokens: 0, output_tokens: 0, total_tokens: 0, model_name: 'gemini-mock' } };
        }
    }

    mockAttribution(): FaultAttribution {
        return {
            attribution: 'landlord',
            confidence_score: 0.78,
            evidence: [
                '墙面出现大面积渗水痕迹，分布均匀，符合自然渗透模式',
                '损坏区域无明显人为外力痕迹',
                '该类型管件在三亚盐雾环境中平均寿命为3-5年'
            ],
            reasoning: '根据照片分析，该漏水问题是由管道自然老化导致。三亚的高盐雾、高湿度环境会加速金属管件腐蚀。该房屋建成已超过5年，管件已达到预期使用寿命。属于正常磨损范畴。',
            wear_indicators: ['金属管件表面均匀氧化', '无外力变形痕迹', '腐蚀分布呈自然扩散模式'],
            sanya_climate_factors: ['年均湿度80%+加速金属腐蚀', '盐雾环境缩短管件寿命30-50%'],
            legal_reference: '《民法典》第七百一十三条：承租人在租赁物需要维修时可以请求出租人在合理期限内维修。因不可归责于承租人的事由致使租赁物部分或者全部毁损、灭失的，承租人可以请求减少租金或者不支付租金。'
        };
    }
}

export const faultAgent = new FaultAgent();
