/**
 * Pre-Compact Hook
 * 
 * Save state before context compaction.
 */

import { writeJsonFile, getProjectRoot, getTimestamp } from '../lib/utils.js';
import path from 'path';

const CHECKPOINTS_DIR = path.join(getProjectRoot(), 'hooks', 'memory-persistence', 'checkpoints');

/**
 * Create a pre-compaction checkpoint
 */
export function createPreCompactCheckpoint(state) {
    const timestamp = getTimestamp().replace(/[:.]/g, '-');
    const checkpointFile = path.join(CHECKPOINTS_DIR, `pre-compact-${timestamp}.json`);

    const checkpoint = {
        type: 'pre-compact',
        timestamp: getTimestamp(),
        state: {
            currentTask: state.currentTask || null,
            filesModified: state.filesModified || [],
            decisions: state.decisions || [],
            contextSummary: state.contextSummary || ''
        }
    };

    writeJsonFile(checkpointFile, checkpoint);
    return checkpoint;
}

/**
 * Main hook execution
 */
export function onPreCompact(state = {}) {
    console.log('📦 Creating pre-compaction checkpoint...');

    const checkpoint = createPreCompactCheckpoint(state);

    console.log(`✅ Checkpoint saved: pre-compact-${checkpoint.timestamp}`);

    return checkpoint;
}

export default { onPreCompact, createPreCompactCheckpoint };
