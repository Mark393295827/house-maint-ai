/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_API_BASE_URL: string;
    readonly VITE_SENTRY_DSN: string;
    readonly VITE_MIXPANEL_TOKEN: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
