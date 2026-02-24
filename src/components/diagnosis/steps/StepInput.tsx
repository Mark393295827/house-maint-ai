import React from 'react';

interface StepInputProps {
    videoRef: React.RefObject<HTMLVideoElement | null>;
    cameraReady: boolean;
    cameraError: string | null;
    imageUrl: string | null;
    onCapture: () => void;
    onUpload: () => void;
    locale: string;
}

const StepInput: React.FC<StepInputProps> = ({
    videoRef,
    cameraReady,
    cameraError,
    imageUrl,
    onCapture,
    onUpload,
    locale
}) => (
    <div className="flex flex-col h-full">
        <div className="flex-1 relative bg-black">
            {imageUrl ? (
                <img src={imageUrl} alt="Captured" className="w-full h-full object-contain" />
            ) : cameraError ? (
                <div className="flex flex-col items-center justify-center h-full gap-4 px-8">
                    <span className="material-symbols-outlined text-5xl text-gray-400">no_photography</span>
                    <p className="text-gray-400 text-center">{cameraError}</p>
                    <button onClick={onUpload} className="px-6 py-3 bg-primary text-white rounded-2xl font-bold">
                        {locale === 'zh' ? '上传照片' : 'Upload Photo'}
                    </button>
                </div>
            ) : (
                <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
            )}
        </div>
        {!imageUrl && (
            <div className="px-6 py-4 flex items-center justify-center gap-6 bg-white dark:bg-surface-dark">
                <button onClick={onUpload} className="flex flex-col items-center gap-1">
                    <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                        <span className="material-symbols-outlined text-gray-600 dark:text-gray-400">photo_library</span>
                    </div>
                    <span className="text-[10px] text-gray-500">{locale === 'zh' ? '相册' : 'Gallery'}</span>
                </button>
                <button onClick={onCapture} disabled={!cameraReady} className="w-20 h-20 rounded-full border-4 border-primary bg-white dark:bg-gray-800 flex items-center justify-center shadow-xl active:scale-90 transition-transform disabled:opacity-40">
                    <div className="w-16 h-16 rounded-full bg-primary" />
                </button>
                <button className="flex flex-col items-center gap-1 opacity-50">
                    <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                        <span className="material-symbols-outlined text-gray-600 dark:text-gray-400">mic</span>
                    </div>
                    <span className="text-[10px] text-gray-500">{locale === 'zh' ? '语音' : 'Voice'}</span>
                </button>
            </div>
        )}
    </div>
);

export default StepInput;
