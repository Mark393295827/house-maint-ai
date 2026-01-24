/**
 * 匹配度计算工具
 * 
 * 后端算法预估匹配度公式:
 * S = w1 * D + w2 * R + w3 * T
 * 
 * D = 距离 (Distance)
 * R = 评价 (Rating)
 * T = 技能 (Technical)
 */

/**
 * 默认权重配置
 */
export const DEFAULT_WEIGHTS = {
    w1: 0.3, // 距离权重
    w2: 0.4, // 评价权重
    w3: 0.3, // 技能权重
};

/**
 * 计算距离分数 (0-100, 近距离得分高)
 * @param {number} distance - 距离 (km)
 * @param {number} maxDistance - 最大考虑距离 (km)
 * @returns {number} 距离分数
 */
export function calculateDistanceScore(distance, maxDistance = 10) {
    if (distance <= 0) return 100;
    if (distance >= maxDistance) return 0;
    return Math.round((1 - distance / maxDistance) * 100);
}

/**
 * 计算评价分数 (0-100)
 * @param {number} rating - 评分 (0-5)
 * @returns {number} 评价分数
 */
export function calculateRatingScore(rating) {
    return Math.round((rating / 5) * 100);
}

/**
 * 计算技能匹配分数 (0-100)
 * @param {string[]} workerSkills - 工人技能列表
 * @param {string[]} requiredSkills - 所需技能列表
 * @returns {number} 技能匹配分数
 */
export function calculateTechnicalScore(workerSkills, requiredSkills) {
    if (!requiredSkills || requiredSkills.length === 0) return 100;
    if (!workerSkills || workerSkills.length === 0) return 0;

    const matchCount = requiredSkills.filter(skill =>
        workerSkills.includes(skill)
    ).length;

    return Math.round((matchCount / requiredSkills.length) * 100);
}

/**
 * 计算工人匹配度
 * 
 * 公式: S = w1 * D + w2 * R + w3 * T
 * 
 * @param {Object} worker - 工人信息
 * @param {number} worker.distance - 距离 (km)
 * @param {number} worker.rating - 评分 (0-5)
 * @param {string[]} worker.skills - 工人技能列表
 * @param {Object} report - 报修信息
 * @param {string[]} report.requiredSkills - 所需技能列表
 * @param {Object} weights - 权重配置
 * @returns {number} 匹配度分数 (0-100)
 */
export function calculateMatchScore(worker, report, weights = {}) {
    const { w1, w2, w3 } = { ...DEFAULT_WEIGHTS, ...weights };

    // D: 距离分数
    const D = calculateDistanceScore(worker.distance);

    // R: 评价分数
    const R = calculateRatingScore(worker.rating);

    // T: 技能匹配分数
    const T = calculateTechnicalScore(worker.skills, report.requiredSkills);

    // 加权计算: S = w1*D + w2*R + w3*T
    const S = w1 * D + w2 * R + w3 * T;

    return Math.round(S);
}

/**
 * 获取匹配度等级
 * @param {number} score - 匹配度分数
 * @returns {Object} 等级信息
 */
export function getMatchLevel(score) {
    if (score >= 90) return { level: 'excellent', label: '极佳', color: '#34C759' };
    if (score >= 70) return { level: 'good', label: '良好', color: '#007AFF' };
    if (score >= 50) return { level: 'fair', label: '一般', color: '#FF9500' };
    return { level: 'poor', label: '较差', color: '#FF3B30' };
}

export default {
    DEFAULT_WEIGHTS,
    calculateDistanceScore,
    calculateRatingScore,
    calculateTechnicalScore,
    calculateMatchScore,
    getMatchLevel,
};
