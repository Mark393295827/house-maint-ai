import React, { useMemo, useState } from 'react';

export const AI_CONFIG_STORAGE_KEY = 'enterprise.ai.orchestration.config.v1';

type PanelId = 'keys' | 'models' | 'skills' | 'agents' | 'workflow' | 'blueprints';
type RuntimeMode = 'auto' | 'approval' | 'manual';
type WorkflowGate = 'auto' | 'confidence' | 'human';
type BlueprintStatus = 'draft' | 'ready' | 'live';

interface ModelProvider {
    id: string;
    name: string;
    providerType: string;
    baseUrl: string;
    apiKey: string;
    enabled: boolean;
}

interface ModelProfile {
    id: string;
    name: string;
    providerId: string;
    modelCode: string;
    contextWindow: string;
    latency: string;
    cost: string;
    bestFor: string;
    enabled: boolean;
}

interface AgentProfile {
    id: string;
    name: string;
    layer: string;
    description: string;
    modelId: string;
    mode: RuntimeMode;
    systemPrompt: string;
    toolAccess: string;
    enabled: boolean;
}

interface SkillProfile {
    id: string;
    name: string;
    description: string;
    ownerAgentId: string;
    trigger: string;
    inputContract: string;
    enabled: boolean;
}

interface WorkflowStep {
    id: string;
    title: string;
    description: string;
    ownerAgentId: string;
    gate: WorkflowGate;
    dependsOn: string;
    enabled: boolean;
}

interface CreationBlueprint {
    id: string;
    title: string;
    scenario: string;
    targetUser: string;
    primaryAgentId: string;
    outputFormat: string;
    workflowStepIds: string;
    skillIds: string;
    status: BlueprintStatus;
}

interface EnterpriseAIConfig {
    modelProviders: ModelProvider[];
    modelProfiles: ModelProfile[];
    agents: AgentProfile[];
    skills: SkillProfile[];
    workflow: WorkflowStep[];
    blueprints: CreationBlueprint[];
}

