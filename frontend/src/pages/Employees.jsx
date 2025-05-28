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
  InputAdornment
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  Person as PersonIcon,
  Email as EmailIcon,
  Business as BusinessIcon,
  SupervisorAccount as ManagerIcon
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useFormik } from 'formik';
import * as yup from 'yup';
import api from '../utils/axios';
import { useAuth } from '../contexts/AuthContext';

// バリデーションスキーマ
const employeeSchema = yup.object({
  firstName: yup.string().required('名前（名）は必須です'),
  lastName: yup.string().required('名前（姓）は必須です'),
  email: yup.string().email('有効なメールアドレスを入力してください').required('メールアドレスは必須です'),
  position: yup.string().nullable(),
  role: yup.string().required('ロールは必須です'),
  companyId: yup.string().nullable()
});

// ロールの表示名マッピング
const roleLabels = {
  MANAGER: 'マネージャー',
  MEMBER: 'メンバー'
};

// ステータスの表示名マッピング
const statusLabels = {
  active: '有効',
  inactive: '無効'
};

// ステータスの色マッピング
const statusColors = {
  active: 'success',
  inactive: 'error'
};

// 社員行コンポーネント
const EmployeeRow = ({ employee, onEdit, onDelete }) => {
  return (
    <TableRow hover>
      <TableCell>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <PersonIcon sx={{ mr: 1, color: 'text.secondary' }} />
          {employee.firstName} {employee.lastName}
        </Box>
      </TableCell>
      <TableCell>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <EmailIcon sx={{ mr: 1, fontSize: 'small' }} />
          {employee.email}
        </Box>
      </TableCell>
      <TableCell>{employee.position || '-'}</TableCell>
      <TableCell>
        <Chip
          label={roleLabels[employee.role]}
          color={employee.role === 'MANAGER' ? 'warning' : 'primary'}
          size="small"
        />
      </TableCell>
      <TableCell>
        <Chip
          label={statusLabels[employee.isActive ? 'active' : 'inactive']}
          color={statusColors[employee.isActive ? 'active' : 'inactive']}
          size="small"
        />
      </TableCell>
      <TableCell>
        {employee.lastLoginAt
          ? new Date(employee.lastLoginAt).toLocaleString()
          : '未ログイン'}
      </TableCell>
      <TableCell>
        {new Date(employee.createdAt).toLocaleDateString()}
      </TableCell>
      <TableCell align="right">
        <Tooltip title="編集">
          <IconButton size="small" onClick={() => onEdit(employee)}>
            <EditIcon />
          </IconButton>
        </Tooltip>
        <Tooltip title="削除">
          <IconButton
            size="small"
            color="error"
            onClick={() => {
              if (window.confirm('この社員を削除してもよろしいですか？')) {
                onDelete(employee.id);
              }
            }}
          >
            <DeleteIcon />
          </IconButton>
        </Tooltip>
      </TableCell>
    </TableRow>
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

  const [openDialog, setOpenDialog] = useState(false);
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

  // 社員の作成/更新
  const saveEmployee = useMutation({
    mutationFn: async (values) => {
      const employeeData = {
        ...values,
        role: values.role.toUpperCase(),
        companyId: values.companyId || null,
        position: values.position || null
      };
      
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
    validationSchema: employeeSchema,
    enableReinitialize: true,
    onSubmit: async (values) => {
      try {
        await saveEmployee.mutateAsync(values);
      } catch (error) {
        // Error handling is done in saveEmployee.mutate
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
        companyId: employee.company?.id || '',
        position: employee.position || ''
      });
    } else {
      formik.resetForm({
        values: {
          firstName: '',
          lastName: '',
          email: '',
          role: 'MEMBER',
          companyId: '',
          position: ''
        }
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedEmployee(null);
    formik.resetForm();
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
          社員管理
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          社員を追加
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

      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, pb: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
            <PersonIcon sx={{ mr: 1, color: 'primary.main' }} />
            <Typography variant="h6">
              社員一覧
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ ml: 2 }}>
              （{employeesData?.pagination.total || 0}名）
            </Typography>
          </Box>

          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                placeholder="社員を検索..."
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
                  {Object.entries(statusLabels).map(([value, label]) => (
                    <MenuItem key={value} value={value}>
                      {label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>

          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>名前</TableCell>
                  <TableCell>メールアドレス</TableCell>
                  <TableCell>役職</TableCell>
                  <TableCell>ロール</TableCell>
                  <TableCell>ステータス</TableCell>
                  <TableCell>最終ログイン</TableCell>
                  <TableCell>作成日</TableCell>
                  <TableCell align="right">操作</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {employeesData?.users.map((employee) => (
                  <EmployeeRow
                    key={employee.id}
                    employee={employee}
                    onEdit={handleOpenDialog}
                    onDelete={deleteEmployee.mutate}
                  />
                ))}
                {employeesData?.users.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} align="center">
                      <Typography color="text.secondary">
                        社員が見つかりません
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>

          <TablePagination
            component="div"
            count={employeesData?.pagination.total || 0}
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
        </CardContent>
      </Card>

      {/* 社員作成/編集ダイアログ */}
      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
      >
        <form onSubmit={formik.handleSubmit}>
          <DialogTitle>
            {selectedEmployee ? '社員を編集' : '社員を追加'}
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
                    {['MANAGER', 'MEMBER'].map((role) => (
                      <MenuItem key={role} value={role}>
                        {roleLabels[role]}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
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
              {currentUser?.role === 'ADMIN' && (
                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <InputLabel>会社</InputLabel>
                    <Select
                      name="companyId"
                      value={formik.values.companyId}
                      label="会社"
                      onChange={formik.handleChange}
                      error={formik.touched.companyId && Boolean(formik.errors.companyId)}
                    >
                      <MenuItem value="">選択してください</MenuItem>
                      {companiesData?.map((company) => (
                        <MenuItem key={company.id} value={company.id}>
                          {company.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              )}
              {currentUser?.role === 'COMPANY' && (
                <input type="hidden" name="companyId" value={currentUser.managedCompany?.id} />
              )}
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
              {selectedEmployee ? '更新' : '作成'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
};

export default Employees; 