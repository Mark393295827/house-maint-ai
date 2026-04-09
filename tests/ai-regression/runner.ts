import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { aiService } from '../../server/services/ai.js';
// Make sure to configure Sentry or mock if it tries to init
import * as dotenv from 'dotenv';
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Generic 1x1 Red JPEG base64
const MOCK_BASE64_JPEG = "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=";

const CASES_FILE = path.join(__dirname, 'cases.json');
const FIXTURES_DIR = path.join(__dirname, '../fixtures');

async function getBase64Image(imagePath: string): Promise<string> {
    const fullPath = path.resolve(__dirname, '../../', imagePath);
    try {
        if (fs.existsSync(fullPath)) {
            const data = fs.readFileSync(fullPath);
            return data.toString('base64');
        }
    } catch {
        // Fallback below
    }
    return MOCK_BASE64_JPEG; 
}

function mapSeverity(aiSeverity: string): string {
    const lower = aiSeverity.toLowerCase();
    if (lower === 'critical') return 'Emergency';
    if (lower === 'moderate') return '48h';
    if (lower === 'cosmetic') return 'DIY';
    return aiSeverity;
}

async function runRegression() {
    console.log('🚀 Starting AI Regression Test Suite');
    
    if (!fs.existsSync(CASES_FILE)) {
        console.error('cases.json not found!');
        process.exit(1);
    }

    const cases = JSON.parse(fs.readFileSync(CASES_FILE, 'utf8'));
    let passed = 0;
    const total = cases.length;
    const errors: any[] = [];

    for (let i = 0; i < total; i++) {
        const testCase = cases[i];
        console.log(`[${i + 1}/${total}] Testing ${testCase.id} - ${testCase.description}`);
        
        try {
            const base64Img = await getBase64Image(testCase.imagePath);
            // This hits the real API! It requires GEMINI_API_KEY injected in environment
            const response = await aiService.diagnoseIssue(base64Img, 'image/jpeg', testCase.description);
            
            const rawCategory = response.result.diagnosis.category || response.result.diagnosis.issue_type;
            const mappedSeverity = mapSeverity(response.result.diagnosis.severity);

            const severityMatch = mappedSeverity === testCase.expectedSeverity;
            const categoryMatch = rawCategory.toLowerCase().includes(testCase.expectedCategory.toLowerCase()) || 
                                  testCase.expectedCategory.toLowerCase().includes(rawCategory.toLowerCase());

            if (severityMatch && categoryMatch) {
                console.log(`  ✅ Passed! Severity: ${mappedSeverity}, Category: ${rawCategory}`);
                passed++;
            } else {
                console.log(`  ❌ Failed! Expected [${testCase.expectedCategory}, ${testCase.expectedSeverity}], got [${rawCategory}, ${mappedSeverity}]`);
                errors.push({ id: testCase.id, expected: testCase.expectedSeverity, got: mappedSeverity });
            }

        } catch (error) {
            console.error(`  ⚠️ Execution Error for ${testCase.id}:`, error instanceof Error ? error.message : String(error));
            errors.push({ id: testCase.id, error: String(error) });
        }
        
        // Anti-rate-limit delay
        await new Promise(r => setTimeout(r, 1000));
    }

    const accuracy = passed / total;
    console.log('\n=======================================');
    console.log(`🎯 Completion! Accuracy: ${(accuracy * 100).toFixed(1)}% (${passed}/${total})`);
    
    if (accuracy < 0.85) {
         console.error('❌ Accuracy below 85% acceptable threshold!');
         console.error(JSON.stringify(errors, null, 2));
         process.exit(1);
    } else {
         console.log('✅ AI Regression Gate Passed.');
         process.exit(0);
    }
}

runRegression().catch(err => {
    console.error('Fatal crash inside regression runner:', err);
    process.exit(1);
});
