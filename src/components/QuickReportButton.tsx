import { hapticButtonPress } from '../utils/haptics';

type ButtonVariant = 'primary' | 'warning';

interface QuickReportButtonProps {
    onPress?: () => void;
    label?: string;
    icon?: string;
    variant?: ButtonVariant;
}

const variantClasses: Record<ButtonVariant, string> = {
    primary: 'btn-action-primary',
    warning: 'btn-action-warning'
};

/**
 * QuickReportButton - 快速报修入口按钮
 *
 * 位于屏幕底部的主要报修入口，符合 UI/UX 标准。
 * - 位置: 底部 33% 区域 (fixed bottom-8)
 * - 尺寸: 48dp 高度, 20px 圆角
 * - 颜色: action-primary (#007AFF)
 * - 反馈: Haptic Light Impact
 */
export default function QuickReportButton({
    onPress,
    label = "极速报修",
    icon = "report_problem",
    variant = "primary"
}: QuickReportButtonProps) {
    const handlePress = () => {
        hapticButtonPress();
        onPress?.();
    };

    return (
        <button
            onClick={handlePress}
            className={`
        ${variantClasses[variant]}
        fixed bottom-8 left-1/2 -translate-x-1/2
        flex items-center gap-2
        shadow-lg hover:shadow-xl
        transition-shadow
      `}
            data-testid="quick-report-button"
        >
            <span className="material-symbols-outlined">{icon}</span>
            {label}
        </button>
    );
}
