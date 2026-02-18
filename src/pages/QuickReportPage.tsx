import { useState } from 'react';
import BottomNav from '../components/BottomNav';

import VoiceRecordButton from '../components/VoiceRecordButton';
import VideoRecordButton from '../components/VideoRecordButton';
import { hapticSuccess, hapticError } from '../utils/haptics';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

import type { RecordingData } from '../types';

interface RecordingState {
    voice: RecordingData | null;
    video: RecordingData | null;
}

/**
 * QuickReportPage - 极速报修页面
 * 
 * 符合 UI/UX 标准的报修流程页面：
 * - 核心按钮位于底部 33% 区域
 * - 录音/录像带呼吸灯动画
 * - 完整的触觉反馈
 * - 集成后端 API
 */
export default function QuickReportPage() {
    const navigate = useNavigate();
    useAuth(); // ensure auth context is available
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState('');
    const [urgency, setUrgency] = useState('normal');
    const [recordings, setRecordings] = useState<RecordingState>({ voice: null, video: null });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // 问题分类
    const categories = [
        { id: 'plumbing', name: '水管/管道', icon: 'water_drop' },
        { id: 'electrical', name: '电路/照明', icon: 'bolt' },
        { id: 'hvac', name: '空调/暖通', icon: 'ac_unit' },
        { id: 'appliance', name: '家电维修', icon: 'kitchen' },
        { id: 'structural', name: '墙体/结构', icon: 'foundation' },
        { id: 'other', name: '其他问题', icon: 'handyman' },
    ];

    // 紧急程度
    const urgencyLevels = [
        { id: 'low', name: '不急', color: 'text-green-500 bg-green-50' },
        { id: 'normal', name: '一般', color: 'text-blue-500 bg-blue-50' },
        { id: 'high', name: '紧急', color: 'text-orange-500 bg-orange-50' },
        { id: 'critical', name: '非常紧急', color: 'text-red-500 bg-red-50' },
    ];

    const handleVoiceComplete = (data: RecordingData) => {
        setRecordings(prev => ({ ...prev, voice: data }));
    };

    const handleVideoComplete = (data: RecordingData) => {
        setRecordings(prev => ({ ...prev, video: data }));
    };

    const handleSubmit = async () => {
        if (!description.trim()) {
            setError('请填写问题描述');
            return;
        }

        setIsSubmitting(true);
        setError(null);

        try {
            // Note: voice/video URLs are placeholders until MediaRecorder is integrated
            const voiceUrl: string | undefined = undefined;
            const videoUrl: string | undefined = undefined;

            // Create report
            const reportData = {
                title: description.substring(0, 50),
                description: description,
                category: category || 'other',
                voice_url: voiceUrl ?? undefined,
                video_url: videoUrl ?? undefined,
            };

            const result = await api.createReport(reportData);

            hapticSuccess();

            // Store report ID for matching
            sessionStorage.setItem('lastReportId', String(result.report.id));

            // Navigate to match page
            navigate('/match');
        } catch (err) {
            hapticError();
            setError(err instanceof Error ? err.message : '提交失败，请重试');
        } finally {
            setIsSubmitting(false);
        }
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

            {/* 内容区域 */}
            <div className="flex-1 px-4 space-y-6 overflow-y-auto">
                {/* 问题分类 */}
                <div>
                    <label className="block text-sm font-semibold text-text-main-light dark:text-text-main-dark mb-3">
                        问题类型
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                        {categories.map((cat) => (
                            <button
                                key={cat.id}
                                onClick={() => setCategory(cat.id)}
                                className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all ${category === cat.id
                                    ? 'border-primary bg-primary/10 text-primary'
                                    : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400'
                                    }`}
                            >
                                <span className="material-symbols-outlined text-xl">{cat.icon}</span>
                                <span className="text-xs font-medium">{cat.name}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* 紧急程度 */}
                <div>
                    <label className="block text-sm font-semibold text-text-main-light dark:text-text-main-dark mb-3">
                        紧急程度
                    </label>
                    <div className="flex gap-2">
                        {urgencyLevels.map((level) => (
                            <button
                                key={level.id}
                                onClick={() => setUrgency(level.id)}
                                className={`flex-1 py-2 px-3 rounded-xl text-sm font-medium transition-all ${urgency === level.id
                                    ? `${level.color} ring-2 ring-current`
                                    : 'bg-gray-100 dark:bg-gray-800 text-gray-500'
                                    }`}
                            >
                                {level.name}
                            </button>
                        ))}
                    </div>
                </div>

                {/* 问题描述 */}
                <div>
                    <label className="block text-sm font-semibold text-text-main-light dark:text-text-main-dark mb-2">
                        问题描述 <span className="text-red-500">*</span>
                    </label>
                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="请详细描述您遇到的问题..."
                        className="w-full h-32 p-4 rounded-2xl border border-gray-200 dark:border-gray-700 
                       bg-white dark:bg-surface-dark text-text-main-light dark:text-text-main-dark
                       placeholder:text-text-sub-light dark:placeholder:text-text-sub-dark
                       focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                    />
                    <p className="text-xs text-gray-400 mt-1 text-right">{description.length}/500</p>
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
                                <button
                                    onClick={() => setRecordings(prev => ({ ...prev, voice: null }))}
                                    className="ml-1 text-gray-400 hover:text-red-500"
                                >
                                    <span className="material-symbols-outlined text-sm">close</span>
                                </button>
                            </div>
                        )}
                        {recordings.video && (
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-action-primary/10 rounded-full">
                                <span className="material-symbols-outlined text-sm text-action-primary">videocam</span>
                                <span className="text-sm text-action-primary">{recordings.video.duration}s</span>
                                <button
                                    onClick={() => setRecordings(prev => ({ ...prev, video: null }))}
                                    className="ml-1 text-gray-400 hover:text-red-500"
                                >
                                    <span className="material-symbols-outlined text-sm">close</span>
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* 错误提示 */}
                {error && (
                    <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800">
                        <span className="material-symbols-outlined text-red-500">error</span>
                        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                    </div>
                )}
            </div>

            {/* 底部按钮区域 */}
            <div className="p-4 pb-24">
                <button
                    onClick={handleSubmit}
                    disabled={!description.trim() || isSubmitting}
                    className={`w-full h-14 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all
            ${!description.trim() || isSubmitting
                            ? 'bg-gray-300 dark:bg-gray-700 text-gray-500 cursor-not-allowed'
                            : 'bg-primary hover:bg-primary-dark text-white shadow-lg shadow-primary/30 active:scale-[0.98]'
                        }`}
                >
                    {isSubmitting ? (
                        <>
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            <span>提交中...</span>
                        </>
                    ) : (
                        <>
                            <span className="material-symbols-outlined">send</span>
                            <span>提交报修</span>
                        </>
                    )}
                </button>
            </div>

            <BottomNav />
        </div>
    );
}
