export interface RunObservation {
    schema: 'run-observation/v1';
    event_id: string;
    organization_id: number;
    scope_id: string;
    case_id: number;
    run_id: string | null;
    task_id: string | null;
    event_type: string;
    outcome: 'accepted' | 'denied' | 'retry' | 'cancelled' | 'failed';
    reason_code: string;
    occurred_at: string;
    metrics: {
        wall_ms?: number;
        attempts?: number;
        deliveries?: number;
    };
}

export interface RunObservationSink {
    append(observation: RunObservation): Promise<void>;
}

const forbiddenKey = /(?:payload|content|prompt|credential|secret|token|password|api.?key|provider|model)/i;

export class ScopedRunObserver {
    constructor(private readonly sink: RunObservationSink) {}

    async record(observation: RunObservation, expected: {
        organization_id: number;
        scope_id: string;
        case_id: number;
    }): Promise<void> {
        if (observation.organization_id !== expected.organization_id
            || observation.scope_id !== expected.scope_id || observation.case_id !== expected.case_id) {
            throw new Error('Run observation scope mismatch');
        }
        if (Object.keys(observation.metrics).some((key) => forbiddenKey.test(key))) {
            throw new Error('Run observation contains a forbidden content field');
        }
        await this.sink.append(structuredClone(observation));
    }
}

export class MemoryRunObservationSink implements RunObservationSink {
    private readonly values: RunObservation[] = [];

    async append(observation: RunObservation): Promise<void> {
        this.values.push(structuredClone(observation));
    }

    snapshot(): RunObservation[] {
        return structuredClone(this.values);
    }
}
