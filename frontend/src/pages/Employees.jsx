import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { 
  FaUser, 
  FaEnvelope, 
  FaEdit, 
  FaSpinner, 
  FaPlus,
  FaEye,
  FaTrash
} from 'react-icons/fa';
import api from '../utils/axios';
import { useAuth } from '../contexts/AuthContext';
import { useSnackbar } from '../hooks/useSnackbar';
import Snackbar from '../components/Snackbar';

// ロールの表示名マッピング
const roleLabels = {
  MANAGER: 'マネージャー',
  MEMBER: 'メンバー',
  COMPANY: '管理者'
};

// ロールの色マッピング
const roleColors = {
  MANAGER: 'w3-orange',
  MEMBER: 'w3-blue',
  COMPANY: 'w3-red'
};

// ステータスの表示名マッピング
const statusLabels = {
  active: '有効',
  inactive: '無効'
};

// ステータスの色マッピング
const statusColors = {
  active: 'w3-green',
  inactive: 'w3-red'
};

// 社員行コンポーネント
const EmployeeRow = ({ employee, onEdit, onDelete, onViewDetail }) => {
  return (
    <tr className="w3-hover-light-gray">
      <td>
        <button
          className="w3-button w3-small w3-blue"
          onClick={() => onViewDetail(employee)}
          title="詳細表示"
        >
          <FaEye /> 詳細
        </button>
      </td>
      <td>
        <div className="w3-cell-row">
          <FaUser className="w3-margin-right" />
          {employee.lastName} {employee.firstName}
        </div>
      </td>
      <td>{employee.position || '-'}</td>
      <td>
        <span className={`w3-tag ${roleColors[employee.role]}`}>
          {roleLabels[employee.role]}
        </span>
      </td>
      <td>
        <div className="w3-cell-row">
          <FaEnvelope className="w3-margin-right" />
          {employee.email}
        </div>
      </td>      <td>
        <div style={{ maxWidth: '200px', overflow: 'hidden' }}>
          {employee.userSkills && employee.userSkills.length > 0 ? (
            employee.userSkills.slice(0, 3).map((userSkill, index) => {
              const skillName = userSkill.companySelectedSkill?.skillName || 
                              userSkill.companySelectedSkill?.globalSkill?.name || 
                              '不明なスキル';
              return (
                <span 
                  key={userSkill.id} 
                  className="w3-tag w3-small w3-green w3-margin-right w3-margin-bottom"
                  title={`${skillName}（${userSkill.years || 0}年）`}
                >
                  {skillName}（{userSkill.years || 0}年）
                </span>
              );
            })
          ) : (
            <span className="w3-text-gray">-</span>
          )}
          {employee.userSkills && employee.userSkills.length > 3 && (
            <span className="w3-text-gray w3-small">
              +{employee.userSkills.length - 3}個
            </span>
          )}
        </div>
      </td>
      <td>
        <span className={`w3-tag ${statusColors[employee.isActive ? 'active' : 'inactive']}`}>
          {statusLabels[employee.isActive ? 'active' : 'inactive']}
        </span>
      </td>
      <td>
        <div className="w3-bar">          <button
            className="w3-button w3-small w3-blue w3-margin-right"
            onClick={() => onEdit(employee)}
            title="編集"
          >
            <FaEdit />
          </button>
          <button
            className="w3-button w3-small w3-red"
            onClick={() => {
              onDelete(employee.id);
            }}
            title="削除"
          >
            <FaTrash />
          </button>
        </div>
      </td>
    </tr>
  );
};

