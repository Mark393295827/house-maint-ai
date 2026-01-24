import { useState } from 'react';
import BottomNav from '../components/BottomNav';
import QuickReportButton from '../components/QuickReportButton';
import VoiceRecordButton from '../components/VoiceRecordButton';
import VideoRecordButton from '../components/VideoRecordButton';
import { hapticSuccess } from '../utils/haptics';
import { useNavigate } from 'react-router-dom';

/**
 * QuickReportPage - 极速报修页面
 * 
 * 符合 UI/UX 标准的报修流程页面：
 * - 核心按钮位于底部 33% 区域
 * - 录音/录像带呼吸灯动画
 * - 完整的触觉反馈
 */
export default function QuickReportPage() {
    const navigate = useNavigate();
    const [description, setDescription] = useState('');
    const [recordings, setRecordings] = useState({ voice: null, video: null });

    const handleVoiceComplete = (data) => {
        setRecordings(prev => ({ ...prev, voice: data }));
    };

    const handleVideoComplete = (data) => {
        setRecordings(prev => ({ ...prev, video: data }));
    };

    const handleSubmit = async () => {
        hapticSuccess();

        // 创建 Multipart 请求
        const formData = new FormData();
        formData.append('description', description);

        if (recordings.voice) {
            formData.append('voice_duration', recordings.voice.duration);
        }
        if (recordings.video) {
            formData.append('video_duration', recordings.video.duration);
        }

        // TODO: Send to backend API
        // Future: await api.submitReport({ description, recordings });

        // Navigate to match page
        navigate('/match');
    };



    return (
        <div className="relative flex min-h-screen w-full flex-col max-w-md mx-auto bg-background-light dark:bg-background-dark pb-[90px]">
            {/* Header */}
            <div className="flex items-center justify-between p-4 pt-6">
                <h1 className="text-2xl font-bold text-text-main-light dark:text-text-main-dark">
                    极速报修
                </h1>
                <span className="text-sm text-text-sub-light dark:text-text-sub-dark">
                    Quick Report
                </span>
            </div>

            {/* 内容区域 - 顶部 67% */}
            <div className="flex-1 px-4 space-y-6">
                {/* 问题描述 */}
                <div>
                    <label className="block text-sm font-semibold text-text-main-light dark:text-text-main-dark mb-2">
                        问题描述
                    </label>
                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="请描述您遇到的问题..."
                        className="w-full h-32 p-4 rounded-2xl border border-gray-200 dark:border-gray-700 
                       bg-white dark:bg-surface-dark text-text-main-light dark:text-text-main-dark
                       placeholder:text-text-sub-light dark:placeholder:text-text-sub-dark
                       focus:outline-none focus:ring-2 focus:ring-action-primary"
                    />
                </div>

                {/* 媒体录制 */}
                <div>
                    <label className="block text-sm font-semibold text-text-main-light dark:text-text-main-dark mb-4">
                        语音/视频补充（可选）
                    </label>
                    <div className="flex justify-center gap-12">
                        <VoiceRecordButton onRecordComplete={handleVoiceComplete} />
                        <VideoRecordButton onRecordComplete={handleVideoComplete} />
                    </div>
                </div>

                {/* 已录制提示 */}
                {(recordings.voice || recordings.video) && (
                    <div className="flex gap-4 justify-center">
                        {recordings.voice && (
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-success/10 rounded-full">
                                <span className="material-symbols-outlined text-sm text-success">mic</span>
                                <span className="text-sm text-success">{recordings.voice.duration}s</span>
                            </div>
                        )}
                        {recordings.video && (
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-action-primary/10 rounded-full">
                                <span className="material-symbols-outlined text-sm text-action-primary">videocam</span>
                                <span className="text-sm text-action-primary">{recordings.video.duration}s</span>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* 底部按钮区域 - 底部 33% */}
            <div className="p-4 pb-24">
                <button
                    onClick={handleSubmit}
                    disabled={!description.trim()}
                    className={`
            btn-action-primary w-full
            ${!description.trim() ? 'opacity-50 cursor-not-allowed' : ''}
          `}
                >
                    提交报修
                </button>
            </div>

            <BottomNav />
        </div>
    );
}
