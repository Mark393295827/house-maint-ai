import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  { ignores: ['dist'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx,js,jsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      'no-unused-vars': 'off', // Turn off base rule in favor of ts rule
      '@typescript-eslint/no-unused-vars': ['warn', { varsIgnorePattern: '^[A-Z_]|^_', argsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
  // k6 load tests - add k6 globals
  {
    files: ['load-tests/**/*.js'],
    languageOptions: {
      globals: {
        __ENV: 'readonly',
        sleep: 'readonly',
        check: 'readonly',
        group: 'readonly',
      },
    },
  },
)
