/**
 * Memory Persistence Hook
 * 
 * This module handles persisting agent memory and context between sessions.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const MEMORY_FILE = path.join(__dirname, 'memory.json');

/**
 * Load persisted memory
 * @returns {Object} The loaded memory object
 */
export function loadMemory() {
    try {
        if (fs.existsSync(MEMORY_FILE)) {
            const data = fs.readFileSync(MEMORY_FILE, 'utf-8');
            return JSON.parse(data);
        }
    } catch (error) {
        console.warn('Failed to load memory:', error.message);
    }
    return { sessions: [], context: {} };
}

/**
 * Save memory to disk
 * @param {Object} memory - The memory object to persist
 */
export function saveMemory(memory) {
    try {
        fs.writeFileSync(MEMORY_FILE, JSON.stringify(memory, null, 2));
    } catch (error) {
        console.error('Failed to save memory:', error.message);
    }
}

/**
 * Add a session entry to memory
 * @param {Object} session - The session data to add
 */
export function addSession(session) {
    const memory = loadMemory();
    memory.sessions.push({
        ...session,
        timestamp: new Date().toISOString()
    });

    // Keep only last 100 sessions
    if (memory.sessions.length > 100) {
        memory.sessions = memory.sessions.slice(-100);
    }

    saveMemory(memory);
}

/**
 * Update context data
 * @param {string} key - The context key
 * @param {*} value - The context value
 */
export function updateContext(key, value) {
    const memory = loadMemory();
    memory.context[key] = value;
    saveMemory(memory);
}

export default {
    loadMemory,
    saveMemory,
    addSession,
    updateContext
};
