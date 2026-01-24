/**
 * Package manager detection and selection utilities
 */

import fs from 'fs';
import path from 'path';
import { getProjectRoot, safeExec } from './utils.js';

/**
 * Detect which package manager is being used
 */
export function detectPackageManager() {
    const root = getProjectRoot();

    if (fs.existsSync(path.join(root, 'pnpm-lock.yaml'))) {
        return 'pnpm';
    }
    if (fs.existsSync(path.join(root, 'yarn.lock'))) {
        return 'yarn';
    }
    if (fs.existsSync(path.join(root, 'package-lock.json'))) {
        return 'npm';
    }

    // Default to npm
    return 'npm';
}

/**
 * Get the version of a package manager
 */
export async function getPackageManagerVersion(pm) {
    const result = await safeExec(`${pm} --version`);
    return result.success ? result.output : null;
}

/**
 * Check if a package manager is installed
 */
export async function isPackageManagerInstalled(pm) {
    const version = await getPackageManagerVersion(pm);
    return version !== null;
}

/**
 * Get the install command for a package manager
 */
export function getInstallCommand(pm) {
    const commands = {
        npm: 'npm install',
        yarn: 'yarn install',
        pnpm: 'pnpm install'
    };
    return commands[pm] || 'npm install';
}

/**
 * Get the run command for a package manager
 */
export function getRunCommand(pm, script) {
    const commands = {
        npm: `npm run ${script}`,
        yarn: `yarn ${script}`,
        pnpm: `pnpm ${script}`
    };
    return commands[pm] || `npm run ${script}`;
}

/**
 * Get package manager configuration
 */
export function getPackageManagerConfig() {
    const pm = detectPackageManager();
    return {
        name: pm,
        install: getInstallCommand(pm),
        run: (script) => getRunCommand(pm, script),
        lockfile: {
            npm: 'package-lock.json',
            yarn: 'yarn.lock',
            pnpm: 'pnpm-lock.yaml'
        }[pm]
    };
}

export default {
    detectPackageManager,
    getPackageManagerVersion,
    isPackageManagerInstalled,
    getInstallCommand,
    getRunCommand,
    getPackageManagerConfig
};
