import React, { useState, useMemo, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { FaUser, FaBuilding, FaFilter } from 'react-icons/fa';
import api from '../utils/axios';

const AddMemberDialog = ({ 
  open, 
  onClose, 
  project, 
  onSubmit,
  roleFilter = null, // 特定のロールのみフィルタリング ['COMPANY', 'MANAGER'] または ['MEMBER']
  excludeIds = [], // 除外するメンバーID
  title = 'メンバーを追加', // ダイアログのタイトル
  preSelectedMemberIds = [], // 事前選択されたメンバーID
  calculateTotalAllocation = null // 総工数計算関数
}) => {
  const [selectedMemberIds, setSelectedMemberIds] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [selectedSkills, setSelectedSkills] = useState([]);  const [showOverAllocated, setShowOverAllocated] = useState(false);
  const [maxAllocation, setMaxAllocation] = useState(1.0);
  const [error, setError] = useState('');
  const [memberAllocations, setMemberAllocations] = useState({});
  const [showFilters, setShowFilters] = useState(false);

  const { user: currentUser } = useAuth();

  // 一時的な解決策: 全プロジェクトデータを取得して総工数を計算
  const { data: allProjectsData } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const response = await api.get('/projects');
      return response.data;
    },
    enabled: open // ダイアログが開いている時のみクエリを実行
  });

  // 総工数計算のローカル関数
  const calculateLocalTotalAllocation = (userId) => {
    if (!allProjectsData?.projects) return 0;
    
    let total = 0;
    allProjectsData.projects.forEach(project => {
      project.members?.forEach(membership => {
        if (membership.userId === userId) {
          total += membership.allocation || 0;
        }
      });
    });
    return total;
  };

  // debounced search query - 500ms待ってから検索実行
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);
  // モーダルが開かれた時の状態リセット
  React.useEffect(() => {
    if (open) {
      setSelectedMemberIds(preSelectedMemberIds || []);
      setSearchQuery('');
      setSelectedSkills([]);      setShowOverAllocated(false);
      setMaxAllocation(1.0);
      setError('');
      setMemberAllocations({});
      setShowFilters(false);
    }
  }, [open, preSelectedMemberIds]);

  // MEMBER ロールのアクセス制御チェック
  React.useEffect(() => {
    if (open && currentUser?.role === 'MEMBER') {
      setError('メンバーロールではメンバー管理機能にアクセスできません');
      onClose();
    }
  }, [open, currentUser, onClose]);
  // スキル一覧の取得（新しいAPIエンドポイントを使用）
  const { data: skillsData, isLoading: skillsLoading, error: skillsError } = useQuery({
    queryKey: ['company-skills'],
    queryFn: async () => {
      try {
        const response = await api.get('/skills/company');
        console.log('Skills API response:', response.data); // デバッグ用
        
        // 新しいスキル管理APIから { status: 'success', data: { skills } } の形で返される
        if (response.data?.status === 'success' && response.data?.data?.skills) {
          return response.data.data.skills;
        } else if (Array.isArray(response.data)) {
          return response.data;
        } else {
          return [];
        }
      } catch (error) {
        console.error('Error fetching company skills:', error);
        return [];
      }
    },    enabled: Boolean(open && currentUser && currentUser.role !== 'MEMBER'),
    initialData: []
  });
  // メンバー一覧の取得（モーダルが開いたときにフレッシュなデータを取得）
  const { data: membersData, isLoading: membersLoading, error: membersError } = useQuery({
    queryKey: ['members-with-skills', currentUser?.managedCompanyId, currentUser?.companyId, open],
    queryFn: async () => {
      if (currentUser?.role === 'MEMBER') {
        return [];
      }

      try {
        const params = {
          limit: 1000,
          include: 'skills'
        };
        
        // ロールベースの会社フィルタリング
        if (currentUser?.role === 'COMPANY' && currentUser?.managedCompanyId) {
          params.companyId = currentUser.managedCompanyId;
        } else if (currentUser?.role === 'MANAGER' && currentUser?.companyId) {
          params.companyId = currentUser.companyId;
        }
        
        console.log('🔍 メンバー取得API呼び出し:', params);
        const response = await api.get('/users', { params });
        console.log('🔍 メンバーAPI レスポンス:', response.data);
        
        const users = response.data.data.users || [];
        
        // 各メンバーにスキル情報が含まれているか確認
        console.log('🔍 取得したメンバーのスキル情報:', users.map(u => ({
          name: `${u.firstName} ${u.lastName}`,
          skills: u.userSkills || u.skills || [],
          skillCount: (u.userSkills || u.skills || []).length
        })));
        
        return users;
      } catch (error) {
        console.error('メンバー取得エラー:', error);
        throw error;
      }
    },
    enabled: Boolean(open && currentUser && currentUser.role !== 'MEMBER'),
    staleTime: 0, // 常に最新データを取得
    cacheTime: 0, // キャッシュしない
    onError: (error) => {
      console.error('メンバー取得エラー:', error);
    }
  });
  // メンバーのフィルタリングとソート
  const { availableMembers } = useMemo(() => {
    if (!membersData) return { availableMembers: [] };

    // 基本フィルター
    const baseFilter = member => {
      // ロールフィルタリング
      if (roleFilter && roleFilter.length > 0) {
        const roleMatches = roleFilter.includes(member.role);
        if (!roleMatches) {
          return false;
        }
      }

      // 除外IDフィルター
      if (excludeIds && excludeIds.length > 0) {
        if (excludeIds.includes(member.id)) {
          return false;
        }
      }

      // 既存プロジェクトメンバーの除外（プロジェクトが指定されている場合のみ）
      if (project) {
        const existingMemberIds = new Set([
          ...(project.members?.map(m => m.id) || []),
          ...(project.managers?.map(m => m.id) || [])
        ]);
        if (existingMemberIds.has(member.id)) {
          return false;
        }
      }

      return true;
    };
    
    // 検索フィルター
    const searchFilter = member => {
      const searchLower = debouncedSearchQuery.toLowerCase();
      return (
        member.firstName.toLowerCase().includes(searchLower) ||
        member.lastName.toLowerCase().includes(searchLower) ||
        member.email.toLowerCase().includes(searchLower) ||
        member.company?.name?.toLowerCase().includes(searchLower) ||
        member.position?.toLowerCase().includes(searchLower)
      );
    };
      // スキルフィルター
    const skillFilter = member => {
      if (selectedSkills.length === 0) return true;
      
      const memberSkills = member.userSkills || member.skills || [];
      console.log('🔍 スキルフィルタ - ユーザー:', member.firstName, member.lastName);
      console.log('🔍 選択されたスキル:', selectedSkills);
      console.log('🔍 メンバーのスキル:', memberSkills);
      
      return selectedSkills.every(skillId => {
        const hasSkill = memberSkills.some(userSkill => {
          // 新しいスキル管理システムに対応した比較
          const skillData = userSkill.companySelectedSkill;
          
          // 1. CompanySelectedSkill IDとの直接比較
          const matchesCompanySelectedSkillId = userSkill.companySelectedSkillId === skillId || 
                                              userSkill.companySelectedSkillId === parseInt(skillId);
          
          // 2. skillDataが存在する場合の比較
          let matchesSkillData = false;
          if (skillData) {
            matchesSkillData = skillData.id === skillId || skillData.id === parseInt(skillId);
          }
          
          // 3. 旧システムとの互換性チェック
          const matchesDirectId = userSkill.id === skillId || userSkill.id === parseInt(skillId);
          const matchesSkillId = userSkill.skillId === skillId || userSkill.skillId === parseInt(skillId);
          const matchesNestedSkillId = userSkill.skill?.id === skillId || userSkill.skill?.id === parseInt(skillId);
          
          // 4. スキル名による比較（フォールバック）
          const selectedSkillData = skillsData?.find(s => s.id === skillId || s.id === parseInt(skillId));
          const skillName = selectedSkillData?.name;
          const matchesSkillName = skillName && (
            userSkill.name === skillName || 
            userSkill.skill?.name === skillName ||
            skillData?.skillName === skillName ||
            skillData?.globalSkill?.name === skillName
          );
          
          console.log('🔍 スキルマッチング詳細:', {
            skillId,
            selectedSkillData,
            userSkill,
            skillData,
            matchesCompanySelectedSkillId,
            matchesSkillData,
            matchesDirectId,
            matchesSkillId,
            matchesNestedSkillId,
            matchesSkillName
          });
          
          return matchesCompanySelectedSkillId || matchesSkillData || matchesDirectId || 
                 matchesSkillId || matchesNestedSkillId || matchesSkillName;
        });
        
        console.log('🔍 スキル', skillId, 'のマッチング結果:', hasSkill);
        return hasSkill;
      });
    };

    // 工数フィルター
    const allocationFilter = member => {
      const currentAllocation = member.totalAllocation || 0;
      
      if (!showOverAllocated && currentAllocation >= 1.0) {
        return false;
      }
      
      return currentAllocation <= maxAllocation;
    };    // 既存メンバーのIDを取得
    // const existingMemberIds = new Set([
    //   ...(project.members?.map(m => m.id) || []),
    //   ...(project.managers?.map(m => m.id) || [])
    // ]);

    // 選択可能なメンバー（各種フィルターを適用）
    const available = membersData
      .filter(baseFilter)
      .filter(searchFilter)
      .filter(skillFilter)
      .filter(allocationFilter)
      .sort((a, b) => {
        const companyA = a.company?.name || '';
        const companyB = b.company?.name || '';
        if (companyA !== companyB) {
          return companyA.localeCompare(companyB);
        }
        return `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`);
      });    return { availableMembers: available };
  }, [membersData, project, debouncedSearchQuery, selectedSkills, showOverAllocated, maxAllocation, roleFilter, excludeIds]);  const handleSubmit = () => {
    try {
      if (selectedMemberIds.length === 0) {
        setError('メンバーを選択してください');
        return;
      }

      const selectedMembers = availableMembers
        .filter(member => selectedMemberIds.includes(member.id))
        .map(member => {
          const currentAllocation = member.totalAllocation || 0;
          const remainingAllocation = Math.max(0, 1.0 - currentAllocation);
          const defaultAllocation = Math.min(remainingAllocation, 1.0);
          
          return {
            ...member,
            allocation: memberAllocations[member.id] || defaultAllocation
          };
        });

      onSubmit(selectedMembers);
      onClose();
    } catch (error) {
      setError('メンバーの追加に失敗しました');
      console.error('Error adding members:', error);
    }
  };

  if (!open) return null;
  
  if (currentUser?.role === 'MEMBER') {
    return null;
  }  return (
    <div className="w3-modal" style={{ display: 'block', zIndex: 1001 }}>
      <div className="w3-modal-content w3-card-4 w3-animate-zoom" style={{ maxWidth: '90vw', width: 'auto' }}>
        <header className="w3-container w3-blue">
          <span 
            className="w3-button w3-display-topright w3-hover-red w3-large"
            onClick={onClose}
          >
            &times;
          </span>
          <h3>{title}</h3>
        </header>

        <div className="w3-container w3-padding">
          {error && (
            <div className="w3-panel w3-red w3-margin-bottom">
              <p>{error}</p>
            </div>
          )}

          {/* 検索バー */}
          <div className="w3-row-padding w3-margin-bottom">
            <div className="w3-col m10">
              <input
                className="w3-input w3-border"
                type="text"
                placeholder="名前、メール、会社名、役職で検索..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="w3-col m2">
              <button
                className={`w3-button w3-border w3-block ${showFilters ? 'w3-blue' : 'w3-light-grey'}`}
                onClick={() => setShowFilters(!showFilters)}
              >
                <FaFilter /> フィルタ
              </button>
            </div>
          </div>

          {/* フィルターセクション */}
          {showFilters && (
            <div className="w3-card w3-margin-bottom w3-padding">
              <h4 className="w3-text-blue">フィルタ条件</h4>
              <div className="w3-row-padding w3-margin-bottom">
                <div className="w3-col m6">                  <label className="w3-text-grey">スキルフィルタ</label>
                  <select
                    className="w3-select w3-border"
                    multiple
                    value={selectedSkills}
                    onChange={(e) => {                      const options = e.target.options;
                      const value = [];
                      for (let i = 0, l = options.length; i < l; i++) {
                        if (options[i].selected) {
                          value.push(options[i].value);
                        }
                      }
                      setSelectedSkills(value);
                    }}
                    style={{ minHeight: '120px' }}
                  >
                    {Array.isArray(skillsData) && skillsData.length > 0 ? (
                      skillsData.map(skill => {
                        const skillName = skill.globalSkill?.name || skill.skillName || skill.name || 'スキル名不明';
                        const skillId = skill.id || skill.globalSkillId;
                        return (
                          <option key={skillId} value={skillId}>
                            {skillName}
                          </option>
                        );
                      })
                    ) : (
                      <option disabled>
                        {skillsLoading ? 'スキルデータを読み込み中...' : 
                         Array.isArray(skillsData) ? 'スキルがありません' : 'スキルデータの形式が不正です'}
                      </option>
                    )}
                  </select>
                  <div className="w3-text-grey w3-small">
                    Ctrl+クリックで複数選択。選択したスキルをすべて持つメンバーが表示されます。
                    <br />
                    <span className="w3-text-blue">利用可能スキル数: {Array.isArray(skillsData) ? skillsData.length : 0}</span>
                    {skillsLoading && <span className="w3-text-orange"> (読み込み中...)</span>}
                    {skillsError && <span className="w3-text-red"> (エラー: {skillsError.message})</span>}
                    {/* デバッグ情報 */}
                    {Array.isArray(skillsData) && skillsData.length > 0 && (
                      <div className="w3-tiny w3-text-grey w3-margin-top">
                        <details>
                          <summary>デバッグ: 最初のスキルデータ</summary>
                          <pre style={{ fontSize: '10px', maxHeight: '100px', overflow: 'auto' }}>
                            {JSON.stringify(skillsData[0], null, 2)}
                          </pre>
                        </details>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="w3-col m6">
                  <label className="w3-text-grey">工数フィルタ</label>
                  <div className="w3-margin-bottom">
                    <input
                      type="range"
                      className="w3-input"
                      min="0"
                      max="1.5"
                      step="0.1"
                      value={maxAllocation}
                      onChange={(e) => setMaxAllocation(parseFloat(e.target.value))}
                    />
                    <div className="w3-small w3-text-grey">
                      最大現在工数: {Math.round(maxAllocation * 100)}%
                    </div>
                  </div>
                  <label className="w3-text-small">
                    <input
                      type="checkbox"
                      className="w3-check"
                      checked={showOverAllocated}
                      onChange={(e) => setShowOverAllocated(e.target.checked)}
                    />
                    <span className="w3-margin-left">工数100%超過メンバーも表示</span>
                  </label>
                </div>
              </div>
              
              <div className="w3-bar">
                <button
                  className="w3-button w3-light-grey"
                  onClick={() => {
                    setSelectedSkills([]);
                    setMaxAllocation(1.0);
                    setShowOverAllocated(true);
                    setSearchQuery('');
                  }}
                >
                  フィルタクリア
                </button>
                <span className="w3-margin-left w3-text-grey">
                  見つかったメンバー: {availableMembers.length}人
                  {selectedMemberIds.length > 0 && ` (${selectedMemberIds.length}人選択中)`}
                </span>
              </div>
            </div>
          )}          {/* メンバーテーブル */}
          <div className="w3-responsive">
            <table className="w3-table-all w3-striped w3-small">
              <thead>
                <tr>
                  <th>選択</th>
                  <th>名前</th>
                  <th>役職</th>
                  <th>メール</th>
                  <th>会社</th>
                  <th>スキル</th>
                  <th>現在の工数</th>                  <th>割り当て工数</th>
                </tr>
              </thead>
              <tbody>{availableMembers.map(member => {
                  // 総工数計算関数が提供されている場合は使用、そうでなければローカル関数を使用
                  const currentAllocation = calculateTotalAllocation ? calculateTotalAllocation(member.id) : calculateLocalTotalAllocation(member.id);
                  const isOverAllocated = currentAllocation >= 1.0;
                  const remainingAllocation = Math.max(0, 1.0 - currentAllocation);
                  const memberSkills = member.userSkills || member.skills || [];
                  console.log('🔍 メンバー表示 - スキル詳細:', {
                    name: `${member.firstName} ${member.lastName}`,
                    userSkills: member.userSkills,
                    skills: member.skills,
                    memberSkills,
                    skillCount: memberSkills.length
                  });
                  
                  return (
                    <tr key={member.id} className={isOverAllocated ? 'w3-pale-red' : remainingAllocation <= 0.1 ? 'w3-pale-yellow' : ''}>
                      <td>
                        <input
                          type="checkbox"
                          className="w3-check"
                          checked={selectedMemberIds.includes(member.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedMemberIds([...selectedMemberIds, member.id]);
                            } else {
                              setSelectedMemberIds(selectedMemberIds.filter(id => id !== member.id));
                            }
                          }}
                          disabled={remainingAllocation <= 0}
                        />
                      </td>
                      <td>
                        <div>
                          <strong>{member.lastName} {member.firstName}</strong>
                          {member.role === 'MANAGER' && (
                            <span className="w3-tag w3-small w3-blue w3-margin-left">マネージャー</span>
                          )}
                        </div>
                      </td>
                      <td>{member.position || '-'}</td>
                      <td>{member.email}</td>
                      <td>
                        <div className="w3-small">
                          <FaBuilding className="w3-margin-right" />
                          {member.company?.name || '-'}
                        </div>
                      </td>
                      <td>                        <div className="w3-small">
                          {memberSkills.length > 0 ? (
                            memberSkills.slice(0, 3).map((userSkill, index) => {
                              // スキル名を取得（新しいスキル管理システムに対応）
                              const skillName = userSkill.companySelectedSkill?.skillName || 
                                              userSkill.companySelectedSkill?.globalSkill?.name ||
                                              userSkill.skill?.name || 
                                              userSkill.name ||
                                              'Unknown Skill';
                              
                              return (
                                <div key={index} className="w3-tag w3-tiny w3-light-grey w3-margin-bottom">
                                  {skillName}
                                  {userSkill.years && ` (${userSkill.years}年)`}
                                </div>
                              );
                            })
                          ) : (
                            <span className="w3-text-grey">スキル未設定</span>
                          )}
                          {memberSkills.length > 3 && (
                            <div className="w3-text-grey">+{memberSkills.length - 3}個</div>
                          )}
                        </div></td>
                      <td>
                        <div className={currentAllocation >= 1.0 ? 'w3-text-red' : 'w3-text-green'}>
                          <div>{Math.round((currentAllocation || 0) * 100)}% 使用中</div>
                          <div className="w3-tiny w3-text-grey">
                            残り: {Math.round(remainingAllocation * 100)}%
                          </div>
                        </div>
                      </td>
                      <td>
                        {(() => {
                          const maxAvailable = Math.max(0.1, remainingAllocation);
                          const currentInputValue = memberAllocations[member.id] || Math.min(maxAvailable, 1.0);
                          
                          return (
                            <div>
                              <input
                                type="number"
                                className="w3-input w3-border"
                                min="0.1"
                                max={maxAvailable}
                                step="0.1"
                                value={currentInputValue}
                                onChange={(e) => {
                                  const value = parseFloat(e.target.value) || 0.1;
                                  setMemberAllocations({
                                    ...memberAllocations,
                                    [member.id]: Math.min(Math.max(value, 0.1), maxAvailable)
                                  });
                                }}
                                style={{ width: '80px' }}
                                disabled={remainingAllocation <= 0}
                              />
                              <div className="w3-tiny w3-text-grey">
                                最大: {Math.round(maxAvailable * 100)}%
                              </div>
                            </div>
                          );
                        })()}
                      </td>
                    </tr>
                  );
                })}
                {availableMembers.length === 0 && (
                  <tr>
                    <td colSpan="8" className="w3-center w3-padding">
                      <div className="w3-text-grey">
                        条件に一致するメンバーが見つかりません
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <footer className="w3-container w3-padding">
          <button 
            type="button" 
            className="w3-button w3-gray"
            onClick={onClose}
          >
            キャンセル
          </button>
          <button 
            className="w3-button w3-blue w3-right"
            onClick={handleSubmit}
            disabled={selectedMemberIds.length === 0}
          >
            追加 ({selectedMemberIds.length})
          </button>
        </footer>
      </div>
    </div>
  );
};

export default AddMemberDialog;
