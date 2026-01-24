import { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import { hapticButtonPress, hapticSuccess, VIDEO_CONSTRAINTS } from '../utils/haptics';

/**
 * VideoRecordButton - 视频录制按钮
 * 
 * 带进度环和时长限制的视频录制组件。
 * - 最大时长: 15秒
 * - 分辨率: 720p
 * - 包含进度环动画
 */
export default function VideoRecordButton({
    onRecordStart,
    onRecordComplete,
    maxDuration = VIDEO_CONSTRAINTS.maxDuration // 15秒
}) {
    const [isRecording, setIsRecording] = useState(false);
    const [duration, setDuration] = useState(0);
    const timerRef = useRef(null);

    // 计算进度环参数
    const circumference = 2 * Math.PI * 38; // r=38
    const progress = (duration / maxDuration) * circumference;

    // 清理定时器
    useEffect(() => {
        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
        };
    }, []);

    const startRecording = () => {
        hapticButtonPress();
        setIsRecording(true);
        setDuration(0);
        onRecordStart?.();

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

    const stopRecording = () => {
        hapticSuccess();
        setIsRecording(false);

        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }

        onRecordComplete?.({
            duration: duration + 1,
            maxWidth: VIDEO_CONSTRAINTS.maxWidth,
            maxHeight: VIDEO_CONSTRAINTS.maxHeight,
            timestamp: new Date().toISOString()
        });
        setDuration(0);
    };

    return (
        <div className="flex flex-col items-center gap-4">
            {/* 视频录制按钮 */}
            <div className="relative w-20 h-20">
                <button
                    onClick={isRecording ? stopRecording : startRecording}
                    className={`
            w-full h-full rounded-full
            flex items-center justify-center
            text-white
            transition-all duration-200
            ${isRecording
                            ? 'bg-danger recording-pulse'
                            : 'bg-action-primary hover:bg-action-primary-dark hover:scale-105'
                        }
          `}
                    data-testid="video-record-button"
                    aria-label={isRecording ? '停止录制' : '开始录制'}
                >
                    <span className="material-symbols-outlined text-3xl">
                        {isRecording ? 'stop' : 'videocam'}
                    </span>
                </button>

                {/* 进度环 */}
                {isRecording && (
                    <svg
                        className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none"
                        viewBox="0 0 80 80"
                    >
                        {/* 背景环 */}
                        <circle
                            cx="40"
                            cy="40"
                            r="38"
                            fill="none"
                            stroke="rgba(255,255,255,0.3)"
                            strokeWidth="4"
                        />
                        {/* 进度环 */}
                        <circle
                            cx="40"
                            cy="40"
                            r="38"
                            fill="none"
                            stroke="white"
                            strokeWidth="4"
                            strokeLinecap="round"
                            strokeDasharray={circumference}
                            strokeDashoffset={circumference - progress}
                            className="transition-all duration-1000"
                        />
                    </svg>
                )}
            </div>

            {/* 时长显示 */}
            {isRecording && (
                <span
                    className="text-danger font-mono text-lg font-bold"
                    data-testid="video-duration"
                >
                    {duration}s / {maxDuration}s
                </span>
            )}

            {/* 提示文字 */}
            <span className="text-sm text-text-sub-light dark:text-text-sub-dark">
                {isRecording ? '点击停止录制' : `最长 ${maxDuration} 秒`}
            </span>
        </div>
    );
}

VideoRecordButton.propTypes = {
    /** Callback when recording starts */
    onRecordStart: PropTypes.func,
    /** Callback when recording completes with metadata */
    onRecordComplete: PropTypes.func,
    /** Maximum recording duration in seconds */
    maxDuration: PropTypes.number,
};

