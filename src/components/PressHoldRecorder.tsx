import { useState, useRef, useEffect, useCallback } from 'react';
import { hapticButtonPress, hapticWarning } from '../utils/haptics';
import type { RecordingData } from '../types';

interface PressHoldRecorderProps {
    onRecordStart?: () => void;
    onRecordComplete?: (data: RecordingData) => void;
    maxDuration?: number;
}

/**
 * PressHoldRecorder - 长按录音组件
 *
 * 使用 onMouseDown/onMouseUp 和 onTouchStart/onTouchEnd
 * 实现"长按录制"交互，模拟 React Native 的 onPressIn/onPressOut。
 */
export default function PressHoldRecorder({
    onRecordStart,
    onRecordComplete,
    maxDuration = 60
}: PressHoldRecorderProps) {
    const [isRecording, setIsRecording] = useState(false);
    const [duration, setDuration] = useState(0);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const startTimeRef = useRef<number | null>(null);

    // 清理定时器
    useEffect(() => {
        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
        };
    }, []);

    const stopRecording = useCallback(() => {
        if (!isRecording && !timerRef.current) return;

        hapticWarning();
        setIsRecording(false);

        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }

        const startTime = startTimeRef.current ?? Date.now();
        const finalDuration = Math.ceil((Date.now() - startTime) / 1000);

        onRecordComplete?.({
            duration: Math.min(finalDuration, maxDuration),
            timestamp: new Date().toISOString()
        });
        setDuration(0);
    }, [isRecording, maxDuration, onRecordComplete]);

    const startRecording = useCallback(() => {
        hapticButtonPress();
        setIsRecording(true);
        setDuration(0);
        startTimeRef.current = Date.now();
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
    }, [maxDuration, onRecordStart, stopRecording]);

    // 处理鼠标/触摸离开按钮区域
    const handlePointerLeave = useCallback(() => {
        if (isRecording) {
            stopRecording();
        }
    }, [isRecording, stopRecording]);

    const formatTime = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${String(secs).padStart(2, '0')}`;
    };

    return (
        <div className="flex flex-col items-center gap-4">
            {/* 长按录音按钮 */}
            <button
                onMouseDown={startRecording}
                onMouseUp={stopRecording}
                onMouseLeave={handlePointerLeave}
                onTouchStart={startRecording}
                onTouchEnd={stopRecording}
                className={`
          w-24 h-24 rounded-full
          flex items-center justify-center
          text-white select-none
          transition-all duration-200
          ${isRecording
                        ? 'bg-danger recording-pulse scale-110'
                        : 'bg-action-warning hover:bg-action-warning-dark active:scale-95'
                    }
        `}
                data-testid="press-hold-recorder"
                aria-label={isRecording ? '松开停止录音' : '长按开始录音'}
            >
                <span className="material-symbols-outlined text-4xl">
                    {isRecording ? 'stop' : 'mic'}
                </span>
            </button>

            {/* 时长显示 */}
            {isRecording && (
                <div className="flex flex-col items-center gap-1">
                    <span
                        className="text-danger font-mono text-2xl font-bold"
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
                {isRecording ? '松开停止录音' : '长按开始录音'}
            </span>
        </div>
    );
}
