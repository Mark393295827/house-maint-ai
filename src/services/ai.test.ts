// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('./api', () => ({
    getCsrfToken: vi.fn().mockResolvedValue('csrf-token'),
}));

function jsonResponse(body: unknown): Response {
    return {
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue(body),
    } as unknown as Response;
}

describe('photo diagnosis service', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('normalizes the current nested Gemini diagnosis contract', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({
            diagnosis: {
                issue_type: 'Loose sink slip-joint',
                severity: 'moderate',
                diagnosis_summary: 'Moisture is visible around the drain connection.',
                confidence_score: 0.91,
                category: 'plumbing',
                urgency_score: 5,
                safety_warning: null,
            },
            solution: {
                can_diy: true,
                steps: ['Place a bucket below the joint.', 'Hand-tighten the slip nut.'],
                required_parts: [{ name: 'Slip-joint washer', spec: '40 mm', estimated_price: '¥8-15' }],
                tools_needed: ['Bucket'],
            },
        })));

        const { diagnosePhoto } = await import('./ai');
        const result = await diagnosePhoto('base64-image', 'image/jpeg', 'Analyze this leak');

        expect(result).toMatchObject({
            detected: true,
            issueName: 'Loose sink slip-joint',
            category: 'plumbing',
            severity: 'moderate',
            confidence: 0.91,
            canDiy: true,
            steps: ['Place a bucket below the joint.', 'Hand-tighten the slip nut.'],
        });
    });

    it('does not treat an uncertain or unrelated photo as a detected repair', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({
            diagnosis: {
                issue_type: 'UNCERTAIN',
                severity: 'cosmetic',
                diagnosis_summary: 'The photo shows a person rather than a damaged fixture.',
                confidence_score: 0.2,
                category: 'other',
                urgency_score: 1,
                safety_warning: null,
            },
            solution: {
                can_diy: false,
                steps: ['Retake the full fixture.', 'Add a close-up of the damaged area.'],
                required_parts: [],
                tools_needed: [],
            },
        })));

        const { diagnosePhoto } = await import('./ai');
        const result = await diagnosePhoto('base64-image');

        expect(result.detected).toBe(false);
        expect(result.issueName).toBe('UNCERTAIN');
        expect(result.steps).toHaveLength(2);
    });
});
