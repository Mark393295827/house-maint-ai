import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import InquiryChat from './InquiryChat';

const mocks = vi.hoisted(() => ({
    diagnosePhoto: vi.fn(),
    inquiryChat: vi.fn(),
    track: vi.fn(),
}));

vi.mock('../../i18n/LanguageContext', () => ({
    useLanguage: () => ({ locale: 'en' }),
}));

vi.mock('../../services/ai', () => ({
    diagnosePhoto: mocks.diagnosePhoto,
    inquiryChat: mocks.inquiryChat,
}));

vi.mock('../../services/analytics', () => ({
    default: { track: mocks.track },
}));

describe('InquiryChat camera diagnosis', () => {
    const stopTrack = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        Object.defineProperty(URL, 'createObjectURL', {
            configurable: true,
            value: vi.fn(() => 'blob:captured-photo'),
        });
        Object.defineProperty(URL, 'revokeObjectURL', {
            configurable: true,
            value: vi.fn(),
        });
        Object.defineProperty(navigator, 'mediaDevices', {
            configurable: true,
            value: {
                getUserMedia: vi.fn().mockResolvedValue({
                    getTracks: () => [{ stop: stopTrack }],
                }),
            },
        });
        Object.defineProperty(HTMLVideoElement.prototype, 'videoWidth', { configurable: true, value: 640 });
        Object.defineProperty(HTMLVideoElement.prototype, 'videoHeight', { configurable: true, value: 480 });
        vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
            drawImage: vi.fn(),
        } as unknown as CanvasRenderingContext2D);
        vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/jpeg;base64,camera-image');
        vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((callback) => {
            callback(new Blob(['image'], { type: 'image/jpeg' }));
        });
        mocks.diagnosePhoto.mockResolvedValue({
            detected: true,
            issueName: 'Loose sink slip-joint',
            category: 'plumbing',
            severity: 'moderate',
            confidence: 0.91,
            summary: 'Moisture is visible around the drain connection.',
            urgencyScore: 5,
            safetyWarning: null,
            canDiy: true,
            steps: ['Place a bucket below the joint.', 'Hand-tighten the slip nut.'],
            requiredParts: [],
            toolsNeeded: ['Bucket'],
        });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('captures a photo and renders the direct structured AI answer', async () => {
        render(<InquiryChat onComplete={vi.fn()} onBack={vi.fn()} />);

        fireEvent.click(screen.getByRole('button', { name: 'add' }));
        fireEvent.click(await screen.findByRole('button', { name: /camera/i }));

        const video = document.querySelector('video');
        expect(video).not.toBeNull();
        await waitFor(() => expect(video!.srcObject).not.toBeNull());
        fireEvent.loadedMetadata(video!);

        const captureButton = await screen.findByRole('button', { name: 'Capture and analyze photo' });
        await waitFor(() => expect(captureButton).toBeEnabled());
        fireEvent.click(captureButton);

        await waitFor(() => expect(mocks.diagnosePhoto).toHaveBeenCalledWith(
            'camera-image',
            'image/jpeg',
            expect.stringContaining('Directly analyze')
        ));
        expect(await screen.findByText('AI preliminary photo diagnosis')).toBeInTheDocument();
        expect(screen.getByText('Loose sink slip-joint')).toBeInTheDocument();
        expect(screen.getByText('91%')).toBeInTheDocument();
        expect(screen.getByText('Recommended next steps')).toBeInTheDocument();
        expect(screen.queryByText('System error.')).not.toBeInTheDocument();
    });

    it('preserves the uploaded image MIME type for multimodal diagnosis', async () => {
        render(<InquiryChat onComplete={vi.fn()} onBack={vi.fn()} />);

        fireEvent.click(screen.getByRole('button', { name: 'add' }));
        fireEvent.click(await screen.findByRole('button', { name: /gallery/i }));

        const fileInput = document.querySelector<HTMLInputElement>('input[type="file"]');
        expect(fileInput).not.toBeNull();
        fireEvent.change(fileInput!, {
            target: {
                files: [new File(['png-image'], 'fixture.png', { type: 'image/png' })],
            },
        });

        await waitFor(() => expect(mocks.diagnosePhoto).toHaveBeenCalledWith(
            expect.any(String),
            'image/png',
            expect.stringContaining('Directly analyze')
        ));
    });
});
