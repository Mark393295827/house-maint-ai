import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { analyzeImageFromUrl, analyzeImageFile } from '../services/ai';
import { useLanguage } from '../i18n/LanguageContext';

// Sub-components
import CameraPreview from '../components/diagnosis/CameraPreview';
import DiagnosisOverlay from '../components/diagnosis/DiagnosisOverlay';
import AnalysisResultPanel from '../components/diagnosis/AnalysisResultPanel';
import CameraControls from '../components/diagnosis/CameraControls';
import AnalysisErrorPanel from '../components/diagnosis/AnalysisErrorPanel';

interface DiagnosisResult {
    raw_response: Record<string, unknown>;
    detected: boolean;
    issue_name: string;
    issue_name_en: string;
    confidence: number;
    severity: string;
    description: string;
    description_en: string;
    possible_causes: string[];
    recommended_actions: { action: string; detail?: string }[];
    diy_difficulty: string;
    estimated_cost: string;
    urgency: string;
    steps: { step: number; action: string; detail: string }[];
    safety_warning: string | null;
}

const DiagnosisPage = () => {
    const { t } = useLanguage();
    const navigate = useNavigate();
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Camera state
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [isCameraReady, setIsCameraReady] = useState(false);
    const [cameraError, setCameraError] = useState<string | null>(null);
    const [flashEnabled, setFlashEnabled] = useState(false);

    // Capture state
    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<DiagnosisResult | null>(null);
    const [analysisError, setAnalysisError] = useState<string | null>(null);

    // Mode: 'photo' | 'import' | 'batch'
    const [mode, setMode] = useState('photo');

    // Initialize camera
    useEffect(() => {
        const initCamera = async () => {
            try {
                const mediaStream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        facingMode: 'environment',
                        width: { ideal: 1920 },
                        height: { ideal: 1080 }
                    },
                    audio: false
                });
                setStream(mediaStream);
                if (videoRef.current) {
                    videoRef.current.srcObject = mediaStream;
                    videoRef.current.onloadedmetadata = () => {
                        setIsCameraReady(true);
                    };
                }
            } catch (error: any) {
                console.error('Error accessing camera:', error);
                setIsCameraReady(false);
                setCameraError(error.name === 'NotAllowedError'
                    ? t('diagnosis.camera.permission')
                    : t('diagnosis.camera.error'));
            }
        };

        initCamera();

        // Cleanup
        return () => {
            if (stream) {
                stream.getTracks().forEach((track: MediaStreamTrack) => track.stop());
                setStream(null);
            }
        };
    }, [t]);

    // Capture photo
    const capturePhoto = useCallback(() => {
        if (!videoRef.current || !canvasRef.current || isAnalyzing) return;

        const video = videoRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0);

        // Convert to blob URL
        canvas.toBlob((blob) => {
            if (!blob) return;
            const imageUrl = URL.createObjectURL(blob);
            setCapturedImage(imageUrl);
            analyzePhoto(imageUrl);
        }, 'image/jpeg', 0.9);
    }, [isAnalyzing]);

    // Analyze captured photo
    const analyzePhoto = async (imageUrl: string) => {
        setIsAnalyzing(true);
        setAnalysisError(null);
        setAnalysisResult(null);

        try {
            const result = await analyzeImageFromUrl(imageUrl);
            setAnalysisResult(result);

            // Navigate to repair guide if issue detected
            if (result.detected) {
                sessionStorage.setItem('diagnosisResult', JSON.stringify(result));
                sessionStorage.setItem('capturedImage', imageUrl);
            }
        } catch (error) {
            console.error('Analysis error:', error);
            setAnalysisError(t('diagnosis.error.analysis') || 'Analysis failed, please try again');
        } finally {
            setIsAnalyzing(false);
        }
    };

    // Handle file import
    const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const imageUrl = URL.createObjectURL(file);
        setCapturedImage(imageUrl);

        setIsAnalyzing(true);
        setAnalysisError(null);
        setAnalysisResult(null);

        try {
            const result = await analyzeImageFile(file);
            setAnalysisResult(result);

            if (result.detected) {
                sessionStorage.setItem('diagnosisResult', JSON.stringify(result));
                sessionStorage.setItem('capturedImage', imageUrl);
            }
        } catch (error) {
            console.error('Analysis error:', error);
            setAnalysisError(t('diagnosis.error.analysis') || 'Analysis failed, please try again');
        } finally {
            setIsAnalyzing(false);
        }
    };

    // Reset capture
    const resetCapture = () => {
        if (capturedImage) {
            URL.revokeObjectURL(capturedImage);
        }
        setCapturedImage(null);
        setAnalysisResult(null);
        setAnalysisError(null);
    };

    // Toggle flash
    const toggleFlash = async () => {
        if (stream) {
            const track = stream.getVideoTracks()[0];
            const capabilities = track.getCapabilities?.() as Record<string, unknown> | undefined;
            if (capabilities?.torch) {
                const newFlashState = !flashEnabled;
                await track.applyConstraints({ advanced: [{ torch: newFlashState } as MediaTrackConstraintSet] });
                setFlashEnabled(newFlashState);
            }
        }
    };

    return (
        <div className="bg-background-light dark:bg-background-dark font-sans overflow-hidden h-screen w-full relative">
            {/* Hidden canvas for capture */}
            <canvas ref={canvasRef} className="hidden" />

            {/* Hidden file input */}
            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileImport}
                className="hidden"
            />

            {/* Sub-components */}
            <CameraPreview
                videoRef={videoRef}
                cameraError={cameraError}
                isCameraReady={isCameraReady}
                capturedImage={capturedImage}
                onUploadClick={() => fileInputRef.current?.click()}
            />

            <DiagnosisOverlay
                isAnalyzing={isAnalyzing}
                analysisResult={analysisResult}
                analysisError={analysisError}
            />

            <AnalysisResultPanel
                analysisResult={analysisResult}
                isAnalyzing={isAnalyzing}
                onReset={resetCapture}
                onGoToRepair={() => navigate('/repair/ai-diagnosis')}
                onQuickReport={() => navigate('/quick-report')}
            />

            <AnalysisErrorPanel
                error={analysisError}
                onReset={resetCapture}
            />

            <CameraControls
                capturedImage={capturedImage}
                isCameraReady={isCameraReady}
                isAnalyzing={isAnalyzing}
                flashEnabled={flashEnabled}
                mode={mode}
                onToggleFlash={toggleFlash}
                onCapture={capturePhoto}
                onReset={resetCapture}
                onUploadClick={() => fileInputRef.current?.click()}
                onModeChange={setMode}
            />
        </div>
    );
};

export default DiagnosisPage;
