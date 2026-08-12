export const MINIPROGRAM_COMPATIBILITY = [
    { legacy_page: 'pages/report/index', surface: 'resident_diagnosis', contract: 'case-command/v1', fallback: 'manual' },
    { legacy_page: 'pages/report/upload', surface: 'resident_media_confirm', contract: 'case-command/v1', fallback: 'text' },
    { legacy_page: 'pages/report/diagnosis', surface: 'case_progress', contract: 'case-progress/v1', fallback: 'manual' },
] as const;

export function mapMiniProgramSubmission(input: {
    source: string;
    text: string;
    media_artifact_id?: string;
    consent_receipt_id?: string;
}): {
    source: 'text' | 'voice' | 'camera' | 'photo' | 'manual' | 'emergency';
    description: string;
    artifact_id?: string;
    consent_receipt_id?: string;
} {
    const mapped = {
        text: 'text', record: 'voice', camera: 'camera', album: 'photo',
        manual: 'manual', emergency: 'emergency',
    } as const;
    const source = mapped[input.source as keyof typeof mapped] ?? 'manual';
    const description = input.text.trim() || 'Manual support requested for this maintenance issue.';
    return {
        source, description,
        ...(input.media_artifact_id ? { artifact_id: input.media_artifact_id } : {}),
        ...(input.consent_receipt_id ? { consent_receipt_id: input.consent_receipt_id } : {}),
    };
}
