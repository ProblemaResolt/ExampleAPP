import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FaCalendarCheck, FaPlus, FaEdit, FaTrash, FaUsers, FaGift } from 'react-icons/fa';
import api from '../utils/axios';

const LeaveBalanceManagement = ({ userRole, managedCompanyId }) => {  const [selectedUserIds, setSelectedUserIds] = useState([]); // 複数選択用
  const [annualDays, setAnnualDays] = useState(20); // 付与日数
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const queryClient = useQueryClient();

  // 管理対象ユーザー一覧の取得
  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ['managedUsers', managedCompanyId],
    queryFn: async () => {
      const params = {};
      if (managedCompanyId) {
        params.companyId = managedCompanyId;
      }
      const response = await api.get('/users', { params });
      return response.data.data;
    },
    enabled: userRole === 'COMPANY' || userRole === 'ADMIN'
  });

  // 有給残高一覧の取得
  const { data: leaveBalances, isLoading: balancesLoading } = useQuery({
    queryKey: ['leaveBalances', managedCompanyId],
    queryFn: async () => {
      const currentYear = new Date().getFullYear();
      const promises = usersData?.users?.map(async (user) => {
        try {
          const response = await api.get('/leave/leave-balance', {
            params: { userId: user.id, year: currentYear }
          });
          return {
            user,
            balances: response.data.data.leaveBalances || []
          };
        } catch (error) {
          console.error(`Error fetching balance for user ${user.id}:`, error);
          return {
            user,
            balances: []
          };
        }
      });
      
      if (promises) {
        return await Promise.all(promises);
      }
      return [];
    },
    enabled: !usersLoading && usersData?.users?.length > 0
  });
  // 有給残高設定（個別・一括共通）
  const initializeBalance = useMutation({
    mutationFn: async (data) => {
      const response = await api.post('/leave/leave-balance/initialize', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leaveBalances'] });
      setSuccess('有給残高を設定しました');
      setTimeout(() => setSuccess(''), 3000);
    },
    onError: (error) => {
      const errorMessage = error.response?.data?.message || '有給残高の設定に失敗しました';
      setError(errorMessage);
      setTimeout(() => setError(''), 5000);
    }
  });

  // 選択した社員への一括設定
  const bulkInitializeSelectedUsers = useMutation({
    mutationFn: async ({ userIds, year, annualDays }) => {
      const promises = userIds.map(userId => 
        api.post('/leave/leave-balance/initialize', {
          userId,
          year,
          annualDays
        }).catch(error => {
          console.error(`Failed to initialize for user ${userId}:`, error);
          return null;
        })
      );
      
      const results = await Promise.all(promises);
      return results.filter(result => result !== null);
    },
    onSuccess: (results) => {
      queryClient.invalidateQueries({ queryKey: ['leaveBalances'] });
      setSelectedUserIds([]); // 選択をクリア
      setSuccess(`${results.length}人の有給残高を一括設定しました`);
      setTimeout(() => setSuccess(''), 3000);
    },
    onError: (error) => {
      setError('選択した社員への一括設定に失敗しました');
      setTimeout(() => setError(''), 5000);
    }
  });
  const handleSubmitInitialize = (userId, customAnnualDays = null) => {
    const daysToSet = customAnnualDays || annualDays;
    initializeBalance.mutate({
      userId,
      year: new Date().getFullYear(),
      annualDays: daysToSet
    });
  };

  // 選択した社員への一括設定
  const handleBulkInitializeSelected = () => {
    if (selectedUserIds.length === 0) {
      setError('設定する社員を選択してください');
      setTimeout(() => setError(''), 3000);
      return;
    }
      if (window.confirm(`選択した${selectedUserIds.length}名に対して${new Date().getFullYear()}年度の有給残高を${annualDays}日で設定しますか？`)) {
      bulkInitializeSelectedUsers.mutate({
        userIds: selectedUserIds,
        year: new Date().getFullYear(),
        annualDays: annualDays
      });
    }
  };

  // 全選択/全解除
  const handleSelectAll = () => {
    if (selectedUserIds.length === leaveBalances?.length) {
      setSelectedUserIds([]);
    } else {
      setSelectedUserIds(leaveBalances?.map(({ user }) => user.id) || []);
    }
  };

  // 個別選択
  const handleUserSelect = (userId) => {
    setSelectedUserIds(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const getPaidLeaveBalance = (balances) => {
    const paidLeave = balances.find(b => b.leaveType === 'PAID_LEAVE');
    return paidLeave || { totalDays: 0, usedDays: 0, remainingDays: 0 };
  };

  if (userRole !== 'COMPANY' && userRole !== 'ADMIN') {
    return (
      <div className="w3-panel w3-orange">
        <p>有給残高管理は会社管理者またはシステム管理者のみが利用できます。</p>
      </div>
    );
  }
  return (
    <div className="w3-container">
      {/* ヘッダー */}
      <div className="w3-panel w3-blue w3-leftbar">
        <h5><FaCalendarCheck className="w3-margin-right" />有給残高管理</h5>
        <p>社員の有給残高を設定・管理できます。チェックボックスで複数選択して一括設定が可能です。</p>
      </div>

      {/* 成功・エラーメッセージ */}
      {success && (
        <div className="w3-panel w3-green w3-display-container">
          <span onClick={() => setSuccess('')} className="w3-button w3-display-topright">×</span>
          <p>{success}</p>
        </div>
      )}

      {error && (
        <div className="w3-panel w3-red w3-display-container">
          <span onClick={() => setError('')} className="w3-button w3-display-topright">×</span>
          <p>{error}</p>
        </div>
      )}      {/* 一括設定パネル */}
      <div className="w3-container w3-margin-bottom">
        <div className="w3-panel w3-light-blue w3-border">
          <h6><FaUsers className="w3-margin-right" />一括設定</h6>
          <div className="w3-row-padding">
            <div className="w3-col s6 m4">
              <label className="w3-text-blue"><strong>付与日数:</strong></label>
              <input
                type="number"
                className="w3-input w3-border w3-white"
                value={annualDays}
                onChange={(e) => setAnnualDays(parseInt(e.target.value))}
                min="0"
                step="1"
                placeholder="例: 20"
              />
            </div>
            <div className="w3-col s6 m4">
              <label className="w3-text-blue"><strong>対象:</strong></label>
              <button
                className="w3-button w3-orange w3-block"
                onClick={handleBulkInitializeSelected}
                disabled={bulkInitializeSelectedUsers.isPending || selectedUserIds.length === 0}
              >
                <FaGift className="w3-margin-right" />
                選択した{selectedUserIds.length}名に設定
              </button>
            </div>
            <div className="w3-col s12 m4">
              {selectedUserIds.length === 0 && (
                <div className="w3-small w3-text-gray w3-padding-top">
                  下の表でチェックボックスを選択して一括設定を行えます
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 有給残高一覧 */}
      <div className="w3-white">
        <header className="w3-container w3-light-gray">
          <h4>
            <FaUsers className="w3-margin-right" />
            社員別有給残高一覧 ({new Date().getFullYear()}年度)
          </h4>
        </header>
        <div className="w3-container w3-padding">
          {balancesLoading ? (
            <div className="w3-center w3-padding-large">
              <i className="fa fa-spinner fa-spin fa-2x"></i>
              <p>読み込み中...</p>
            </div>
          ) : (
            <div className="w3-responsive">              <table className="w3-table w3-striped w3-bordered">
                <thead>
                  <tr className="w3-green">
                    <th>
                      <label className="w3-checkbox">
                        <input
                          type="checkbox"
                          className="w3-check"
                          checked={selectedUserIds.length === leaveBalances?.length && leaveBalances?.length > 0}
                          onChange={handleSelectAll}
                        />
                        <span className="w3-checkmark"></span>
                      </label>
                    </th>
                    <th>社員名</th>
                    <th>メールアドレス</th>
                    <th>付与日数</th>
                    <th>使用日数</th>
                    <th>残日数</th>
                    <th>ステータス</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {leaveBalances?.map(({ user, balances }) => {
                    const paidLeave = getPaidLeaveBalance(balances);
                    const hasBalance = balances.length > 0 && paidLeave.totalDays > 0;
                      return (
                      <tr key={user.id} className="w3-hover-light-gray">
                        <td>
                          <label className="w3-checkbox">
                            <input
                              type="checkbox"
                              className="w3-check"
                              checked={selectedUserIds.includes(user.id)}
                              onChange={() => handleUserSelect(user.id)}
                            />
                            <span className="w3-checkmark"></span>
                          </label>
                        </td>
                        <td>
                          <div className="w3-cell-row">
                            <div className="w3-cell">
                              {user.lastName} {user.firstName}
                            </div>
                          </div>
                        </td>
                        <td>{user.email}</td>
                        <td>
                          <span className={`w3-tag ${hasBalance ? 'w3-blue' : 'w3-gray'}`}>
                            {paidLeave.totalDays}日
                          </span>
                        </td>
                        <td>
                          <span className={`w3-tag ${paidLeave.usedDays > 0 ? 'w3-orange' : 'w3-light-gray'}`}>
                            {paidLeave.usedDays}日
                          </span>
                        </td>
                        <td>
                          <span className={`w3-tag ${paidLeave.remainingDays > 5 ? 'w3-green' : paidLeave.remainingDays > 0 ? 'w3-orange' : 'w3-red'}`}>
                            {paidLeave.remainingDays}日
                          </span>
                        </td>
                        <td>
                          <span className={`w3-tag ${hasBalance ? 'w3-green' : 'w3-red'}`}>
                            {hasBalance ? '設定済み' : '未設定'}
                          </span>
                        </td>                        <td>
                          <button
                            className="w3-button w3-small w3-blue"
                            onClick={() => handleSubmitInitialize(user.id, 20)}
                            title="有給残高を20日で設定/更新"
                            disabled={initializeBalance.isPending}
                          >
                            <FaEdit className="w3-margin-right" />
                            {initializeBalance.isPending ? '処理中' : '20日設定'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              
              {(!leaveBalances || leaveBalances.length === 0) && (
                <div className="w3-center w3-padding-large">
                  <p className="w3-text-gray">管理対象の社員がいません。</p>
                </div>
              )}            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LeaveBalanceManagement;
