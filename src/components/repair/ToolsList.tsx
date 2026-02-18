import React from 'react';

interface ToolsListProps {
    tools: string[];
    parts: any[];
    t: (key: string, options?: any) => string;
}

const ToolsList: React.FC<ToolsListProps> = ({ tools, parts, t }) => {
    if (tools.length === 0 && parts.length === 0) return null;

    return (
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4">
            {tools.length > 0 && (
                <div className="mb-3">
                    <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                        🛠️ {t('repair.tools', { defaultValue: 'Tools Needed' })}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                        {tools.map((tool: string, i: number) => (
                            <span key={i} className="text-xs bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-1 rounded-lg border border-gray-200 dark:border-gray-600">
                                {tool}
                            </span>
                        ))}
                    </div>
                </div>
            )}
            {parts.length > 0 && (
                <div>
                    <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                        📦 {t('repair.parts', { defaultValue: 'Parts Required' })}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                        {parts.map((part: any, i: number) => (
                            <span key={i} className="text-xs bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-1 rounded-lg border border-gray-200 dark:border-gray-600">
                                {part.name || part}{part.estimated_price ? ` ~${part.estimated_price}` : ''}
                            </span>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ToolsList;
