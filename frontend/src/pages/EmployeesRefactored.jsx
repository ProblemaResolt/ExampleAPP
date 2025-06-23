import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { FaPlus } from 'react-icons/fa';
import api from '../utils/axios';
import { useAuth } from '../contexts/AuthContext';
import { useSnackbar } from '../hooks/useSnackbar';
import Snackbar from '../components/Snackbar';

// 共通コンポーネントのインポート
import Card from '../components/common/Card';
import Table from '../components/common/Table';
import Pagination from '../components/common/Pagination';
import Loading from '../components/common/Loading';
import EmployeeFilters from '../components/employees/EmployeeFilters';
import EmployeeTableRow from '../components/employees/EmployeeTableRow';
import EmployeeDetailModal from '../components/employees/EmployeeDetailModal';

const Employees = () => {
  const navigate = useNavigate();
  const { snackbar, showSuccess, showError, hideSnackbar } = useSnackbar();
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [orderBy, setOrderBy] = useState('createdAt');
  const [order, setOrder] = useState('desc');
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    role: '',
    status: ''
  });
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // debounced search query - 500ms待ってから検索実行
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();

  // 社員一覧の取得
  const { data: employeesData, isLoading } = useQuery({
    queryKey: ['employees', page, rowsPerPage, orderBy, order, debouncedSearchQuery, filters],
    queryFn: async () => {
      const response = await api.get('/users', {
        params: {
          page: page + 1,
          limit: rowsPerPage,
          sort: `${orderBy}:${order}`,
          search: debouncedSearchQuery,
          include: 'skills', // スキル情報を含める
          ...filters
        }
      });
      return response.data.data;
    }
  });

  // 社員削除
  const deleteEmployee = useMutation({
    mutationFn: async (id) => {
      await api.delete(`/users/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['employees']);
      showSuccess('社員を削除しました');
    },
    onError: (error) => {
      showError(error.response?.data?.message || '削除に失敗しました');
    }
  });

  // ハンドラー関数
  const handleSort = (column) => {
    const isAsc = orderBy === column && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(column);
  };

  const handleAddEmployee = () => {
    navigate('/employees/create');
  };

  const handleEditEmployee = (employee) => {
    navigate(`/employees/${employee.id}/edit`);
  };

  const handleDeleteEmployee = async (employee) => {
    if (window.confirm(`${employee.lastName} ${employee.firstName}を削除しますか？`)) {
      deleteEmployee.mutate(employee.id);
    }
  };

  const handleViewDetail = (employee) => {
    setSelectedEmployee(employee);
    setShowDetailModal(true);
  };

  // テーブルの列定義
  const columns = [
    { key: 'name', label: '名前', sortable: true },
    { key: 'position', label: '役職' },
    { key: 'role', label: 'ロール' },
    { key: 'email', label: 'メール' },
    { key: 'skills', label: 'スキル' },
    { key: 'status', label: 'ステータス' }
  ];

  // テーブル用のデータ変換とレンダリング
  const tableData = useMemo(() => {
    if (!employeesData?.users) return [];
    
    return employeesData.users;
  }, [employeesData]);

  // テーブル行のレンダリング
  const renderTableRow = (employee) => (
    <EmployeeTableRow
      key={employee.id}
      employee={employee}
      onEdit={handleEditEmployee}
      onDelete={handleDeleteEmployee}
      onViewDetail={handleViewDetail}
      showSkills={true}
    />
  );

  if (isLoading) return <Loading />;

  return (
    <div className="w3-container w3-margin-top">
      <Card
        title="社員管理"
        subtitle="社員の一覧表示、追加、編集、削除を行います"
        actions={
          <button
            className="w3-button w3-green w3-margin-top"
            onClick={handleAddEmployee}
          >
            <FaPlus className="w3-margin-right" />
            新規追加
          </button>
        }
      >
        {/* フィルター */}
        <EmployeeFilters
          searchTerm={searchQuery}
          onSearchChange={setSearchQuery}
          roleFilter={filters.role}
          onRoleFilterChange={(value) => setFilters(prev => ({...prev, role: value}))}
          statusFilter={filters.status}
          onStatusFilterChange={(value) => setFilters(prev => ({...prev, status: value}))}
        />

        {/* テーブル */}
        <div className="w3-responsive">
          <table className="w3-table-all w3-hoverable w3-card">
            <thead>
              <tr className="w3-light-gray">
                <th style={{ width: '80px' }}>操作</th>
                <th 
                  className="w3-button" 
                  onClick={() => handleSort('lastName')}
                  style={{ cursor: 'pointer' }}
                >
                  名前 {orderBy === 'lastName' && (order === 'asc' ? '↑' : '↓')}
                </th>
                <th style={{ width: '120px' }}>役職</th>
                <th style={{ width: '100px' }}>ロール</th>
                <th>メール</th>
                <th style={{ width: '200px' }}>スキル</th>
                <th style={{ width: '80px' }}>ステータス</th>
                <th style={{ width: '120px' }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {tableData.length === 0 ? (
                <tr>
                  <td colSpan="8" className="w3-center w3-text-gray w3-padding-large">
                    {debouncedSearchQuery || filters.role || filters.status ? 
                      '検索条件に一致する社員はありません' : 
                      '社員はありません'
                    }
                  </td>
                </tr>
              ) : (
                tableData.map(renderTableRow)
              )}
            </tbody>
          </table>
        </div>

        {/* ページネーション */}
        <Pagination
          currentPage={page}
          totalPages={Math.ceil((employeesData?.pagination.total || 0) / rowsPerPage)}
          onPageChange={setPage}
          totalItems={employeesData?.pagination.total || 0}
          itemsPerPage={rowsPerPage}
          onItemsPerPageChange={setRowsPerPage}
        />
      </Card>

      {/* 詳細モーダル */}
      <EmployeeDetailModal
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        employee={selectedEmployee}
      />

      <Snackbar {...snackbar} onClose={hideSnackbar} />
    </div>
  );
};

export default Employees;
