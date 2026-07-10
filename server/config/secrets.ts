import { readFileSync, existsSync } from 'fs';

/**
 * Read a secret from Docker secrets file or fallback to environment variable
 *
 * Docker secrets are mounted at /run/secrets/<secret_name>
 * In development, falls back to environment variables
 */
function readSecret(secretName: string, envVar: string, defaultValue: string = ''): string {
    const secretPath = `/run/secrets/${secretName}`;

    // Try to read from Docker secret file first
    if (existsSync(secretPath)) {
        try {
            return readFileSync(secretPath, 'utf8').trim();
        } catch (_error) {
            console.warn(`Warning: Could not read secret file ${secretPath}`);
        }
    }

    // Fallback to environment variable
    return process.env[envVar] || defaultValue;
}

// JWT Secret - required for authentication
export const JWT_SECRET = readSecret(
    'jwt_secret',
    'JWT_SECRET',
    'house-maint-ai-dev-secret-change-in-production'
);

// Key used to HMAC refresh tokens before database storage. Defaults to the
// JWT secret for local compatibility when a dedicated secret is not configured.
export const REFRESH_TOKEN_HASH_SECRET = readSecret(
    'refresh_token_hash_secret',
    'REFRESH_TOKEN_HASH_SECRET',
    JWT_SECRET
);

// Database password
export const DB_PASSWORD = readSecret(
    'db_password',
    'DB_PASSWORD',
    'postgres'
);

// DeepSeek API Key - for reasoning tasks
export const DEEPSEEK_API_KEY = readSecret(
    'deepseek_api_key',
    'DEEPSEEK_API_KEY',
    '' // No default in production/dev, must be provided for feature to work
);

// Mixpanel Token - for analytics
export const MIXPANEL_TOKEN = readSecret(
    'mixpanel_token',
    'MIXPANEL_TOKEN',
    '' // No default
);

// Internal image anonymization service used before sending image payloads to LLMs.
export const PIPL_ANONYMIZER_URL = readSecret(
    'pipl_anonymizer_url',
    'PIPL_ANONYMIZER_URL',
    ''
);

export const PIPL_ANONYMIZER_TOKEN = readSecret(
    'pipl_anonymizer_token',
    'PIPL_ANONYMIZER_TOKEN',
    ''
);

// Validate required secrets in production
if (process.env.NODE_ENV === 'production') {
    if (JWT_SECRET === 'house-maint-ai-dev-secret-change-in-production') {
        throw new Error(
            'FATAL: Default JWT secret detected in production! ' +
            'Set JWT_SECRET environment variable or provide a Docker secret. ' +
            'The server will NOT start with the default secret in production.'
        );
    }
}

export default {
    JWT_SECRET,
    REFRESH_TOKEN_HASH_SECRET,
    DB_PASSWORD,
    DEEPSEEK_API_KEY,
    PIPL_ANONYMIZER_URL,
    PIPL_ANONYMIZER_TOKEN,
};
