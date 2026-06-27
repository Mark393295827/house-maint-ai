import type { RecordingData } from '../types';

export type RecordingKind = 'voice' | 'video';

const URGENCY_SCORES: Record<string, number> = {
    low: 2,
    normal: 5,
    high: 8,
    critical: 10,
};

export function urgencyToScore(urgency: string): number {
    return URGENCY_SCORES[urgency] ?? URGENCY_SCORES.normal;
}

export function buildRecordingReference(kind: RecordingKind, recording: RecordingData | null): string | undefined {
    if (!recording) return undefined;

    const params = new URLSearchParams();
    params.set('duration', String(recording.duration));
    params.set('timestamp', recording.timestamp);
    if (recording.mimeType) params.set('mimeType', recording.mimeType);

    return `recording://${kind}?${params.toString()}`;
}
