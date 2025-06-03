import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useFormik } from 'formik';
import * as yup from 'yup';
import { 
  FaUser, 
  FaEnvelope, 
  FaEdit, 
  FaTrash, 
  FaSpinner, 
  FaPlus, 
  FaSearch as FaMagnifyingGlass,
  FaEye
} from 'react-icons/fa';
import api from '../utils/axios';
import { useAuth } from '../contexts/AuthContext';
import EmployeeDialog from '../components/EmployeeDialog';
import EmployeeDetailModal from '../components/EmployeeDetailModal';

// バリデーションスキーマ
const employeeSchema = yup.object({
  firstName: yup.string().required('名前（名）は必須です'),
  lastName: yup.string().required('名前（姓）は必須です'),
  email: yup.string().email('有効なメールアドレスを入力してください').required('メールアドレスは必須です'),  password: yup.string().when('isEdit', {
    is: false,
    then: schema => schema.min(6, 'パスワードは6文字以上である必要があります').required('パスワードは必須です'),
    otherwise: schema => schema.notRequired()
  }),
  position: yup.string().nullable(),
  role: yup.string().required('ロールは必須です'),
  companyId: yup.string().nullable(),
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
    <tr className="w3-hover-light-gray"><td>
        <div className="w3-cell-row">
          <FaUser className="w3-margin-right" />
          {employee.firstName} {employee.lastName}
        </div>
      </td><td>
        <div className="w3-cell-row">
          <FaEnvelope className="w3-margin-right" />
          {employee.email}
        </div>
      </td><td>{employee.position || '-'}</td><td>
        <span className={`w3-tag ${roleColors[employee.role]}`}>
          {roleLabels[employee.role]}
        </span>
      </td><td>
        <span className={`w3-tag ${statusColors[employee.isActive ? 'active' : 'inactive']}`}>
          {statusLabels[employee.isActive ? 'active' : 'inactive']}
        </span>
      </td><td>
        <div>
          {employee.skills && employee.skills.length > 0 ? (
            employee.skills.map(skill => (
              <span key={skill.id} className="w3-tag w3-light-blue w3-small w3-margin-right">
                {skill.name}（{skill.years || 0}年）
              </span>
            ))
          ) : (
            <span className="w3-text-gray">-</span>
          )}
        </div>
      </td><td>
        {employee.lastLoginAt
          ? new Date(employee.lastLoginAt).toLocaleString()
          : '未ログイン'}
      </td><td>{new Date(employee.createdAt).toLocaleDateString()}</td><td>
        <div className="w3-bar">
          <button
            className="w3-button w3-small w3-light-blue"
            onClick={() => onViewDetail(employee)}
            title="詳細表示"
          >
            <FaEye />
          </button>
          <button
            className="w3-button w3-small w3-blue"
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
      </td></tr>
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
  });  const [openDialog, setOpenDialog] = useState(false);
  const [openDetailModal, setOpenDetailModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();

  // 会社一覧の取得
  const { data: companiesData } = useQuery({
    queryKey: ['companies'],
    queryFn: async () => {
      const response = await api.get('/api/companies');
      if (currentUser?.role === 'COMPANY') {
        return response.data.data.companies.filter(company => company.manager.id === currentUser.id);
      }
      return response.data.data.companies;
    }
  });
  // 社員一覧の取得
  const { data: employeesData, isLoading } = useQuery({
    queryKey: ['employees', page, rowsPerPage, orderBy, order, searchQuery, filters],
    queryFn: async () => {
      const response = await api.get('/api/users', {
        params: {
          page: page + 1,
          limit: rowsPerPage,
          sort: `${orderBy}:${order}`,
          search: searchQuery,
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
    mutationFn: async (values) => {
      const employeeData = {
        firstName: values.firstName,
        lastName: values.lastName,
        email: values.email,
        role: values.role.toUpperCase(),
        companyId: values.companyId || null,
        position: values.position || null,
        skills: (values.skills || []).filter(skill => skill.skillId).map(skill => ({
          skillId: skill.skillId,
          years: skill.years || null
        }))
      };

      // 編集時のみisActiveを追加
      if (selectedEmployee) {
        employeeData.isActive = values.isActive;
      }

      // 新規作成時のみパスワードを追加
      if (!selectedEmployee && values.password) {
        employeeData.password = values.password;
      }
      
      if (selectedEmployee) {
        const { data } = await api.patch(`/api/users/${selectedEmployee.id}`, employeeData);
        return data;
      } else {
        const { data } = await api.post('/api/users', employeeData);
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['employees']);
      setSuccess(selectedEmployee ? '社員情報を更新しました' : '社員を追加しました');
      setError('');
      handleCloseDialog();
    },
    onError: (error) => {
      const errorMessage = error.response?.data?.message || error.response?.data?.error || '操作に失敗しました';
      setError(errorMessage);
      setSuccess('');
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
      const errorMessage = error.response?.data?.message || error.response?.data?.error || '社員の削除に失敗しました';
      setError(errorMessage);
      setSuccess('');
    }  });
  // フォーム
  const formik = useFormik({
    initialValues: {
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      role: '',
      companyId: currentUser?.role === 'COMPANY' ? currentUser.managedCompanyId || '' : '',
      position: '',
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
      // 編集時のcompanyId設定
      let editCompanyId = employee.companyId || '';
      if (currentUser?.role === 'COMPANY') {
        editCompanyId = currentUser.managedCompanyId || '';
      }
      
      formik.setValues({
        firstName: employee.firstName,
        lastName: employee.lastName,
        email: employee.email,
        password: '',
        role: employee.role,
        companyId: editCompanyId,
        position: employee.position || '',        skills: (employee.skills || []).map(skill => ({
          skillId: skill.id,
          years: skill.years || ''
        })),
        isActive: employee.isActive,
        isEdit: true
      });} else {
      // 新規作成時のデフォルト値を設定
      const defaultCompanyId = currentUser?.role === 'COMPANY' ? currentUser.managedCompanyId : '';
      
      formik.setValues({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        role: '',        companyId: defaultCompanyId,
        position: '',
        skills: [],
        isActive: true,
        isEdit: false
      });
    }
    setOpenDialog(true);
  };
  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedEmployee(null);
    formik.resetForm();
  };

  // 詳細表示の処理
  const handleViewDetail = (employee) => {
    setSelectedEmployee(employee);
    setOpenDetailModal(true);
  };

  const handleCloseDetailModal = () => {
    setOpenDetailModal(false);
    setSelectedEmployee(null);
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
          <div className="w3-input-group">
            <input
              className="w3-input w3-border"
              type="text"
              placeholder="社員を検索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <span className="w3-input-group-btn">
              <button className="w3-button w3-blue">
                <FaMagnifyingGlass />
              </button>
            </span>
          </div>
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
        </div>        <div className="w3-col m3">
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
              <th onClick={() => handleRequestSort('firstName')} style={{ cursor: 'pointer' }}>
                名前 {orderBy === 'firstName' && (order === 'asc' ? '↑' : '↓')}
              </th>
              <th>メールアドレス</th>
              <th>役職</th>
              <th>ロール</th>
              <th>ステータス</th>
              <th>スキル</th>
              <th>最終ログイン</th>
              <th>作成日</th>
              <th>操作</th>
            </tr>
          </thead>          <tbody>{employeesData?.users.map((employee) => (
              <EmployeeRow
                key={employee.id}
                employee={employee}
                onEdit={handleOpenDialog}
                onDelete={deleteEmployee.mutate}
                onViewDetail={handleViewDetail}
              />
            ))}
            {employeesData?.users.length === 0 && (
              <tr>
                <td colSpan="9" className="w3-center w3-text-gray">
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
        companies={companiesData}
        skills={skillsData}
      />

      <EmployeeDetailModal
        open={openDetailModal}
        onClose={handleCloseDetailModal}
        employee={selectedEmployee}
      />
    </div>
  );
};

export default Employees;