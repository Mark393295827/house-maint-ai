# UI/UX 报修端开发标准

本规范定义了 house-maint-ai 报修端的交互设计标准。

---

## 1. 物理交互约束 (Ergonomics)

### 热区要求
所有核心操作按钮（如"报修"、"提交"）必须位于屏幕底部 **33%** 的区域。

```
┌─────────────────────────┐
│                         │  ← 顶部 33%: 信息展示区
│      信息展示区          │
├─────────────────────────┤
│                         │  ← 中部 34%: 内容区
│       内容区             │
├─────────────────────────┤
│   【报修】  【提交】      │  ← 底部 33%: 核心操作热区
│                         │
└─────────────────────────┘
```

### 触控尺寸
| 元素 | 最小高度 | 圆角 |
|------|----------|------|
| 交互按钮 | 48dp | 20px |
| 图标按钮 | 44dp | 12px |
| 输入框 | 48dp | 16px |

### Tailwind 实现
```jsx
// 核心操作按钮
<button className="h-12 min-h-[48px] rounded-[20px] px-6">
  提交报修
</button>
```

### 视觉反馈

#### 录音状态动画
必须包含 `scale` 动画（1.1x）及呼吸灯效果：

```css
@keyframes recording-pulse {
  0%, 100% { 
    transform: scale(1); 
    box-shadow: 0 0 0 0 rgba(255, 0, 0, 0.4);
  }
  50% { 
    transform: scale(1.1); 
    box-shadow: 0 0 0 10px rgba(255, 0, 0, 0);
  }
}

.recording-active {
  animation: recording-pulse 1.5s ease-in-out infinite;
}
```

#### 震动反馈
调用系统震动 API：

```javascript
// React Native / Expo
import * as Haptics from 'expo-haptics';

const handlePress = async () => {
  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  // 执行操作
};

// Web (如果支持)
const triggerHaptic = () => {
  if (navigator.vibrate) {
    navigator.vibrate(10); // 10ms 轻触
  }
};
```

---

## 2. 媒体处理规则

### 视频限制

| 属性 | 限制值 |
|------|--------|
| 最大时长 | 15 秒 |
| 最大分辨率 | 720p (1280×720) |
| 格式 | MP4 (H.264) |
| 最大文件大小 | 20MB |

```javascript
const VIDEO_CONSTRAINTS = {
  maxDuration: 15,        // 秒
  maxWidth: 1280,
  maxHeight: 720,
  maxFileSize: 20 * 1024 * 1024, // 20MB
  format: 'video/mp4'
};
```

### 隐私保护

在上传前必须触发 `security-reviewer` 代理，扫描敏感信息：

```javascript
const SENSITIVE_PATTERNS = [
  '身份证',
  '门牌号', 
  '银行卡',
  '手机号',
  '车牌号'
];

// 上传前检查
async function checkPrivacyBeforeUpload(mediaFile) {
  // 调用 security-reviewer 代理
  const result = await securityReviewer.scan({
    file: mediaFile,
    checks: ['personal_info', 'location_info', 'document_detection']
  });
  
  if (result.sensitiveDataFound) {
    // 提示用户
    return {
      allowed: false,
      warnings: result.warnings
    };
  }
  
  return { allowed: true };
}
```

---

## 3. 颜色系统

### 主色调

| 名称 | 色值 | 用途 | 心理效果 |
|------|------|------|----------|
| **Primary** | `#007AFF` | 主要操作、链接 | 安全蓝 - 建立信任 |
| **Warning** | `#FF9500` | 紧急操作、警告 | 专业橙 - 紧急提醒 |
| **Success** | `#34C759` | 成功状态 | 确认绿 - 正向反馈 |
| **Danger** | `#FF3B30` | 危险/删除操作 | 警示红 - 谨慎操作 |

### Tailwind 配置

```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: '#007AFF',
        warning: '#FF9500',
        success: '#34C759',
        danger: '#FF3B30',
        // 扩展色阶
        'primary-light': '#4DA3FF',
        'primary-dark': '#0056B3',
        'warning-light': '#FFB84D',
        'warning-dark': '#CC7700',
      }
    }
  }
};
```

### 按钮样式示例

```jsx
// 主要操作按钮 (蓝色 - 建立信任)
<button className="bg-[#007AFF] hover:bg-[#0056B3] text-white h-12 rounded-[20px] px-6 transition-colors">
  提交报修
</button>

// 紧急操作按钮 (橙色 - 紧急提醒)
<button className="bg-[#FF9500] hover:bg-[#CC7700] text-white h-12 rounded-[20px] px-6 transition-colors">
  紧急报修
</button>
```

---

## 4. 组件规范检查清单

### 按钮组件
- [ ] 位于底部 33% 区域
- [ ] 高度 ≥ 48dp
- [ ] 圆角 20px
- [ ] 包含点击反馈动画
- [ ] 支持震动反馈

### 媒体上传组件
- [ ] 视频限制 15s
- [ ] 分辨率压缩至 720p
- [ ] 上传前隐私扫描
- [ ] 敏感信息警告提示

### 颜色使用
- [ ] 主要操作使用 Primary (#007AFF)
- [ ] 紧急操作使用 Warning (#FF9500)
- [ ] 颜色对比度满足 WCAG AA 标准
