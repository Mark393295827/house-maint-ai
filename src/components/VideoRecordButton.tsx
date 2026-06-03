import { useState, useRef, useEffect } from 'react';
import { hapticButtonPress, hapticSuccess, VIDEO_CONSTRAINTS } from '../utils/haptics';
import type { RecordingData } from '../types';

/**
 * VideoRecordButton - 视频录制按钮
 *
 * 带进度环和时长限制的视频录制组件。
 * - 最大时长: 15秒
 * - 分辨率: 720p
 * - 包含进度环动画
 */
interface VideoRecordButtonProps {
    onRecordStart?: () => void;
    onRecordComplete?: (data: RecordingData) => void;
    maxDuration?: number;
}

export default function VideoRecordButton({
    onRecordStart,
    onRecordComplete,
    maxDuration = VIDEO_CONSTRAINTS.maxDuration // 15秒
}: VideoRecordButtonProps) {
    const [isRecording, setIsRecording] = useState(false);
    const [duration, setDuration] = useState(0);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const durationRef = useRef(0);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const mediaChunksRef = useRef<Blob[]>([]);
    const streamRef = useRef<MediaStream | null>(null);

    // 计算进度环参数
    const circumference = 2 * Math.PI * 38; // r=38
    const progress = (duration / maxDuration) * circumference;

    // 清理定时器
    useEffect(() => {
        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
            streamRef.current?.getTracks().forEach(track => track.stop());
        };
    }, []);

    const completeRecording = (blob?: Blob, mimeType?: string) => {
        const recordedDuration = Math.max(1, durationRef.current);

        onRecordComplete?.({
            duration: recordedDuration,
            maxWidth: VIDEO_CONSTRAINTS.maxWidth,
            maxHeight: VIDEO_CONSTRAINTS.maxHeight,
            timestamp: new Date().toISOString(),
            blob,
            mimeType,
            filename: blob ? `video-${Date.now()}.webm` : undefined
        });
        setDuration(0);
        durationRef.current = 0;
    };

    const stopRecording = () => {
        hapticSuccess();
        setIsRecording(false);

        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }

        const recorder = mediaRecorderRef.current;
        if (recorder && recorder.state !== 'inactive') {
            recorder.onstop = () => {
                const mimeType = recorder.mimeType || 'video/webm';
                const blob = mediaChunksRef.current.length > 0
                    ? new Blob(mediaChunksRef.current, { type: mimeType })
                    : undefined;
                completeRecording(blob, mimeType);
                streamRef.current?.getTracks().forEach(track => track.stop());
                mediaRecorderRef.current = null;
                streamRef.current = null;
                mediaChunksRef.current = [];
            };
            recorder.stop();
            return;
        }

        completeRecording();
    };

    const startRecording = async () => {
        hapticButtonPress();
        setIsRecording(true);
        setDuration(0);
        durationRef.current = 0;
        onRecordStart?.();

        if (navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== 'undefined') {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        width: { ideal: VIDEO_CONSTRAINTS.maxWidth },
                        height: { ideal: VIDEO_CONSTRAINTS.maxHeight }
                    },
                    audio: true
                });
                streamRef.current = stream;
                mediaChunksRef.current = [];
                const mimeType = MediaRecorder.isTypeSupported?.('video/webm') ? 'video/webm' : '';
                const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
                recorder.ondataavailable = event => {
                    if (event.data.size > 0) mediaChunksRef.current.push(event.data);
                };
                recorder.start();
                mediaRecorderRef.current = recorder;
            } catch {
                mediaRecorderRef.current = null;
            }
        }

        timerRef.current = setInterval(() => {
            durationRef.current += 1;
            setDuration(durationRef.current);
            if (durationRef.current >= maxDuration) stopRecording();
        }, 1000);
    };

    return (
        <div className="flex flex-col items-center gap-4">
            {/* 视频录制按钮 */}
            <div className="relative w-20 h-20">
                <button
                    onClick={isRecording ? stopRecording : () => void startRecording()}
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
