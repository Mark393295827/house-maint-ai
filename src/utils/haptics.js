/**
 * Haptic Feedback Utility
 * 
 * Provides haptic/vibration feedback for touch interactions.
 * Per UI/UX standards: Light impact for button presses.
 */

/**
 * Trigger haptic feedback (light impact)
 * Uses Vibration API on web, Haptics on React Native
 */
export function triggerHaptic() {
    // Web Vibration API
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(10); // 10ms light touch
    }
}

/**
 * Trigger haptic feedback for button press
 */
export function hapticButtonPress() {
    triggerHaptic();
}

/**
 * Trigger haptic feedback for error/warning
 */
export function hapticWarning() {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([10, 50, 10]); // Pattern: vibrate-pause-vibrate
    }
}

/**
 * Trigger haptic feedback for success
 */
export function hapticSuccess() {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([10, 30, 20]); // Pattern: short-pause-longer
    }
}

// Video constraints per UI/UX standards
export const VIDEO_CONSTRAINTS = {
    maxDuration: 15,        // 秒
    maxWidth: 1280,
    maxHeight: 720,
    maxFileSize: 20 * 1024 * 1024, // 20MB
    format: 'video/mp4'
};

// Sensitive information patterns for privacy check
export const SENSITIVE_PATTERNS = [
    '身份证',
    '门牌号',
    '银行卡',
    '手机号',
    '车牌号'
];

export default {
    triggerHaptic,
    hapticButtonPress,
    hapticWarning,
    hapticSuccess,
    VIDEO_CONSTRAINTS,
    SENSITIVE_PATTERNS
};
