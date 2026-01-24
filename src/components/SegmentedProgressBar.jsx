import PropTypes from 'prop-types';

/**
 * SegmentedProgressBar - 分段进度条
 * 
 * 显示上传进度，减少用户焦虑。
 * 支持多段显示各阶段完成状态。
 */
export default function SegmentedProgressBar({
    segments = [],
    totalProgress = 0,
    showLabels = true
}) {
    return (
        <div className="w-full space-y-3">
            {/* 总进度条 */}
            <div className="relative h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                    className="absolute left-0 top-0 h-full bg-action-primary rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${Math.min(100, Math.max(0, totalProgress))}%` }}
                />
            </div>

            {/* 分段标签 */}
            {showLabels && segments.length > 0 && (
                <div className="flex justify-between">
                    {segments.map((segment, index) => (
                        <div
                            key={index}
                            className="flex flex-col items-center gap-1"
                        >
                            {/* 状态图标 */}
                            <div className={`
                w-6 h-6 rounded-full flex items-center justify-center text-xs
                ${segment.progress === 100
                                    ? 'bg-success text-white'
                                    : segment.progress > 0
                                        ? 'bg-action-primary text-white'
                                        : 'bg-gray-200 dark:bg-gray-700 text-gray-400'
                                }
              `}>
                                {segment.progress === 100 ? (
                                    <span className="material-symbols-outlined text-sm">check</span>
                                ) : segment.progress > 0 ? (
                                    <span className="text-xs font-bold">{Math.round(segment.progress)}%</span>
                                ) : (
                                    <span className="text-xs">{index + 1}</span>
                                )}
                            </div>

                            {/* 段落名称 */}
                            <span className={`
                text-xs
                ${segment.progress === 100
                                    ? 'text-success font-medium'
                                    : segment.progress > 0
                                        ? 'text-action-primary font-medium'
                                        : 'text-text-sub-light dark:text-text-sub-dark'
                                }
              `}>
                                {segment.name}
                            </span>
                        </div>
                    ))}
                </div>
            )}

            {/* 总进度百分比 */}
            <div className="text-center">
                <span className="text-sm text-text-sub-light dark:text-text-sub-dark">
                    总进度: <span className="font-bold text-action-primary">{Math.round(totalProgress)}%</span>
                </span>
            </div>
        </div>
    );
}

SegmentedProgressBar.propTypes = {
    /** Array of segment objects with name and progress */
    segments: PropTypes.arrayOf(PropTypes.shape({
        name: PropTypes.string.isRequired,
        progress: PropTypes.number.isRequired,
    })),
    /** Total progress percentage (0-100) */
    totalProgress: PropTypes.number,
    /** Whether to show segment labels */
    showLabels: PropTypes.bool,
};

/**
 * 紧凑版进度条 (无分段标签)
 */
export function CompactProgressBar({ progress = 0, label = '' }) {
    return (
        <div className="w-full space-y-1">
            <div className="relative h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                    className="absolute left-0 top-0 h-full bg-action-primary rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
                />
            </div>
            {label && (
                <div className="flex justify-between text-xs text-text-sub-light dark:text-text-sub-dark">
                    <span>{label}</span>
                    <span>{Math.round(progress)}%</span>
                </div>
            )}
        </div>
    );
}

CompactProgressBar.propTypes = {
    /** Progress percentage (0-100) */
    progress: PropTypes.number,
    /** Label text */
    label: PropTypes.string,
};

