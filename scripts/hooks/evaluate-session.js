/**
 * Evaluate Session Hook
 * 
 * Extract patterns and learnings from sessions.
 */

import { getTimestamp } from '../lib/utils.js';

/**
 * Extract patterns from session activity
 */
export function extractPatterns(sessionActivity) {
    const patterns = [];
    let patternId = 1;

    // Look for repeated solutions
    if (sessionActivity.solutions) {
        for (const solution of sessionActivity.solutions) {
            patterns.push({
                id: `pat-${patternId++}`,
                type: 'solution',
                context: solution.context,
                problem: solution.problem,
                solution: solution.solution,
                confidence: 0.8,
                tags: solution.tags || []
            });
        }
    }

    // Look for coding conventions used
    if (sessionActivity.codePatterns) {
        for (const pattern of sessionActivity.codePatterns) {
            patterns.push({
                id: `pat-${patternId++}`,
                type: 'convention',
                context: pattern.context,
                pattern: pattern.pattern,
                example: pattern.example,
                confidence: 0.7,
                tags: ['convention']
            });
        }
    }

    return patterns;
}

/**
 * Generate evaluation report
 */
export function generateEvaluationReport(patterns, metrics) {
    let report = '## Session Evaluation\n\n';
    report += `**Timestamp**: ${getTimestamp()}\n\n`;

    report += '### Patterns Extracted\n\n';
    for (const pattern of patterns) {
        report += `- **${pattern.type}**: ${pattern.context}\n`;
    }

    if (metrics) {
        report += '\n### Metrics\n\n';
        report += `- Tasks Completed: ${metrics.tasksCompleted || 0}\n`;
        report += `- Files Modified: ${metrics.filesModified || 0}\n`;
        report += `- Tests Added: ${metrics.testsAdded || 0}\n`;
    }

    return report;
}

/**
 * Main hook execution
 */
export function onEvaluateSession(sessionActivity = {}, metrics = {}) {
    console.log('📊 Evaluating session...');

    const patterns = extractPatterns(sessionActivity);
    const report = generateEvaluationReport(patterns, metrics);

    console.log(`✅ Extracted ${patterns.length} patterns`);

    return { patterns, report };
}

export default { onEvaluateSession, extractPatterns, generateEvaluationReport };
