import React, { RefObject } from 'react';
import { useLanguage } from '../../i18n/LanguageContext';

interface CameraPreviewProps {
    videoRef: RefObject<HTMLVideoElement | null>;
    cameraError: string | null;
    isCameraReady: boolean;
    capturedImage: string | null;
    onUploadClick: () => void;
}

const CameraPreview: React.FC<CameraPreviewProps> = ({
    videoRef,
    cameraError,
    isCameraReady,
    capturedImage,
    onUploadClick
}) => {
    const { t } = useLanguage();

    return (
        <div className="absolute inset-0 w-full h-full z-0">
            {cameraError ? (
                <div className="w-full h-full flex flex-col items-center justify-center bg-gray-900 text-white p-8">
                    <span className="material-symbols-outlined text-6xl mb-4 text-red-400">videocam_off</span>
                    <p className="text-center mb-4">{cameraError}</p>
                    <button
                        onClick={onUploadClick}
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
            {isCameraReady && !capturedImage && !cameraError && (
                <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10">
                    {/* Placeholder for camera ready indicator if needed */}
                </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/60"></div>
        </div>
    );
};

export default CameraPreview;
