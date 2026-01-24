/**
 * Setup Package Manager Script
 * 
 * This script ensures the correct package manager is configured for the project.
 * Run with: node scripts/setup-package-manager.js
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import process from 'process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

function detectPackageManager() {
    // Check for lockfiles
    if (fs.existsSync(path.join(projectRoot, 'package-lock.json'))) {
        return 'npm';
    }
    if (fs.existsSync(path.join(projectRoot, 'yarn.lock'))) {
        return 'yarn';
    }
    if (fs.existsSync(path.join(projectRoot, 'pnpm-lock.yaml'))) {
        return 'pnpm';
    }

    // Default to npm
    return 'npm';
}

function setup() {
    console.log('🔧 Setting up package manager...\n');

    const packageManager = detectPackageManager();
    console.log(`📦 Detected package manager: ${packageManager}`);

    // Verify package manager is installed
    try {
        const version = execSync(`${packageManager} --version`, { encoding: 'utf-8' }).trim();
        console.log(`✅ ${packageManager} version ${version} is installed`);
    } catch (_error) {
        console.error(`❌ ${packageManager} is not installed. Please install it first.`);
        process.exit(1);
    }

    // Ensure node_modules exists
    if (!fs.existsSync(path.join(projectRoot, 'node_modules'))) {
        console.log('\n📥 Installing dependencies...');
        try {
            execSync(`${packageManager} install`, {
                cwd: projectRoot,
                stdio: 'inherit'
            });
            console.log('✅ Dependencies installed successfully');
        } catch (_error) {
            console.error('❌ Failed to install dependencies');
            process.exit(1);
        }
    } else {
        console.log('✅ Dependencies already installed');
    }

    console.log('\n🎉 Package manager setup complete!');
}

setup();
