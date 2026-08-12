import { CaseProgressSchema, type CaseProgress } from '@house-maint/contracts';
import type { RealtimePort, RealtimeTarget } from './ports.js';

export class ScopedRealtimePublisher {
    constructor(private readonly realtime: RealtimePort) {}

    async publish(target: RealtimeTarget, value: CaseProgress): Promise<void> {
        const progress = CaseProgressSchema.parse(value);
        if (target.organization_id !== progress.organization_id || target.case_id !== progress.case_id
            || target.scope_id !== `case:${progress.case_id}` || target.principal_ids.length === 0) {
            throw new Error('Realtime progress scope mismatch');
        }
        await this.realtime.publish(structuredClone(target), progress);
    }
}
