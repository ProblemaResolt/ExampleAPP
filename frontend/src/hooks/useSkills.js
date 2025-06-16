import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '../utils/axios';

export const useSkills = (showSnackbar) => {
  const navigate = useNavigate(); // フックをトップレベルで定義
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
  }, [searchQuery]);  // スキル一覧の取得
  const { data: skillsData, isLoading, error: skillsError } = useQuery({
    queryKey: ['company-skills'],
    queryFn: async () => {      try {
        const response = await api.get('/skills/company');
        
        if (response.data?.status === 'success' && response.data?.data?.skills) {
          return response.data.data.skills;
        } else if (Array.isArray(response.data)) {
          return response.data;
        } else {
          return [];
        }
      } catch (error) {
        if (error.response?.status === 401) {
          showSnackbar('認証エラーが発生しました。', 'error');
        }        return [];
      }
    },
    staleTime: 2 * 60 * 1000,        // 2分間キャッシュ（短めに設定して適度に更新）
    gcTime: 10 * 60 * 1000,          // 10分間メモリに保持
    refetchOnMount: false,           // マウント時の自動再取得を無効
    refetchOnWindowFocus: false,     // ウィンドウフォーカス時の再取得を無効
    enabled: true,
    retry: 1  });

  // 利用可能なグローバルスキルの取得
  const { data: availableSkillsData, isLoading: isLoadingAvailable, error: availableSkillsError } = useQuery({
    queryKey: ['available-skills'],
    queryFn: async () => {      try {
        const response = await api.get('/skills/company/available');
        
        if (response.data?.status === 'success' && response.data?.data?.skills) {
          const skills = response.data.data.skills;
          return skills;
        } else {
          console.warn('⚠️ 予期しないレスポンス形式:', response.data);
          return [];
        }
      } catch (error) {
        console.error('❌ 利用可能スキル取得エラー:', error);
        if (error.response?.status === 401) {
          showSnackbar('認証が無効になりました。ページを再読み込みしてください。', 'error');
          // 自動リダイレクトを削除 - ユーザーに選択権を与える
        }        throw error; // エラーを再スローしてReact Queryにエラーを認識させる
      }
    },
    staleTime: 2 * 60 * 1000,        // 2分間キャッシュ（短めに設定して適度に更新）
    gcTime: 10 * 60 * 1000,          // 10分間メモリに保持
    refetchOnMount: false,           // マウント時の自動再取得を無効
    refetchOnWindowFocus: false,     // ウィンドウフォーカス時の再取得を無効
    enabled: true,
    retry: 1
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
    onMutate: async (globalSkillId) => {
      // 楽観的更新: リクエスト前にUIを更新
      await queryClient.cancelQueries(['company-skills']);
      await queryClient.cancelQueries(['available-skills']);
      
      // 現在のデータを保存（ロールバック用）
      const previousCompanySkills = queryClient.getQueryData(['company-skills']);
      const previousAvailableSkills = queryClient.getQueryData(['available-skills']);
      
      // 追加されるスキルを見つける
      const skillToAdd = availableSkillsData?.find(skill => skill.id === globalSkillId);
      
      if (skillToAdd && previousCompanySkills) {
        // 楽観的にスキルを追加
        const optimisticSkill = {
          id: `temp-${Date.now()}`, // 一時的なID
          globalSkill: skillToAdd,
          isRequired: false,
          userSkills: []
        };
        
        queryClient.setQueryData(['company-skills'], [...previousCompanySkills, optimisticSkill]);
        
        // 利用可能スキルからも削除
        if (previousAvailableSkills) {
          queryClient.setQueryData(['available-skills'], 
            previousAvailableSkills.filter(skill => skill.id !== globalSkillId)
          );
        }
      }
      
      return { previousCompanySkills, previousAvailableSkills };
    },
    onSuccess: (data, variables, context) => {
      const skillName = snackbar.skillName || data?.globalSkill?.name || data?.name || 'スキル';
      showSnackbar(`「${skillName}」を会社のスキルに追加しました`, 'success');
      
      // 成功時は正確なデータで更新
      queryClient.invalidateQueries(['company-skills']);
      queryClient.invalidateQueries(['available-skills']);
    },
    onError: (error, variables, context) => {
      console.error('❌ スキル追加エラー:', error);
      
      // エラー時は前の状態にロールバック
      if (context?.previousCompanySkills) {
        queryClient.setQueryData(['company-skills'], context.previousCompanySkills);
      }
      if (context?.previousAvailableSkills) {
        queryClient.setQueryData(['available-skills'], context.previousAvailableSkills);
      }
      
      let errorMessage = error.response?.data?.message || error.message || 'スキルの追加に失敗しました';
      
      if (error.response?.status === 401) {
        errorMessage = '認証が無効です。ページを再読み込みしてから再試行してください。';
      }
      
      showSnackbar(errorMessage, 'error');
    }
  });
  // 会社からスキルを削除
  const removeSkillFromCompany = useMutation({
    mutationFn: async (skillId) => {
      await api.delete(`/skills/company/${skillId}`);
      return skillId;
    },
    onMutate: async (skillId) => {
      // 楽観的更新: リクエスト前にUIを更新
      await queryClient.cancelQueries(['company-skills']);
      await queryClient.cancelQueries(['available-skills']);
      
      // 現在のデータを保存（ロールバック用）
      const previousCompanySkills = queryClient.getQueryData(['company-skills']);
      const previousAvailableSkills = queryClient.getQueryData(['available-skills']);
      
      // 削除されるスキルを見つける
      const skillToRemove = previousCompanySkills?.find(skill => skill.id === skillId);
      
      if (skillToRemove && previousCompanySkills) {
        // 楽観的にスキルを削除
        queryClient.setQueryData(['company-skills'], 
          previousCompanySkills.filter(skill => skill.id !== skillId)
        );
        
        // 利用可能スキルに追加
        if (previousAvailableSkills && skillToRemove.globalSkill) {
          queryClient.setQueryData(['available-skills'], 
            [...previousAvailableSkills, skillToRemove.globalSkill]
          );
        }
      }
      
      return { previousCompanySkills, previousAvailableSkills };
    },
    onSuccess: (skillId, variables, context) => {
      showSnackbar('スキルを会社の選択から削除しました', 'success');
      
      // 成功時は正確なデータで更新
      queryClient.invalidateQueries(['company-skills']);
      queryClient.invalidateQueries(['available-skills']);
    },
    onError: (error, variables, context) => {
      console.error('❌ スキル削除エラー:', error);
      
      // エラー時は前の状態にロールバック
      if (context?.previousCompanySkills) {
        queryClient.setQueryData(['company-skills'], context.previousCompanySkills);
      }
      if (context?.previousAvailableSkills) {
        queryClient.setQueryData(['available-skills'], context.previousAvailableSkills);
      }
      
      let errorMessage = error.response?.data?.message || error.message || 'スキルの削除に失敗しました';
      
      if (error.response?.status === 401) {
        errorMessage = '認証が無効です。ページを再読み込みしてから再試行してください。';
      }
      
      showSnackbar(errorMessage, 'error');
    }
  });

  // 独自スキル作成
  const createCustomSkill = useMutation({
    mutationFn: async (skillData) => {
      try {
        const response = await api.post('/skills/company/custom', skillData);
        return response.data;
      } catch (error) {
        throw error;
      }
    },
    onSuccess: () => {
      const skillName = customSkillForm.name;
      showSnackbar(`独自スキル「${skillName}」を作成しました`, 'success');
      queryClient.invalidateQueries(['company-skills']);
      queryClient.invalidateQueries(['available-skills']);
      setCustomSkillForm({ name: '', category: '', description: '' });
    },    onError: (error) => {
      console.error('❌ 独自スキル作成エラー:', error);
      let errorMessage = error.response?.data?.message || error.message || '独自スキルの作成に失敗しました';
      
      if (error.response?.status === 401) {
        errorMessage = '認証が無効です。ページを再読み込みしてから再試行してください。';
      }
      
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
    
    return skillsData.filter(skill => {
      const skillName = skill?.globalSkill?.name || skill?.name || '';
      return skillName.toLowerCase().includes(debouncedSearchQuery.toLowerCase());
    });
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
  };  const handleRemoveSkillFromCompany = (skill) => {
    const skillName = skill.globalSkill?.name || skill.name;
    // 確認ダイアログを削除し、直接削除実行
    removeSkillFromCompany.mutate(skill.id);
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

  // 手動リフレッシュ機能
  const refetchData = () => {
    queryClient.invalidateQueries(['company-skills']);
    queryClient.invalidateQueries(['available-skills']);
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
    rawAvailableSkillsData: availableSkillsData, // 元のデータも返す
    groupedAvailableSkills,
    
    // Loading states
    isLoading,
    isLoadingAvailable,
    
    // Error states
    availableSkillsError,
    
    // Mutations
    addSkillToCompany,
    removeSkillFromCompany,
    createCustomSkill,
    
    // Handlers
    handleAddSkillToCompany,
    handleRemoveSkillFromCompany,
    handleCreateCustomSkill,
    handleCustomSkillFormChange,
    
    // Utilities
    refetchData
  };
};
