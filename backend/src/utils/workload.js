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
    },
    include: {
      project: {
        select: {
          id: true,
          name: true,
          status: true
        }
      }
    }
  });

  const total = memberships.reduce((total, membership) => total + membership.allocation, 0);
  
    membershipCount: memberships.length,
    memberships: memberships.map(m => ({
      projectId: m.project.id,
      projectName: m.project.name,
      allocation: m.allocation,
      startDate: m.startDate,
      endDate: m.endDate
    })),
    totalAllocation: total
  });

  return total;
}

/**
 * 推奨工数を計算します
 * @param {string} userId - ユーザーID
 * @param {boolean} isManager - マネージャーかどうか
 * @returns {Promise<number>} - 推奨工数
 */
async function calculateRecommendedAllocation(userId, isManager) {
  const totalAllocation = await calculateTotalAllocation(userId);
  const availableAllocation = 1.0 - totalAllocation;

  // 利用可能な工数がない場合は0を返す
  if (availableAllocation <= 0) {
    return 0;
  }

  // マネージャーも通常メンバーも、利用可能な工数の範囲内で100%を目指す
  return Math.min(1.0, availableAllocation);
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
  
  // 全てのユーザー（マネージャー含む）が100%の制限を受ける
  return totalAllocation + newAllocation > 1.0;
}

module.exports = {
  calculateTotalAllocation,
  calculateRecommendedAllocation,
  isAllocationExceeded
};
