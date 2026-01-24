/**
 * Suggest Compact Hook
 * 
 * Analyze context and suggest what can be compacted.
 */

/**
 * Analyze content and suggest compactions
 */
export function analyzeForCompaction(contextInfo) {
    const suggestions = [];

    // Suggest compacting old tool outputs
    if (contextInfo.toolOutputs && contextInfo.toolOutputs.length > 10) {
        suggestions.push({
            type: 'tool_outputs',
            priority: 'medium',
            description: 'Verbose tool outputs from earlier in session',
            estimatedSavings: '~3K tokens',
            action: 'Summarize tool outputs into key findings'
        });
    }

    // Suggest compacting resolved tasks
    if (contextInfo.completedTasks && contextInfo.completedTasks.length > 5) {
        suggestions.push({
            type: 'completed_tasks',
            priority: 'low',
            description: 'Details of completed subtasks',
            estimatedSavings: '~2K tokens',
            action: 'Keep only task names and outcomes'
        });
    }

    // Suggest compacting file contents
    if (contextInfo.filesViewed && contextInfo.filesViewed.length > 5) {
        suggestions.push({
            type: 'file_contents',
            priority: 'medium',
            description: 'Full file contents no longer needed',
            estimatedSavings: '~5K tokens',
            action: 'Remove full contents, keep file summaries'
        });
    }

    return suggestions;
}

/**
 * Generate compaction report
 */
export function generateCompactionReport(suggestions) {
    if (suggestions.length === 0) {
        return 'No compaction suggestions at this time.';
    }

    let report = '## Compaction Suggestions\n\n';

    for (const suggestion of suggestions) {
        report += `### ${suggestion.type}\n`;
        report += `**Priority**: ${suggestion.priority}\n`;
        report += `**Description**: ${suggestion.description}\n`;
        report += `**Estimated Savings**: ${suggestion.estimatedSavings}\n`;
        report += `**Action**: ${suggestion.action}\n\n`;
    }

    return report;
}

/**
 * Main hook execution
 */
export function onSuggestCompact(contextInfo = {}) {
    console.log('🔍 Analyzing context for compaction...');

    const suggestions = analyzeForCompaction(contextInfo);
    const report = generateCompactionReport(suggestions);

    if (suggestions.length > 0) {
        console.log(`💡 ${suggestions.length} compaction suggestions`);
    }

    return { suggestions, report };
}

export default { onSuggestCompact, analyzeForCompaction, generateCompactionReport };
