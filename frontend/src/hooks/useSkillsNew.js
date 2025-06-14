import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../utils/axios';

export const useSkills = (showSnackbar) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [customSkillForm, setCustomSkillForm] = useState({
    name: '',
    category: '',
    description: ''
  });
  const [snackbar, setSnackbar] = useState({
    isOpen: false,
    message: '',
    severity: 'info',
    skillName: ''
  });

  const queryClient = useQueryClient();

  // debounced search query - 500ms待ってから検索実行
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // スキル一覧の取得
  const { data: skillsData, isLoading } = useQuery({
    queryKey: ['company-skills'],
    queryFn: async () => {
      try {
        const response = await api.get('/skills/company');
        
        if (response.data?.status === 'success' && response.data?.data?.skills) {
          return response.data.data.skills;
        } else if (Array.isArray(response.data)) {
          return response.data;
        } else {
          return [];
        }
      } catch (error) {
        console.error('❌ 会社選択済みスキル取得エラー:', error);
        return [];
      }
    },
    initialData: []
  });

  // 利用可能なグローバルスキルの取得
  const { data: availableSkillsData, isLoading: isLoadingAvailable } = useQuery({
    queryKey: ['available-skills'],
    queryFn: async () => {
      try {
        const response = await api.get('/skills/company/available');
        
        if (response.data?.status === 'success' && response.data?.data?.skills) {
          const skills = response.data.data.skills;
          
          // JWTトークンの問題を検出
          if (skills.length === 0 && response.data?.message === '会社が設定されていません') {
            const shouldReLogin = window.confirm(
              '⚠️ 認証情報の更新が必要です\n\n' +
              'システムの更新により、一度ログアウトして再ログインしていただく必要があります。\n' +
              '「OK」を押すと自動的にログアウトします。'
            );
            
            if (shouldReLogin) {
              localStorage.removeItem('token');
              window.location.href = '/login';
              return [];
            }
          }
          return skills;
        } else {
          return [];
        }
      } catch (error) {
        console.error('❌ 利用可能スキル取得エラー:', error);
        
        if (error.response?.status === 401) {
          showSnackbar('認証が無効になりました。再ログインしてください。', 'error');
          setTimeout(() => {
            localStorage.removeItem('token');
            window.location.href = '/login';
          }, 2000);
        }
        return [];
      }
    },
    initialData: []
  });

  // グローバルスキルから会社に追加
  const addSkillToCompany = useMutation({
    mutationFn: async (globalSkillId) => {
      const response = await api.post('/skills/company/select', { 
        globalSkillId,
        isRequired: false
      });
      return response.data.data.skill;
    },
    onSuccess: (data) => {
      const skillName = snackbar.skillName || data?.name || data?.skill?.name || 'スキル';
      showSnackbar(`「${skillName}」を会社のスキルに追加しました`, 'success');
      queryClient.invalidateQueries(['company-skills']);
      queryClient.invalidateQueries(['available-skills']);
    },
    onError: (error) => {
      const errorMessage = error.response?.data?.message || error.message || 'スキルの追加に失敗しました';
      showSnackbar(errorMessage, 'error');
    }
  });

  // 会社からスキルを削除
  const removeSkillFromCompany = useMutation({
    mutationFn: async (skillId) => {
      await api.delete(`/skills/company/${skillId}`);
    },
    onSuccess: () => {
      showSnackbar('スキルを会社の選択から削除しました', 'success');
      queryClient.invalidateQueries(['company-skills']);
      queryClient.invalidateQueries(['available-skills']);
    },
    onError: (error) => {
      const errorMessage = error.response?.data?.message || error.message || 'スキルの削除に失敗しました';
      showSnackbar(errorMessage, 'error');
    }
  });

  // 独自スキル作成
  const createCustomSkill = useMutation({
    mutationFn: async (skillData) => {
      const response = await api.post('/skills/company/custom', skillData);
      return response.data;
    },
    onSuccess: (data, variables) => {
      const skillName = variables.name;
      showSnackbar(`独自スキル「${skillName}」を作成しました`, 'success');
      queryClient.invalidateQueries(['company-skills']);
      queryClient.invalidateQueries(['available-skills']);
    },
    onError: (error) => {
      const errorMessage = error.response?.data?.message || error.message || '独自スキルの作成に失敗しました';
      showSnackbar(errorMessage, 'error');
    }
  });

  // カテゴリごとにスキルをグループ化
  const groupedAvailableSkills = useMemo(() => {
    if (!Array.isArray(availableSkillsData)) return {};
    
    return availableSkillsData.reduce((acc, skill) => {
      const category = skill.category || 'その他';
      if (!acc[category]) acc[category] = [];
      acc[category].push(skill);
      return acc;
    }, {});
  }, [availableSkillsData]);

  // フィルタリング
  const filteredSkills = useMemo(() => {
    if (!Array.isArray(skillsData)) return [];
    
    return skillsData.filter(skill =>
      skill?.name?.toLowerCase().includes(debouncedSearchQuery.toLowerCase())
    );
  }, [skillsData, debouncedSearchQuery]);

  const filteredAvailableSkills = useMemo(() => {
    if (!Array.isArray(availableSkillsData)) return [];
    
    let filtered = availableSkillsData;
    
    if (debouncedSearchQuery) {
      filtered = filtered.filter(skill =>
        skill?.name?.toLowerCase().includes(debouncedSearchQuery.toLowerCase())
      );
    }
    
    if (selectedCategory) {
      filtered = filtered.filter(skill => skill.category === selectedCategory);
    }
    
    return filtered;
  }, [availableSkillsData, debouncedSearchQuery, selectedCategory]);

  const handleAddSkillToCompany = (skill) => {
    setSnackbar(prev => ({ ...prev, skillName: skill.name }));
    addSkillToCompany.mutate(skill.id);
  };

  const handleRemoveSkillFromCompany = (skill) => {
    if (window.confirm(`「${skill.name}」を会社のスキル選択から削除してもよろしいですか？`)) {
      removeSkillFromCompany.mutate(skill.id);
    }
  };

  const handleCreateCustomSkill = (formData) => {
    if (!formData.name.trim()) {
      showSnackbar('スキル名を入力してください', 'error');
      return;
    }
    if (!formData.category.trim()) {
      showSnackbar('カテゴリを入力してください', 'error');
      return;
    }
    createCustomSkill.mutate(formData);
  };

  const handleCustomSkillFormChange = (field, value) => {
    setCustomSkillForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return {
    // State
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    customSkillForm,
    setCustomSkillForm,
    
    // Data
    skillsData: filteredSkills,
    availableSkillsData: filteredAvailableSkills,
    groupedAvailableSkills,
    
    // Loading states
    isLoading,
    isLoadingAvailable,
    
    // Mutations
    addSkillToCompany,
    removeSkillFromCompany,
    createCustomSkill,
    
    // Handlers
    handleAddSkillToCompany,
    handleRemoveSkillFromCompany,
    handleCreateCustomSkill,
    handleCustomSkillFormChange
  };
};
