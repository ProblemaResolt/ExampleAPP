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
  TableSortLabel,
  Chip,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Grid,
  Alert,
  CircularProgress,
  Tooltip,
  InputAdornment
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  FilterList as FilterListIcon,
  Person as PersonIcon,
  Business as BusinessIcon,
  AdminPanelSettings as AdminIcon,
  SupervisorAccount as ManagerIcon
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useFormik } from 'formik';
import * as yup from 'yup';
import api from '../utils/axios';

// バリデーションスキーマ
const userSchema = yup.object({
  firstName: yup.string().required('名前（名）は必須です'),
  lastName: yup.string().required('名前（姓）は必須です'),
  email: yup.string().email('有効なメールアドレスを入力してください').required('メールアドレスは必須です'),
  role: yup.string().required('ロールは必須です'),
  company: yup.string(),
  position: yup.string()
});

// ロールの表示名マッピング
const roleLabels = {
  admin: '管理者',
  company: '会社',
  manager: 'マネージャー',
  member: 'メンバー'
};

// ロールのアイコンコンポーネント
const RoleIcon = ({ role }) => {
  switch (role) {
    case 'admin':
      return <AdminIcon />;
    case 'company':
      return <BusinessIcon />;
    case 'manager':
      return <ManagerIcon />;
    default:
      return <PersonIcon />;
  }
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

  // ユーザー一覧の取得
  const { data, isLoading } = useQuery({
    queryKey: ['users', page, rowsPerPage, orderBy, order, searchQuery, filters],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page + 1,
        limit: rowsPerPage,
        sort: `${orderBy}:${order}`,
        search: searchQuery,
        ...filters
      });
      const { data } = await api.get(`/users?${params}`);
      return data;
    }
  });

  // ユーザーの作成/更新
  const saveUser = useMutation({
    mutationFn: async (values) => {
      if (selectedUser) {
        const { data } = await api.put(`/users/${selectedUser.id}`, values);
        return data;
      } else {
        const { data } = await api.post('/users', values);
      return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['users']);
      setSuccess(selectedUser ? 'ユーザーを更新しました' : 'ユーザーを作成しました');
      setError('');
      handleCloseDialog();
    },
    onError: (error) => {
      setError(error.response?.data?.message || '操作に失敗しました');
      setSuccess('');
    }
  });

  // ユーザーの削除
  const deleteUser = useMutation({
    mutationFn: async (userId) => {
      const { data } = await api.delete(`/users/${userId}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['users']);
      setSuccess('ユーザーを削除しました');
      setError('');
    },
    onError: (error) => {
      setError(error.response?.data?.message || 'ユーザーの削除に失敗しました');
      setSuccess('');
    }
  });

  // ユーザーのステータス変更
  const updateUserStatus = useMutation({
    mutationFn: async ({ userId, status }) => {
      const { data } = await api.put(`/users/${userId}/status`, { status });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['users']);
      setSuccess('ユーザーのステータスを更新しました');
      setError('');
    },
    onError: (error) => {
      setError(error.response?.data?.message || 'ステータスの更新に失敗しました');
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
      company: '',
      position: ''
    },
    validationSchema: userSchema,
    enableReinitialize: true,
    onSubmit: async (values) => {
      await saveUser.mutateAsync(values);
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
        company: user.company || '',
        position: user.position || ''
      });
    } else {
      formik.resetForm();
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedUser(null);
    formik.resetForm();
  };

  // テーブルのソート
  const handleRequestSort = (property) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  // ページネーション
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // 検索
  const handleSearch = (event) => {
    setSearchQuery(event.target.value);
    setPage(0);
  };

  // フィルター
  const handleFilterChange = (name, value) => {
    setFilters(prev => ({ ...prev, [name]: value }));
    setPage(0);
  };

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">
          ユーザー管理
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          ユーザーを追加
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                placeholder="ユーザーを検索..."
                value={searchQuery}
                onChange={handleSearch}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  )
                }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>ロール</InputLabel>
                <Select
                  value={filters.role}
                  label="ロール"
                  onChange={(e) => handleFilterChange('role', e.target.value)}
                >
                  <MenuItem value="">すべて</MenuItem>
                  {Object.entries(roleLabels).map(([value, label]) => (
                    <MenuItem key={value} value={value}>
                      {label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>ステータス</InputLabel>
                <Select
                  value={filters.status}
                  label="ステータス"
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                >
                  <MenuItem value="">すべて</MenuItem>
                  <MenuItem value="active">有効</MenuItem>
                  <MenuItem value="inactive">無効</MenuItem>
                  <MenuItem value="pending">保留中</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <TableContainer component={Card}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>
                <TableSortLabel
                  active={orderBy === 'firstName'}
                  direction={orderBy === 'firstName' ? order : 'asc'}
                  onClick={() => handleRequestSort('firstName')}
                >
                  名前
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={orderBy === 'email'}
                  direction={orderBy === 'email' ? order : 'asc'}
                  onClick={() => handleRequestSort('email')}
                >
                  メールアドレス
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={orderBy === 'role'}
                  direction={orderBy === 'role' ? order : 'asc'}
                  onClick={() => handleRequestSort('role')}
                >
                  ロール
                </TableSortLabel>
              </TableCell>
              <TableCell>会社</TableCell>
              <TableCell>
                <TableSortLabel
                  active={orderBy === 'status'}
                  direction={orderBy === 'status' ? order : 'asc'}
                  onClick={() => handleRequestSort('status')}
                >
                  ステータス
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={orderBy === 'createdAt'}
                  direction={orderBy === 'createdAt' ? order : 'asc'}
                  onClick={() => handleRequestSort('createdAt')}
                >
                  作成日
                </TableSortLabel>
              </TableCell>
              <TableCell align="right">操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data?.users.map((user) => (
              <TableRow key={user.id}>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <PersonIcon sx={{ mr: 1 }} />
                    {user.firstName} {user.lastName}
                  </Box>
                </TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  <Chip
                    icon={<RoleIcon role={user.role} />}
                    label={roleLabels[user.role]}
                    color={
                      user.role === 'admin'
                        ? 'error'
                        : user.role === 'manager'
                        ? 'warning'
                        : 'default'
                    }
                    size="small"
                  />
                </TableCell>
                <TableCell>{user.company}</TableCell>
                <TableCell>
                  <Chip
                    label={
                      user.status === 'active'
                        ? '有効'
                        : user.status === 'inactive'
                        ? '無効'
                        : '保留中'
                    }
                    color={
                      user.status === 'active'
                        ? 'success'
                        : user.status === 'inactive'
                        ? 'error'
                        : 'warning'
                    }
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  {new Date(user.createdAt).toLocaleDateString()}
                </TableCell>
                <TableCell align="right">
                  <Tooltip title="編集">
                    <IconButton
                      size="small"
                      onClick={() => handleOpenDialog(user)}
                    >
                      <EditIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="削除">
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => {
                        if (window.confirm('このユーザーを削除してもよろしいですか？')) {
                          deleteUser.mutate(user.id);
                        }
                      }}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <TablePagination
          component="div"
          count={data?.total || 0}
          page={page}
          onPageChange={handleChangePage}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          rowsPerPageOptions={[5, 10, 25, 50]}
          labelRowsPerPage="表示件数:"
          labelDisplayedRows={({ from, to, count }) =>
            `${from}-${to} / ${count}`
          }
        />
      </TableContainer>

      {/* ユーザー作成/編集ダイアログ */}
      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
      >
        <form onSubmit={formik.handleSubmit}>
        <DialogTitle>
            {selectedUser ? 'ユーザーを編集' : 'ユーザーを追加'}
        </DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  name="firstName"
                  label="名前（名）"
                  value={formik.values.firstName}
                  onChange={formik.handleChange}
                  error={formik.touched.firstName && Boolean(formik.errors.firstName)}
                  helperText={formik.touched.firstName && formik.errors.firstName}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  name="lastName"
                  label="名前（姓）"
                  value={formik.values.lastName}
                  onChange={formik.handleChange}
                  error={formik.touched.lastName && Boolean(formik.errors.lastName)}
                  helperText={formik.touched.lastName && formik.errors.lastName}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  name="email"
                  label="メールアドレス"
                  value={formik.values.email}
                  onChange={formik.handleChange}
                  error={formik.touched.email && Boolean(formik.errors.email)}
                  helperText={formik.touched.email && formik.errors.email}
                />
              </Grid>
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>ロール</InputLabel>
                  <Select
                    name="role"
                    value={formik.values.role}
                    label="ロール"
                    onChange={formik.handleChange}
                    error={formik.touched.role && Boolean(formik.errors.role)}
                  >
                    {Object.entries(roleLabels).map(([value, label]) => (
                      <MenuItem key={value} value={value}>
                        {label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  name="company"
                  label="会社名"
                  value={formik.values.company}
                  onChange={formik.handleChange}
                  error={formik.touched.company && Boolean(formik.errors.company)}
                  helperText={formik.touched.company && formik.errors.company}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  name="position"
                  label="役職"
                  value={formik.values.position}
                  onChange={formik.handleChange}
                  error={formik.touched.position && Boolean(formik.errors.position)}
                  helperText={formik.touched.position && formik.errors.position}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>
              キャンセル
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={formik.isSubmitting}
            >
              {selectedUser ? '更新' : '作成'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
};

export default Users; 