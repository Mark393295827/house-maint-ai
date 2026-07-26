import { Bot, ExternalLink } from 'lucide-react';
import {
    MeasurementBadge,
    MetricValue,
    ModuleHeader,
    TextMeasurement,
    cx,
    formatDateTime,
    useModuleHeadingId,
    type AnalyticsModuleProps,
} from './shared';
import type {
    AgentOperationMetric,
    AgentStatus,
    AgentWorkflowStage,
} from './types';

export interface AgentOperationsCopy {
    title: string;
    description?: string;
    tableCaption: string;
    agentLabel: string;
    statusLabel: string;
    workflowLabel: string;
    modelsLabel: string;
    callsLabel: string;
    tokensLabel: string;
    totalTokensLabel: string;
    inputTokensLabel: string;
    outputTokensLabel: string;
    costLabel: string;
    latencyLabel: string;
    averageLatencyLabel: string;
    p95LatencyLabel: string;
    successLabel: string;
    lastActiveLabel: string;
    statusLabels: Record<AgentStatus, string>;
    workflowLabels: Record<AgentWorkflowStage, string>;
    inspectAgentLabel: string;
    emptyLabel: string;
}

export interface AgentOperationsProps extends AnalyticsModuleProps {
    agents: readonly AgentOperationMetric[];
    copy: AgentOperationsCopy;
    onSelectAgent?: (agent: AgentOperationMetric) => void;
}

export function AgentOperations({
    agents,
    copy,
    onSelectAgent,
    valueCopy,
    locale = 'en',
    unitLabels,
    className,
    id,
}: AgentOperationsProps) {
    const headingId = useModuleHeadingId(id, 'agent-operations');

    return (
        <section
            className={cx('eam-module', 'eam-agent-operations', className)}
            id={id}
            aria-labelledby={headingId}
        >
            <ModuleHeader
                id={headingId}
                icon={<Bot size={18} />}
                title={copy.title}
                description={copy.description}
            />
            <div className="eam-table-surface" tabIndex={0}>
                <table className="eam-data-table eam-agent-table">
                    <caption className="eam-sr-only">{copy.tableCaption}</caption>
                    <thead>
                        <tr>
                            <th scope="col">{copy.agentLabel}</th>
                            <th scope="col">{copy.statusLabel}</th>
                            <th scope="col">{copy.workflowLabel}</th>
                            <th scope="col">{copy.modelsLabel}</th>
                            <th scope="col">{copy.callsLabel}</th>
                            <th scope="col">{copy.tokensLabel}</th>
                            <th scope="col">{copy.costLabel}</th>
                            <th scope="col">{copy.latencyLabel}</th>
                            <th scope="col">{copy.successLabel}</th>
                            <th scope="col">{copy.lastActiveLabel}</th>
                            {onSelectAgent && <th scope="col" aria-label={copy.inspectAgentLabel} />}
                        </tr>
                    </thead>
                    <tbody>
                        {agents.length === 0 ? (
                            <tr>
                                <td
                                    className="eam-table-empty"
                                    colSpan={onSelectAgent ? 11 : 10}
                                >
                                    {copy.emptyLabel}
                                </td>
                            </tr>
                        ) : agents.map((agent) => (
                            <tr key={agent.id}>
                                <th scope="row">
                                    <strong className="eam-agent-code">{agent.display_code}</strong>
                                    <small>{agent.id}</small>
                                </th>
                                <td>
                                    <span
                                        className="eam-agent-status"
                                        data-status={agent.status}
                                    >
                                        <i aria-hidden="true" />
                                        {copy.statusLabels[agent.status]}
                                    </span>
                                </td>
                                <td>{copy.workflowLabels[agent.workflow_stage]}</td>
                                <td>
                                    {agent.models.length > 0 ? (
                                        <ul className="eam-inline-list">
                                            {agent.models.map((model) => (
                                                <li key={model}><code>{model}</code></li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <MeasurementBadge
                                            compact
                                            labels={valueCopy.measurementLabels}
                                            measurement="unavailable"
                                        />
                                    )}
                                </td>
                                <td>
                                    <MetricValue
                                        compact
                                        metric={agent.calls}
                                        valueCopy={valueCopy}
                                        locale={locale}
                                        unitLabels={unitLabels}
                                    />
                                </td>
                                <td>
                                    <dl className="eam-table-stack">
                                        <div>
                                            <dt>{copy.totalTokensLabel}</dt>
                                            <dd>
                                                <MetricValue
                                                    compact
                                                    metric={agent.total_tokens}
                                                    valueCopy={valueCopy}
                                                    locale={locale}
                                                    unitLabels={unitLabels}
                                                />
                                            </dd>
                                        </div>
                                        <div>
                                            <dt>{copy.inputTokensLabel}</dt>
                                            <dd>
                                                <MetricValue
                                                    compact
                                                    metric={agent.input_tokens}
                                                    valueCopy={valueCopy}
                                                    locale={locale}
                                                    unitLabels={unitLabels}
                                                />
                                            </dd>
                                        </div>
                                        <div>
                                            <dt>{copy.outputTokensLabel}</dt>
                                            <dd>
                                                <MetricValue
                                                    compact
                                                    metric={agent.output_tokens}
                                                    valueCopy={valueCopy}
                                                    locale={locale}
                                                    unitLabels={unitLabels}
                                                />
                                            </dd>
                                        </div>
                                    </dl>
                                </td>
                                <td>
                                    <MetricValue
                                        compact
                                        metric={agent.cost_cny}
                                        valueCopy={valueCopy}
                                        locale={locale}
                                        unitLabels={unitLabels}
                                    />
                                </td>
                                <td>
                                    <dl className="eam-table-stack">
                                        <div>
                                            <dt>{copy.averageLatencyLabel}</dt>
                                            <dd>
                                                <MetricValue
                                                    compact
                                                    metric={agent.average_latency_ms}
                                                    valueCopy={valueCopy}
                                                    locale={locale}
                                                    unitLabels={unitLabels}
                                                />
                                            </dd>
                                        </div>
                                        <div>
                                            <dt>{copy.p95LatencyLabel}</dt>
                                            <dd>
                                                <MetricValue
                                                    compact
                                                    metric={agent.p95_latency_ms}
                                                    valueCopy={valueCopy}
                                                    locale={locale}
                                                    unitLabels={unitLabels}
                                                />
                                            </dd>
                                        </div>
                                    </dl>
                                </td>
                                <td>
                                    <MetricValue
                                        compact
                                        metric={agent.success_rate_pct}
                                        valueCopy={valueCopy}
                                        locale={locale}
                                        unitLabels={unitLabels}
                                    />
                                </td>
                                <td>
                                    <TextMeasurement
                                        compact
                                        value={agent.last_active_at
                                            ? formatDateTime(agent.last_active_at, locale)
                                            : null}
                                        measurement={agent.last_active_at
                                            ? 'measured'
                                            : 'unavailable'}
                                        valueCopy={valueCopy}
                                    />
                                </td>
                                {onSelectAgent && (
                                    <td>
                                        <button
                                            type="button"
                                            className="eam-icon-button"
                                            aria-label={`${copy.inspectAgentLabel}: ${agent.display_code}`}
                                            onClick={() => onSelectAgent(agent)}
                                        >
                                            <ExternalLink size={15} aria-hidden="true" />
                                        </button>
                                    </td>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </section>
    );
}

export default AgentOperations;
