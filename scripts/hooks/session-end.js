/**
 * Session End Hook
 * 
 * Saves state and patterns when a session ends.
 */

import { readJsonFile, writeJsonFile, getProjectRoot, getTimestamp } from '../lib/utils.js';
import path from 'path';

const MEMORY_DIR = path.join(getProjectRoot(), 'hooks', 'memory-persistence');

/**
 * Save session summary
 */
export function saveSession(sessionData) {
    const memoryFile = path.join(MEMORY_DIR, 'memory.json');
    const memory = readJsonFile(memoryFile) || { sessions: [], context: {} };

    memory.sessions.push({
        ...sessionData,
        timestamp: getTimestamp()
    });

    // Keep only last 50 sessions
    if (memory.sessions.length > 50) {
        memory.sessions = memory.sessions.slice(-50);
    }

    writeJsonFile(memoryFile, memory);
    return memory;
}

/**
 * Update patterns from session
 */
export function updatePatterns(newPatterns) {
    const patternsFile = path.join(MEMORY_DIR, 'patterns.json');
    const existing = readJsonFile(patternsFile) || { patterns: [] };

    for (const pattern of newPatterns) {
        const existingIndex = existing.patterns.findIndex(p => p.id === pattern.id);
        if (existingIndex >= 0) {
            existing.patterns[existingIndex].frequency += 1;
            existing.patterns[existingIndex].lastUsed = getTimestamp();
        } else {
            existing.patterns.push({
                ...pattern,
                frequency: 1,
                lastUsed: getTimestamp()
            });
        }
    }

    writeJsonFile(patternsFile, existing);
    return existing;
}

/**
 * Main hook execution
 */
export function onSessionEnd(sessionData = {}, patterns = []) {
    console.log('💾 Saving session state...');

    saveSession(sessionData);

    if (patterns.length > 0) {
        updatePatterns(patterns);
        console.log(`📝 ${patterns.length} patterns saved`);
    }

    console.log('✅ Session state saved');
}

export default { onSessionEnd, saveSession, updatePatterns };
