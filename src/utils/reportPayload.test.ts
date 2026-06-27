import { describe, expect, it } from 'vitest';
import { buildRecordingReference, urgencyToScore } from './reportPayload';

describe('reportPayload helpers', () => {
    it('maps UI urgency ids to backend urgency scores', () => {
        expect(urgencyToScore('critical')).toBe(10);
        expect(urgencyToScore('high')).toBe(8);
        expect(urgencyToScore('normal')).toBe(5);
        expect(urgencyToScore('low')).toBe(2);
        expect(urgencyToScore('unknown')).toBe(5);
    });

    it('builds deterministic metadata references for recordings without uploaded blobs', () => {
        const ref = buildRecordingReference('voice', {
            duration: 12,
            timestamp: '2026-06-03T12:00:00.000Z',
            mimeType: 'audio/webm'
        });

        expect(ref).toBe('recording://voice?duration=12&timestamp=2026-06-03T12%3A00%3A00.000Z&mimeType=audio%2Fwebm');
    });

    it('returns undefined when no recording was captured', () => {
        expect(buildRecordingReference('video', null)).toBeUndefined();
    });
});
