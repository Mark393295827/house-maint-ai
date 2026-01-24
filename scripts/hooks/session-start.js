/**
 * Session Start Hook
 * 
 * Loads context and state when a new session begins.
 */

import { readJsonFile, getProjectRoot, getTimestamp } from '../lib/utils.js';
import path from 'path';

const MEMORY_DIR = path.join(getProjectRoot(), 'hooks', 'memory-persistence');

/**
 * Load session context
 */
export function loadSessionContext() {
    const memoryFile = path.join(MEMORY_DIR, 'memory.json');
    const patternsFile = path.join(MEMORY_DIR, 'patterns.json');

    const memory = readJsonFile(memoryFile) || { sessions: [], context: {} };
    const patterns = readJsonFile(patternsFile) || { patterns: [] };

    return {
        memory,
        patterns,
        lastSession: memory.sessions[memory.sessions.length - 1] || null
    };
}

/**
 * Get relevant patterns for current context
 */
export function getRelevantPatterns(context, patterns) {
    if (!patterns || !patterns.patterns) return [];

    return patterns.patterns
        .filter(p => p.frequency > 2 || p.confidence > 0.8)
        .sort((a, b) => b.frequency - a.frequency)
        .slice(0, 10);
}

/**
 * Main hook execution
 */
export function onSessionStart() {
    console.log('📥 Loading session context...');

    const { memory, patterns, lastSession } = loadSessionContext();

    if (lastSession) {
        console.log(`📋 Last session: ${lastSession.timestamp}`);
    }

    const relevantPatterns = getRelevantPatterns({}, patterns);
    if (relevantPatterns.length > 0) {
        console.log(`💡 ${relevantPatterns.length} relevant patterns loaded`);
    }

    console.log('✅ Session context loaded');

    return {
        memory,
        patterns: relevantPatterns,
        startTime: getTimestamp()
    };
}

export default { onSessionStart, loadSessionContext, getRelevantPatterns };
