import PropTypes from 'prop-types';
import { calculateMatchScore, getMatchLevel } from '../utils/matchScore';

/**
 * MatchScoreCard - 工人匹配度卡片
 * 
 * 显示工人的匹配度分数和等级。
 */
export default function MatchScoreCard({
    worker,
    report,
    showDetails = true
}) {
    const score = calculateMatchScore(worker, report);
    const { level, label, color } = getMatchLevel(score);

    return (
        <div className="bg-white dark:bg-surface-dark rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-800">
            {/* 头部 */}
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                    {/* 头像 */}
                    <div
                        className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-700 bg-cover bg-center"
                        style={{ backgroundImage: worker.avatar ? `url(${worker.avatar})` : undefined }}
                    />
                    <div>
                        <h3 className="font-bold text-text-main-light dark:text-text-main-dark">
                            {worker.name}
                        </h3>
                        <p className="text-xs text-text-sub-light dark:text-text-sub-dark">
                            {worker.distance}km · ⭐ {worker.rating}
                        </p>
                    </div>
                </div>

                {/* 匹配度分数 */}
                <div className="text-center">
                    <div
                        className="text-2xl font-bold"
                        style={{ color }}
                    >
                        {score}
                    </div>
                    <div
                        className="text-xs font-medium"
                        style={{ color }}
                    >
                        {label}
                    </div>
                </div>
            </div>

            {/* 详细分数 */}
            {showDetails && (
                <div className="flex gap-4 pt-3 border-t border-gray-100 dark:border-gray-800">
                    <ScoreItem
                        icon="location_on"
                        label="距离"
                        value={worker.distanceScore || Math.round((1 - worker.distance / 10) * 100)}
                    />
                    <ScoreItem
                        icon="star"
                        label="评价"
                        value={Math.round((worker.rating / 5) * 100)}
                    />
                    <ScoreItem
                        icon="handyman"
                        label="技能"
                        value={worker.technicalScore || 80}
                    />
                </div>
            )}
        </div>
    );
}

function ScoreItem({ icon, label, value }) {
    return (
        <div className="flex-1 flex flex-col items-center gap-1">
            <span className="material-symbols-outlined text-sm text-text-sub-light dark:text-text-sub-dark">
                {icon}
            </span>
            <span className="text-xs text-text-sub-light dark:text-text-sub-dark">
                {label}
            </span>
            <span className="text-sm font-bold text-text-main-light dark:text-text-main-dark">
                {value}
            </span>
        </div>
    );
}

MatchScoreCard.propTypes = {
    /** Worker information object */
    worker: PropTypes.shape({
        id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
        name: PropTypes.string.isRequired,
        avatar: PropTypes.string,
        distance: PropTypes.number.isRequired,
        rating: PropTypes.number.isRequired,
        skills: PropTypes.arrayOf(PropTypes.string),
        distanceScore: PropTypes.number,
        technicalScore: PropTypes.number,
    }).isRequired,
    /** Report information for matching */
    report: PropTypes.shape({
        requiredSkills: PropTypes.arrayOf(PropTypes.string),
    }).isRequired,
    /** Whether to show detailed score breakdown */
    showDetails: PropTypes.bool,
};

ScoreItem.propTypes = {
    /** Material icon name */
    icon: PropTypes.string.isRequired,
    /** Label text */
    label: PropTypes.string.isRequired,
    /** Score value */
    value: PropTypes.number.isRequired,
};

