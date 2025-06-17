import { useQuery } from '@tanstack/react-query';
import api from '../utils/axios';

/**
 * プロジェクト工数管理のカスタムフック
 * 全プロジェクトデータを取得し、各ユーザーの総工数を計算する機能を提供
 */
export const useProjectAllocation = () => {
  // 全プロジェクトデータを取得
  const { data: projectsData, ...queryProps } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const response = await api.get('/projects');
      return response.data;
    }
  });

  /**
   * 指定されたユーザーの全プロジェクトでの工数合計を計算
   * @param {string} userId - ユーザーID
   * @returns {number} 総工数 (0.0-1.0以上)
   */
  const calculateTotalAllocation = (userId) => {
    if (!projectsData?.projects || !userId) return 0;
    
    let total = 0;
    projectsData.projects.forEach(project => {
      project.members?.forEach(membership => {
        if (membership.userId === userId) {
          total += membership.allocation || 0;
        }
      });
    });
    return total;
  };

  /**
   * プロジェクトの各メンバーに総工数を追加したデータを作成
   * @param {Object} project - プロジェクトオブジェクト
   * @returns {Object} 総工数が追加されたプロジェクトオブジェクト
   */
  const enrichProjectWithTotalAllocation = (project) => {
    if (!project) return null;
    
    return {
      ...project,
      members: project.members?.map(membership => ({
        ...membership,
        user: {
          ...membership.user,
          totalAllocation: calculateTotalAllocation(membership.userId)
        }
      }))
    };
  };

  /**
   * ユーザーの工数状態を取得
   * @param {string} userId - ユーザーID
   * @returns {Object} 工数状態オブジェクト
   */
  const getUserAllocationStatus = (userId) => {
    const totalAllocation = calculateTotalAllocation(userId);
    const remainingAllocation = Math.max(0, 1.0 - totalAllocation);
    const isOverAllocated = totalAllocation > 1.0;
    
    return {
      total: totalAllocation,
      remaining: remainingAllocation,
      isOverAllocated,
      percentage: Math.round(totalAllocation * 100)
    };
  };

  return {
    projectsData,
    calculateTotalAllocation,
    enrichProjectWithTotalAllocation,
    getUserAllocationStatus,
    ...queryProps
  };
};

export default useProjectAllocation;
