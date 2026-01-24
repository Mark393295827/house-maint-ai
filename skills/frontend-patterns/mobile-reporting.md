---
name: Mobile Reporting Patterns
description: 移动端报修 UI 模式和组件实现指南
---

# Mobile Reporting Patterns

移动端"极速报修"功能的 UI 模式和组件实现指南。

## 核心组件

### 1. QuickReportButton - 快速报修入口

位于屏幕底部的主要报修入口按钮。

```jsx
// 位置: 底部 33% 区域
// 尺寸: 48dp 高度, 20px 圆角
// 颜色: action-primary (#007AFF)
// 反馈: Haptic Light Impact

import { hapticButtonPress } from '../../utils/haptics';

export function QuickReportButton({ onPress, label = "极速报修" }) {
  const handlePress = () => {
    hapticButtonPress();
    onPress?.();
  };

  return (
    <button
      onClick={handlePress}
      className="btn-action-primary fixed bottom-8 left-1/2 -translate-x-1/2 
                 flex items-center gap-2 shadow-lg"
    >
      <span className="material-symbols-outlined">report_problem</span>
      {label}
    </button>
  );
}
```

### 2. VoiceRecordButton - 语音录制按钮

带呼吸灯动画的录音按钮。

```jsx
import { useState, useRef } from 'react';
import { hapticButtonPress, hapticWarning } from '../../utils/haptics';

export function VoiceRecordButton({ onRecordComplete, maxDuration = 60 }) {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const timerRef = useRef(null);

  const startRecording = async () => {
    hapticButtonPress();
    setIsRecording(true);
    
    // Start timer
    timerRef.current = setInterval(() => {
      setDuration(d => {
        if (d >= maxDuration) {
          stopRecording();
          return d;
        }
        return d + 1;
      });
    }, 1000);
    
    // TODO: Start actual audio recording
  };

  const stopRecording = async () => {
    hapticWarning();
    setIsRecording(false);
    clearInterval(timerRef.current);
    
    // TODO: Stop recording and get audio blob
    onRecordComplete?.({ duration });
    setDuration(0);
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <button
        onClick={isRecording ? stopRecording : startRecording}
        className={`
          w-20 h-20 rounded-full flex items-center justify-center
          ${isRecording 
            ? 'bg-danger recording-pulse' 
            : 'bg-action-warning hover:bg-action-warning-dark'
          }
          text-white transition-colors
        `}
      >
        <span className="material-symbols-outlined text-3xl">
          {isRecording ? 'stop' : 'mic'}
        </span>
      </button>
      
      {isRecording && (
        <span className="text-danger font-mono text-lg">
          {Math.floor(duration / 60)}:{String(duration % 60).padStart(2, '0')}
        </span>
      )}
      
      <span className="text-sm text-text-sub-light dark:text-text-sub-dark">
        {isRecording ? '点击停止录音' : '点击开始录音'}
      </span>
    </div>
  );
}
```

### 3. VideoRecordButton - 视频录制按钮

带时长限制的视频录制组件。

```jsx
import { VIDEO_CONSTRAINTS } from '../../utils/haptics';

export function VideoRecordButton({ onRecordComplete }) {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  
  // 最大 15 秒
  const maxDuration = VIDEO_CONSTRAINTS.maxDuration;

  // ... 录制逻辑

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative">
        <button
          onClick={isRecording ? stopRecording : startRecording}
          className={`
            w-20 h-20 rounded-full flex items-center justify-center
            ${isRecording 
              ? 'bg-danger recording-pulse' 
              : 'bg-action-primary hover:bg-action-primary-dark'
            }
            text-white transition-colors
          `}
        >
          <span className="material-symbols-outlined text-3xl">
            {isRecording ? 'stop' : 'videocam'}
          </span>
        </button>
        
        {/* 进度环 */}
        {isRecording && (
          <svg className="absolute inset-0 w-full h-full -rotate-90">
            <circle
              cx="40" cy="40" r="38"
              fill="none"
              stroke="rgba(255,255,255,0.3)"
              strokeWidth="4"
            />
            <circle
              cx="40" cy="40" r="38"
              fill="none"
              stroke="white"
              strokeWidth="4"
              strokeDasharray={`${(duration / maxDuration) * 238} 238`}
            />
          </svg>
        )}
      </div>
      
      <span className="text-sm text-text-sub-light dark:text-text-sub-dark">
        最长 {maxDuration} 秒
      </span>
    </div>
  );
}
```

### 4. ReportForm - 报修表单

完整的报修表单组件。

```jsx
export function ReportForm({ onSubmit }) {
  const [description, setDescription] = useState('');
  const [mediaFiles, setMediaFiles] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    hapticButtonPress();
    setIsSubmitting(true);
    
    // 创建 Multipart 请求
    const formData = new FormData();
    formData.append('description', description);
    mediaFiles.forEach((file, i) => {
      formData.append(`media_${i}`, file);
    });
    
    await onSubmit?.(formData);
    setIsSubmitting(false);
  };

  return (
    <div className="flex flex-col h-full">
      {/* 顶部 67%: 输入区域 */}
      <div className="flex-1 p-4 space-y-4">
        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="描述您的问题..."
          className="w-full h-32 p-4 rounded-2xl border border-gray-200 
                     dark:border-gray-700 bg-white dark:bg-surface-dark"
        />
        
        {/* 媒体录制按钮 */}
        <div className="flex justify-center gap-8">
          <VoiceRecordButton onRecordComplete={...} />
          <VideoRecordButton onRecordComplete={...} />
        </div>
      </div>
      
      {/* 底部 33%: 提交按钮 */}
      <div className="p-4 pb-8">
        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="btn-action-primary w-full"
        >
          {isSubmitting ? '提交中...' : '提交报修'}
        </button>
      </div>
    </div>
  );
}
```

## Multipart 请求封装

```javascript
async function submitReport(formData) {
  const response = await fetch('/api/reports', {
    method: 'POST',
    body: formData, // 自动设置 Content-Type: multipart/form-data
  });
  
  if (!response.ok) {
    throw new Error('提交失败');
  }
  
  return response.json();
}
```

## 测试模式

```jsx
describe('QuickReportButton', () => {
  it('should trigger haptic on press', () => {
    const hapticSpy = vi.spyOn(haptics, 'hapticButtonPress');
    render(<QuickReportButton onPress={() => {}} />);
    
    fireEvent.click(screen.getByRole('button'));
    
    expect(hapticSpy).toHaveBeenCalled();
  });
});
```