const Employees = () => {
  const navigate = useNavigate();
  const { showSuccess, showError } = useSnackbar();
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [orderBy, setOrderBy] = useState('createdAt');
  const [order, setOrder] = useState('desc');
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    role: '',
    status: ''
  });

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
      const response = await api.get('/users', {        params: {
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
  });  // スキル一覧の取得（新しいAPIエンドポイントを使用）
  const { data: skillsData } = useQuery({
    queryKey: ['company-skills'],
    queryFn: async () => {
      try {
        const response = await api.get('/skills/company');
        
        // 新しいスキル管理APIから { status: 'success', data: { skills } } の形で返される
        if (response.data?.status === 'success' && response.data?.data?.skills) {
          return response.data.data.skills;
        } else if (Array.isArray(response.data)) {
          return response.data;
        } else {
          return [];
        }
      } catch (error) {
        console.error('❌ 会社選択済みスキル取得エラー:', error);
        console.error('   ステータス:', error.response?.status);
        console.error('   データ:', error.response?.data);
        return [];
      }
    },
    initialData: []
  });  // 社員の作成/更新
  const saveEmployee = useMutation({
    mutationFn: async (values) => {
      
      const employeeData = {
        firstName: values.firstName,
        lastName: values.lastName,
        email: values.email,
        role: values.role.toUpperCase(),
        position: values.position || null,
        phone: values.phone || null,
        prefecture: values.prefecture || null,
        city: values.city || null,
        streetAddress: values.streetAddress || null,
        skills: (values.skills || []).filter(skill => skill.skillId).map(skill => ({
          skillId: skill.skillId,
          years: skill.years || null
        }))
      };
      

      // 編集時のみisActiveを追加
      if (selectedEmployee) {
        employeeData.isActive = values.isActive;
      }      if (selectedEmployee) {
        const { data } = await api.patch(`/users/${selectedEmployee.id}`, employeeData);
        return data;
      } else {
        // 新規作成時はパスワードを含めない（バックエンドで自動生成）
        const { data } = await api.post('/users', employeeData);
        return data;
      }
    },    onSuccess: () => {
      queryClient.invalidateQueries(['employees']);
      if (selectedEmployee) {
        showSuccess('社員情報を更新しました');
      } else {
        showSuccess('社員を追加しました。ログイン情報とメール確認リンクを含むメールを送信しました。');
      }
      handleCloseDialog();
    },
    onError: (error) => {
      let errorMessage;
      if (error.response?.data?.message === '指定されたスキルの中に、この会社に属さないものが含まれています') {
        errorMessage = 'エラー: 選択されたスキルの中に、会社で利用可能でないものが含まれています。スキル管理画面で必要なスキルを会社に追加してから再度お試しください。';      } else {
        errorMessage = error.response?.data?.message || error.response?.data?.error || '操作に失敗しました';
      }
      
      showError(errorMessage);
    }
  });

  // 社員の削除
  const deleteEmployee = useMutation({
    mutationFn: async (employeeId) => {
      const { data } = await api.delete(`/users/${employeeId}`);
      return data;
    },    onSuccess: () => {
      queryClient.invalidateQueries(['employees']);
      showSuccess('社員を削除しました');
    },
    onError: (error) => {
      const errorMessage = error.response?.data?.message || error.response?.data?.error || '削除に失敗しました';
      showError(errorMessage);
    }  });

  // 詳細表示（ページ遷移）
  const handleViewDetail = (employee) => {
    navigate(`/employees/${employee.id}`);
  };

  // 編集（ページ遷移）
  const handleEditEmployee = (employee) => {
    navigate(`/employees/${employee.id}/edit`);
  };

  // 社員削除
  const handleDeleteEmployee = (employeeId) => {    deleteEmployee.mutate(employeeId);
  };

  // テーブルのソート
  const handleRequestSort = (property) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  if (isLoading) {
    return (
      <div className="w3-container w3-center" style={{ paddingTop: '200px' }}>
        <FaSpinner className="fa-spin w3-xxlarge" />
      </div>
    );
  }

  return (
    <div className="w3-container">      <div className="w3-bar w3-margin-bottom">
        <h2 className="w3-bar-item">社員管理</h2>
        <button
          className="w3-button w3-blue w3-right"
          onClick={() => navigate('/employees/create')}
        >
          <FaPlus /> 社員を追加
        </button>
      </div><div className="w3-row-padding w3-margin-bottom">
        <div className="w3-col m6">
          <input
            className="w3-input w3-border"
            type="text"
            placeholder="社員を検索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="w3-col m3">
          <select
            className="w3-select w3-border"
            value={filters.role}
            onChange={(e) => setFilters(prev => ({ ...prev, role: e.target.value }))}
          >
            <option value="">すべてのロール</option>
            {Object.entries(roleLabels).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
        <div className="w3-col m3">
          <select
            className="w3-select w3-border"
            value={filters.status}
            onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
          >
            <option value="">すべてのステータス</option>
            <option value="true">有効</option>
            <option value="false">無効</option>
          </select>
        </div>
      </div>

      <div className="w3-responsive">
        <table className="w3-table w3-bordered w3-striped">
          <thead>
            <tr>
              <th>詳細</th>
              <th onClick={() => handleRequestSort('firstName')} style={{ cursor: 'pointer' }}>
                名前 {orderBy === 'firstName' && (order === 'asc' ? '↑' : '↓')}
              </th>
              <th onClick={() => handleRequestSort('position')} style={{ cursor: 'pointer' }}>
                役職 {orderBy === 'position' && (order === 'asc' ? '↑' : '↓')}
              </th>
              <th onClick={() => handleRequestSort('role')} style={{ cursor: 'pointer' }}>
                ロール {orderBy === 'role' && (order === 'asc' ? '↑' : '↓')}
              </th>
              <th>メールアドレス</th>
              <th>スキル</th>
              <th onClick={() => handleRequestSort('isActive')} style={{ cursor: 'pointer' }}>
                ステータス {orderBy === 'isActive' && (order === 'asc' ? '↑' : '↓')}
              </th>
              <th>編集</th>
            </tr>
          </thead>
          <tbody>
            {employeesData?.users.map((employee) => (              <EmployeeRow
                key={employee.id}
                employee={employee}
                onEdit={handleEditEmployee}
                onDelete={handleDeleteEmployee}
                onViewDetail={handleViewDetail}
              />
            ))}            {employeesData?.users.length === 0 && (
              <tr>
                <td colSpan="8" className="w3-center w3-text-gray">
                  {debouncedSearchQuery || filters.role || filters.status ? 
                    '検索条件に一致する社員はありません' : 
                    '社員はありません'
                  }
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="w3-bar w3-center w3-margin-top">
        <button
          className="w3-button w3-bar-item"
          onClick={() => setPage(0)}
          disabled={page === 0}
        >
          &laquo;
        </button>
        <button
          className="w3-button w3-bar-item"
          onClick={() => setPage(p => Math.max(0, p - 1))}
          disabled={page === 0}
        >
          &lsaquo;
        </button>
        <span className="w3-bar-item w3-padding">
          {page + 1} / {Math.ceil((employeesData?.pagination.total || 0) / rowsPerPage)}
        </span>
        <button
          className="w3-button w3-bar-item"
          onClick={() => setPage(p => p + 1)}
          disabled={(page + 1) * rowsPerPage >= (employeesData?.pagination.total || 0)}
        >
          &rsaquo;
        </button>
        <button
          className="w3-button w3-bar-item"
          onClick={() => setPage(Math.ceil((employeesData?.pagination.total || 0) / rowsPerPage) - 1)}
          disabled={(page + 1) * rowsPerPage >= (employeesData?.pagination.total || 0)}
        >
          &raquo;
        </button>
        <select
          className="w3-select w3-bar-item"
          style={{ width: 'auto' }}
          value={rowsPerPage}
          onChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
        >
          {[5, 10, 25, 50].map(size => (
            <option key={size} value={size}>{size}件表示</option>
          ))}
        </select>      </div>

      <Snackbar />
    </div>
  );
};

export default Employees;