import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Grid,
  Alert,
  CircularProgress,
  Tooltip,
  InputAdornment,
  FormHelperText
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Search as SearchIcon,
  Person as PersonIcon,
  Business as BusinessIcon,
  AdminPanelSettings as AdminIcon,
  SupervisorAccount as ManagerIcon,
  Block as BlockIcon,
  CheckCircle as CheckCircleIcon,
  Email as EmailIcon
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useFormik } from 'formik';
import * as yup from 'yup';
import api from '../utils/axios';
import { useAuth } from '../contexts/AuthContext';

// バリデーションスキーマ
const userSchema = yup.object({
  firstName: yup.string().required('名前（名）は必須です'),
  lastName: yup.string().required('名前（姓）は必須です'),
  email: yup.string().email('有効なメールアドレスを入力してください').required('メールアドレスは必須です'),
  role: yup.string().required('ロールは必須です'),
  companyId: yup.string().nullable(),
  position: yup.string().nullable()
});

// ロールの表示名マッピング
const roleLabels = {
  ADMIN: '管理者',
  COMPANY: '会社',
  MANAGER: 'マネージャー',
  MEMBER: 'メンバー'
};

// ロールのアイコンコンポーネント
const RoleIcon = ({ role }) => {
  switch (role) {
    case 'ADMIN':
      return <AdminIcon />;
    case 'COMPANY':
      return <BusinessIcon />;
    case 'MANAGER':
      return <ManagerIcon />;
    default:
      return <PersonIcon />;
  }
};

