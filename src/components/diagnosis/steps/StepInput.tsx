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
        {/* Sanya IoT Premium Banner (Phase 6 Roadmap) */}
        <div className="bg-blue-50 dark:bg-blue-900/30 px-4 py-2 flex items-center justify-between text-xs text-blue-800 dark:text-blue-300">
            <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-sm">sensors</span>
                <span>{locale === 'zh' ? '三亚 IoT 尊享版: 绑定网关自动报警' : 'Sanya IoT Premium: Link sensors for auto-triage'}</span>
            </div>
            <button className="underline font-bold">{locale === 'zh' ? '升级' : 'Upgrade'}</button>
        </div>

        <div className="flex-1 relative bg-[#1a1c29]">
            {imageUrl ? (
                <img src={imageUrl} alt="Captured" className="w-full h-full object-contain" />
            ) : cameraError ? (
                <div className="flex flex-col items-center justify-center h-full gap-4 px-8">
                    <span className="material-symbols-outlined text-5xl text-gray-400">no_photography</span>
                    <p className="text-gray-400 text-center">{cameraError}</p>
                    <button onClick={onUpload} className="px-6 py-3 bg-violet-600 text-white rounded-2xl font-bold">
                        {locale === 'zh' ? '上传照片' : 'Upload Photo'}
                    </button>
                </div>
            ) : (
                <>
                    <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                </>
            )}

            {/* Central Action Button (Overlay on camera feed) */}
            {!imageUrl && (
                <div className="absolute bottom-16 left-0 right-0 flex justify-center z-10">
                    <div className="relative">
                        {/* Outer white ring */}
                        <div className="absolute inset-0 border-4 border-white/80 rounded-full scale-125 pointer-events-none" />
                        {/* Inner purple button */}
                        <button
                            onClick={cameraReady ? onCapture : onUpload}
                            style={{ backgroundColor: '#8b5cf6' }} // violet-500
                            className="w-20 h-20 rounded-full bg-violet-500 flex items-center justify-center shadow-[0_0_30px_rgba(139,92,246,0.5)] active:scale-95 transition-all outline-none"
                        >
                            <div className="w-4 h-4 bg-white/20 rounded-sm" /> {/* Small center icon matching mockup */}
                        </button>
                    </div>
                </div>
            )}
        </div>
    </div>
);

export default StepInput;
