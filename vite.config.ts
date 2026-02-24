/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/',
  server: {
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  test: {
    env: {
      DB_USE_SQLITE: 'true',
      REDIS_MOCK: 'true'
    },
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/e2e/**',
      '**/load-tests/**',
      '**/.{idea,git,cache,output,temp}/**',
    ],
    // Use project-based configuration for different environments
    environmentMatchGlobs: [
      // Server tests use node environment
      ['server/**/*.test.ts', 'node'],
      // All other tests use jsdom
      ['**/*.test.{js,jsx,ts,tsx}', 'jsdom'],
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.config.js',
        '**/*.config.ts',
        '**/main.tsx',
      ],
    },
  },
})
