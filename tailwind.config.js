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
            },
            fontFamily: {
                "sans": ["Manrope", "sans-serif"],
                "display": ["Manrope", "sans-serif"]
            },
            borderRadius: {
                "DEFAULT": "0.5rem",
                "lg": "1rem",
                "xl": "1.5rem",
                "full": "9999px"
            },
        },
    },
    plugins: [],
}
