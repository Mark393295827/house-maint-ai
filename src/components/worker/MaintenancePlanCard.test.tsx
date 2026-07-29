import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import MaintenancePlanCard, { normalizeMaintenancePlan } from './MaintenancePlanCard';

describe('MaintenancePlanCard', () => {
    it('normalizes the legacy nested DeepSeek response into a bilingual client plan', () => {
        const plan = normalizeMaintenancePlan({
            result: {
                required_skills: ['plumber'],
                required_tools: ['pipe wrench', "plumber's tape", 'replacement pipe or coupling'],
                estimated_hours: 1.5,
                cost_range: { min: 100, max: 250 },
                priority_protocol: 'immediate',
                steps: [
                    'Shut off water supply to the kitchen sink.',
                    'Drain remaining water from pipes.',
                    'Inspect the leak area and determine the cause (loose joint, crack, etc.).',
                ],
                explanation: 'Repair the leaking pipe below the kitchen sink.',
            },
            usage: { model_name: 'deepseek-reasoner' },
        });

        expect(plan).not.toBeNull();
        render(<MaintenancePlanCard plan={plan!} provider="DeepSeek R1" />);

        expect(screen.getByText('客户维修方案')).toBeInTheDocument();
        expect(screen.getByText('Client Maintenance Plan')).toBeInTheDocument();
        expect(screen.getByText('立即处理 / Immediate')).toBeInTheDocument();
        expect(screen.getByText('1.5 小时 / 1.5 hr')).toBeInTheDocument();
        expect(screen.getByText('¥100–¥250')).toBeInTheDocument();
        expect(screen.getByText('水管工 / plumber')).toBeInTheDocument();
        expect(screen.getByText('关闭厨房水槽的供水。')).toBeInTheDocument();
        expect(screen.getByText('Shut off water supply to the kitchen sink.')).toBeInTheDocument();
        expect(screen.queryByText(/required_skills/)).not.toBeInTheDocument();
        expect(screen.queryByText(/Confidence:/)).not.toBeInTheDocument();
    });

    it('renders the new bilingual planner contract without exposing JSON', () => {
        const plan = normalizeMaintenancePlan({
            customer_summary: {
                zh: '先关闭供水，再维修漏水接头，最后复水检查。',
                en: 'Shut off the water, repair the leaking joint, then restore water and test.',
            },
            required_skills: [{ zh: '水管工', en: 'Plumber' }],
            required_tools: [{ zh: '管钳', en: 'Pipe wrench' }],
            estimated_hours: 1,
            cost_range: { min: 120, max: 200, currency: 'CNY' },
            priority_protocol: 'batch',
            steps: [
                { zh: '关闭相关供水。', en: 'Shut off the affected water supply.' },
                { zh: '维修漏水接头。', en: 'Repair the leaking joint.' },
            ],
            safety_notes: [
                { zh: '地面湿滑时先清理积水。', en: 'Clear standing water before working on a slippery floor.' },
            ],
        });

        expect(plan).not.toBeNull();
        render(<MaintenancePlanCard plan={plan!} />);

        expect(screen.getByText('先关闭供水，再维修漏水接头，最后复水检查。')).toBeInTheDocument();
        expect(screen.getByText('Shut off the water, repair the leaking joint, then restore water and test.')).toBeInTheDocument();
        expect(screen.getByText('计划处理 / Scheduled')).toBeInTheDocument();
        expect(screen.getByText('安全提示 / Safety')).toBeInTheDocument();
        expect(screen.queryByText(/[{}]/)).not.toBeInTheDocument();
    });

    it('rejects an incomplete or failed planner response', () => {
        expect(normalizeMaintenancePlan({ result: { error: 'Unable to generate plan' } })).toBeNull();
        expect(normalizeMaintenancePlan('not-json')).toBeNull();
    });
});
