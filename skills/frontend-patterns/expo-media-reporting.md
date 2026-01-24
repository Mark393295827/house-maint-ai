---
name: 极速媒体报修组件
description: React Native (Expo) 媒体报修组件实现指南
---

# 极速媒体报修组件实现

使用 `expo-av` 和 `expo-image-picker` 实现媒体报修功能。

## 核心依赖

```bash
npx expo install expo-av expo-image-picker expo-haptics
```

---

## 1. 长按录音组件

使用 `onPressIn` 与 `onPressOut` 实现"长按录制"。

```jsx
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import { useState, useRef } from 'react';
import { Pressable, View, Text, Animated } from 'react-native';

export function PressAndHoldRecorder({ onRecordComplete, maxDuration = 60 }) {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const recordingRef = useRef(null);
  const timerRef = useRef(null);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const startRecording = async () => {
    try {
      // 请求权限
      const permission = await Audio.requestPermissionsAsync();
      if (permission.status !== 'granted') return;

      // 震动反馈
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      // 设置音频模式
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      // 创建录音
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      recordingRef.current = recording;
      setIsRecording(true);

      // 呼吸灯动画
      Animated.loop(
        Animated.sequence([
          Animated.timing(scaleAnim, {
            toValue: 1.1,
            duration: 750,
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration: 750,
            useNativeDriver: true,
          }),
        ])
      ).start();

      // 计时器
      timerRef.current = setInterval(() => {
        setDuration(d => {
          if (d >= maxDuration - 1) {
            stopRecording();
            return maxDuration;
          }
          return d + 1;
        });
      }, 1000);

    } catch (error) {
      console.error('Failed to start recording:', error);
    }
  };

  const stopRecording = async () => {
    if (!recordingRef.current) return;

    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      
      setIsRecording(false);
      clearInterval(timerRef.current);
      scaleAnim.stopAnimation();
      scaleAnim.setValue(1);

      onRecordComplete?.({
        uri,
        duration: duration + 1,
        timestamp: new Date().toISOString(),
      });
      
      setDuration(0);
      recordingRef.current = null;

    } catch (error) {
      console.error('Failed to stop recording:', error);
    }
  };

  return (
    <View style={{ alignItems: 'center', gap: 16 }}>
      <Pressable
        onPressIn={startRecording}
        onPressOut={stopRecording}
        style={{ alignItems: 'center' }}
      >
        <Animated.View
          style={{
            width: 80,
            height: 80,
            borderRadius: 40,
            backgroundColor: isRecording ? '#FF3B30' : '#FF9500',
            justifyContent: 'center',
            alignItems: 'center',
            transform: [{ scale: scaleAnim }],
          }}
        >
          {/* Icon */}
        </Animated.View>
      </Pressable>
      
      {isRecording && (
        <Text style={{ fontFamily: 'monospace', fontSize: 18, color: '#FF3B30' }}>
          {Math.floor(duration / 60)}:{String(duration % 60).padStart(2, '0')}
        </Text>
      )}
      
      <Text style={{ color: '#666', fontSize: 14 }}>
        {isRecording ? '松开停止录音' : '长按开始录音'}
      </Text>
    </View>
  );
}
```

---

## 2. 视频拍摄组件

使用 `expo-image-picker` 并开启 `allowsEditing`。

```jsx
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';

export async function pickVideo({ maxDuration = 15 }) {
  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  
  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Videos,
    allowsEditing: true,  // 必须开启
    quality: 0.7,         // 720p 压缩
    videoMaxDuration: maxDuration,
  });

  if (!result.canceled && result.assets[0]) {
    return {
      uri: result.assets[0].uri,
      duration: result.assets[0].duration,
      width: result.assets[0].width,
      height: result.assets[0].height,
    };
  }
  
  return null;
}
```

---

## 3. 匹配度计算公式

后端匹配算法预估匹配度 $S$：

$$S = w_1 \cdot D + w_2 \cdot R + w_3 \cdot T$$

| 变量 | 含义 | 权重建议 |
|------|------|----------|
| $D$ | 距离 (Distance) | $w_1 = 0.3$ |
| $R$ | 评价 (Rating) | $w_2 = 0.4$ |
| $T$ | 技能 (Technical) | $w_3 = 0.3$ |

### 前端实现

```javascript
/**
 * 计算工人匹配度
 * @param {Object} worker - 工人信息
 * @param {Object} report - 报修信息
 * @param {Object} weights - 权重配置
 * @returns {number} 匹配度分数 (0-100)
 */
export function calculateMatchScore(worker, report, weights = {}) {
  const { w1 = 0.3, w2 = 0.4, w3 = 0.3 } = weights;
  
  // D: 距离分数 (0-100, 近距离得分高)
  const distanceScore = Math.max(0, 100 - worker.distance * 10);
  
  // R: 评价分数 (0-100)
  const ratingScore = (worker.rating / 5) * 100;
  
  // T: 技能匹配分数 (0-100)
  const skillMatch = worker.skills.filter(s => 
    report.requiredSkills.includes(s)
  ).length / report.requiredSkills.length;
  const technicalScore = skillMatch * 100;
  
  // 加权计算
  const S = w1 * distanceScore + w2 * ratingScore + w3 * technicalScore;
  
  return Math.round(S);
}
```

---

## 4. 分段上传进度条

减少用户焦虑的分段进度显示。

```jsx
import { View, Text } from 'react-native';

export function SegmentedProgressBar({ 
  segments = [],  // [{ name: '视频', progress: 50 }, ...]
  totalProgress = 0 
}) {
  return (
    <View style={{ width: '100%', gap: 8 }}>
      {/* 总进度 */}
      <View style={{ 
        height: 8, 
        backgroundColor: '#E5E5E5', 
        borderRadius: 4,
        overflow: 'hidden'
      }}>
        <View style={{ 
          height: '100%', 
          width: `${totalProgress}%`,
          backgroundColor: '#007AFF',
          borderRadius: 4,
        }} />
      </View>
      
      {/* 分段详情 */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        {segments.map((seg, i) => (
          <View key={i} style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: 12, color: '#666' }}>{seg.name}</Text>
            <Text style={{ 
              fontSize: 10, 
              color: seg.progress === 100 ? '#34C759' : '#007AFF' 
            }}>
              {seg.progress === 100 ? '✓' : `${seg.progress}%`}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}
```

### 使用示例

```jsx
<SegmentedProgressBar
  totalProgress={75}
  segments={[
    { name: '描述', progress: 100 },
    { name: '语音', progress: 100 },
    { name: '视频', progress: 50 },
    { name: '提交', progress: 0 },
  ]}
/>
```

---

## 5. 完整上传流程

```jsx
async function submitReport(formData, onProgress) {
  const segments = ['description', 'audio', 'video', 'submit'];
  let currentSegment = 0;
  
  // 分段上传
  for (const segment of segments) {
    const segmentData = formData[segment];
    if (!segmentData) continue;
    
    // 模拟上传进度
    for (let progress = 0; progress <= 100; progress += 10) {
      onProgress({
        segment,
        segmentProgress: progress,
        totalProgress: (currentSegment / segments.length) * 100 + 
                       (progress / segments.length),
      });
      await delay(100);
    }
    
    currentSegment++;
  }
  
  return { success: true };
}
```
