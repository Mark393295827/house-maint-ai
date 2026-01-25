import { useState, useRef, useEffect } from 'react';
import { hapticButtonPress, hapticWarning } from '../utils/haptics';
import type { RecordingData } from '../types';

/**
 * VoiceRecordButton - 语音录制按钮
 *
 * 带呼吸灯动画的录音按钮，符合 UI/UX 标准。
 * - 录音状态: scale(1.1x) 动画 + 呼吸灯效果
 * - 震动反馈: 开始/停止时触发
 */
interface VoiceRecordButtonProps {
    onRecordStart?: () => void;
    onRecordComplete?: (data: RecordingData) => void;
    maxDuration?: number;
}

export default function VoiceRecordButton({
    onRecordStart,
    onRecordComplete,
    maxDuration = 60
}: VoiceRecordButtonProps) {
    const [isRecording, setIsRecording] = useState(false);
    const [duration, setDuration] = useState(0);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // 清理定时器
    useEffect(() => {
        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
        };
    }, []);

    const stopRecording = () => {
        hapticWarning();
        setIsRecording(false);

        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }

        onRecordComplete?.({
            duration: duration + 1,
            timestamp: new Date().toISOString()
        });
        setDuration(0);
    };

    const startRecording = () => {
        hapticButtonPress();
        setIsRecording(true);
        setDuration(0);
        onRecordStart?.();

        // 开始计时
        timerRef.current = setInterval(() => {
            setDuration(d => {
                if (d >= maxDuration - 1) {
                    stopRecording();
                    return maxDuration;
                }
                return d + 1;
            });
        }, 1000);
    };

    const formatTime = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${String(secs).padStart(2, '0')}`;
    };

    return (
        <div className="flex flex-col items-center gap-4">
            {/* 录音按钮 */}
            <button
                onClick={isRecording ? stopRecording : startRecording}
                className={`
          w-20 h-20 rounded-full
          flex items-center justify-center
          text-white
          transition-all duration-200
          ${isRecording
                        ? 'bg-danger recording-pulse'
                        : 'bg-action-warning hover:bg-action-warning-dark hover:scale-105'
                    }
        `}
                data-testid="voice-record-button"
                aria-label={isRecording ? '停止录音' : '开始录音'}
            >
                <span className="material-symbols-outlined text-3xl">
                    {isRecording ? 'stop' : 'mic'}
                </span>
            </button>

            {/* 时长显示 */}
            {isRecording && (
                <div className="flex flex-col items-center gap-1">
                    <span
                        className="text-danger font-mono text-xl font-bold"
                        data-testid="recording-duration"
                    >
                        {formatTime(duration)}
                    </span>
                    <span className="text-xs text-text-sub-light dark:text-text-sub-dark">
                        / {formatTime(maxDuration)}
                    </span>
                </div>
            )}

            {/* 提示文字 */}
            <span className="text-sm text-text-sub-light dark:text-text-sub-dark">
                {isRecording ? '点击停止录音' : '点击开始录音'}
            </span>
        </div>
    );
}
