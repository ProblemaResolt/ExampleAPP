import React, { useState, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Alert } from '@mui/material';
import api from '../utils/axios';

const AddMemberDialog = ({ open, onClose, project, onSubmit }) => {
  const [selectedMemberIds, setSelectedMemberIds] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState('');
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
  }, [membersData, project, searchQuery]);

  const handleSubmit = () => {
    try {
      if (selectedMemberIds.length === 0) {
        setError('メンバーを選択してください');
        return;
      }      const selectedMembers = availableMembers
        .filter(member => selectedMemberIds.includes(member.id))
        .map(member => ({
          ...member,
          allocation: member.allocation || 1.0
        }));

      onSubmit(selectedMembers);
      setSelectedMemberIds([]);
      setSearchQuery('');
      setError('');
      onClose();
    } catch (error) {
      setError('メンバーの追加に失敗しました');
      console.error('Error adding members:', error);
    }
  };

  if (!open) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>メンバーを追加</DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" className="w3-margin-bottom">
            {error}
          </Alert>
        )}
        <div className="w3-row-padding">
          <div className="w3-col m12">
            <input
              className="w3-input w3-border"
              type="text"
              placeholder="メンバーを検索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="w3-col m12">
            <table className="w3-table w3-striped w3-bordered w3-margin-top">              <thead>
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
              <tbody>                {availableMembers.map(member => {
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
                    <td>{member.firstName} {member.lastName}</td>
                    <td>{member.email}</td>
                    <td>{member.company?.name || '-'}</td>
                    <td>{member.position || '-'}</td>
                    <td>
                      <span className={`w3-tag ${currentAllocation > 1 ? 'w3-red' : currentAllocation >= 0.8 ? 'w3-orange' : 'w3-teal'}`}>
                        {Math.round(currentAllocation * 100)}%
                      </span>
                      {isOverAllocated && (
                        <div className="w3-text-red w3-small">工数超過</div>
                      )}
                    </td>
                    <td>
                      <input
                        type="number"
                        className="w3-input w3-border"
                        step="0.1"
                        min="0"
                        max="1"
                        defaultValue="1.0"
                        onChange={(e) => {
                          const allocation = parseFloat(e.target.value);
                          member.allocation = !isNaN(allocation) ? allocation : 1.0;
                        }}
                      />
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>キャンセル</Button>
        <Button onClick={handleSubmit} variant="contained" color="primary">
          追加
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AddMemberDialog;
