import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { analyzeImageFromUrl, analyzeImageFile } from '../services/ai';
import { useLanguage } from '../i18n/LanguageContext';


interface DiagnosisResult {
    raw_response: any;
    detected: boolean;
    issue_name: string;
    issue_name_en: string;
    confidence: number;
    severity: string;
    description: string;
    description_en: string;
    possible_causes: string[];
    recommended_actions: any[];
    diy_difficulty: string;
    estimated_cost: string;
    urgency: string;
    steps: any[];
    safety_warning: any;
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
    }, []);

    // Capture photo
    const capturePhoto = useCallback(() => {
        if (!videoRef.current || !canvasRef.current) return;

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
    }, []);

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
                // Store result in sessionStorage for the repair page
                sessionStorage.setItem('diagnosisResult', JSON.stringify(result));
                // Also store the captured image for display on repair page
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
            const capabilities = track.getCapabilities?.();
            if (capabilities?.torch) {
                const newFlashState = !flashEnabled;
                await track.applyConstraints({ advanced: [{ torch: newFlashState }] });
                setFlashEnabled(newFlashState);
            }
        }
    };

    // Navigate to repair guide
    const goToRepairGuide = () => {
        navigate('/repair/ai-diagnosis');
    };

    return (
        <div className="bg-background-light dark:bg-background-dark font-sans overflow-hidden h-screen w-full relative">
            {/* Camera/Image Preview */}
            <div className="absolute inset-0 w-full h-full z-0">
                {cameraError ? (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-gray-900 text-white p-8">
                        <span className="material-symbols-outlined text-6xl mb-4 text-red-400">videocam_off</span>
                        <p className="text-center mb-4">{cameraError}</p>
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="px-6 py-3 bg-primary rounded-xl font-bold"
                        >
                            {t('diagnosis.upload')}
                        </button>
                    </div>
                ) : capturedImage ? (
                    <div
                        className="w-full h-full bg-cover bg-center bg-no-repeat"
                        style={{ backgroundImage: `url("${capturedImage}")` }}
                    />
                ) : (
                    <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover"
                    />
                )}
                <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/60"></div>
            </div>

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

            {/* Detection Overlay - Show when analyzing or result */}
            {(isAnalyzing || analysisResult) && !analysisError && (
                <div className="absolute inset-0 z-10 pointer-events-none">
                    {isAnalyzing ? (
                        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                            <div className="flex flex-col items-center gap-4 bg-black/50 backdrop-blur-md rounded-2xl p-6">
                                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                                <p className="text-white font-bold">{t('diagnosis.analyzing.title')}</p>
                                <p className="text-white/70 text-sm">{t('diagnosis.analyzing.desc')}</p>
                            </div>
                        </div>
                    ) : analysisResult?.detected ? (
                        <div className="absolute top-[30%] left-[10%] w-[200px] border-2 border-primary rounded-lg animate-pulse flex flex-col items-start justify-end p-2 bg-primary/10">
                            <div className="bg-primary text-white text-xs font-bold px-2 py-1 rounded-md shadow-sm mb-2 ml-auto">
                                {analysisResult.confidence}% {t('diagnosis.result.match')}
                            </div>
                            <div className="flex items-center gap-1 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-md shadow-sm">
                                <span className="material-symbols-outlined text-primary text-[16px]">warning</span>
                                <span className="text-xs font-bold text-gray-900">
                                    {analysisResult.issue_name} / {analysisResult.issue_name_en}
                                </span>
                            </div>
                        </div>
                    ) : (
                        <div className="absolute top-1/3 left-1/2 transform -translate-x-1/2">
                            <div className="bg-green-500/90 backdrop-blur-sm text-white px-6 py-3 rounded-xl shadow-lg">
                                <div className="flex items-center gap-2">
                                    <span className="material-symbols-outlined">check_circle</span>
                                    <span className="font-bold">{t('diagnosis.result.noIssue')}</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Analysis Result Panel */}
            {analysisResult?.detected && !isAnalyzing && (
                <div className="absolute bottom-[180px] left-4 right-4 z-20">
                    <div className="bg-white/95 dark:bg-surface-dark/95 backdrop-blur-md rounded-2xl p-4 shadow-xl">
                        <div className="flex items-start gap-3">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${analysisResult.severity === 'critical' ? 'bg-red-100 text-red-500' :
                                analysisResult.severity === 'high' ? 'bg-orange-100 text-orange-500' :
                                    analysisResult.severity === 'medium' ? 'bg-yellow-100 text-yellow-500' :
                                        'bg-green-100 text-green-500'
                                }`}>
                                <span className="material-symbols-outlined text-2xl">
                                    {analysisResult.severity === 'critical' || analysisResult.severity === 'high'
                                        ? 'error' : 'warning'}
                                </span>
                            </div>
                            <div className="flex-1">
                                <h3 className="font-bold text-text-main-light dark:text-text-main-dark">
                                    {analysisResult.issue_name}
                                </h3>
                                <p className="text-xs text-text-sub-light dark:text-text-sub-dark">
                                    {analysisResult.issue_name_en}
                                </p>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                                    {analysisResult.description}
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-2 mt-3">
                            <button
                                onClick={resetCapture}
                                className="flex-1 h-10 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-medium rounded-xl flex items-center justify-center gap-1"
                            >
                                <span className="material-symbols-outlined text-lg">refresh</span>
                                <span>{t('diagnosis.result.retry')}</span>
                            </button>
                            <button
                                onClick={goToRepairGuide}
                                className="flex-1 h-10 bg-primary text-white font-bold rounded-xl flex items-center justify-center gap-1"
                            >
                                <span>{t('diagnosis.result.guide')}</span>
                                <span className="material-symbols-outlined text-lg">arrow_forward</span>
                            </button>
                        </div>
                        <button
                            onClick={() => navigate('/quick-report')}
                            className="w-full h-10 mt-2 bg-transparent border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 font-medium rounded-xl flex items-center justify-center gap-1"
                        >
                            <span className="material-symbols-outlined text-lg">description</span>
                            <span>{t('diagnosis.result.report', { defaultValue: 'Quick Report' })}</span>
                        </button>
                    </div>
                </div>
            )}

            {/* Error Panel */}
            {analysisError && (
                <div className="absolute bottom-[180px] left-4 right-4 z-20">
                    <div className="bg-red-50 dark:bg-red-900/50 border border-red-200 dark:border-red-800 rounded-2xl p-4">
                        <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                            <span className="material-symbols-outlined">error</span>
                            <span className="font-bold">{analysisError}</span>
                        </div>
                        <button
                            onClick={resetCapture}
                            className="w-full mt-3 h-10 bg-red-100 dark:bg-red-800 text-red-700 dark:text-red-200 font-medium rounded-xl"
                        >
                            {t('diagnosis.result.retry')}
                        </button>
                    </div>
                </div>
            )}

            {/* UI Controls */}
            <div className="relative z-20 flex flex-col h-full justify-between p-4 pb-8">
                <div className="flex flex-col gap-4 pt-8">
                    <div className="flex justify-between items-center px-2">
                        <Link to="/" className="flex items-center justify-center w-10 h-10 rounded-full bg-black/20 backdrop-blur-md text-white active:bg-primary transition-colors">
                            <span className="material-symbols-outlined">arrow_back</span>
                        </Link>
                        <button
                            onClick={toggleFlash}
                            className="flex items-center justify-center w-10 h-10 rounded-full bg-black/20 backdrop-blur-md text-white active:bg-primary transition-colors"
                        >
                            <span className="material-symbols-outlined">
                                {flashEnabled ? 'flash_on' : 'flash_off'}
                            </span>
                        </button>
                        <button className="flex items-center justify-center w-10 h-10 rounded-full bg-black/20 backdrop-blur-md text-white active:bg-primary transition-colors">
                            <span className="material-symbols-outlined">grid_4x4</span>
                        </button>
                    </div>
                    {!capturedImage && isCameraReady && (
                        <div className="flex justify-center">
                            <div className="flex items-center gap-2 bg-white/90 backdrop-blur-md px-4 py-2 rounded-full shadow-lg max-w-[95%]">
                                <span className="material-symbols-outlined text-primary text-[20px] shrink-0">lightbulb</span>
                                <p className="text-gray-900 text-sm font-medium truncate">
                                    {t('diagnosis.guide.point')}
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex-grow"></div>

                {/* Bottom Controls */}
                <div className="flex flex-col gap-6 items-center w-full">
                    {/* Mode Selector */}
                    <div className="bg-black/30 backdrop-blur-md rounded-full p-1 flex relative">
                        <button
                            onClick={() => { setMode('import'); fileInputRef.current?.click(); }}
                            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors whitespace-nowrap ${mode === 'import' ? 'bg-primary text-white shadow-md' : 'text-white/70 hover:text-white'
                                }`}
                        >
                            {t('diagnosis.mode.import')}
                        </button>
                        <button
                            onClick={() => setMode('photo')}
                            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors whitespace-nowrap ${mode === 'photo' ? 'bg-primary text-white shadow-md' : 'text-white/70 hover:text-white'
                                }`}
                        >
                            {t('diagnosis.mode.photo')}
                        </button>
                        <button
                            onClick={() => setMode('batch')}
                            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors whitespace-nowrap ${mode === 'batch' ? 'bg-primary text-white shadow-md' : 'text-white/70 hover:text-white'
                                }`}
                        >
                            {t('diagnosis.mode.batch')}
                        </button>
                    </div>

                    {/* Capture Controls */}
                    <div className="flex items-center justify-between w-full px-8 max-w-sm">
                        {/* Gallery Button */}
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="w-12 h-12 rounded-lg bg-gray-800 overflow-hidden border-2 border-white/20 active:scale-95 transition-transform flex items-center justify-center"
                        >
                            <span className="material-symbols-outlined text-white">photo_library</span>
                        </button>

                        {/* Capture Button */}
                        {!capturedImage ? (
                            <button
                                onClick={capturePhoto}
                                disabled={!isCameraReady || isAnalyzing}
                                className="group relative flex items-center justify-center w-20 h-20 rounded-full border-4 border-white active:scale-95 transition-all duration-150 disabled:opacity-50"
                            >
                                <div className="w-16 h-16 bg-primary rounded-full group-hover:scale-90 transition-transform duration-200"></div>
                            </button>
                        ) : (
                            <button
                                onClick={resetCapture}
                                className="group relative flex items-center justify-center w-20 h-20 rounded-full border-4 border-white active:scale-95 transition-all duration-150"
                            >
                                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center">
                                    <span className="material-symbols-outlined text-gray-800 text-3xl">refresh</span>
                                </div>
                            </button>
                        )}

                        {/* Settings Button */}
                        <button className="w-12 h-12 rounded-full bg-black/20 backdrop-blur-md text-white flex items-center justify-center hover:bg-black/40 transition-colors">
                            <span className="material-symbols-outlined">tune</span>
                        </button>
                    </div>
                    <div className="h-2"></div>
                </div>
            </div>
        </div>
    );
};

export default DiagnosisPage;
