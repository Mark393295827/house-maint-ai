import { describe, expect, it } from 'vitest';
import { normalizeDiagnosisResult } from './common.js';

describe('normalizeDiagnosisResult', () => {
    it('coerces flat Gemini JSON into the nested diagnosis contract', () => {
        const result = normalizeDiagnosisResult({
            issue_type: 'Under-sink pipe leak',
            category: 'Plumbing',
            severity: 'Moderate',
            urgency_score: 12,
            diagnosis_summary: 'Pipe joint is leaking.',
            confidence_score: 5,
            can_diy: true,
            recommended_next_action: 'Tighten the joint and call a plumber if it continues.'
        });

        expect(result.diagnosis.issue_type).toBe('Under-sink pipe leak');
        expect(result.diagnosis.category).toBe('plumbing');
        expect(result.diagnosis.severity).toBe('moderate');
        expect(result.diagnosis.urgency_score).toBe(10);
        expect(result.diagnosis.confidence_score).toBe(0.5);
        expect(result.solution.can_diy).toBe(true);
        expect(result.solution.steps).toContain('Tighten the joint and call a plumber if it continues.');
        expect(result.worker_matching_criteria.required_skill).toBe('plumbing');
    });

    it('normalizes nested diagnosis responses and derives missing urgency', () => {
        const result = normalizeDiagnosisResult({
            diagnosis: {
                issue_type: 'Electrical sparks',
                category: 'Electrical',
                severity: 'HIGH',
                diagnosis_summary: 'Outlet is sparking.',
                confidence_score: 95
            },
            solution: {
                can_diy: false,
                steps: ['Turn off breaker'],
                required_parts: [],
                tools_needed: []
            },
            worker_matching_criteria: {
                required_skill: 'electrician',
                urgency: 'immediate',
                estimated_man_hours: '1h'
            }
        });

        expect(result.diagnosis.severity).toBe('critical');
        expect(result.diagnosis.category).toBe('electrical');
        expect(result.diagnosis.urgency_score).toBe(10);
        expect(result.diagnosis.confidence_score).toBe(0.95);
    });
});
