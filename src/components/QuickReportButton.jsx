import PropTypes from 'prop-types';
import { hapticButtonPress } from '../utils/haptics';

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
    variant = "primary" // "primary" | "warning"
}) {
    const handlePress = () => {
        hapticButtonPress();
        onPress?.();
    };

    const variantClasses = {
        primary: 'btn-action-primary',
        warning: 'btn-action-warning'
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

QuickReportButton.propTypes = {
    /** Callback function when button is pressed */
    onPress: PropTypes.func,
    /** Button label text */
    label: PropTypes.string,
    /** Material icon name */
    icon: PropTypes.string,
    /** Button style variant */
    variant: PropTypes.oneOf(['primary', 'warning']),
};

