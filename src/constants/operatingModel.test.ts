import { describe, expect, it } from 'vitest';
import {
    OPERATING_STAGES,
    calculatePortfolioImpact,
    getOperatingStageCopies,
    getOperationalResults,
    getReportOperatingStageId,
} from './operatingModel';

describe('operatingModel', () => {
    it('keeps the project on one six-stage operating loop', () => {
        expect(OPERATING_STAGES.map((stage) => stage.id)).toEqual([
            'intake',
            'diagnosis',
            'deflection',
            'dispatch',
            'verification',
            'reporting',
        ]);

        expect(getOperatingStageCopies('en')).toHaveLength(6);
        expect(getOperatingStageCopies('zh')[0].title).toContain('微信');
    });

    it('maps report statuses into operating stages', () => {
        expect(getReportOperatingStageId('pending')).toBe('intake');
        expect(getReportOperatingStageId('matching')).toBe('diagnosis');
        expect(getReportOperatingStageId('matched')).toBe('dispatch');
        expect(getReportOperatingStageId('in_progress')).toBe('verification');
        expect(getReportOperatingStageId('completed')).toBe('reporting');
    });

    it('calculates portfolio impact with stable benchmark assumptions', () => {
        const impact = calculatePortfolioImpact({ doors: 250, managers: 3, salary: 120000 });

        expect(impact).toEqual({
            annualValue: 210720,
            deflectedJobs: 462,
            hoursBack: 11.2,
            addedDoors: 290,
        });
    });

    it('exposes buyer-facing benchmark metrics', () => {
        expect(getOperationalResults('en').map((metric) => metric.value)).toEqual(['30s', '85%+', '20%+', '100%']);
    });
});
