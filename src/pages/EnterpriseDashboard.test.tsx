import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '../i18n/LanguageContext';
import { EnterpriseDashboardHome } from './EnterpriseDashboard';

vi.mock('../components/EnterpriseMap', () => ({
    default: () => <div data-testid="enterprise-map" />,
}));

const renderDashboard = (locale: 'zh' | 'en' = 'zh') => {
    localStorage.setItem('app_locale', locale);
    return render(
        <LanguageProvider>
            <MemoryRouter initialEntries={['/enterprise']}>
                <EnterpriseDashboardHome />
            </MemoryRouter>
        </LanguageProvider>,
    );
};

describe('EnterpriseDashboardHome', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it('renders a summary-first dashboard around the six-stage operating loop', async () => {
        renderDashboard();

        expect(await screen.findByRole('heading', { name: '物业运营总览' })).toBeInTheDocument();
        expect(screen.getByText('六阶段运营闭环')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /24\/7 微信接入/ })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /AI 诊断与责任判断/ })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /DIY 分流/ })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /师傅智能派单/ })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /维修验收回访/ })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /业主报表和 SLA/ })).toBeInTheDocument();
        expect(screen.getByText('实时运维地图')).toBeInTheDocument();
        expect(screen.getByTestId('enterprise-map')).toBeInTheDocument();
        expect(screen.getByText('维修中')).toBeInTheDocument();
        expect(screen.getByText('待命')).toBeInTheDocument();
        expect(screen.getByText('SLA 异常工单')).toBeInTheDocument();
    });

    it('expands and collapses the restored operations map', async () => {
        const user = userEvent.setup();
        renderDashboard();

        const mapPanel = await screen.findByTestId('operations-map-panel');
        await user.click(screen.getByRole('button', { name: '展开地图' }));

        expect(mapPanel).toHaveClass('is-expanded');
        expect(screen.getByRole('button', { name: '收起地图' })).toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: '收起地图' }));
        expect(mapPanel).not.toHaveClass('is-expanded');
    });

    it('updates KPI totals when the time range changes', async () => {
        const user = userEvent.setup();
        renderDashboard();

        const intakeText = await screen.findByText('接入工单');
        const intakeCard = intakeText.closest('article');
        expect(intakeCard).not.toBeNull();
        expect(within(intakeCard as HTMLElement).getByText('2,785')).toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: '今日' }));

        expect(within(intakeCard as HTMLElement).getByText('475')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: '今日' })).toHaveAttribute('aria-pressed', 'true');
    });

    it('links stage, category, and region filters to dashboard data', async () => {
        const user = userEvent.setup();
        renderDashboard();

        const diagnosisStage = await screen.findByRole('button', { name: /AI 诊断与责任判断/ });
        await user.click(diagnosisStage);
        expect(diagnosisStage).toHaveAttribute('aria-pressed', 'true');
        expect(screen.getByText('HM-240721')).toBeInTheDocument();
        expect(screen.queryByText('HM-240718')).not.toBeInTheDocument();

        await user.click(diagnosisStage);
        await user.click(screen.getByRole('button', { name: /水暖/ }));
        expect(screen.getByText('HM-240718')).toBeInTheDocument();
        expect(screen.getByText('HM-240681')).toBeInTheDocument();
        expect(screen.queryByText('HM-240704')).not.toBeInTheDocument();

        await user.selectOptions(screen.getByLabelText('区域'), 'tianya');
        const slaCard = screen.getByText('SLA 达成率').closest('article');
        expect(slaCard).not.toBeNull();
        expect(within(slaCard as HTMLElement).getByText('91.7')).toBeInTheDocument();
    });

    it('renders the same analytical structure in English', async () => {
        renderDashboard('en');

        expect(await screen.findByRole('heading', { name: 'Property Operations Overview' })).toBeInTheDocument();
        expect(screen.getByText('Six-stage operating loop')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /DIY deflection/ })).toBeInTheDocument();
        expect(screen.getByText('Live operations map')).toBeInTheDocument();
        expect(screen.getByText('SLA exception queue')).toBeInTheDocument();
    });
});
