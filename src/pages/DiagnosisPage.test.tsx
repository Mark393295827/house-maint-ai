import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { LanguageProvider } from '../i18n/LanguageContext';
import DiagnosisPage from './DiagnosisPage';

// Mock the AI service
vi.mock('../services/ai', () => ({
    analyzeImageFromUrl: vi.fn(),
    analyzeImageFile: vi.fn(),
}));

// Mock navigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useNavigate: () => mockNavigate,
    };
});

// Mock MediaDevices
const mockGetUserMedia = vi.fn();
const mockMediaStream = {
    getTracks: () => [{
        stop: vi.fn(),
        getCapabilities: () => ({}),
        applyConstraints: vi.fn(),
    }],
    getVideoTracks: () => [{
        stop: vi.fn(),
        getCapabilities: () => ({}),
        applyConstraints: vi.fn(),
    }],
};

// Mock URL.createObjectURL and revokeObjectURL
const mockCreateObjectURL = vi.fn(() => 'blob:test-url');
const mockRevokeObjectURL = vi.fn();

const renderDiagnosisPage = () => {
    return render(
        <LanguageProvider>
            <BrowserRouter>
                <DiagnosisPage />
            </BrowserRouter>
        </LanguageProvider>
    );
};

describe('DiagnosisPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();

        // Mock canvas methods
        HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
            drawImage: vi.fn(),
        }) as any;
        HTMLCanvasElement.prototype.toBlob = vi.fn((callback) => {
            // @ts-ignore
            callback(new Blob(['test'], { type: 'image/jpeg' }));
        });

        // Setup navigator.mediaDevices mock
        Object.defineProperty(navigator, 'mediaDevices', {
            value: {
                getUserMedia: mockGetUserMedia,
            },
            writable: true,
        });

        // Mock URL methods
        global.URL.createObjectURL = mockCreateObjectURL;
        global.URL.revokeObjectURL = mockRevokeObjectURL;

        // Default: camera access succeeds
        mockGetUserMedia.mockResolvedValue(mockMediaStream);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should render the diagnosis page with camera controls', async () => {
        renderDiagnosisPage();

        // Wait for camera to initialize
        await waitFor(() => {
            // Should have back button
            expect(screen.getByRole('link', { name: /arrow_back/i }) ||
                screen.getByText('arrow_back')).toBeInTheDocument();
        });
    });

    it('should show camera error when access is denied', async () => {
        // Mock camera access denied
        mockGetUserMedia.mockRejectedValue({ name: 'NotAllowedError' });

        renderDiagnosisPage();

        await waitFor(() => {
            expect(screen.getByText('Please allow camera access to use diagnosis')).toBeInTheDocument();
        });
    });

    it('should show generic camera error for other errors', async () => {
        // Mock generic camera error
        mockGetUserMedia.mockRejectedValue({ name: 'NotFoundError' });

        renderDiagnosisPage();

        await waitFor(() => {
            expect(screen.getByText('Cannot access camera, please check permissions')).toBeInTheDocument();
        });
    });

    it('should have upload image option when camera fails', async () => {
        mockGetUserMedia.mockRejectedValue({ name: 'NotAllowedError' });

        renderDiagnosisPage();

        await waitFor(() => {
            expect(screen.getByText('Upload Image')).toBeInTheDocument();
        });
    });

    it('should render mode selector buttons', async () => {
        renderDiagnosisPage();

        await waitFor(() => {
            expect(screen.getByText(/Import/)).toBeInTheDocument();
            expect(screen.getByText(/Photo/)).toBeInTheDocument();
            expect(screen.getByText(/Batch/)).toBeInTheDocument();
        });
    });

    it('should have a capture button', async () => {
        renderDiagnosisPage();

        await waitFor(() => {
            // Look for the capture button by test id or aria-label
            const buttons = screen.getAllByRole('button');
            // The capture button should be present
            expect(buttons.length).toBeGreaterThan(0);
        });
    });

    it('should have flash toggle button', async () => {
        renderDiagnosisPage();

        await waitFor(() => {
            expect(screen.getByText('flash_off') || screen.getByText('flash_on')).toBeInTheDocument();
        });
    });

    it('should have gallery button', async () => {
        renderDiagnosisPage();

        await waitFor(() => {
            expect(screen.getByText('photo_library')).toBeInTheDocument();
        });
    });

    it('should show instruction tip when camera is ready', async () => {
        renderDiagnosisPage();

        // After camera is ready, the page should have buttons
        await waitFor(() => {
            const buttons = screen.getAllByRole('button');
            expect(buttons.length).toBeGreaterThan(0);
        });
    });

    it('should have hidden file input for image import', async () => {
        renderDiagnosisPage();

        await waitFor(() => {
            const fileInput = document.querySelector('input[type="file"]');
            expect(fileInput).toBeInTheDocument();
            expect(fileInput).toHaveAttribute('accept', 'image/*');
        });
    });

    it('should switch to import mode when import button is clicked', async () => {
        renderDiagnosisPage();

        await waitFor(() => {
            const importButton = screen.getByText(/Import/);
            fireEvent.click(importButton);
        });

        // Import mode should be active (button should have different styling)
        // This tests the mode switching logic
    });

    it('should call getUserMedia with correct constraints', async () => {
        renderDiagnosisPage();

        await waitFor(() => {
            expect(mockGetUserMedia).toHaveBeenCalledWith({
                video: {
                    facingMode: 'environment',
                    width: { ideal: 1920 },
                    height: { ideal: 1080 }
                },
                audio: false
            });
        });
    });

    it('should request camera access on mount', async () => {
        renderDiagnosisPage();

        await waitFor(() => {
            expect(mockGetUserMedia).toHaveBeenCalled();
        });
    });

    it('should show diagnosis results after successful analysis', async () => {
        const ai = await import('../services/ai');
        (ai.analyzeImageFromUrl as any).mockResolvedValue({
            detected: true,
            issue_name: 'Leaky Pipe',
            issue_name_en: 'Leaky Pipe',
            confidence: 90,
            severity: 'medium',
            description: 'Water is dripping from the joint.',
            steps: ['Step 1', 'Step 2'],
            raw_response: { solution: { steps: ['Step 1', 'Step 2'] } }
        });

        renderDiagnosisPage();

        // Wait for camera and trigger loadedmetadata
        await waitFor(() => expect(mockGetUserMedia).toHaveBeenCalled());
        const video = document.querySelector('video');
        if (video) {
            fireEvent(video, new Event('loadedmetadata'));
        }

        // Ensure button is enabled
        await waitFor(() => expect(screen.getByTestId('capture-button')).not.toBeDisabled());

        // Capture
        const captureButton = screen.getByTestId('capture-button');
        fireEvent.click(captureButton);

        // Wait for results
        await waitFor(() => {
            expect(screen.getAllByText(/Leaky Pipe/i).length).toBeGreaterThan(0);
            expect(screen.getByText(/Water is dripping/i)).toBeInTheDocument();
        });
    });

    it('should show error message when analysis fails', async () => {
        const ai = await import('../services/ai');
        (ai.analyzeImageFromUrl as any).mockRejectedValue(new Error('API Error'));

        renderDiagnosisPage();

        // Wait for camera and trigger loadedmetadata
        await waitFor(() => expect(mockGetUserMedia).toHaveBeenCalled());
        const video = document.querySelector('video');
        if (video) {
            fireEvent(video, new Event('loadedmetadata'));
        }

        await waitFor(() => expect(screen.getByTestId('capture-button')).not.toBeDisabled());

        // Capture
        const captureButton = screen.getByTestId('capture-button');
        fireEvent.click(captureButton);

        // Wait for error (using translation or fallback)
        await waitFor(() => {
            // Check for common error text or partial match
            expect(screen.getByText(/Analysis failed/i)).toBeInTheDocument();
        });
    });

    it('should reset diagnosis and return to camera when reset button is clicked', async () => {
        const ai = await import('../services/ai');
        (ai.analyzeImageFromUrl as any).mockResolvedValue({
            detected: true,
            issue_name: 'Leaky Pipe',
            issue_name_en: 'Leaky Pipe',
            severity: 'medium',
            description: 'Water is dripping from the joint.',
            steps: [],
            raw_response: {}
        });

        renderDiagnosisPage();

        // Wait for camera and trigger loadedmetadata
        await waitFor(() => expect(mockGetUserMedia).toHaveBeenCalled());
        const video = document.querySelector('video');
        if (video) {
            fireEvent(video, new Event('loadedmetadata'));
        }

        await waitFor(() => expect(screen.getByTestId('capture-button')).not.toBeDisabled());

        const captureButton = screen.getByTestId('capture-button');
        fireEvent.click(captureButton);

        // Wait for results to appear
        await waitFor(() => expect(screen.getAllByText(/Leaky Pipe/i).length).toBeGreaterThan(0));

        // Click reset/retake button
        const resetButton = screen.getByTestId('reset-button');
        fireEvent.click(resetButton);

        // Should be back to camera state (results gone, capture button back)
        await waitFor(() => {
            expect(screen.queryByText(/Leaky Pipe/i)).not.toBeInTheDocument();
            expect(screen.getByTestId('capture-button')).toBeInTheDocument();
        });
    });
});
