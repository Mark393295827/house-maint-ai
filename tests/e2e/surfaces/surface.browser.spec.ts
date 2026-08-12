import { expect, test, type Page } from '@playwright/test';
import {
    createSurfaceViewModel,
    type SurfaceAudience,
    type SurfaceSessionSnapshot,
} from '../../../apps/web/src/index.js';

const now = '2026-08-02T06:00:00.000Z';

function snapshot(audience: SurfaceAudience): SurfaceSessionSnapshot {
    return {
        schema: 'surface-session/v1', session_id: 'session:42',
        scope: {
            schema: 'effective-scope/v1', scope_id: 'case:42', scope_kind: 'case', organization_id: 1,
            case_id: 42, property_id: 10, unit_id: 100,
            principal: {
                principal_id: 'principal:1', actor_kind: 'member', organization_id: 1,
                membership_id: 101, user_id: 201, role: audience === 'enterprise' ? 'manager' : 'resident',
                authenticated_at: '2026-08-02T05:50:00.000Z',
            },
            actions: ['read', 'contribute', 'manage', 'verify', 'message', 'media', 'report'],
            data_classes: ['personal'], capabilities: ['maintenance.diagnose-and-plan.v1'],
            tool_grants: [], purposes: ['maintenance-case'], region: 'cn-east', retention_days: 30,
            policy_version: 'policy:test:v1', resolved_at: '2026-08-02T05:55:00.000Z',
            expires_at: '2026-08-02T07:00:00.000Z',
        },
        case: {
            schema: 'case-projection/v1', id: 42, organization_id: 1, property_id: 10, unit_id: 100,
            title: 'Kitchen leak', status: 'open', stage: 'diagnosis', priority: 'urgent', version: 7,
            active_run_id: 'run:42', accepted_artifact_ids: [], created_at: now, updated_at: now, closed_at: null,
        },
        progress: {
            schema: 'case-progress/v1', organization_id: 1, case_id: 42, case_version: 7,
            stage: 'diagnosis', run: { run_id: 'run:42', status: 'working', progress_percent: 55 },
            next_action: {
                kind: 'review_plan',
                display: { zh_cn: '请查看维修建议。', en_us: 'Review the repair guidance.' },
                artifact_id: null,
            },
            updated_at: now,
        },
        artifacts: [], captured_at: now,
    };
}

async function render(page: Page, audience: SurfaceAudience, width: number): Promise<void> {
    const view = createSurfaceViewModel(snapshot(audience), {
        audience, locale: 'bilingual', viewport_width: width, now,
    });
    await page.setViewportSize({ width, height: 844 });
    await page.setContent('<main id="surface"></main>');
    await page.evaluate((value) => {
        const root = document.querySelector<HTMLElement>('#surface');
        if (!root) throw new Error('Surface root is missing');
        root.dataset.layout = value.layout;
        root.dataset.audience = value.audience;
        root.dataset.contract = 'case-progress/v1';
        root.dataset.controls = value.controls.join(',');
        root.dataset.providerFree = String(!/provider_name|model_name|deepseek|gemini|openai/i.test(JSON.stringify(value)));
        const title = document.createElement('h1');
        title.textContent = `${value.title.zh_cn} / ${value.title.en_us}`;
        const progress = document.createElement('p');
        progress.dataset.testid = 'progress';
        progress.textContent = `${value.progress_percent}%`;
        const action = document.createElement('p');
        action.dataset.testid = 'next-action';
        action.textContent = `${value.next_action.zh_cn} / ${value.next_action.en_us}`;
        root.append(title, progress, action);
    }, view);
}

test('resident surface renders the mobile bilingual contract', async ({ page }) => {
    await render(page, 'resident', 390);
    await expect(page.locator('#surface')).toHaveAttribute('data-layout', 'mobile');
    await expect(page.locator('#surface')).toHaveAttribute('data-provider-free', 'true');
    await expect(page.getByTestId('progress')).toHaveText('55%');
    await expect(page.getByRole('heading')).toContainText('维修进度');
    await expect(page.getByRole('heading')).toContainText('Case progress');
});

test('enterprise surface renders the desktop scoped contract', async ({ page }) => {
    await render(page, 'enterprise', 1440);
    await expect(page.locator('#surface')).toHaveAttribute('data-layout', 'desktop');
    await expect(page.locator('#surface')).toHaveAttribute('data-audience', 'enterprise');
    await expect(page.getByTestId('next-action')).toContainText('Review the repair guidance.');
});

for (const journey of [
    { audience: 'worker', width: 1024, control: 'job', title: 'Job progress' },
    { audience: 'payment', width: 390, control: 'payment_status', title: 'Payment status' },
    { audience: 'review', width: 390, control: 'review', title: 'Service review' },
]) {
    test(`${journey.audience} surface consumes scoped case progress`, async ({ page }) => {
        await render(page, journey.audience as SurfaceAudience, journey.width);
        await expect(page.locator('#surface')).toHaveAttribute('data-audience', journey.audience);
        await expect(page.locator('#surface')).toHaveAttribute('data-contract', 'case-progress/v1');
        await expect(page.locator('#surface')).toHaveAttribute('data-controls', new RegExp(journey.control));
        await expect(page.locator('#surface')).toHaveAttribute('data-provider-free', 'true');
        await expect(page.getByRole('heading')).toContainText(journey.title);
    });
}
