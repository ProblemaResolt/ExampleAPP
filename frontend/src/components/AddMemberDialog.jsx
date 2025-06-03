import React, { useState, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { FaSearch, FaUser, FaBuilding, FaFilter } from 'react-icons/fa';
import api from '../utils/axios';

const AddMemberDialog = ({ open, onClose, project, onSubmit }) => {
  const [selectedMemberIds, setSelectedMemberIds] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState('');
  const [memberAllocations, setMemberAllocations] = useState({});
  
  // フィルタ状態
  const [roleFilter, setRoleFilter] = useState(''); // 'MANAGER' or '' (all)
  const [skillFilter, setSkillFilter] = useState('');
  const [minYearsFilter, setMinYearsFilter] = useState('');
  const [showOverAllocated, setShowOverAllocated] = useState(true);
  const [showFilters, setShowFilters] = useState(false);const { user: currentUser } = useAuth();

  // デバッグ: ユーザーロールを確認
  React.useEffect(() => {
    console.log('AddMemberDialog - currentUser:', {
      role: currentUser?.role,
      open,
      shouldShowDialog: currentUser?.role !== 'MEMBER'
    });
  }, [currentUser, open]);

  // MEMBER ロールのアクセス制御チェック
  React.useEffect(() => {
    if (open && currentUser?.role === 'MEMBER') {
      console.log('AddMemberDialog - MEMBER role detected, closing dialog');
      setError('メンバーロールではメンバー管理機能にアクセスできません');
      onClose();
    }
  }, [open, currentUser, onClose]);  // 会社管理者の権限でのフィルタリングを追加
  const { data: membersData } = useQuery({
    queryKey: ['members', currentUser?.managedCompanyId, currentUser?.companyId],
    queryFn: async () => {
      // MEMBERロールの場合は早期リターン
      if (currentUser?.role === 'MEMBER') {
        return [];
      }

      try {
        const params = {
          limit: 1000,
          include: ['company', 'skills']
        };
        // 会社管理者の場合、自社のメンバーのみを取得
        if (currentUser?.role === 'COMPANY' && currentUser?.managedCompanyId) {
          params.companyId = currentUser.managedCompanyId;
        }
        // マネージャーの場合、自分の会社のメンバーのみを取得
        else if (currentUser?.role === 'MANAGER' && currentUser?.companyId) {
          params.companyId = currentUser.companyId;
        }

        const response = await api.get('/api/users', { params });
        return response.data.data.users;
      } catch (error) {
        console.error('Error fetching members:', error);
        throw error;
      }
    },
    enabled: Boolean(
      open && 
      currentUser && 
      currentUser.role !== 'MEMBER' && 
      (currentUser.role === 'ADMIN' || currentUser.role === 'COMPANY' || currentUser.role === 'MANAGER')
    ),
    initialData: []
  });

  // 利用可能なスキルリストを取得
  const availableSkills = useMemo(() => {
    if (!membersData) return [];
    const skills = new Set();
    membersData.forEach(member => {
      if (member.skills && Array.isArray(member.skills)) {
        member.skills.forEach(skill => {
          if (skill.name) skills.add(skill.name);
        });
      }
    });
    return Array.from(skills).sort();
  }, [membersData]);
  // メンバーのフィルタリングとソート
  const { availableMembers } = useMemo(() => {
    if (!membersData || !project) return { availableMembers: [] };

    // 検索フィルター
    const searchFilter = member => {
      const searchLower = searchQuery.toLowerCase();
      return (
        member.firstName.toLowerCase().includes(searchLower) ||
        member.lastName.toLowerCase().includes(searchLower) ||
        member.email.toLowerCase().includes(searchLower) ||
        member.company?.name?.toLowerCase().includes(searchLower) ||
        member.position?.toLowerCase().includes(searchLower)
      );
    };

    // ロールフィルター
    const roleFilterFn = member => {
      if (!roleFilter) return true;
      return member.role === roleFilter;
    };

    // スキルフィルター
    const skillFilterFn = member => {
      if (!skillFilter) return true;
      if (!member.skills || !Array.isArray(member.skills)) return false;
      
      const hasSkill = member.skills.some(skill => {
        const matchesSkill = skill.name === skillFilter;
        if (!matchesSkill) return false;
        
        // 最小年数フィルターがある場合
        if (minYearsFilter && skill.years) {
          return skill.years >= parseInt(minYearsFilter);
        }
        return true;
      });
      return hasSkill;
    };    // 工数オーバーフィルター
    const allocationFilter = member => {
      const currentAllocation = member.totalAllocation || 0;
      const remainingAllocation = 1.0 - currentAllocation;
      
      if (showOverAllocated) {
        return true; // すべて表示
      } else {
        return remainingAllocation > 0; // 残り工数があるメンバーのみ表示
      }
    };

    // 既存メンバーのIDを取得
    const existingMemberIds = new Set([
      ...(project.members?.map(m => m.id) || []),
      ...(project.managers?.map(m => m.id) || [])
    ]);

    // 選択可能なメンバー（既存メンバーを除外）
    const available = membersData
      .filter(m => !existingMemberIds.has(m.id))
      .filter(searchFilter)
      .filter(roleFilterFn)
      .filter(skillFilterFn)
      .filter(allocationFilter)
      .sort((a, b) => {
        // 会社名でソート
        const companyA = a.company?.name || '';
        const companyB = b.company?.name || '';
        if (companyA !== companyB) {
          return companyA.localeCompare(companyB);
        }
        // 名前でソート
        return `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`);
      });

    return { availableMembers: available };
  }, [membersData, project, searchQuery, roleFilter, skillFilter, minYearsFilter, showOverAllocated]);const handleSubmit = () => {
    try {
      if (selectedMemberIds.length === 0) {
        setError('メンバーを選択してください');
        return;
      }      const selectedMembers = availableMembers
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

      console.log('Selected members with allocations:', selectedMembers); // デバッグ用

      onSubmit(selectedMembers);
      setSelectedMemberIds([]);
      setSearchQuery('');
      setError('');
      setMemberAllocations({});
      onClose();
    } catch (error) {
      setError('メンバーの追加に失敗しました');
      console.error('Error adding members:', error);
    }
  };

  if (!open) return null;
  
  // MEMBER ロールの場合はダイアログを表示しない
  if (currentUser?.role === 'MEMBER') {
    return null;
  }

  return (
    <div className="w3-modal" style={{ display: 'block' }}>
      <div className="w3-modal-content w3-card-4 w3-animate-zoom">
        <header className="w3-container w3-blue">
          <span 
            className="w3-button w3-display-topright w3-hover-red"
            onClick={onClose}
          >
            &times;
          </span>
          <h3>メンバーを追加</h3>
        </header>        <div className="w3-container w3-padding">
          {error && (
            <div className="w3-panel w3-red w3-margin-bottom">
              <p>{error}</p>
            </div>
          )}
          
          {/* 検索バー */}
          <div className="w3-row-padding w3-margin-bottom">
            <div className="w3-col m10">
              <div className="w3-input-group">
                <input
                  className="w3-input w3-border"
                  type="text"
                  placeholder="名前、メール、会社名で検索..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <span className="w3-input-group-btn">
                  <button className="w3-button w3-blue">
                    <FaSearch />
                  </button>
                </span>
              </div>
            </div>
            <div className="w3-col m2">
              <button
                className={`w3-button w3-border ${showFilters ? 'w3-blue' : 'w3-light-grey'} w3-block`}
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
                <div className="w3-col m3">
                  <label className="w3-text-grey">役職</label>
                  <select
                    className="w3-select w3-border"
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                  >
                    <option value="">すべて</option>
                    <option value="MANAGER">マネージャー</option>
                    <option value="MEMBER">メンバー</option>
                  </select>
                </div>
                <div className="w3-col m3">
                  <label className="w3-text-grey">スキル</label>
                  <select
                    className="w3-select w3-border"
                    value={skillFilter}
                    onChange={(e) => setSkillFilter(e.target.value)}
                  >
                    <option value="">すべて</option>
                    {availableSkills.map(skill => (
                      <option key={skill} value={skill}>{skill}</option>
                    ))}
                  </select>
                </div>
                <div className="w3-col m3">
                  <label className="w3-text-grey">最小経験年数</label>
                  <input
                    className="w3-input w3-border"
                    type="number"
                    min="0"
                    placeholder="年数"
                    value={minYearsFilter}
                    onChange={(e) => setMinYearsFilter(e.target.value)}
                    disabled={!skillFilter}
                  />
                </div>                <div className="w3-col m3">
                  <label className="w3-text-grey">工数制限</label>
                  <div className="w3-margin-top">
                    <input
                      type="checkbox"
                      className="w3-check"
                      checked={showOverAllocated}
                      onChange={(e) => setShowOverAllocated(e.target.checked)}
                    />
                    <label className="w3-margin-left">工数100%のメンバーも表示</label>
                  </div>
                </div>
              </div>
              <div className="w3-bar">
                <button
                  className="w3-button w3-light-grey"
                  onClick={() => {
                    setRoleFilter('');
                    setSkillFilter('');
                    setMinYearsFilter('');
                    setShowOverAllocated(true);
                  }}
                >
                  フィルタクリア
                </button>
              </div>
            </div>
          )}

          <div className="w3-row-padding">
            <div className="w3-col m12">
              <p className="w3-text-grey">
                {availableMembers.length}人のメンバーが見つかりました
                {selectedMemberIds.length > 0 && ` (${selectedMemberIds.length}人選択中)`}
              </p>              <div className="w3-responsive">
                <table className="w3-table w3-striped w3-bordered">                  <thead>
                    <tr>
                      <th>選択</th>
                      <th>名前</th>
                      <th>役職</th>
                      <th>メール</th>
                      <th>会社</th>
                      <th>スキル</th>
                      <th>現在の工数</th>
                      <th>割り当て工数</th>
                    </tr>
                  </thead>
                  <tbody>                    {availableMembers.map(member => {
                      const currentAllocation = member.totalAllocation || 0;
                      const isOverAllocated = currentAllocation >= 1.0;
                      const remainingAllocation = Math.max(0, 1.0 - currentAllocation);
                      const memberSkills = member.skills || [];
                      
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
                          <td>
                            <div className="w3-small">
                              {memberSkills.length > 0 ? (
                                memberSkills.slice(0, 3).map((skill, index) => (
                                  <div key={index} className="w3-tag w3-tiny w3-light-grey w3-margin-bottom">
                                    {skill.name}
                                    {skill.years && ` (${skill.years}年)`}
                                  </div>
                                ))
                              ) : (
                                <span className="w3-text-grey">スキル未設定</span>
                              )}
                              {memberSkills.length > 3 && (
                                <div className="w3-text-grey">+{memberSkills.length - 3}個</div>
                              )}
                            </div>
                          </td>                          <td>
                            <div className={currentAllocation >= 1.0 ? 'w3-text-red' : 'w3-text-green'}>
                              <div>{Math.round(currentAllocation * 100)}% 使用中</div>
                              <div className="w3-tiny w3-text-grey">
                                残り: {Math.round(remainingAllocation * 100)}%
                              </div>
                            </div>
                          </td><td>
                            {(() => {
                              const remainingAllocation = Math.max(0, 1.0 - currentAllocation);
                              const currentInputValue = memberAllocations[member.id] || Math.min(remainingAllocation, 1.0);
                              
                              return (
                                <div>
                                  <input
                                    type="number"
                                    className="w3-input w3-border"
                                    min="0.1"
                                    max={remainingAllocation}
                                    step="0.1"
                                    value={currentInputValue}
                                    onChange={(e) => {
                                      const value = parseFloat(e.target.value) || 0.1;
                                      const maxValue = Math.max(0.1, remainingAllocation);
                                      setMemberAllocations({
                                        ...memberAllocations,
                                        [member.id]: Math.min(Math.max(value, 0.1), maxValue)
                                      });
                                    }}
                                    style={{ width: '80px' }}
                                    disabled={remainingAllocation <= 0}
                                  />
                                  <div className="w3-tiny w3-text-grey">
                                    最大: {Math.round(remainingAllocation * 100)}%
                                  </div>
                                </div>
                              );
                            })()}
                          </td>
                        </tr>
                      );
                    }                    )}
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
          </div>
        </div>
        <footer className="w3-container w3-padding">
          <button 
            type="button" 
            className="w3-button w3-gray"
            onClick={onClose}
          >
            キャンセル
          </button>          <button 
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
