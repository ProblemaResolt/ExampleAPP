import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FaCheck, FaTimes, FaClock } from 'react-icons/fa';
import api from '../utils/axios';
import Loading from '../components/common/Loading';
import ErrorMessage from '../components/common/ErrorMessage';
import Pagination from '../components/common/Pagination';
import AttendanceFilters from '../components/attendance/AttendanceFilters';
import AttendanceApprovalTable from '../components/attendance/AttendanceApprovalTable';
import AttendanceDetailModal from '../components/attendance/AttendanceDetailModal';

const AttendanceApproval = () => {
  const [selectedEntries, setSelectedEntries] = useState([]);
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    userId: '',
    page: 1,
    limit: 20
  });
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  
  const queryClient = useQueryClient();

  // 承認待ち勤怠データの取得
  const { data: attendanceData, isLoading, error } = useQuery({
    queryKey: ['pending-attendance', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
      const response = await api.get(`/attendance/pending-approval?${params}`);
      return response.data;
    }
  });

  // 承認/却下のミューテーション
  const approvalMutation = useMutation({
    mutationFn: async ({ id, action, approvalNote }) => {
      const response = await api.patch(`/attendance/approve/${id}`, {
        action,
        approvalNote
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-attendance'] });
      setSelectedEntries([]);
      setShowDetailModal(false);
    }
  });

  const handleApproval = (timeEntry, action) => {
    const approvalNote = prompt(
      action === 'APPROVED' ? '承認コメント (任意):' : '却下理由 (任意):'
    );
    
    if (action === 'REJECTED' && !approvalNote) {
      alert('却下する場合は理由を入力してください。');
      return;
    }

    approvalMutation.mutate({
      id: timeEntry.id,
      action,
      approvalNote: approvalNote || undefined
    });
  };

  const handleBulkApproval = (action) => {
    if (selectedEntries.length === 0) {
      alert('処理する記録を選択してください。');
      return;
    }

    const confirmMessage = action === 'APPROVED' 
      ? `${selectedEntries.length}件の勤怠記録を一括承認しますか？`
      : `${selectedEntries.length}件の勤怠記録を一括却下しますか？`;
    
    if (!confirm(confirmMessage)) return;

    const approvalNote = action === 'REJECTED' 
      ? prompt('却下理由を入力してください:')
      : undefined;

    if (action === 'REJECTED' && !approvalNote) {
      alert('却下する場合は理由を入力してください。');
      return;
    }

    selectedEntries.forEach(entryId => {
      approvalMutation.mutate({
        id: entryId,
        action,
        approvalNote
      });
    });
  };

  const handleEntrySelection = (entryId) => {
    setSelectedEntries(prev => 
      prev.includes(entryId) 
        ? prev.filter(id => id !== entryId)
        : [...prev, entryId]
    );
  };

  const handleSelectAll = (selectAll) => {
    if (selectAll) {
      setSelectedEntries(timeEntries.map(entry => entry.id));
    } else {
      setSelectedEntries([]);
    }
  };

  const handleViewDetail = (entry) => {
    setSelectedEntry(entry);
    setShowDetailModal(true);
  };

  const handlePageChange = (page) => {
    setFilters(prev => ({ ...prev, page }));
  };

  if (isLoading) {
    return <Loading message="勤怠記録を読み込み中..." />;
  }

  if (error) {
    return (
      <div className="w3-container">
        <ErrorMessage 
          error={error} 
          title="勤怠記録の取得に失敗しました"
        />
      </div>
    );
  }

  const timeEntries = attendanceData?.data?.timeEntries || [];
  const pagination = attendanceData?.data?.pagination || {};

  return (
    <div className="w3-container">
      <div className="w3-row w3-margin-bottom">
        <div className="w3-col m8">
          <h2><FaClock className="w3-margin-right" />勤怠承認管理</h2>
        </div>
        <div className="w3-col m4 w3-right-align">
          <button
            className="w3-button w3-green w3-margin-right"
            onClick={() => handleBulkApproval('APPROVED')}
            disabled={selectedEntries.length === 0 || approvalMutation.isPending}
          >
            <FaCheck className="w3-margin-right" />
            一括承認 ({selectedEntries.length})
          </button>
          <button
            className="w3-button w3-red"
            onClick={() => handleBulkApproval('REJECTED')}
            disabled={selectedEntries.length === 0 || approvalMutation.isPending}
          >
            <FaTimes className="w3-margin-right" />
            一括却下 ({selectedEntries.length})
          </button>
        </div>
      </div>

      {/* フィルター */}
      <AttendanceFilters
        filters={filters}
        onFilterChange={setFilters}
        onApplyFilters={() => setFilters(prev => ({ ...prev, page: 1 }))}
        showUserFilter={true}
      />

      {/* 勤怠記録リスト */}
      <div className="w3-card-4">
        <div className="w3-container">
          <h4>承認待ち勤怠記録 ({pagination.totalItems || 0}件)</h4>
          
          <AttendanceApprovalTable
            timeEntries={timeEntries}
            selectedEntries={selectedEntries}
            onEntrySelection={handleEntrySelection}
            onSelectAll={handleSelectAll}
            onApproval={handleApproval}
            onViewDetail={handleViewDetail}
            isLoading={approvalMutation.isPending}
          />

          {/* ページネーション */}
          <Pagination 
            pagination={pagination}
            onPageChange={handlePageChange}
          />
        </div>
      </div>

      {/* 詳細モーダル */}
      <AttendanceDetailModal
        entry={selectedEntry}
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        onApproval={handleApproval}
        isLoading={approvalMutation.isPending}
      />
    </div>
  );
};

export default AttendanceApproval;
