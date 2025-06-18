import { useQuery } from '@tanstack/react-query';
import api from '../utils/axios';

/**
 * 各ページで会社選択済みスキルと既定のスキルを取得するフック
 * スキル管理、プロジェクト管理、社員管理ページで使用
 */
export const usePageSkills = () => {
  // 会社選択済みスキル一覧の取得
  const {
    data: companySkills,
    isLoading: companySkillsLoading,
    error: companySkillsError,
    refetch: refetchCompanySkills
  } = useQuery({
    queryKey: ['company-skills'],
    queryFn: async () => {
      try {
        const response = await api.get('/skills/company');
        console.log('📊 会社選択済みスキル取得:', response.data);
        
        if (response.data?.status === 'success' && response.data?.data?.skills) {
          return response.data.data.skills;
        } else if (Array.isArray(response.data)) {
          return response.data;
        } else {
          return [];
        }
      } catch (error) {
        console.error('会社選択済みスキル取得エラー:', error);
        return [];
      }
    },
    staleTime: 5 * 60 * 1000, // 5分間キャッシュ
    cacheTime: 10 * 60 * 1000, // 10分間キャッシュ保持
  });

  // 既定のスキル一覧の取得
  const {
    data: defaultSkills,
    isLoading: defaultSkillsLoading,
    error: defaultSkillsError,
    refetch: refetchDefaultSkills
  } = useQuery({
    queryKey: ['default-skills'],
    queryFn: async () => {
      try {
        const response = await api.get('/skills/global');
        console.log('📊 既定のスキル取得:', response.data);
        
        if (response.data?.status === 'success' && response.data?.data?.skills) {
          return response.data.data.skills;
        } else if (Array.isArray(response.data)) {
          return response.data;
        } else {
          return [];
        }
      } catch (error) {
        console.error('既定のスキル取得エラー:', error);
        return [];
      }
    },
    staleTime: 10 * 60 * 1000, // 10分間キャッシュ（既定スキルは変更頻度が低い）
    cacheTime: 30 * 60 * 1000, // 30分間キャッシュ保持
  });

  // 全スキルデータを統合
  const allSkills = [
    ...(companySkills || []),
    ...(defaultSkills || [])
  ];

  // カテゴリ一覧を取得
  const categories = [...new Set(allSkills.map(skill => skill.category).filter(Boolean))];

  // スキル数の統計
  const skillStats = {
    company: (companySkills || []).length,
    default: (defaultSkills || []).length,
    total: allSkills.length
  };

  return {
    // 会社選択済みスキル
    companySkills: companySkills || [],
    companySkillsLoading,
    companySkillsError,
    refetchCompanySkills,
    
    // 既定のスキル
    defaultSkills: defaultSkills || [],
    defaultSkillsLoading,
    defaultSkillsError,
    refetchDefaultSkills,
    
    // 統合データ
    allSkills,
    categories,
    skillStats,
    
    // 全体のローディング状態
    isLoading: companySkillsLoading || defaultSkillsLoading,
    hasError: companySkillsError || defaultSkillsError,
    
    // 全スキルデータを再取得
    refetchAll: () => {
      refetchCompanySkills();
      refetchDefaultSkills();
    }
  };
};

/**
 * スキル名でスキルを検索するヘルパー関数
 */
export const findSkillByName = (skills, skillName) => {
  return skills.find(skill => 
    skill.name === skillName || 
    skill.skillName === skillName ||
    skill.globalSkill?.name === skillName
  );
};

/**
 * カテゴリでスキルをフィルタリングするヘルパー関数
 */
export const filterSkillsByCategory = (skills, category) => {
  if (!category) return skills;
  return skills.filter(skill => skill.category === category);
};

/**
 * スキルをカテゴリ別にグループ化するヘルパー関数
 */
export const groupSkillsByCategory = (skills) => {
  return skills.reduce((groups, skill) => {
    const category = skill.category || 'その他';
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(skill);
    return groups;
  }, {});
};
