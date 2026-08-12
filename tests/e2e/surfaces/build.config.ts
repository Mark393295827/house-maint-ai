import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const source = (relativePath: string) => fileURLToPath(new URL(relativePath, import.meta.url));

export default defineConfig({
    build: {
        write: false,
        lib: {
            entry: {
                web: source('../../../apps/web/src/index.ts'),
                miniprogram: source('../../../apps/miniprogram/src/index.ts'),
            },
            formats: ['es'],
        },
        rollupOptions: {
            external: ['@house-maint/contracts'],
        },
    },
});
