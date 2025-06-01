const prisma = require('../lib/prisma');

/**
 * ユーザーの総工数を計算します
 * @param {string} userId - ユーザーID
 * @returns {Promise<number>} - 総工数（0.0-1.0の範囲）
 */
async function calculateTotalAllocation(userId) {
  const memberships = await prisma.projectMembership.findMany({
    where: {
      userId,
      project: {
        status: 'ACTIVE'
      },
      OR: [
        { endDate: null },
        { endDate: { gt: new Date() } }
      ]
    }
  });

  return memberships.reduce((total, membership) => total + membership.allocation, 0);
}

/**
 * 推奨工数を計算します
 * @param {string} userId - ユーザーID
 * @param {boolean} isManager - マネージャーかどうか
 * @returns {Promise<number>} - 推奨工数
 */
async function calculateRecommendedAllocation(userId, isManager) {
  if (isManager) {
    return 1.0; // マネージャーは常に100%
  }

  const totalAllocation = await calculateTotalAllocation(userId);
  const availableAllocation = 1.0 - totalAllocation;

  // デフォルトは50%だが、利用可能な工数が50%未満の場合は利用可能な工数を返す
  return Math.min(0.5, Math.max(0, availableAllocation));
}

/**
 * 工数が1.0を超えているかチェックします
 * @param {string} userId - ユーザーID
 * @param {number} newAllocation - 新しい工数
 * @param {string} excludeProjectId - 除外するプロジェクトID（更新時）
 * @param {boolean} isManager - マネージャーかどうか
 * @returns {Promise<boolean>} - 工数が1.0を超える場合はtrue
 */
async function isAllocationExceeded(userId, newAllocation, excludeProjectId = null, isManager = false) {
  // マネージャーの場合は常に100%を許可
  if (isManager) {
    return false;
  }

  const memberships = await prisma.projectMembership.findMany({
    where: {
      userId,
      project: {
        status: 'ACTIVE'
      },
      OR: [
        { endDate: null },
        { endDate: { gt: new Date() } }
      ],
      ...(excludeProjectId && { projectId: { not: excludeProjectId } })
    }
  });

  const totalAllocation = memberships.reduce((total, membership) => total + membership.allocation, 0);
  return totalAllocation + newAllocation > 1.0;
}

module.exports = {
  calculateTotalAllocation,
  calculateRecommendedAllocation,
  isAllocationExceeded
};
