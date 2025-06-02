import React, { useState, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { FaSearch, FaUser, FaBuilding } from 'react-icons/fa';
import api from '../utils/axios';

const AddMemberDialog = ({ open, onClose, project, onSubmit }) => {
  const [selectedMemberIds, setSelectedMemberIds] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState('');
  const [memberAllocations, setMemberAllocations] = useState({});
  const { user: currentUser } = useAuth();

  // 会社管理者の権限でのフィルタリングを追加
  const { data: membersData } = useQuery({
    queryKey: ['members', currentUser?.managedCompanyId],
    queryFn: async () => {
      const params = {
        limit: 1000,
        include: ['company']
      };
      // 会社管理者の場合、自社のメンバーのみを取得
      if (currentUser?.role === 'COMPANY') {
        params.companyId = currentUser.managedCompanyId;
      }
      const response = await api.get('/api/users', { params });
      return response.data.data.users;
    }
  });

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

    // 既存メンバーのIDを取得
    const existingMemberIds = new Set([
      ...(project.members?.map(m => m.id) || []),
      ...(project.managers?.map(m => m.id) || [])
    ]);

    // 選択可能なメンバー（既存メンバーを除外）
    const available = membersData
      .filter(m => !existingMemberIds.has(m.id))
      .filter(searchFilter)
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
  }, [membersData, project, searchQuery]);  const handleSubmit = () => {
    try {
      if (selectedMemberIds.length === 0) {
        setError('メンバーを選択してください');
        return;
      }

      const selectedMembers = availableMembers
        .filter(member => selectedMemberIds.includes(member.id))
        .map(member => ({
          ...member,
          allocation: memberAllocations[member.id] || 1.0
        }));

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

  return (
    <div className="w3-modal" style={{ display: 'block' }}>
      <div className="w3-modal-content w3-card-4 w3-animate-zoom" style={{ maxWidth: '1000px' }}>
        <header className="w3-container w3-blue">
          <span 
            className="w3-button w3-display-topright w3-hover-red"
            onClick={onClose}
          >
            &times;
          </span>
          <h3>メンバーを追加</h3>
        </header>
        <div className="w3-container w3-padding">
          {error && (
            <div className="w3-panel w3-red w3-margin-bottom">
              <p>{error}</p>
            </div>
          )}
          <div className="w3-row-padding">
            <div className="w3-col m12">
              <div className="w3-input-group w3-margin-bottom">
                <input
                  className="w3-input w3-border"
                  type="text"
                  placeholder="メンバーを検索..."
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
            <div className="w3-col m12">
              <div className="w3-responsive">
                <table className="w3-table w3-striped w3-bordered">
                  <thead>
                    <tr>
                      <th>選択</th>
                      <th>名前</th>
                      <th>メール</th>
                      <th>会社</th>
                      <th>役職</th>
                      <th>現在の総工数</th>
                      <th>工数</th>
                    </tr>
                  </thead>
                  <tbody>
                    {availableMembers.map(member => {
                      const currentAllocation = member.totalAllocation || 0;
                      const isOverAllocated = currentAllocation >= 1.0;
                      return (
                        <tr key={member.id} className={isOverAllocated ? 'w3-pale-red' : ''}>
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
                            />
                          </td>
                          <td>
                            <FaUser className="w3-margin-right" />
                            {member.firstName} {member.lastName}
                          </td>
                          <td>{member.email}</td>
                          <td>
                            {member.company?.name ? (
                              <>
                                <FaBuilding className="w3-margin-right" />
                                {member.company.name}
                              </>
                            ) : (
                              '-'
                            )}
                          </td>
                          <td>{member.position || '-'}</td>
                          <td>
                            <span className={`w3-tag ${currentAllocation > 1 ? 'w3-red' : currentAllocation >= 0.8 ? 'w3-orange' : 'w3-teal'}`}>
                              {Math.round(currentAllocation * 100)}%
                            </span>
                            {isOverAllocated && (
                              <div className="w3-text-red w3-small">工数超過</div>
                            )}
                          </td>                          <td>
                            <input
                              type="number"
                              className="w3-input w3-border"
                              style={{ width: '80px' }}
                              step="0.1"
                              min="0"
                              max="1"
                              value={memberAllocations[member.id] || 1.0}
                              onChange={(e) => {
                                const allocation = parseFloat(e.target.value);
                                setMemberAllocations(prev => ({
                                  ...prev,
                                  [member.id]: !isNaN(allocation) ? allocation : 1.0
                                }));
                              }}
                            />
                          </td>
                        </tr>
                      );
                    })}
                    {availableMembers.length === 0 && (
                      <tr>
                        <td colSpan="7" className="w3-center w3-text-gray">
                          追加可能なメンバーがありません
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
