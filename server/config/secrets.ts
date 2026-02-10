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
        } catch (error) {
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

// Validate required secrets in production
if (process.env.NODE_ENV === 'production') {
    if (JWT_SECRET === 'house-maint-ai-dev-secret-change-in-production') {
        console.warn('WARNING: Using default JWT secret in production! Please set a secure secret.');
    }
}

export default {
    JWT_SECRET,
    DB_PASSWORD,
    DEEPSEEK_API_KEY,
};
