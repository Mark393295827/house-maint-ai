/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: "class",
    theme: {
        extend: {
            colors: {
                "primary": "#2bb673",
                "primary-dark": "#23945d",
                "background-light": "#f6f8f7",
                "background-dark": "#131f19",
                "surface-light": "#ffffff",
                "surface-dark": "#1c2e25",
                "text-main-light": "#0f1a15",
                "text-main-dark": "#e0e7e3",
                "text-sub-light": "#568f74",
                "text-sub-dark": "#8abfab",
                // UI/UX 报修端标准色
                "action-primary": "#007AFF",    // 安全蓝 - 建立信任
                "action-primary-dark": "#0056B3",
                "action-warning": "#FF9500",    // 专业橙 - 紧急操作
                "action-warning-dark": "#CC7700",
                "success": "#34C759",
                "danger": "#FF3B30",
            },
            fontFamily: {
                "sans": ["Manrope", "sans-serif"],
                "display": ["Manrope", "sans-serif"]
            },
            borderRadius: {
                "DEFAULT": "0.5rem",
                "lg": "1rem",
                "xl": "1.5rem",
                "2xl": "1.25rem",  // 20px - 按钮标准圆角
                "full": "9999px"
            },
            minHeight: {
                "button": "48px",  // 触控尺寸标准
            },
        },
    },
    plugins: [],
}
