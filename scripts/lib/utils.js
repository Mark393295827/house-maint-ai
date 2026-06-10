/**
 * Cross-platform utilities for scripts
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';

/**
 * Get the project root directory
 */
export function getProjectRoot() {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    return path.resolve(__dirname, '..', '..');
}

/**
 * Check if a file exists
 */
export function fileExists(filePath) {
    return fs.existsSync(filePath);
}

/**
 * Read JSON file safely
 */
export function readJsonFile(filePath) {
    try {
        const content = fs.readFileSync(filePath, 'utf-8');
        return JSON.parse(content);
    } catch (_error) {
        return null;
    }
}

/**
 * Write JSON file with pretty formatting
 */
export function writeJsonFile(filePath, data) {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

/**
 * Get current timestamp in ISO format
 */
export function getTimestamp() {
    return new Date().toISOString();
}

/**
 * Get platform-specific path separator
 */
export function getPathSeparator() {
    return path.sep;
}

/**
 * Normalize path for current OS
 */
export function normalizePath(inputPath) {
    return path.normalize(inputPath);
}

/**
 * Get OS type
 */
export function getOSType() {
    const platform = os.platform();
    if (platform === 'win32') return 'windows';
    if (platform === 'darwin') return 'macos';
    return 'linux';
}

/**
 * Execute command safely (placeholder for cross-platform exec)
 */
export async function safeExec(command) {
    const { execSync } = await import('child_process');
    try {
        return {
            success: true,
            output: execSync(command, { encoding: 'utf-8' }).trim()
        };
    } catch (error) {
        return {
            success: false,
            error: error.message
        };
    }
}

export default {
    getProjectRoot,
    fileExists,
    readJsonFile,
    writeJsonFile,
    getTimestamp,
    getPathSeparator,
    normalizePath,
    getOSType,
    safeExec
};