// ユーザー編集ダイアログ
const UserDialog = ({ open, onClose, user, onSubmit, formik, companies }) => {
  if (!open) return null;

  return (
    <div className="w3-modal" style={{ display: 'block' }}>
      <div className="w3-modal-content w3-card-4 w3-animate-zoom" style={{ maxWidth: '600px' }}>
        <header className="w3-container w3-blue">
          <h3>{user ? 'ユーザーを編集' : 'ユーザーを追加'}</h3>
        </header>
        <form onSubmit={onSubmit}>
          <div className="w3-container">
            <div className="w3-row-padding">
              <div className="w3-col m6">
                <label>名前（名）</label>
                <input
                  className={`w3-input w3-border ${formik.touched.firstName && formik.errors.firstName ? 'w3-border-red' : ''}`}
                  name="firstName"
                  value={formik.values.firstName}
                  onChange={formik.handleChange}
                />
                {formik.touched.firstName && formik.errors.firstName && (
                  <div className="w3-text-red">{formik.errors.firstName}</div>
                )}
              </div>
              <div className="w3-col m6">
                <label>名前（姓）</label>
                <input
                  className={`w3-input w3-border ${formik.touched.lastName && formik.errors.lastName ? 'w3-border-red' : ''}`}
                  name="lastName"
                  value={formik.values.lastName}
                  onChange={formik.handleChange}
                />
                {formik.touched.lastName && formik.errors.lastName && (
                  <div className="w3-text-red">{formik.errors.lastName}</div>
                )}
              </div>
              <div className="w3-col m12">
                <label>メールアドレス</label>
                <input
                  className={`w3-input w3-border ${formik.touched.email && formik.errors.email ? 'w3-border-red' : ''}`}
                  type="email"
                  name="email"
                  value={formik.values.email}
                  onChange={formik.handleChange}
                />
                {formik.touched.email && formik.errors.email && (
                  <div className="w3-text-red">{formik.errors.email}</div>
                )}
              </div>
              <div className="w3-col m6">
                <label>ロール</label>
                <select
                  className={`w3-select w3-border ${formik.touched.role && formik.errors.role ? 'w3-border-red' : ''}`}
                  name="role"
                  value={formik.values.role}
                  onChange={formik.handleChange}
                >
                  <option value="">選択してください</option>
                  {Object.entries(roleLabels).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
                {formik.touched.role && formik.errors.role && (
                  <div className="w3-text-red">{formik.errors.role}</div>
                )}
              </div>
              <div className="w3-col m6">
                <label>会社</label>
                <select
                  className="w3-select w3-border"
                  name="companyId"
                  value={formik.values.companyId}
                  onChange={formik.handleChange}
                >
                  <option value="">選択してください</option>
                  {companies?.map((company) => (
                    <option key={company.id} value={company.id}>
                      {company.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="w3-col m12">
                <label>役職</label>
                <input
                  className="w3-input w3-border"
                  name="position"
                  value={formik.values.position}
                  onChange={formik.handleChange}
                />
              </div>
            </div>
          </div>
          <footer className="w3-container w3-padding">
            <button type="button" className="w3-button w3-gray" onClick={onClose}>
              キャンセル
            </button>
            <button
              type="submit"
              className="w3-button w3-blue w3-right"
              disabled={formik.isSubmitting}
            >
              {user ? '更新' : '作成'}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
};

const Users = () => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [orderBy, setOrderBy] = useState('createdAt');
  const [order, setOrder] = useState('desc');
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    role: '',
    status: ''
  });

  const [openDialog, setOpenDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();

  // ユーザー一覧の取得
  const { data: usersData, isLoading } = useQuery({
    queryKey: ['users', page, rowsPerPage, orderBy, order, searchQuery, filters],
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

  // ユーザーの作成/更新
  const saveUser = useMutation({
    mutationFn: async (values) => {
      const userData = {
        ...values,
        role: values.role.toUpperCase(),
        companyId: values.companyId || null,
        position: values.position || null
      };
      
      if (selectedUser) {
        const { data } = await api.patch(`/api/users/${selectedUser.id}`, userData);
        return data;
      } else {
        const { data } = await api.post('/api/users', userData);
        return data;
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setSuccess(selectedUser ? 'ユーザーを更新しました' : 'ユーザーを作成しました');
      setError('');
      handleCloseDialog();
    },
    onError: (error) => {
      if (error.response?.data?.error?.errors) {
        const validationErrors = error.response.data.error.errors;
        const errorMessages = validationErrors.map(err => {
          const field = err.param;
          const message = err.msg;
          const value = error.response.data.error.requestBody?.[field];
          return `${field}: ${message} (値: ${value})`;
        }).join('\n');
        setError(`バリデーションエラー:\n${errorMessages}`);
      } else {
        const errorMessage = error.response?.data?.message || error.response?.data?.error || '操作に失敗しました';
        setError(errorMessage);
      }
      setSuccess('');
    }
  });

  // ユーザーのステータス変更
  const updateUserStatus = useMutation({
    mutationFn: async ({ userId, isActive }) => {
      const { data } = await api.patch(`/api/users/${userId}`, { isActive });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setSuccess('ユーザーのステータスを更新しました');
      setError('');
    },
    onError: (error) => {
      const errorMessage = error.response?.data?.message || error.response?.data?.error || 'ステータスの更新に失敗しました';
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
      companyId: '',
      position: ''
    },
    validationSchema: userSchema,
    enableReinitialize: true,
    onSubmit: async (values, { setSubmitting }) => {
      try {
        await saveUser.mutateAsync(values);
      } catch (error) {
        // Error handling is done in saveUser.mutate
      } finally {
        setSubmitting(false);
      }
    }
  });

  // ダイアログの開閉
  const handleOpenDialog = (user = null) => {
    setSelectedUser(user);
    if (user) {
      formik.setValues({
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        companyId: user.company?.id || '',
        position: user.position || ''
      });
    } else {
      formik.resetForm({
        values: {
          firstName: '',
          lastName: '',
          email: '',
          role: currentUser?.role === 'ADMIN' ? '' : 'MEMBER',
          companyId: '',
          position: ''
        }
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedUser(null);
    formik.resetForm();
  };

  if (isLoading) {
    return (
      <div className="w3-container w3-center" style={{ paddingTop: '200px' }}>
        <i className="fa fa-spinner fa-spin w3-xxlarge"></i>
      </div>
    );
  }

  return (
    <div className="w3-container">
      <div className="w3-bar w3-margin-bottom">
        <h2 className="w3-bar-item">ユーザー管理</h2>
        <button
          className="w3-button w3-blue w3-right"
          onClick={() => handleOpenDialog()}
        >
          <i className="fa fa-plus"></i> ユーザーを追加
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
              placeholder="ユーザーを検索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <span className="w3-input-group-btn">
              <button className="w3-button w3-blue">
                <i className="fa fa-search"></i>
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
        </div>
        <div className="w3-col m3">
          <select
            className="w3-select w3-border"
            value={filters.status}
            onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
          >
            <option value="">すべてのステータス</option>
            <option value="active">アクティブ</option>
            <option value="inactive">非アクティブ</option>
          </select>
        </div>
      </div>

      <div className="w3-responsive">
        <table className="w3-table w3-bordered w3-striped">
          <thead>
            <tr>
              <th>名前</th>
              <th>メールアドレス</th>
              <th>ロール</th>
              <th>会社</th>
              <th>役職</th>
              <th>ステータス</th>
              <th>最終ログイン</th>
              <th>作成日</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {usersData?.users.map((user) => (
              <tr key={user.id} className="w3-hover-light-gray">
                <td>
                  <div className="w3-cell-row">
                    <div className="w3-cell" style={{ width: '40px' }}>
                      <RoleIcon role={user.role} />
                    </div>
                    <div className="w3-cell">
                      {user.firstName} {user.lastName}
                    </div>
                  </div>
                </td>
                <td>
                  <div className="w3-cell-row">
                    <i className="fa fa-envelope w3-margin-right"></i>
                    {user.email}
                  </div>
                </td>
                <td>
                  <span className={`w3-tag ${user.role === 'ADMIN' ? 'w3-red' : user.role === 'COMPANY' ? 'w3-blue' : user.role === 'MANAGER' ? 'w3-green' : 'w3-gray'}`}>
                    {roleLabels[user.role]}
                  </span>
                </td>
                <td>{user.company?.name || '-'}</td>
                <td>{user.position || '-'}</td>
                <td>
                  <span className={`w3-tag ${user.isActive ? 'w3-green' : 'w3-red'}`}>
                    {user.isActive ? 'アクティブ' : '非アクティブ'}
                  </span>
                </td>
                <td>
                  {user.lastLoginAt
                    ? new Date(user.lastLoginAt).toLocaleString()
                    : '未ログイン'}
                </td>
                <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                <td>
                  <div className="w3-bar">
                    <button
                      className="w3-button w3-small w3-blue"
                      onClick={() => handleOpenDialog(user)}
                      title="ユーザー編集"
                    >
                      <i className="fa fa-edit"></i>
                    </button>
                    <button
                      className={`w3-button w3-small ${user.isActive ? 'w3-red' : 'w3-green'}`}
                      onClick={() => updateUserStatus.mutate({ userId: user.id, isActive: !user.isActive })}
                      title={user.isActive ? '非アクティブ化' : 'アクティブ化'}
                    >
                      <i className={`fa fa-${user.isActive ? 'ban' : 'check'}`}></i>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {usersData?.users.length === 0 && (
              <tr>
                <td colSpan="9" className="w3-center w3-text-gray">
                  ユーザーはありません
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
          {page + 1} / {Math.ceil((usersData?.pagination.total || 0) / rowsPerPage)}
        </span>
        <button
          className="w3-button w3-bar-item"
          onClick={() => setPage(p => p + 1)}
          disabled={(page + 1) * rowsPerPage >= (usersData?.pagination.total || 0)}
        >
          &rsaquo;
        </button>
        <button
          className="w3-button w3-bar-item"
          onClick={() => setPage(Math.ceil((usersData?.pagination.total || 0) / rowsPerPage) - 1)}
          disabled={(page + 1) * rowsPerPage >= (usersData?.pagination.total || 0)}
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
      </div>

      <UserDialog
        open={openDialog}
        onClose={handleCloseDialog}
        user={selectedUser}
        onSubmit={formik.handleSubmit}
        formik={formik}
        companies={companiesData}
      />
    </div>
  );
};

export default Users; 