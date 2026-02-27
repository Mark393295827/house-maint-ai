import fs from 'fs';
import https from 'https';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const REPO_URL = 'https://github.com/affaan-m/everything-claude-code/archive/refs/heads/main.zip';
const ZIP_PATH = path.join(__dirname, 'ecc.zip');

console.log('Fetching configs from everything-claude-code...');

// Download the ZIP
const file = fs.createWriteStream(ZIP_PATH);
https.get(REPO_URL, (response) => {
    // Handle redirects
    if (response.statusCode === 301 || response.statusCode === 302) {
        https.get(response.headers.location!, (res) => {
            res.pipe(file);
            file.on('finish', () => {
                file.close(() => extractAndCopy());
            });
        });
    } else {
        response.pipe(file);
        file.on('finish', () => {
            file.close(() => extractAndCopy());
        });
    }
}).on('error', (err) => {
    fs.unlinkSync(ZIP_PATH);
    console.error('Download error:', err.message);
});

function extractAndCopy() {
    console.log('Extracting archive using PowerShell...');

    try {
        // Use PowerShell to extract the zip on Windows
        execSync(`powershell -Command "Expand-Archive -Path '${ZIP_PATH}' -DestinationPath '${__dirname}' -Force"`);
        console.log('Extraction complete.');

        const extractFolder = path.join(__dirname, 'everything-claude-code-main');

        // Folders and files to copy
        const targets = [
            '.claude', 'agents', 'commands', 'contexts', 'hooks', 'mcp-configs', 'plugins', 'rules', 'schemas', 'CLAUDE.md'
        ];

        console.log('Copying configuration directories into the project root...');
        targets.forEach(target => {
            const srcPath = path.join(extractFolder, target);
            const destPath = path.join(__dirname, target);

            if (fs.existsSync(srcPath)) {
                // Remove existing if any
                if (fs.existsSync(destPath)) {
                    fs.rmSync(destPath, { recursive: true, force: true });
                }

                // Copy using Node.js fs implementation
                fs.cpSync(srcPath, destPath, { recursive: true });
                console.log(`✅ Copied ${target}`);
            }
        });

        // Cleanup
        console.log('Cleaning up temporary files...');
        fs.unlinkSync(ZIP_PATH);
        fs.rmSync(extractFolder, { recursive: true, force: true });

        console.log('🎉 Successfully replicated all Claude Code configurations to house-maint-ai!');
    } catch (err) {
        console.error('Script failed:', err.message);
    }
}
