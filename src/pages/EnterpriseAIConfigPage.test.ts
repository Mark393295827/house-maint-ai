// @vitest-environment jsdom
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { beforeEach, describe, expect, it } from 'vitest';
import EnterpriseAIConfigPage, { AI_CONFIG_STORAGE_KEY } from './EnterpriseAIConfigPage';
import { LanguageProvider } from '../i18n/LanguageContext';

const renderPage = () => render(
    React.createElement(LanguageProvider, null, React.createElement(EnterpriseAIConfigPage))
);

describe('EnterpriseAIConfigPage', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it('renders configurable AIP API keys, model profiles, and agent model routing', () => {
        renderPage();

        expect(screen.getByText('AI Operations Configuration')).toBeInTheDocument();
        expect(screen.getByText('AIP / API Key Vault')).toBeInTheDocument();
        expect(screen.getByLabelText('API key for OpenAI')).toHaveValue('');
        expect(screen.getByLabelText('Base URL for OpenAI')).toHaveValue('https://api.openai.com/v1');

        fireEvent.click(screen.getByRole('button', { name: 'Models' }));
        expect(screen.getByText('Multi-Model Catalog')).toBeInTheDocument();
        expect(screen.getByLabelText('Model code for Gemini 1.5 Flash')).toHaveValue('gemini-1.5-flash');
        expect(screen.getByLabelText('Model code for GPT-5.5 Codex')).toHaveValue('gpt-5.5');

        fireEvent.click(screen.getByRole('button', { name: 'Agents' }));
        expect(screen.getByLabelText('Model for PlanningAgent')).toHaveValue('deepseek-r1');
        expect(screen.getByLabelText('Model for ProblemSolvingAgent')).toHaveValue('gpt-5.5-codex');
    });

    it('renders AI config chrome in Chinese when the saved locale is zh', () => {
        localStorage.setItem('app_locale', 'zh');
        renderPage();

        expect(screen.getByText('AI 运营配置')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: '模型' })).toBeInTheDocument();
        expect(screen.getAllByRole('switch')[0]).toHaveTextContent('已启用');
    });

    it('adds a custom provider and model, then assigns the model to an agent', () => {
        renderPage();

        fireEvent.click(screen.getByRole('button', { name: 'Add provider' }));
        fireEvent.change(screen.getByLabelText('Provider name for Custom Provider'), {
            target: { value: 'Moonshot' },
        });
        fireEvent.change(screen.getByLabelText('API key for Moonshot'), {
            target: { value: 'sk-moonshot-test' },
        });

        fireEvent.click(screen.getByRole('button', { name: 'Models' }));
        fireEvent.click(screen.getByRole('button', { name: 'Add model' }));
        fireEvent.change(screen.getByLabelText('Model name for Custom Model'), {
            target: { value: 'Moonshot Kimi K2' },
        });
        fireEvent.change(screen.getByLabelText('Model code for Moonshot Kimi K2'), {
            target: { value: 'kimi-k2-latest' },
        });

        fireEvent.click(screen.getByRole('button', { name: 'Agents' }));
        fireEvent.change(screen.getByLabelText('Model for PlanningAgent'), {
            target: { value: 'model-7' },
        });

        expect(screen.getByLabelText('Model for PlanningAgent')).toHaveValue('model-7');
        expect(screen.getByText('PlanningAgent routes to Moonshot Kimi K2')).toBeInTheDocument();
    });

    it('freely configures skills, agents, workflow, and creation blueprints', () => {
        renderPage();

        fireEvent.click(screen.getByRole('button', { name: 'Skills' }));
        fireEvent.click(screen.getByRole('button', { name: 'Add skill' }));
        fireEvent.change(screen.getByLabelText('Skill name for Custom Skill'), {
            target: { value: 'Proposal Generator Skill' },
        });
        fireEvent.change(screen.getByLabelText('Trigger for Proposal Generator Skill'), {
            target: { value: 'After diagnosis confidence exceeds 80%' },
        });

        fireEvent.click(screen.getByRole('button', { name: 'Agents' }));
        fireEvent.click(screen.getByRole('button', { name: 'Add agent' }));
        fireEvent.change(screen.getByLabelText('Agent name for Custom Agent'), {
            target: { value: 'ProposalAgent' },
        });
        fireEvent.change(screen.getByLabelText('System prompt for ProposalAgent'), {
            target: { value: 'Create owner-ready maintenance proposals with cost, risk, and dispatch plan.' },
        });

        fireEvent.click(screen.getByRole('button', { name: 'Workflow' }));
        fireEvent.click(screen.getByRole('button', { name: 'Add workflow step' }));
        fireEvent.change(screen.getByLabelText('Step title for Custom Workflow Step'), {
            target: { value: 'Proposal Draft' },
        });
        fireEvent.change(screen.getByLabelText('Owner for Proposal Draft'), {
            target: { value: 'agent-9' },
        });

        fireEvent.click(screen.getByRole('button', { name: 'Blueprints' }));
        fireEvent.click(screen.getByRole('button', { name: 'Add blueprint' }));
        fireEvent.change(screen.getByLabelText('Blueprint title for Custom Creation Blueprint'), {
            target: { value: 'Sanya Rental Maintenance Proposal' },
        });
        fireEvent.change(screen.getByLabelText('Primary agent for Sanya Rental Maintenance Proposal'), {
            target: { value: 'agent-9' },
        });
        fireEvent.change(screen.getByLabelText('Scenario for Sanya Rental Maintenance Proposal'), {
            target: { value: 'Vacation rental air-conditioner repair proposal' },
        });
        fireEvent.click(screen.getByRole('button', { name: 'Save configuration' }));

        const stored = JSON.parse(localStorage.getItem(AI_CONFIG_STORAGE_KEY) || '{}');
        expect(stored.skills.some((skill: { name: string }) => skill.name === 'Proposal Generator Skill')).toBe(true);
        expect(stored.agents.some((agent: { name: string; systemPrompt: string }) => agent.name === 'ProposalAgent' && agent.systemPrompt.includes('owner-ready'))).toBe(true);
        expect(stored.workflow.some((step: { title: string; ownerAgentId: string }) => step.title === 'Proposal Draft' && step.ownerAgentId === 'agent-9')).toBe(true);
        expect(stored.blueprints.some((blueprint: { title: string; primaryAgentId: string }) => blueprint.title === 'Sanya Rental Maintenance Proposal' && blueprint.primaryAgentId === 'agent-9')).toBe(true);
        expect(screen.getByText('Configuration saved locally')).toBeInTheDocument();
    });
});
