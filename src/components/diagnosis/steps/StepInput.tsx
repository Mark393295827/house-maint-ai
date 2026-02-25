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
                <>
                    <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                    {/* AR Overlay Placeholder */}
                    <div className="absolute top-4 left-4 bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/20 flex items-center gap-2 pointer-events-none">
                        <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                        <span className="text-white text-[10px] font-bold tracking-wider">
                            {locale === 'zh' ? 'AR 扫描准备就绪 (Beta)' : 'AR SCAN READY (BETA)'}
                        </span>
                    </div>
                    {/* Viewfinder crosshairs */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-30">
                        <div className="w-48 h-48 border-2 border-dashed border-white rounded-3xl" />
                    </div>
                </>
            )}
        </div>
        {!imageUrl && (
            <div className="px-6 py-4 flex items-center justify-around bg-white dark:bg-surface-dark">
                <button onClick={onUpload} className="flex flex-col items-center gap-1">
                    <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                        <span className="material-symbols-outlined text-gray-600 dark:text-gray-400">photo_library</span>
                    </div>
                    <span className="text-[10px] text-gray-500">{locale === 'zh' ? '相册' : 'Gallery'}</span>
                </button>

                <button className="flex flex-col items-center gap-1 opacity-50 relative group">
                    <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center border border-dashed border-gray-300 dark:border-gray-600">
                        <span className="material-symbols-outlined text-gray-600 dark:text-gray-400">videocam</span>
                    </div>
                    <span className="text-[10px] text-gray-500">{locale === 'zh' ? '视频(开发中)' : 'Video (WIP)'}</span>
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
