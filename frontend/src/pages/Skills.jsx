import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FaPlus, FaEdit, FaTrash, FaLightbulb } from 'react-icons/fa';
import api from '../utils/axios';

const Skills = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [newSkillName, setNewSkillName] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [editingSkill, setEditingSkill] = useState(null);
  const [editName, setEditName] = useState('');
  const [showAvailableSkills, setShowAvailableSkills] = useState(false);
  const [showCreateCustomSkill, setShowCreateCustomSkill] = useState(false);
  const [customSkillForm, setCustomSkillForm] = useState({
    name: '',
    category: '',
    description: ''
  });
  const queryClient = useQueryClient();

  // debounced search query - 500ms待ってから検索実行
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);  // スキル一覧の取得（新しいAPIエンドポイントを使用）
  const { data: skillsData, isLoading } = useQuery({
    queryKey: ['company-skills'],
    queryFn: async () => {
      try {
        console.log('🔍 会社選択済みスキルAPI呼び出し開始...');
        const response = await api.get('/api/skills/company');
        console.log('📋 API応答:', response.data);
        
        // 新しいスキル管理APIから { status: 'success', data: { skills } } の形で返される
        if (response.data?.status === 'success' && response.data?.data?.skills) {
          console.log('✅ 会社選択済みスキル取得成功:', response.data.data.skills.length, '件');
          return response.data.data.skills;
        } else if (Array.isArray(response.data)) {
          console.log('✅ 配列形式で取得:', response.data.length, '件');
          return response.data;
        } else {
          console.log('⚠️ 予期しない応答形式:', response.data);
          return [];        }
      } catch (error) {
        console.error('❌ 会社選択済みスキル取得エラー:', error);
        console.error('   ステータス:', error.response?.status);
        console.error('   データ:', error.response?.data);
        return [];
      }
    },
    initialData: []
  });
  // 利用可能なグローバルスキルの取得
  const { data: availableSkillsData } = useQuery({
    queryKey: ['available-skills'],
    queryFn: async () => {      try {
        console.log('🔍 利用可能スキルAPI呼び出し開始...');
        const response = await api.get('/api/skills/company/available');
        console.log('📋 API応答:', response.data);
        
        if (response.data?.status === 'success' && response.data?.data?.skills) {
          console.log('✅ 利用可能スキル取得成功:', response.data.data.skills.length, '件');
          // 一時的なアラート
          if (response.data.data.skills.length === 0) {
            console.log('⚠️ 利用可能スキルが0件です！APIは正常ですがデータがありません');
          }
          return response.data.data.skills;
        } else {
          console.log('⚠️ 予期しない応答形式:', response.data);
          return [];
        }
      } catch (error) {
        console.error('❌ 利用可能スキル取得エラー:', error);
        console.error('   ステータス:', error.response?.status);
        console.error('   データ:', error.response?.data);
        return [];
      }
    },
    initialData: [],
    enabled: showAvailableSkills  });

  // グローバルスキルから会社に追加
  const addSkillToCompany = useMutation({
    mutationFn: async (globalSkillId) => {
      console.log('📡 API Request:', {
        url: '/api/skills/company/select',
        method: 'POST',
        data: { 
          globalSkillId,
          isRequired: false
        },
        dataTypes: {
          globalSkillId: typeof globalSkillId,
          isRequired: typeof false
        }
      });
      
      const response = await api.post('/api/skills/company/select', { 
        globalSkillId,
        isRequired: false
      });
      
      console.log('✅ API Response:', response.data);
      return response.data.data.skill;
    },
    onSuccess: (data) => {
      console.log('🎉 Skill added successfully:', data);
      queryClient.invalidateQueries(['company-skills']);
      queryClient.invalidateQueries(['available-skills']);
    },
    onError: (error) => {
      console.error('❌ Add skill error:', error);
      console.error('❌ Error response:', error.response?.data);
      alert('スキルの追加に失敗しました: ' + (error.response?.data?.message || error.message));
    }
  });
  // 会社からスキルを削除
  const removeSkillFromCompany = useMutation({
    mutationFn: async (skillId) => {
      await api.delete(`/api/skills/company/${skillId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['company-skills']);
      queryClient.invalidateQueries(['available-skills']);
    },
    onError: (error) => {
      alert('スキルの削除に失敗しました: ' + (error.response?.data?.message || error.message));
    }
  });

  // 独自スキル作成
  const createCustomSkill = useMutation({
    mutationFn: async (skillData) => {
      const response = await api.post('/api/skills/company/custom', skillData);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['company-skills']);
      queryClient.invalidateQueries(['available-skills']);
      setCustomSkillForm({ name: '', category: '', description: '' });
      setShowCreateCustomSkill(false);
    },
    onError: (error) => {
      alert('独自スキルの作成に失敗しました: ' + (error.response?.data?.message || error.message));
    }
  });  const handleAddSkillToCompany = (globalSkillId) => {
    console.log('🔄 Adding skill to company:', { globalSkillId });
    addSkillToCompany.mutate(globalSkillId);
  };const handleRemoveSkillFromCompany = (skill) => {
    if (window.confirm(`「${skill.name}」を会社のスキル選択から削除してもよろしいですか？`)) {
      removeSkillFromCompany.mutate(skill.id);
    }
  };

  const handleCreateCustomSkill = (e) => {
    e.preventDefault();
    if (!customSkillForm.name.trim()) {
      alert('スキル名を入力してください');
      return;
    }
    if (!customSkillForm.category.trim()) {
      alert('カテゴリを入力してください');
      return;
    }
    createCustomSkill.mutate(customSkillForm);
  };

  const handleCustomSkillFormChange = (field, value) => {
    setCustomSkillForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // カテゴリごとにスキルをグループ化
  const groupedAvailableSkills = useMemo(() => {
    if (!Array.isArray(availableSkillsData)) return {};
    
    return availableSkillsData.reduce((acc, skill) => {
      const category = skill.category || 'その他';
      if (!acc[category]) acc[category] = [];
      acc[category].push(skill);
      return acc;
    }, {});
  }, [availableSkillsData]);  // フィルタリング - デバウンス検索クエリを使用
  const filteredSkills = useMemo(() => {
    if (!Array.isArray(skillsData)) return [];
    
    return skillsData.filter(skill =>
      skill?.name?.toLowerCase().includes(debouncedSearchQuery.toLowerCase())
    );
  }, [skillsData, debouncedSearchQuery]);

  // 利用可能スキルのフィルタリング
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

  if (isLoading) {
    return (
      <div className="w3-container w3-padding-64">
        <div className="w3-center">
          <i className="fa fa-spinner fa-spin fa-3x"></i>
          <p>読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w3-container w3-padding">
      <div className="w3-card-4 w3-white">
        <header className="w3-container w3-blue">
          <h2>スキル管理</h2>
        </header>        <div className="w3-container w3-padding">          {/* タブ切り替え */}
          <div className="w3-bar w3-border-bottom w3-margin-bottom">
            <button 
              className={`w3-bar-item w3-button ${!showAvailableSkills && !showCreateCustomSkill ? 'w3-blue' : 'w3-light-gray'}`}
              onClick={() => {
                setShowAvailableSkills(false);
                setShowCreateCustomSkill(false);
              }}
            >
              会社選択済みスキル
            </button>
            <button 
              className={`w3-bar-item w3-button ${showAvailableSkills && !showCreateCustomSkill ? 'w3-blue' : 'w3-light-gray'}`}
              onClick={() => {
                setShowAvailableSkills(true);
                setShowCreateCustomSkill(false);
              }}
            >
              利用可能スキル
            </button>
            <button 
              className={`w3-bar-item w3-button ${showCreateCustomSkill ? 'w3-blue' : 'w3-light-gray'}`}
              onClick={() => {
                setShowAvailableSkills(false);
                setShowCreateCustomSkill(true);
              }}
            >
              <FaLightbulb className="w3-margin-right" />
              独自スキル作成
            </button>
          </div>          {/* 検索 */}
          {!showCreateCustomSkill && (
            <div className="w3-margin-bottom">
              <div className="w3-row">
                <div className="w3-col m8">
                  <input
                    className="w3-input w3-border"
                    type="text"
                    placeholder="スキルを検索..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                {showAvailableSkills && (
                  <div className="w3-col m4">
                    <select
                      className="w3-select w3-border"
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                    >
                      <option value="">全カテゴリ</option>
                      {Object.keys(groupedAvailableSkills).map(category => (
                        <option key={category} value={category}>{category}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>
          )}          {!showAvailableSkills && !showCreateCustomSkill ? (
            /* 会社選択済みスキル一覧 */
            <div className="w3-responsive">
              <table className="w3-table w3-striped w3-bordered">
                <thead>
                  <tr className="w3-blue">
                    <th>スキル名</th>
                    <th>カテゴリ</th>
                    <th>使用者数</th>
                    <th>必須</th>
                    <th>操作</th>                  </tr>
                </thead>
                <tbody>{filteredSkills.map((skill) => (
                    <tr key={skill.id} className="w3-hover-light-gray">
                      <td>{skill.name}</td>
                      <td>
                        <span className="w3-tag w3-round w3-small w3-light-blue">
                          {skill.category || 'その他'}
                        </span>
                      </td>
                      <td>
                        <span className="w3-tag w3-light-blue">
                          {skill._count?.userSkills || 0}人
                        </span>
                      </td>
                      <td>
                        {skill.isRequired ? (
                          <span className="w3-tag w3-red">必須</span>
                        ) : (
                          <span className="w3-tag w3-gray">任意</span>
                        )}
                      </td>
                      <td>
                        <button
                          className="w3-button w3-small w3-red"
                          onClick={() => handleRemoveSkillFromCompany(skill)}
                          title="会社から削除"
                          disabled={removeSkillFromCompany.isPending}
                        >
                          <FaTrash />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredSkills.length === 0 && (
                    <tr>
                      <td colSpan="5" className="w3-center w3-text-gray">
                        {searchQuery ? '該当するスキルがありません' : '選択済みスキルがありません'}
                      </td>
                    </tr>
                  )}                </tbody>
              </table>
            </div>
          ) : showAvailableSkills && !showCreateCustomSkill ? (
            /* 利用可能スキル一覧 */
            <div className="w3-responsive">
              <table className="w3-table w3-striped w3-bordered">
                <thead>
                  <tr className="w3-green">
                    <th>スキル名</th>
                    <th>カテゴリ</th>
                    <th>説明</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAvailableSkills.map((skill) => (
                    <tr key={skill.id} className="w3-hover-light-gray">
                      <td>{skill.name}</td>
                      <td>
                        <span className="w3-tag w3-round w3-small w3-green">
                          {skill.category || 'その他'}
                        </span>
                      </td>
                      <td>
                        <small className="w3-text-gray">
                          {skill.description || 'なし'}
                        </small>
                      </td>
                      <td>
                        <button
                          className="w3-button w3-small w3-blue"
                          onClick={() => handleAddSkillToCompany(skill.id)}
                          title="会社に追加"
                          disabled={addSkillToCompany.isPending}
                        >
                          <FaPlus />
                        </button>
                      </td>
                    </tr>
                  ))}                  {filteredAvailableSkills.length === 0 && (
                    <tr>
                      <td colSpan="4" className="w3-center w3-text-gray">
                        {searchQuery || selectedCategory ? '該当するスキルがありません' : '利用可能なスキルがありません'}
                        <br />
                        <small style={{color: '#999', fontSize: '0.8em'}}>
                          デバッグ: 生データ({availableSkillsData?.length || 0}件), フィルター後({filteredAvailableSkills.length}件)
                        </small>
                      </td>
                    </tr>
                  )}</tbody>
              </table>
            </div>
          ) : (
            /* 独自スキル作成フォーム */
            <div className="w3-container">
              <div className="w3-card-4 w3-light-blue w3-margin-bottom">
                <div className="w3-container w3-padding">
                  <h4><FaLightbulb className="w3-margin-right" />独自スキル作成</h4>
                  <p>会社独自のスキルを作成できます。グローバルスキルにない技術や会社特有のスキルを追加してください。</p>
                </div>
              </div>

              <form onSubmit={handleCreateCustomSkill} className="w3-container">
                <div className="w3-row-padding">
                  <div className="w3-half">
                    <label className="w3-text-blue"><b>スキル名 *</b></label>
                    <input
                      className="w3-input w3-border w3-margin-bottom"
                      type="text"
                      placeholder="例: 独自フレームワーク、社内システム..."
                      value={customSkillForm.name}
                      onChange={(e) => handleCustomSkillFormChange('name', e.target.value)}
                      required
                    />
                  </div>
                  <div className="w3-half">
                    <label className="w3-text-blue"><b>カテゴリ *</b></label>
                    <input
                      className="w3-input w3-border w3-margin-bottom"
                      type="text"
                      placeholder="例: フロントエンド、バックエンド、ツール..."
                      value={customSkillForm.category}
                      onChange={(e) => handleCustomSkillFormChange('category', e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="w3-margin-bottom">
                  <label className="w3-text-blue"><b>説明</b></label>
                  <textarea
                    className="w3-input w3-border"
                    rows="3"
                    placeholder="スキルの詳細説明（任意）"
                    value={customSkillForm.description}
                    onChange={(e) => handleCustomSkillFormChange('description', e.target.value)}
                  ></textarea>
                </div>

                <div className="w3-margin-bottom">
                  <button
                    type="submit"
                    className="w3-button w3-blue w3-margin-right"
                    disabled={createCustomSkill.isPending}
                  >
                    {createCustomSkill.isPending ? (
                      <>
                        <i className="fa fa-spinner fa-spin w3-margin-right"></i>
                        作成中...
                      </>
                    ) : (
                      <>
                        <FaPlus className="w3-margin-right" />
                        独自スキルを作成
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    className="w3-button w3-gray"
                    onClick={() => {
                      setCustomSkillForm({ name: '', category: '', description: '' });
                      setShowCreateCustomSkill(false);
                    }}
                  >
                    キャンセル
                  </button>
                </div>
              </form>

              <div className="w3-panel w3-pale-yellow w3-border-yellow">
                <h4>ご注意</h4>
                <ul>
                  <li>作成した独自スキルは自動的に会社のスキル選択に追加されます</li>
                  <li>既存のグローバルスキルと重複する名前は使用できません</li>
                  <li>会社内で既に同じ名前のスキルがある場合は作成できません</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Skills;
