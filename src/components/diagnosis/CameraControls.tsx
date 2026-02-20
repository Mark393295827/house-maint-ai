import React from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../../i18n/LanguageContext';

interface CameraControlsProps {
    capturedImage: string | null;
    isCameraReady: boolean;
    isAnalyzing: boolean;
    flashEnabled: boolean;
    mode: string;
    onToggleFlash: () => void;
    onCapture: () => void;
    onReset: () => void;
    onUploadClick: () => void;
    onModeChange: (mode: string) => void;
}

const CameraControls: React.FC<CameraControlsProps> = ({
    capturedImage,
    isCameraReady,
    isAnalyzing,
    flashEnabled,
    mode,
    onToggleFlash,
    onCapture,
    onReset,
    onUploadClick,
    onModeChange
}) => {
    const { t } = useLanguage();

    return (
        <div className="relative z-20 flex flex-col h-full justify-between p-4 pb-8">
            <div className="flex flex-col gap-4 pt-8">
                <div className="flex justify-between items-center px-2">
                    <Link to="/" className="flex items-center justify-center w-10 h-10 rounded-full bg-black/20 backdrop-blur-md text-white active:bg-primary transition-colors">
                        <span className="material-symbols-outlined">arrow_back</span>
                    </Link>
                    <button
                        onClick={onToggleFlash}
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
                        onClick={() => { onModeChange('import'); onUploadClick(); }}
                        className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors whitespace-nowrap ${mode === 'import' ? 'bg-primary text-white shadow-md' : 'text-white/70 hover:text-white'
                            }`}
                    >
                        {t('diagnosis.mode.import')}
                    </button>
                    <button
                        onClick={() => onModeChange('photo')}
                        className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors whitespace-nowrap ${mode === 'photo' ? 'bg-primary text-white shadow-md' : 'text-white/70 hover:text-white'
                            }`}
                    >
                        {t('diagnosis.mode.photo')}
                    </button>
                    <button
                        onClick={() => onModeChange('batch')}
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
                        onClick={onUploadClick}
                        className="w-12 h-12 rounded-lg bg-gray-800 overflow-hidden border-2 border-white/20 active:scale-95 transition-transform flex items-center justify-center"
                    >
                        <span className="material-symbols-outlined text-white">photo_library</span>
                    </button>

                    {/* Capture Button */}
                    {!capturedImage ? (
                        <button
                            onClick={onCapture}
                            disabled={!isCameraReady || isAnalyzing}
                            data-testid="capture-button"
                            className="group relative flex items-center justify-center w-20 h-20 rounded-full border-4 border-white active:scale-95 transition-all duration-150 disabled:opacity-50"
                        >
                            <div className="w-16 h-16 bg-primary rounded-full group-hover:scale-90 transition-transform duration-200"></div>
                        </button>
                    ) : (
                        <button
                            onClick={onReset}
                            data-testid="reset-button"
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
    );
};

export default CameraControls;
