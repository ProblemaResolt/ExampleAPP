import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useFormik } from 'formik';
import * as yup from 'yup';
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
import EmployeeDialog from '../components/EmployeeDialog';
import EmployeeDetailModal from '../components/EmployeeDetailModal';

// バリデーションスキーマ
const employeeSchema = yup.object({
  firstName: yup.string().required('名前（名）は必須です'),
  lastName: yup.string().required('名前（姓）は必須です'),
  email: yup.string().email('有効なメールアドレスを入力してください').required('メールアドレスは必須です'),
  position: yup.string().nullable(),
  phone: yup.string().nullable(),
  prefecture: yup.string().nullable(),
  city: yup.string().nullable(),
  streetAddress: yup.string().nullable(),
  role: yup.string().required('ロールは必須です'),
  isActive: yup.boolean(),
  skills: yup.array().of(
    yup.object().shape({
      skillId: yup.string().required('スキルは必須です'),
      years: yup.number().min(0, '年数は0以上でなければなりません').nullable()
    })
  ).required('スキルセットは必須です').nullable()
});

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
          className="w3-button w3-small w3-light-blue"
          onClick={() => onViewDetail(employee)}
          title="詳細表示"
        >
          <FaEye /> 詳細
        </button>
      </td>
      <td>
        <div className="w3-cell-row">
          <FaUser className="w3-margin-right" />
          {employee.firstName} {employee.lastName}
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
      </td>
      <td>
        <span className={`w3-tag ${statusColors[employee.isActive ? 'active' : 'inactive']}`}>
          {statusLabels[employee.isActive ? 'active' : 'inactive']}
        </span>
      </td>
      <td>
        <div className="w3-bar">
          <button
            className="w3-button w3-small w3-blue w3-margin-right"
            onClick={() => onEdit(employee)}
            title="編集"
          >
            <FaEdit />
          </button>
          <button
            className="w3-button w3-small w3-red"
            onClick={() => {
              if (window.confirm('この社員を完全に削除してもよろしいですか？\n※この操作は取り消せません。')) {
                onDelete(employee.id);
              }
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
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [openDetailModal, setOpenDetailModal] = useState(false);
  const [detailEmployee, setDetailEmployee] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();

  // 社員一覧の取得
  const { data: employeesData, isLoading } = useQuery({
    queryKey: ['employees', page, rowsPerPage, orderBy, order, debouncedSearchQuery, filters],
    queryFn: async () => {
      const response = await api.get('/api/users', {
        params: {
          page: page + 1,
          limit: rowsPerPage,
          sort: `${orderBy}:${order}`,
          search: debouncedSearchQuery,
          ...filters
        }
      });
      return response.data.data;
    }
  });

  // スキル一覧の取得
  const { data: skillsData } = useQuery({
    queryKey: ['skills'],
    queryFn: async () => {
      try {
        const response = await api.get('/api/users/skills');
        
        // バックエンドから { status: 'success', data: { skills } } の形で返される
        if (response.data?.status === 'success' && response.data?.data?.skills) {
          return response.data.data.skills;
        } else if (Array.isArray(response.data)) {
          return response.data;
        } else {
          return [];
        }
      } catch (error) {
        console.error('Error fetching skills:', error);
        return [];
      }
    },
    initialData: []
  });
  // 社員の作成/更新
  const saveEmployee = useMutation({
    mutationFn: async (values) => {      const employeeData = {
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
      }
      
      if (selectedEmployee) {
        const { data } = await api.patch(`/api/users/${selectedEmployee.id}`, employeeData);
        return data;
      } else {
        // 新規作成時はパスワードを含めない（バックエンドで自動生成）
        const { data } = await api.post('/api/users', employeeData);
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['employees']);
      if (selectedEmployee) {
        setSuccess('社員情報を更新しました');
      } else {
        setSuccess('社員を追加しました。ログイン情報とメール確認リンクを含むメールを送信しました。');
      }
      setError('');
      handleCloseDialog();
    },
    onError: (error) => {
      const errorMessage = error.response?.data?.message || error.response?.data?.error || '操作に失敗しました';
      setError(errorMessage);      setSuccess('');
    }
  });

  // 社員の削除
  const deleteEmployee = useMutation({
    mutationFn: async (employeeId) => {
      const { data } = await api.delete(`/api/users/${employeeId}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['employees']);
      setSuccess('社員を削除しました');
      setError('');
    },
    onError: (error) => {
      const errorMessage = error.response?.data?.message || error.response?.data?.error || '削除に失敗しました';
      setError(errorMessage);
      setSuccess('');
    }
  });

  // フォーム
  const formik = useFormik({
    initialValues: {
      firstName: '',
      lastName: '',
      email: '',
      role: '',
      position: '',
      phone: '',
      address: '',
      skills: [],
      isActive: true,
      isEdit: false
    },
    validationSchema: employeeSchema,
    enableReinitialize: true,
    onSubmit: async (values) => {
      console.log('=== Employee Creation Debug ===');
      console.log('Current user:', currentUser);
      console.log('Form values:', values);
      console.log('managedCompanyId:', currentUser?.managedCompanyId);
      console.log('Selected companyId:', values.companyId);
      
      try {
        await saveEmployee.mutateAsync(values);
      } catch (error) {
        // エラー処理はsaveEmployee.mutateで行われる
      }
    }
  });
  // ダイアログの開閉
  const handleOpenDialog = (employee = null) => {
    setSelectedEmployee(employee);
    if (employee) {
      formik.setValues({
        firstName: employee.firstName,
        lastName: employee.lastName,
        email: employee.email,
        role: employee.role,
        position: employee.position || '',
        phone: employee.phone || '',
        prefecture: employee.prefecture || '',
        city: employee.city || '',
        streetAddress: employee.streetAddress || '',
        skills: (employee.skills || []).map(skill => ({
          skillId: skill.id,
          years: skill.years || ''
        })),
        isActive: employee.isActive,
        isEdit: true
      });
    } else {
      // 新規作成時のデフォルト値を設定
      formik.setValues({
        firstName: '',
        lastName: '',
        email: '',
        role: '',
        position: '',
        phone: '',
        prefecture: '',
        city: '',
        streetAddress: '',
        skills: [],
        isActive: true,
        isEdit: false
      });
    }
    setOpenDialog(true);
  };  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedEmployee(null);
    formik.resetForm();
  };

  // 詳細表示
  const handleViewDetail = (employee) => {
    setDetailEmployee(employee);
    setOpenDetailModal(true);
  };

  const handleCloseDetailModal = () => {
    setOpenDetailModal(false);
    setDetailEmployee(null);
  };

  // 社員削除
  const handleDeleteEmployee = (employeeId) => {
    deleteEmployee.mutate(employeeId);
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
    <div className="w3-container">
      <div className="w3-bar w3-margin-bottom">
        <h2 className="w3-bar-item">社員管理</h2>
        <button
          className="w3-button w3-blue w3-right"
          onClick={() => handleOpenDialog()}
        >
          <FaPlus /> 社員を追加
        </button>
      </div>

      {error && (
        <div className="w3-panel w3-red">
          <p>{error}</p>
        </div>
      )}
      {success && (
        <div className="w3-panel w3-green">
          <p>{success}</p>
        </div>
      )}

      <div className="w3-row-padding w3-margin-bottom">
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

      <div className="w3-responsive">        <table className="w3-table w3-bordered w3-striped">          <thead>
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
              <th>メールアドレス</th>              <th onClick={() => handleRequestSort('isActive')} style={{ cursor: 'pointer' }}>
                ステータス {orderBy === 'isActive' && (order === 'asc' ? '↑' : '↓')}
              </th>
              <th>編集</th>
            </tr>
          </thead>          <tbody>            {employeesData?.users.map((employee) => (
              <EmployeeRow
                key={employee.id}
                employee={employee}
                onEdit={handleOpenDialog}
                onDelete={handleDeleteEmployee}
                onViewDetail={handleViewDetail}
              />
            ))}
            {employeesData?.users.length === 0 && (
              <tr>
                <td colSpan="7" className="w3-center w3-text-gray">
                  社員はありません
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
        </select>
      </div>      <EmployeeDialog
        open={openDialog}
        onClose={handleCloseDialog}
        employee={selectedEmployee}
        onSubmit={formik.handleSubmit}
        formik={formik}
        skills={skillsData}
      />
      
      <EmployeeDetailModal
        open={openDetailModal}
        onClose={handleCloseDetailModal}
        employee={detailEmployee}
      />
    </div>
  );
};

export default Employees;