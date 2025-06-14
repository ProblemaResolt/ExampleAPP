import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '../utils/axios';

export const useSkills = (showSnackbar) => {
  console.log('🚨 useSkills フック実行開始 - ファイル監視テスト');
  
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
  console.log('🚨 QueryClient:', queryClient);

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
        }      } catch (error) {
        console.error('❌ 会社選択済みスキル取得エラー:', error);
        return [];
      }
    },
    staleTime: 0,        // データを常に古いとみなす
    gcTime: 0,           // キャッシュを即座に削除
    refetchOnMount: true, // マウント時に必ず再取得
    enabled: true,       // 常に会社スキルを取得
    retry: 1            // リトライ回数を制限
  });
  
  console.log('🚨 useQuery（available-skills）実行前');
    // 利用可能なグローバルスキルの取得
  const { data: availableSkillsData, isLoading: isLoadingAvailable, error: availableSkillsError } = useQuery({
    queryKey: ['available-skills'],
    queryFn: async () => {
      console.log('🔄 グローバルスキルAPI呼び出し開始...');
      try {
        const response = await api.get('/skills/global');
        console.log('📨 API応答:', response);
        
        if (response.data?.status === 'success' && response.data?.data?.skills) {
          const skills = response.data.data.skills;
          console.log(`✅ Successfully retrieved ${skills.length} available skills`);
          return skills;
        } else {
          console.warn('⚠️ Unexpected API response format:', response.data);
          return [];
        }
      } catch (error) {
        console.error('❌ 利用可能スキル取得エラー:', error);
        console.error('   ステータス:', error.response?.status);
        console.error('   データ:', error.response?.data);
        
        if (error.response?.status === 401) {
          showSnackbar('認証が無効になりました。再ログインしてください。', 'error');
          setTimeout(() => {
            localStorage.removeItem('token');
            const navigate = useNavigate();
            navigate('/login');
          }, 2000);
        }
        throw error; // エラーを再スローしてReact Queryにエラーを認識させる
      }
    },
    staleTime: 0,        // データを常に古いとみなす
    gcTime: 0,           // キャッシュを即座に削除
    refetchOnMount: true, // マウント時に必ず再取得
    enabled: true,       // 常にグローバルスキルを取得
    retry: 1            // リトライ回数を制限
  });
  
  console.log('🚨 useQuery（available-skills）実行後 - データ:', availableSkillsData);
  console.log('🚨 useQuery（available-skills）実行後 - ローディング:', isLoadingAvailable);
  console.log('🚨 useQuery（available-skills）実行後 - エラー:', availableSkillsError);

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
  });  // 独自スキル作成
  const createCustomSkill = useMutation({
    mutationFn: async (skillData) => {
      console.log('🔄 カスタムスキル作成開始:', skillData);
      
      // ユーザー情報を確認
      try {
        const userResponse = await api.get('/users/me');
        console.log('👤 現在のユーザー情報:', userResponse.data);
      } catch (userError) {
        console.error('❌ ユーザー情報取得エラー:', userError);
      }
      
      try {
        const response = await api.post('/skills/company/custom', skillData);
        console.log('✅ カスタムスキル作成成功:', response.data);
        return response.data;
      } catch (error) {
        console.error('❌ カスタムスキル作成エラー:', error);
        console.error('   ステータス:', error.response?.status);
        console.error('   レスポンス:', error.response?.data);
        console.error('   ヘッダー:', error.response?.headers);
        console.error('   リクエストURL:', error.config?.url);
        console.error('   リクエストメソッド:', error.config?.method);
        console.error('   リクエストデータ:', error.config?.data);
        
        // 403エラーの場合は詳細なデバッグ情報を出力
        if (error.response?.status === 403) {
          console.error('🚫 403 Forbidden Error - 権限エラーの詳細:');
          console.error('   エラーメッセージ:', error.response?.data?.message);
          console.error('   要求権限:', ['ADMIN', 'COMPANY', 'MANAGER']);
        }
        
        throw error;
      }
    },
    onSuccess: () => {
      const skillName = customSkillForm.name;
      showSnackbar(`独自スキル「${skillName}」を作成しました`, 'success');
      queryClient.invalidateQueries(['company-skills']);
      queryClient.invalidateQueries(['available-skills']);
      setCustomSkillForm({ name: '', category: '', description: '' });
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
  };  return {
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
    handleCustomSkillFormChange
  };
};