const defaultConfig: EnterpriseAIConfig = {
    modelProviders: [
        { id: 'openai', name: 'OpenAI', providerType: 'Cloud LLM', baseUrl: 'https://api.openai.com/v1', apiKey: '', enabled: true },
        { id: 'google', name: 'Google Gemini', providerType: 'Cloud multimodal', baseUrl: 'https://generativelanguage.googleapis.com/v1beta', apiKey: '', enabled: true },
        { id: 'deepseek', name: 'DeepSeek', providerType: 'Reasoning LLM', baseUrl: 'https://api.deepseek.com/v1', apiKey: '', enabled: true },
        { id: 'local', name: 'Local Runtime', providerType: 'Private edge', baseUrl: 'http://localhost:11434/v1', apiKey: '', enabled: false },
    ],
    modelProfiles: [
        { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', providerId: 'google', modelCode: 'gemini-1.5-flash', contextWindow: '1M', latency: 'Low', cost: '$', bestFor: 'Photo diagnosis and fast JSON output', enabled: true },
        { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', providerId: 'google', modelCode: 'gemini-1.5-pro', contextWindow: '1M', latency: 'Medium', cost: '$$', bestFor: 'Complex multimodal analysis', enabled: true },
        { id: 'deepseek-r1', name: 'DeepSeek R1', providerId: 'deepseek', modelCode: 'deepseek-reasoner', contextWindow: '64K', latency: 'Medium', cost: '$$', bestFor: 'Repair planning and reasoning', enabled: true },
        { id: 'gpt-4.1-mini', name: 'GPT-4.1 Mini', providerId: 'openai', modelCode: 'gpt-4.1-mini', contextWindow: '128K', latency: 'Low', cost: '$$', bestFor: 'Tool orchestration and bilingual operations', enabled: true },
        { id: 'local-qwen', name: 'Local Qwen Edge', providerId: 'local', modelCode: 'qwen2.5:7b', contextWindow: '32K', latency: 'Very low', cost: 'Fixed', bestFor: 'Private fallback and offline triage', enabled: false },
    ],
    agents: [
        {
            id: 'diagnosis',
            name: 'DiagnosisAgent',
            layer: 'P0 Perception',
            description: 'Photo, voice, and text triage for maintenance reports.',
            modelId: 'gemini-1.5-flash',
            mode: 'auto',
            systemPrompt: 'Identify fault category, severity, privacy risks, and next inspection questions.',
            toolAccess: 'Vision OCR, PIPL blur, case intake',
            enabled: true,
        },
        {
            id: 'planning',
            name: 'PlanningAgent',
            layer: 'P0 Reasoning',
            description: 'Repair sequence, priority protocol, and execution checklist.',
            modelId: 'deepseek-r1',
            mode: 'approval',
            systemPrompt: 'Generate repair plans with materials, steps, duration, risk, and escalation gates.',
            toolAccess: 'BOM lookup, task planner, dispatch draft',
            enabled: true,
        },
        {
            id: 'material',
            name: 'MaterialAgent',
            layer: 'S1 Blue Ocean',
            description: 'BOM, Sanya pricing, tools, and wrong-part trip reduction.',
            modelId: 'gemini-1.5-flash',
            mode: 'auto',
            systemPrompt: 'Map symptoms to part lists and price ranges using local repair history.',
            toolAccess: 'Material price memory, supplier table',
            enabled: true,
        },
        {
            id: 'fault',
            name: 'FaultAgent',
            layer: 'S2 Blue Ocean',
            description: 'Landlord, tenant, or shared responsibility attribution.',
            modelId: 'gemini-1.5-flash',
            mode: 'approval',
            systemPrompt: 'Classify responsibility with evidence, contract context, and civil-code reasoning.',
            toolAccess: 'Evidence pack, lease clauses',
            enabled: true,
        },
        {
            id: 'turnover',
            name: 'TurnoverAgent',
            layer: 'S3 Blue Ocean',
            description: 'Before and after vacation rental checkout evidence.',
            modelId: 'gemini-1.5-pro',
            mode: 'approval',
            systemPrompt: 'Compare move-in and checkout state, identify deltas, and prepare claim packets.',
            toolAccess: 'Image comparator, checkout inventory',
            enabled: true,
        },
        {
            id: 'research',
            name: 'Research Swarm',
            layer: 'Strategy Research',
            description: 'DataMiner, SocialObserver, and Simulator cross-validation.',
            modelId: 'gemini-1.5-flash',
            mode: 'manual',
            systemPrompt: 'Mine market signals, pain-point density, TAM, and go/no-go decision evidence.',
            toolAccess: 'Digital vacuum, simulator, TAM sheet',
            enabled: true,
        },
        {
            id: 'executive',
            name: 'CFO/COO Agent',
            layer: 'Executive Control',
            description: 'Budget, supply-demand, accuracy, and margin guardrails.',
            modelId: 'gpt-4.1-mini',
            mode: 'approval',
            systemPrompt: 'Guard unit economics, supply demand, operational accuracy, and launch budgets.',
            toolAccess: 'Budget monitor, alerting, payment data',
            enabled: true,
        },
    ],
    skills: [
        {
            id: 'pricingMemory',
            name: 'Pricing Memory Skill',
            description: 'Uses completed jobs and BOM deltas to refine local material estimates.',
            ownerAgentId: 'material',
            trigger: 'After completed job',
            inputContract: 'caseId, materialIds, quotedPrice, actualPrice',
            enabled: true,
        },
        {
            id: 'piplGuard',
            name: 'PIPL Guard Skill',
            description: 'Blocks image workflows when privacy anonymization is not available.',
            ownerAgentId: 'diagnosis',
            trigger: 'Before image model call',
            inputContract: 'imageId, detectedFaces, licensePlates, consentState',
            enabled: true,
        },
        {
            id: 'turnoverEvidence',
            name: 'Turnover Evidence Skill',
            description: 'Creates claim-ready checkout evidence packets for short-stay units.',
            ownerAgentId: 'turnover',
            trigger: 'Checkout comparison',
            inputContract: 'beforePhotoSet, afterPhotoSet, inventoryChecklist',
            enabled: true,
        },
        {
            id: 'workerCalibration',
            name: 'Worker Calibration Skill',
            description: 'Updates worker match weights from first-time-fix and review outcomes.',
            ownerAgentId: 'executive',
            trigger: 'Nightly operations audit',
            inputContract: 'workerId, ticketResults, rating, distance, responseTime',
            enabled: false,
        },
    ],
    workflow: [
        { id: 'intake', title: 'Omnichannel Intake', description: 'Accept homeowner, manager, or worker reports from web and messaging channels.', ownerAgentId: 'diagnosis', gate: 'auto', dependsOn: 'start', enabled: true },
        { id: 'diagnosisStep', title: 'AI Diagnosis', description: 'Run perception model, classify issue, and create a structured report.', ownerAgentId: 'diagnosis', gate: 'confidence', dependsOn: 'intake', enabled: true },
        { id: 'planningStep', title: 'Repair Planning', description: 'Generate repair steps, tools, parts, and urgency protocol.', ownerAgentId: 'planning', gate: 'confidence', dependsOn: 'diagnosisStep', enabled: true },
        { id: 'humanReview', title: 'Human Review Gate', description: 'Pause automation when confidence, cost, or liability risk is below threshold.', ownerAgentId: 'executive', gate: 'human', dependsOn: 'planningStep', enabled: true },
        { id: 'dispatch', title: 'Worker Dispatch', description: 'Rank workers by skill, distance, rating, speed, and availability.', ownerAgentId: 'executive', gate: 'confidence', dependsOn: 'humanReview', enabled: true },
        { id: 'learning', title: 'Learning Loop', description: 'Extract repair patterns, update skills, and feed future model routing.', ownerAgentId: 'research', gate: 'auto', dependsOn: 'dispatch', enabled: true },
    ],
    blueprints: [
        {
            id: 'sanya-beachhead',
            title: 'Sanya Beachhead Repair Workflow',
            scenario: 'High-frequency rental maintenance from report intake to worker dispatch.',
            targetUser: 'Property manager',
            primaryAgentId: 'planning',
            outputFormat: 'Repair plan, BOM, dispatch checklist, owner summary',
            workflowStepIds: 'intake, diagnosisStep, planningStep, humanReview, dispatch',
            skillIds: 'pricingMemory, piplGuard, workerCalibration',
            status: 'ready',
        },
        {
            id: 'turnover-claim',
            title: 'Vacation Rental Turnover Evidence',
            scenario: 'Before-after checkout inspection for claim-ready damage packets.',
            targetUser: 'Short-stay operator',
            primaryAgentId: 'turnover',
            outputFormat: 'Evidence packet, responsibility note, cost estimate',
            workflowStepIds: 'intake, diagnosisStep, humanReview, learning',
            skillIds: 'turnoverEvidence, piplGuard',
            status: 'draft',
        },
    ],
};

function createNextId(prefix: string, existing: Array<{ id: string }>) {
    let index = existing.length + 1;
    let id = `${prefix}-${index}`;
    while (existing.some((item) => item.id === id)) {
        index += 1;
        id = `${prefix}-${index}`;
    }
    return id;
}

function listOrDefault<T>(value: unknown, fallback: T[]) {
    return Array.isArray(value) ? (value as T[]) : fallback;
}

function loadConfig(): EnterpriseAIConfig {
    if (typeof localStorage === 'undefined') return defaultConfig;

    try {
        const raw = localStorage.getItem(AI_CONFIG_STORAGE_KEY);
        if (!raw) return defaultConfig;
        const parsed = JSON.parse(raw) as Partial<Record<keyof EnterpriseAIConfig, unknown>>;
        return {
            modelProviders: listOrDefault<ModelProvider>(parsed.modelProviders, defaultConfig.modelProviders),
            modelProfiles: listOrDefault<ModelProfile>(parsed.modelProfiles, defaultConfig.modelProfiles),
            agents: listOrDefault<AgentProfile>(parsed.agents, defaultConfig.agents),
            skills: listOrDefault<SkillProfile>(parsed.skills, defaultConfig.skills),
            workflow: listOrDefault<WorkflowStep>(parsed.workflow, defaultConfig.workflow),
            blueprints: listOrDefault<CreationBlueprint>(parsed.blueprints, defaultConfig.blueprints),
        };
    } catch {
        return defaultConfig;
    }
}

const panelItems: Array<{ id: PanelId; label: string; icon: string }> = [
    { id: 'keys', label: 'AIP Keys', icon: 'key' },
    { id: 'models', label: 'Models', icon: 'hub' },
    { id: 'skills', label: 'Skills', icon: 'extension' },
    { id: 'agents', label: 'Agents', icon: 'smart_toy' },
    { id: 'workflow', label: 'Workflow', icon: 'account_tree' },
    { id: 'blueprints', label: 'Blueprints', icon: 'architecture' },
];

const runtimeOptions: Array<{ id: RuntimeMode; name: string }> = [
    { id: 'auto', name: 'Auto execute' },
    { id: 'approval', name: 'Approval gate' },
    { id: 'manual', name: 'Manual only' },
];

const gateOptions: Array<{ id: WorkflowGate; name: string }> = [
    { id: 'auto', name: 'Auto' },
    { id: 'confidence', name: 'Confidence gate' },
    { id: 'human', name: 'Human approval' },
];

const blueprintStatusOptions: Array<{ id: BlueprintStatus; name: string }> = [
    { id: 'draft', name: 'Draft' },
    { id: 'ready', name: 'Ready' },
    { id: 'live', name: 'Live' },
];

const Toggle: React.FC<{
    checked: boolean;
    label: string;
    onChange: () => void;
}> = ({ checked, label, onChange }) => (
    <button
        type="button"
        role="switch"
        aria-label={label}
        aria-checked={checked}
        onClick={onChange}
        className={`relative h-7 w-12 shrink-0 rounded-full border transition-colors ${
            checked ? 'bg-[#007aff] border-[#007aff]' : 'bg-slate-200 border-slate-200'
        }`}
    >
        <span
            className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${
                checked ? 'translate-x-5' : 'translate-x-0.5'
            }`}
        />
    </button>
);

const SelectField: React.FC<{
    label: string;
    value: string;
    onChange: (value: string) => void;
    options: Array<{ id: string; name: string }>;
}> = ({ label, value, onChange, options }) => (
    <label className="block">
        <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-[#86868b]">{label}</span>
        <select
            aria-label={label}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            className="h-11 w-full rounded-xl border border-black/5 bg-white px-3 text-[13px] font-black text-black outline-none transition focus:border-[#007aff]/30 focus:ring-4 focus:ring-[#007aff]/10"
        >
            {options.map((option) => (
                <option key={option.id} value={option.id}>
                    {option.name}
                </option>
            ))}
        </select>
    </label>
);

const TextField: React.FC<{
    label: string;
    value: string;
    onChange: (value: string) => void;
    type?: 'text' | 'password';
}> = ({ label, value, onChange, type = 'text' }) => (
    <label className="block">
        <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-[#86868b]">{label}</span>
        <input
            aria-label={label}
            type={type}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            className="h-11 w-full rounded-xl border border-black/5 bg-white px-3 text-[13px] font-black text-black outline-none transition focus:border-[#007aff]/30 focus:ring-4 focus:ring-[#007aff]/10"
        />
    </label>
);

const TextAreaField: React.FC<{
    label: string;
    value: string;
    onChange: (value: string) => void;
}> = ({ label, value, onChange }) => (
    <label className="block">
        <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-[#86868b]">{label}</span>
        <textarea
            aria-label={label}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            rows={3}
            className="w-full resize-none rounded-xl border border-black/5 bg-white px-3 py-3 text-[13px] font-black leading-relaxed text-black outline-none transition focus:border-[#007aff]/30 focus:ring-4 focus:ring-[#007aff]/10"
        />
    </label>
);

const SectionHeader: React.FC<{
    title: string;
    description: string;
    buttonLabel?: string;
    onButtonClick?: () => void;
}> = ({ title, description, buttonLabel, onButtonClick }) => (
    <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
            <h2 className="text-xl font-black tracking-tight text-black">{title}</h2>
            <p className="mt-2 text-[13px] font-bold text-[#86868b]">{description}</p>
        </div>
        {buttonLabel && onButtonClick && (
            <button
                type="button"
                onClick={onButtonClick}
                className="inline-flex h-11 w-fit items-center gap-2 rounded-xl border border-black/5 bg-white px-4 text-[11px] font-black uppercase tracking-widest text-black shadow-sm transition hover:border-[#007aff]/30 hover:text-[#007aff]"
            >
                <span aria-hidden="true" className="material-symbols-outlined text-[18px]">add</span>
                {buttonLabel}
            </button>
        )}
    </div>
);

const EnterpriseAIConfigPage: React.FC = () => {
    const [activePanel, setActivePanel] = useState<PanelId>('keys');
    const [config, setConfig] = useState<EnterpriseAIConfig>(() => loadConfig());
    const [saveMessage, setSaveMessage] = useState('');

    const providerOptions = useMemo(() => config.modelProviders.map((provider) => ({ id: provider.id, name: provider.name })), [config.modelProviders]);
    const modelOptions = useMemo(() => config.modelProfiles.map((model) => ({ id: model.id, name: model.name })), [config.modelProfiles]);
    const agentOptions = useMemo(() => config.agents.map((agent) => ({ id: agent.id, name: agent.name })), [config.agents]);

    const summary = useMemo(() => {
        const activeProviders = config.modelProviders.filter((provider) => provider.enabled).length;
        const configuredKeys = config.modelProviders.filter((provider) => provider.apiKey.trim()).length;
        const activeModels = config.modelProfiles.filter((model) => model.enabled).length;
        const activeAgents = config.agents.filter((agent) => agent.enabled).length;
        const activeSkills = config.skills.filter((skill) => skill.enabled).length;
        const activeSteps = config.workflow.filter((step) => step.enabled).length;
        return {
            activeProviders,
            configuredKeys,
            activeModels,
            activeAgents,
            activeSkills,
            activeSteps,
            blueprints: config.blueprints.length,
        };
    }, [config]);

    const getModelName = (modelId: string) => config.modelProfiles.find((model) => model.id === modelId)?.name || modelId;
    const getProviderName = (providerId: string) => config.modelProviders.find((provider) => provider.id === providerId)?.name || providerId;
    const getAgentName = (agentId: string) => config.agents.find((agent) => agent.id === agentId)?.name || agentId;

    const markDirty = () => setSaveMessage('');

    const updateProvider = (providerId: string, patch: Partial<ModelProvider>) => {
        setConfig((current) => ({
            ...current,
            modelProviders: current.modelProviders.map((provider) => (provider.id === providerId ? { ...provider, ...patch } : provider)),
        }));
        markDirty();
    };

    const updateModel = (modelId: string, patch: Partial<ModelProfile>) => {
        setConfig((current) => ({
            ...current,
            modelProfiles: current.modelProfiles.map((model) => (model.id === modelId ? { ...model, ...patch } : model)),
        }));
        markDirty();
    };

    const updateAgent = (agentId: string, patch: Partial<AgentProfile>) => {
        setConfig((current) => ({
            ...current,
            agents: current.agents.map((agent) => (agent.id === agentId ? { ...agent, ...patch } : agent)),
        }));
        markDirty();
    };

    const updateSkill = (skillId: string, patch: Partial<SkillProfile>) => {
        setConfig((current) => ({
            ...current,
            skills: current.skills.map((skill) => (skill.id === skillId ? { ...skill, ...patch } : skill)),
        }));
        markDirty();
    };

    const updateWorkflow = (workflowId: string, patch: Partial<WorkflowStep>) => {
        setConfig((current) => ({
            ...current,
            workflow: current.workflow.map((step) => (step.id === workflowId ? { ...step, ...patch } : step)),
        }));
        markDirty();
    };

    const updateBlueprint = (blueprintId: string, patch: Partial<CreationBlueprint>) => {
        setConfig((current) => ({
            ...current,
            blueprints: current.blueprints.map((blueprint) => (blueprint.id === blueprintId ? { ...blueprint, ...patch } : blueprint)),
        }));
        markDirty();
    };

    const addProvider = () => {
        setConfig((current) => ({
            ...current,
            modelProviders: [
                ...current.modelProviders,
                {
                    id: createNextId('provider', current.modelProviders),
                    name: 'Custom Provider',
                    providerType: 'Custom LLM',
                    baseUrl: 'https://api.example.com/v1',
                    apiKey: '',
                    enabled: true,
                },
            ],
        }));
        markDirty();
    };

    const addModel = () => {
        setConfig((current) => {
            const lastProvider = current.modelProviders[current.modelProviders.length - 1];
            return {
                ...current,
                modelProfiles: [
                    ...current.modelProfiles,
                    {
                        id: createNextId('model', current.modelProfiles),
                        name: 'Custom Model',
                        providerId: lastProvider?.id || 'openai',
                        modelCode: 'custom-model',
                        contextWindow: '128K',
                        latency: 'Configurable',
                        cost: 'Custom',
                        bestFor: 'Custom enterprise workflow',
                        enabled: true,
                    },
                ],
            };
        });
        markDirty();
    };

    const addAgent = () => {
        setConfig((current) => ({
            ...current,
            agents: [
                ...current.agents,
                {
                    id: createNextId('agent', current.agents),
                    name: 'Custom Agent',
                    layer: 'Custom Layer',
                    description: 'Configurable enterprise agent.',
                    modelId: current.modelProfiles[0]?.id || 'gemini-1.5-flash',
                    mode: 'approval',
                    systemPrompt: 'Define the agent mission, constraints, output format, and escalation rules.',
                    toolAccess: 'Custom tools',
                    enabled: true,
                },
            ],
        }));
        markDirty();
    };

    const addSkill = () => {
        setConfig((current) => ({
            ...current,
            skills: [
                ...current.skills,
                {
                    id: createNextId('skill', current.skills),
                    name: 'Custom Skill',
                    description: 'Configurable skill module.',
                    ownerAgentId: current.agents[0]?.id || 'diagnosis',
                    trigger: 'Manual trigger',
                    inputContract: 'Define inputs and outputs',
                    enabled: true,
                },
            ],
        }));
        markDirty();
    };

    const addWorkflowStep = () => {
        setConfig((current) => ({
            ...current,
            workflow: [
                ...current.workflow,
                {
                    id: createNextId('workflow', current.workflow),
                    title: 'Custom Workflow Step',
                    description: 'Configurable workflow stage.',
                    ownerAgentId: current.agents[0]?.id || 'diagnosis',
                    gate: 'human',
                    dependsOn: current.workflow[current.workflow.length - 1]?.id || 'start',
                    enabled: true,
                },
            ],
        }));
        markDirty();
    };

    const addBlueprint = () => {
        setConfig((current) => ({
            ...current,
            blueprints: [
                ...current.blueprints,
                {
                    id: createNextId('blueprint', current.blueprints),
                    title: 'Custom Creation Blueprint',
                    scenario: 'Define the business or operating scenario.',
                    targetUser: 'Enterprise operator',
                    primaryAgentId: current.agents[0]?.id || 'diagnosis',
                    outputFormat: 'Plan, checklist, report, and approval summary',
                    workflowStepIds: current.workflow.map((step) => step.id).join(', '),
                    skillIds: current.skills.filter((skill) => skill.enabled).map((skill) => skill.id).join(', '),
                    status: 'draft',
                },
            ],
        }));
        markDirty();
    };

    const removeProvider = (providerId: string) => {
        setConfig((current) => {
            if (current.modelProviders.length <= 1) return current;
            const remainingProviders = current.modelProviders.filter((provider) => provider.id !== providerId);
            const fallbackProviderId = remainingProviders[0]?.id || 'openai';
            return {
                ...current,
                modelProviders: remainingProviders,
                modelProfiles: current.modelProfiles.map((model) => (model.providerId === providerId ? { ...model, providerId: fallbackProviderId } : model)),
            };
        });
        markDirty();
    };

    const removeModel = (modelId: string) => {
        setConfig((current) => {
            if (current.modelProfiles.length <= 1) return current;
            const remainingModels = current.modelProfiles.filter((model) => model.id !== modelId);
            const fallbackModelId = remainingModels[0]?.id || 'gemini-1.5-flash';
            return {
                ...current,
                modelProfiles: remainingModels,
                agents: current.agents.map((agent) => (agent.modelId === modelId ? { ...agent, modelId: fallbackModelId } : agent)),
            };
        });
        markDirty();
    };

    const removeAgent = (agentId: string) => {
        setConfig((current) => {
            if (current.agents.length <= 1) return current;
            const remainingAgents = current.agents.filter((agent) => agent.id !== agentId);
            const fallbackAgentId = remainingAgents[0]?.id || 'diagnosis';
            return {
                ...current,
                agents: remainingAgents,
                skills: current.skills.map((skill) => (skill.ownerAgentId === agentId ? { ...skill, ownerAgentId: fallbackAgentId } : skill)),
                workflow: current.workflow.map((step) => (step.ownerAgentId === agentId ? { ...step, ownerAgentId: fallbackAgentId } : step)),
                blueprints: current.blueprints.map((blueprint) => (blueprint.primaryAgentId === agentId ? { ...blueprint, primaryAgentId: fallbackAgentId } : blueprint)),
            };
        });
        markDirty();
    };

    const removeSkill = (skillId: string) => {
        setConfig((current) => ({
            ...current,
            skills: current.skills.length <= 1 ? current.skills : current.skills.filter((skill) => skill.id !== skillId),
        }));
        markDirty();
    };

    const removeWorkflowStep = (workflowId: string) => {
        setConfig((current) => ({
            ...current,
            workflow: current.workflow.length <= 1 ? current.workflow : current.workflow.filter((step) => step.id !== workflowId),
        }));
        markDirty();
    };

    const removeBlueprint = (blueprintId: string) => {
        setConfig((current) => ({
            ...current,
            blueprints: current.blueprints.length <= 1 ? current.blueprints : current.blueprints.filter((blueprint) => blueprint.id !== blueprintId),
        }));
        markDirty();
    };

    const saveConfig = () => {
        localStorage.setItem(AI_CONFIG_STORAGE_KEY, JSON.stringify(config));
        setSaveMessage('Configuration saved locally');
    };

    const resetConfig = () => {
        setConfig(defaultConfig);
        localStorage.removeItem(AI_CONFIG_STORAGE_KEY);
        setSaveMessage('Configuration reset to defaults');
    };

    return (
        <div className="page-enter space-y-6 lg:space-y-8">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
                <div className="max-w-3xl">
                    <p className="mb-2 text-[10px] font-black uppercase tracking-[0.25em] text-[#007aff]">Enterprise AI Control Plane</p>
                    <h1 className="text-3xl font-black tracking-tight text-black sm:text-4xl">AI Operations Configuration</h1>
                    <p className="mt-3 text-[13px] font-bold leading-relaxed text-[#86868b]">
                        Configure AIP providers, multi-model routing, skills, agents, workflow gates, and creation blueprints for enterprise maintenance operations.
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    {saveMessage && (
                        <span className="rounded-full border border-[#28cd41]/20 bg-white px-4 py-2 text-[11px] font-black uppercase tracking-widest text-[#28cd41] shadow-sm">
                            {saveMessage}
                        </span>
                    )}
                    <button
                        type="button"
                        onClick={resetConfig}
                        className="inline-flex h-11 items-center gap-2 rounded-xl border border-black/5 bg-white px-4 text-[11px] font-black uppercase tracking-widest text-slate-500 shadow-sm transition hover:text-black"
                    >
                        <span aria-hidden="true" className="material-symbols-outlined text-[18px]">restart_alt</span>
                        Reset
                    </button>
                    <button
                        type="button"
                        onClick={saveConfig}
                        className="inline-flex h-11 items-center gap-2 rounded-xl border border-[#007aff] bg-[#007aff] px-5 text-[11px] font-black uppercase tracking-widest text-white shadow-xl shadow-blue-500/20 transition hover:bg-blue-600"
                    >
                        <span aria-hidden="true" className="material-symbols-outlined text-[18px]">save</span>
                        Save configuration
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-6">
                {[
                    { label: 'AIP Providers', value: summary.activeProviders, tone: 'text-black' },
                    { label: 'Configured Keys', value: summary.configuredKeys, tone: 'text-[#007aff]' },
                    { label: 'Model Profiles', value: summary.activeModels, tone: 'text-[#5856d6]' },
                    { label: 'Active Agents', value: summary.activeAgents, tone: 'text-black' },
                    { label: 'Enabled Skills', value: summary.activeSkills, tone: 'text-[#28cd41]' },
                    { label: 'Blueprints', value: summary.blueprints, tone: 'text-[#ff9500]' },
                ].map((item) => (
                    <div key={item.label} className="ent-card bg-white/70 p-5">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#86868b]">{item.label}</p>
                        <p className={`mt-3 text-4xl font-black tracking-tighter ${item.tone}`}>{item.value}</p>
                    </div>
                ))}
            </div>

            <div className="flex gap-2 overflow-x-auto rounded-2xl border border-black/5 bg-white/70 p-2 shadow-sm">
                {panelItems.map((panel) => (
                    <button
                        key={panel.id}
                        type="button"
                        onClick={() => setActivePanel(panel.id)}
                        className={`inline-flex h-11 min-w-fit items-center gap-2 rounded-xl px-4 text-[11px] font-black uppercase tracking-widest transition ${
                            activePanel === panel.id
                                ? 'bg-black text-white shadow-lg shadow-black/10'
                                : 'text-slate-500 hover:bg-black/5 hover:text-black'
                        }`}
                    >
                        <span aria-hidden="true" className="material-symbols-outlined text-[18px]">{panel.icon}</span>
                        {panel.label}
                    </button>
                ))}
            </div>

            {activePanel === 'keys' && (
                <section className="space-y-5">
                    <SectionHeader
                        title="AIP / API Key Vault"
                        description="Manage model providers and key references used by the enterprise AI runtime."
                        buttonLabel="Add provider"
                        onButtonClick={addProvider}
                    />
                    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                        {config.modelProviders.map((provider) => (
                            <article key={provider.id} className="ent-card bg-white/70 p-5">
                                <div className="mb-5 flex items-start justify-between gap-4">
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#007aff]">{provider.providerType}</p>
                                        <h3 className="mt-1 text-lg font-black tracking-tight text-black">{provider.name}</h3>
                                        <p className="mt-2 text-[12px] font-bold text-[#86868b]">
                                            {config.modelProfiles.filter((model) => model.providerId === provider.id).length} linked models
                                        </p>
                                    </div>
                                    <Toggle checked={provider.enabled} label={`Toggle ${provider.name}`} onChange={() => updateProvider(provider.id, { enabled: !provider.enabled })} />
                                </div>
                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                    <TextField label={`Provider name for ${provider.name}`} value={provider.name} onChange={(name) => updateProvider(provider.id, { name })} />
                                    <TextField label={`Provider type for ${provider.name}`} value={provider.providerType} onChange={(providerType) => updateProvider(provider.id, { providerType })} />
                                    <TextField label={`Base URL for ${provider.name}`} value={provider.baseUrl} onChange={(baseUrl) => updateProvider(provider.id, { baseUrl })} />
                                    <TextField label={`API key for ${provider.name}`} type="password" value={provider.apiKey} onChange={(apiKey) => updateProvider(provider.id, { apiKey })} />
                                </div>
                                <button
                                    type="button"
                                    onClick={() => removeProvider(provider.id)}
                                    className="mt-4 inline-flex h-10 items-center gap-2 rounded-xl border border-black/5 bg-white px-3 text-[11px] font-black uppercase tracking-widest text-slate-500 transition hover:text-red-600"
                                >
                                    <span aria-hidden="true" className="material-symbols-outlined text-[17px]">delete</span>
                                    Remove provider {provider.name}
                                </button>
                            </article>
                        ))}
                    </div>
                </section>
            )}

            {activePanel === 'models' && (
                <section className="space-y-5">
                    <SectionHeader
                        title="Multi-Model Catalog"
                        description="Create model profiles and bind each one to a provider, endpoint model code, cost, and best-use case."
                        buttonLabel="Add model"
                        onButtonClick={addModel}
                    />
                    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                        {config.modelProfiles.map((model) => (
                            <article key={model.id} className="ent-card bg-white/70 p-5">
                                <div className="mb-5 flex items-start justify-between gap-4">
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#5856d6]">{getProviderName(model.providerId)}</p>
                                        <h3 className="mt-1 text-lg font-black tracking-tight text-black">{model.name}</h3>
                                        <p className="mt-2 text-[12px] font-bold leading-relaxed text-[#86868b]">{model.bestFor}</p>
                                    </div>
                                    <Toggle checked={model.enabled} label={`Toggle ${model.name}`} onChange={() => updateModel(model.id, { enabled: !model.enabled })} />
                                </div>
                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                    <TextField label={`Model name for ${model.name}`} value={model.name} onChange={(name) => updateModel(model.id, { name })} />
                                    <TextField label={`Model code for ${model.name}`} value={model.modelCode} onChange={(modelCode) => updateModel(model.id, { modelCode })} />
                                    <SelectField label={`Provider for ${model.name}`} value={model.providerId} onChange={(providerId) => updateModel(model.id, { providerId })} options={providerOptions} />
                                    <TextField label={`Context window for ${model.name}`} value={model.contextWindow} onChange={(contextWindow) => updateModel(model.id, { contextWindow })} />
                                    <TextField label={`Latency for ${model.name}`} value={model.latency} onChange={(latency) => updateModel(model.id, { latency })} />
                                    <TextField label={`Cost for ${model.name}`} value={model.cost} onChange={(cost) => updateModel(model.id, { cost })} />
                                </div>
                                <div className="mt-3">
                                    <TextAreaField label={`Best use for ${model.name}`} value={model.bestFor} onChange={(bestFor) => updateModel(model.id, { bestFor })} />
                                </div>
                                <button
                                    type="button"
                                    onClick={() => removeModel(model.id)}
                                    className="mt-4 inline-flex h-10 items-center gap-2 rounded-xl border border-black/5 bg-white px-3 text-[11px] font-black uppercase tracking-widest text-slate-500 transition hover:text-red-600"
                                >
                                    <span aria-hidden="true" className="material-symbols-outlined text-[17px]">delete</span>
                                    Remove model {model.name}
                                </button>
                            </article>
                        ))}
                    </div>
                </section>
            )}

            {activePanel === 'skills' && (
                <section className="space-y-5">
                    <SectionHeader
                        title="Skills Configuration"
                        description="Create operational skills and assign each one to an owning agent and trigger condition."
                        buttonLabel="Add skill"
                        onButtonClick={addSkill}
                    />
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                        {config.skills.map((skill) => (
                            <article key={skill.id} className="ent-card bg-white/70 p-5">
                                <div className="mb-5 flex items-start justify-between gap-4">
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#007aff]">{getAgentName(skill.ownerAgentId)}</p>
                                        <h3 className="mt-1 text-lg font-black tracking-tight text-black">{skill.name}</h3>
                                        <p className="mt-2 text-[12px] font-bold leading-relaxed text-[#86868b]">{skill.description}</p>
                                    </div>
                                    <Toggle checked={skill.enabled} label={`Toggle ${skill.name}`} onChange={() => updateSkill(skill.id, { enabled: !skill.enabled })} />
                                </div>
                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                    <TextField label={`Skill name for ${skill.name}`} value={skill.name} onChange={(name) => updateSkill(skill.id, { name })} />
                                    <SelectField label={`Owner for ${skill.name}`} value={skill.ownerAgentId} onChange={(ownerAgentId) => updateSkill(skill.id, { ownerAgentId })} options={agentOptions} />
                                    <TextField label={`Trigger for ${skill.name}`} value={skill.trigger} onChange={(trigger) => updateSkill(skill.id, { trigger })} />
                                    <TextField label={`Input contract for ${skill.name}`} value={skill.inputContract} onChange={(inputContract) => updateSkill(skill.id, { inputContract })} />
                                </div>
                                <div className="mt-3">
                                    <TextAreaField label={`Description for ${skill.name}`} value={skill.description} onChange={(description) => updateSkill(skill.id, { description })} />
                                </div>
                                <button
                                    type="button"
                                    onClick={() => removeSkill(skill.id)}
                                    className="mt-4 inline-flex h-10 items-center gap-2 rounded-xl border border-black/5 bg-white px-3 text-[11px] font-black uppercase tracking-widest text-slate-500 transition hover:text-red-600"
                                >
                                    <span aria-hidden="true" className="material-symbols-outlined text-[17px]">delete</span>
                                    Remove skill {skill.name}
                                </button>
                            </article>
                        ))}
                    </div>
                </section>
            )}

            {activePanel === 'agents' && (
                <section className="space-y-5">
                    <SectionHeader
                        title="Agent Runtime Policy"
                        description="Create agents, assign models, define prompts, and choose automation boundaries."
                        buttonLabel="Add agent"
                        onButtonClick={addAgent}
                    />
                    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                        {config.agents.map((agent) => (
                            <article key={agent.id} className="ent-card bg-white/70 p-5">
                                <div className="mb-5 flex items-start justify-between gap-4">
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#86868b]">{agent.layer}</p>
                                        <h3 className="mt-1 text-lg font-black tracking-tight text-black">{agent.name}</h3>
                                        <p className="mt-2 text-[12px] font-bold leading-relaxed text-[#86868b]">{agent.description}</p>
                                    </div>
                                    <Toggle checked={agent.enabled} label={`Toggle runtime for ${agent.name}`} onChange={() => updateAgent(agent.id, { enabled: !agent.enabled })} />
                                </div>
                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                    <TextField label={`Agent name for ${agent.name}`} value={agent.name} onChange={(name) => updateAgent(agent.id, { name })} />
                                    <TextField label={`Layer for ${agent.name}`} value={agent.layer} onChange={(layer) => updateAgent(agent.id, { layer })} />
                                    <SelectField label={`Model for ${agent.name}`} value={agent.modelId} onChange={(modelId) => updateAgent(agent.id, { modelId })} options={modelOptions} />
                                    <SelectField label={`Runtime for ${agent.name}`} value={agent.mode} onChange={(mode) => updateAgent(agent.id, { mode: mode as RuntimeMode })} options={runtimeOptions} />
                                    <TextField label={`Tool access for ${agent.name}`} value={agent.toolAccess} onChange={(toolAccess) => updateAgent(agent.id, { toolAccess })} />
                                </div>
                                <div className="mt-3 grid grid-cols-1 gap-3">
                                    <TextAreaField label={`Description for ${agent.name}`} value={agent.description} onChange={(description) => updateAgent(agent.id, { description })} />
                                    <TextAreaField label={`System prompt for ${agent.name}`} value={agent.systemPrompt} onChange={(systemPrompt) => updateAgent(agent.id, { systemPrompt })} />
                                </div>
                                <p className="mt-4 rounded-xl bg-black/5 px-4 py-3 text-[12px] font-black text-slate-700">
                                    {agent.name} routes to {getModelName(agent.modelId)}
                                </p>
                                <button
                                    type="button"
                                    onClick={() => removeAgent(agent.id)}
                                    className="mt-4 inline-flex h-10 items-center gap-2 rounded-xl border border-black/5 bg-white px-3 text-[11px] font-black uppercase tracking-widest text-slate-500 transition hover:text-red-600"
                                >
                                    <span aria-hidden="true" className="material-symbols-outlined text-[17px]">delete</span>
                                    Remove agent {agent.name}
                                </button>
                            </article>
                        ))}
                    </div>
                </section>
            )}

            {activePanel === 'workflow' && (
                <section className="space-y-5">
                    <SectionHeader
                        title="Workflow Configuration"
                        description="Build workflow steps from intake to learning and attach each gate to the responsible agent."
                        buttonLabel="Add workflow step"
                        onButtonClick={addWorkflowStep}
                    />
                    <div className="space-y-3">
                        {config.workflow.map((step, index) => (
                            <article key={step.id} className="ent-card grid grid-cols-1 gap-4 bg-white/70 p-5 xl:grid-cols-[64px_1fr_260px] xl:items-start">
                                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-black text-[13px] font-black text-white">
                                    {String(index + 1).padStart(2, '0')}
                                </div>
                                <div className="space-y-3">
                                    <div className="flex items-start justify-between gap-4">
                                        <div>
                                            <h3 className="text-lg font-black tracking-tight text-black">{step.title}</h3>
                                            <p className="mt-1 text-[12px] font-bold leading-relaxed text-[#86868b]">{step.description}</p>
                                        </div>
                                        <Toggle checked={step.enabled} label={`Toggle ${step.title}`} onChange={() => updateWorkflow(step.id, { enabled: !step.enabled })} />
                                    </div>
                                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                        <TextField label={`Step title for ${step.title}`} value={step.title} onChange={(title) => updateWorkflow(step.id, { title })} />
                                        <TextField label={`Depends on for ${step.title}`} value={step.dependsOn} onChange={(dependsOn) => updateWorkflow(step.id, { dependsOn })} />
                                    </div>
                                    <TextAreaField label={`Description for ${step.title}`} value={step.description} onChange={(description) => updateWorkflow(step.id, { description })} />
                                </div>
                                <div className="space-y-3">
                                    <SelectField label={`Owner for ${step.title}`} value={step.ownerAgentId} onChange={(ownerAgentId) => updateWorkflow(step.id, { ownerAgentId })} options={agentOptions} />
                                    <SelectField label={`Gate for ${step.title}`} value={step.gate} onChange={(gate) => updateWorkflow(step.id, { gate: gate as WorkflowGate })} options={gateOptions} />
                                    <button
                                        type="button"
                                        onClick={() => removeWorkflowStep(step.id)}
                                        className="inline-flex h-10 items-center gap-2 rounded-xl border border-black/5 bg-white px-3 text-[11px] font-black uppercase tracking-widest text-slate-500 transition hover:text-red-600"
                                    >
                                        <span aria-hidden="true" className="material-symbols-outlined text-[17px]">delete</span>
                                        Remove step {step.title}
                                    </button>
                                </div>
                            </article>
                        ))}
                    </div>
                </section>
            )}

            {activePanel === 'blueprints' && (
                <section className="space-y-5">
                    <SectionHeader
                        title="Creation Blueprint Builder"
                        description="Build reusable operating plans from the configured models, skills, agents, and workflow steps."
                        buttonLabel="Add blueprint"
                        onButtonClick={addBlueprint}
                    />
                    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                        {config.blueprints.map((blueprint) => (
                            <article key={blueprint.id} className="ent-card bg-white/70 p-5">
                                <div className="mb-5 flex items-start justify-between gap-4">
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#ff9500]">{blueprint.status}</p>
                                        <h3 className="mt-1 text-lg font-black tracking-tight text-black">{blueprint.title}</h3>
                                        <p className="mt-2 text-[12px] font-bold leading-relaxed text-[#86868b]">{blueprint.scenario}</p>
                                    </div>
                                    <div className="rounded-xl bg-black px-3 py-2 text-[11px] font-black uppercase tracking-widest text-white">
                                        {getAgentName(blueprint.primaryAgentId)}
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                    <TextField label={`Blueprint title for ${blueprint.title}`} value={blueprint.title} onChange={(title) => updateBlueprint(blueprint.id, { title })} />
                                    <SelectField label={`Primary agent for ${blueprint.title}`} value={blueprint.primaryAgentId} onChange={(primaryAgentId) => updateBlueprint(blueprint.id, { primaryAgentId })} options={agentOptions} />
                                    <TextField label={`Target user for ${blueprint.title}`} value={blueprint.targetUser} onChange={(targetUser) => updateBlueprint(blueprint.id, { targetUser })} />
                                    <SelectField label={`Status for ${blueprint.title}`} value={blueprint.status} onChange={(status) => updateBlueprint(blueprint.id, { status: status as BlueprintStatus })} options={blueprintStatusOptions} />
                                </div>
                                <div className="mt-3 grid grid-cols-1 gap-3">
                                    <TextAreaField label={`Scenario for ${blueprint.title}`} value={blueprint.scenario} onChange={(scenario) => updateBlueprint(blueprint.id, { scenario })} />
                                    <TextAreaField label={`Output format for ${blueprint.title}`} value={blueprint.outputFormat} onChange={(outputFormat) => updateBlueprint(blueprint.id, { outputFormat })} />
                                    <TextField label={`Workflow steps for ${blueprint.title}`} value={blueprint.workflowStepIds} onChange={(workflowStepIds) => updateBlueprint(blueprint.id, { workflowStepIds })} />
                                    <TextField label={`Skills for ${blueprint.title}`} value={blueprint.skillIds} onChange={(skillIds) => updateBlueprint(blueprint.id, { skillIds })} />
                                </div>
                                <button
                                    type="button"
                                    onClick={() => removeBlueprint(blueprint.id)}
                                    className="mt-4 inline-flex h-10 items-center gap-2 rounded-xl border border-black/5 bg-white px-3 text-[11px] font-black uppercase tracking-widest text-slate-500 transition hover:text-red-600"
                                >
                                    <span aria-hidden="true" className="material-symbols-outlined text-[17px]">delete</span>
                                    Remove blueprint {blueprint.title}
                                </button>
                            </article>
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
};

export default EnterpriseAIConfigPage;
