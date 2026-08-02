import { describe, expect, it } from 'vitest';
import {
    CaseEventEnvelopeSchema,
    CaseProjectionSchema,
} from '@house-maint/contracts';
import {
    CaseCommandService,
    compareLegacyReportShadow,
    mapLegacyReportToCase,
    reduceCaseEvent,
    replayCaseEvents,
    selectSingleCaseWriter,
    type LegacyReportSnapshot,
} from '@house-maint/domain';
import { InMemoryCaseCommandRepository } from '../../../packages/persistence/src/cases/index.js';
import { FIXED_NOW, caseScope, openCaseCommand } from './fixtures.js';

describe('canonical case domain contracts', () => {
    it('emits strict contract envelopes and reduces the same timeline deterministically', async () => {
        const repository = new InMemoryCaseCommandRepository();
        const service = new CaseCommandService(repository, () => FIXED_NOW);
        const result = await service.execute({ command: openCaseCommand(), scope: caseScope() });

        expect(CaseEventEnvelopeSchema.parse(result.event)).toEqual(result.event);
        expect(CaseProjectionSchema.parse(result.projection)).toEqual(result.projection);
        expect(result.projection).toMatchObject({
            organization_id: 1,
            status: 'open',
            stage: 'intake',
            priority: 'urgent',
            version: 1,
        });
        const timeline = await repository.timeline(1, result.projection.id);
        expect(replayCaseEvents(timeline)).toEqual(result.projection);
        expect(replayCaseEvents(timeline)).toEqual(replayCaseEvents(structuredClone(timeline)));
    });

    it('fails closed on non-contiguous events and illegal lifecycle transitions', async () => {
        const repository = new InMemoryCaseCommandRepository();
        const service = new CaseCommandService(repository, () => FIXED_NOW);
        const opened = await service.execute({ command: openCaseCommand(), scope: caseScope() });
        const closing = {
            ...opened.event,
            event_id: 'event:illegal-close',
            sequence: 2,
            case_version: 2,
            event_type: 'case_closed' as const,
            idempotency_key: 'illegal-close',
            payload: { reason_code: 'skip_resolution', evidence_artifact_ids: [] },
        };
        expect(() => reduceCaseEvent(opened.projection, { ...closing, sequence: 3, case_version: 3 }))
            .toThrow(/advance exactly once/i);
        expect(() => reduceCaseEvent(opened.projection, closing)).toThrow(/resolved case/i);
    });

    it('maps report lifecycle deterministically and produces field-level shadow evidence', () => {
        const report: LegacyReportSnapshot = {
            id: 70,
            organization_id: 1,
            title: 'Boiler pressure loss',
            description: 'Pressure falls overnight and requires a refill.',
            category: 'hvac',
            status: 'matching',
            urgency_score: 8,
            property_id: 20,
            unit_id: 30,
            created_at: '2026-08-01T08:00:00.000Z',
            updated_at: '2026-08-01T09:00:00.000Z',
        };
        const mapped = mapLegacyReportToCase(report, 500);
        expect(mapped).toMatchObject({
            id: 500,
            status: 'open',
            stage: 'dispatch',
            priority: 'urgent',
        });
        expect(compareLegacyReportShadow(report, mapped)).toMatchObject({
            schema: 'case-report-shadow/v1',
            parity: true,
            mismatches: [],
        });
        expect(compareLegacyReportShadow(report, { ...mapped, title: 'Changed title' })).toMatchObject({
            parity: false,
            mismatches: [{ field: 'title' }],
        });
        expect(() => compareLegacyReportShadow({ ...report, organization_id: 2 }, mapped))
            .toThrow(/cross-organization/i);
    });

    it('rejects simultaneous canonical, report, or old-case writers', () => {
        expect(selectSingleCaseWriter({
            canonicalCommand: true,
            legacyReport: false,
            legacyCase: false,
        })).toBe('canonical-command');
        expect(() => selectSingleCaseWriter({
            canonicalCommand: true,
            legacyReport: true,
            legacyCase: false,
        })).toThrow(/one case lifecycle writer/i);
        expect(() => selectSingleCaseWriter({
            canonicalCommand: false,
            legacyReport: true,
            legacyCase: true,
        })).toThrow(/one case lifecycle writer/i);
    });

    it('rejects unknown command fields through @house-maint/contracts', async () => {
        const repository = new InMemoryCaseCommandRepository();
        const service = new CaseCommandService(repository, () => FIXED_NOW);
        await expect(service.execute({
            command: { ...openCaseCommand(), provider_name: 'forbidden' },
            scope: caseScope(),
        })).rejects.toMatchObject({ code: 'invalid_input' });
    });
});
