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
  InputAdornment,
  Tabs,
  Tab,
  Divider
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  Business as BusinessIcon,
  People as PeopleIcon,
  CreditCard as CreditCardIcon,
  LocationOn as LocationIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  CalendarToday as CalendarIcon,
  Group as GroupIcon,
  Person as PersonIcon,
  SupervisorAccount as SupervisorAccountIcon
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useFormik } from 'formik';
import * as yup from 'yup';
import api from '../utils/axios';

// バリデーションスキーマ
const companySchema = yup.object({
  name: yup.string().required('会社名は必須です'),
  email: yup.string().email('有効なメールアドレスを入力してください').required('メールアドレスは必須です'),
  phone: yup.string().matches(/^\+?[1-9]\d{1,14}$/, '有効な電話番号を入力してください'),
  address: yup.string(),
  website: yup.string().url('有効なURLを入力してください'),
  subscriptionPlan: yup.string().required('サブスクリプションプランは必須です'),
  maxUsers: yup.number().min(1, '1以上の数を入力してください').required('最大ユーザー数は必須です')
});

// サブスクリプションプランの表示名マッピング
const planLabels = {
  free: 'フリープラン',
  basic: 'ベーシックプラン',
  premium: 'プレミアムプラン',
  enterprise: 'エンタープライズプラン'
};

// プランの色マッピング
const planColors = {
  free: 'default',
  basic: 'primary',
  premium: 'warning',
  enterprise: 'error'
};

const Companies = () => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [orderBy, setOrderBy] = useState('createdAt');
  const [order, setOrder] = useState('desc');
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    plan: '',
    status: ''
  });
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const queryClient = useQueryClient();

  // 会社一覧の取得
  const { data, isLoading } = useQuery({
    queryKey: ['companies', page, rowsPerPage, orderBy, order, searchQuery, filters],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page + 1,
        limit: rowsPerPage,
        sort: `${orderBy}:${order}`,
        search: searchQuery,
        ...filters,
        include: 'users'
      });
      const { data } = await api.get(`/companies?${params}`);
      return data;
    }
  });

  // 会社の作成/更新
  const saveCompany = useMutation({
    mutationFn: async (values) => {
      if (selectedCompany) {
        const { data } = await api.put(`/companies/${selectedCompany.id}`, values);
        return data;
      } else {
        const { data } = await api.post('/companies', values);
      return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['companies']);
      setSuccess(selectedCompany ? '会社情報を更新しました' : '会社を作成しました');
      setError('');
      handleCloseDialog();
    },
    onError: (error) => {
      setError(error.response?.data?.message || '操作に失敗しました');
      setSuccess('');
    }
  });

  // 会社の削除
  const deleteCompany = useMutation({
    mutationFn: async (companyId) => {
      const { data } = await api.delete(`/companies/${companyId}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['companies']);
      setSuccess('会社を削除しました');
      setError('');
    },
    onError: (error) => {
      setError(error.response?.data?.message || '会社の削除に失敗しました');
      setSuccess('');
    }
  });

  // 会社のステータス変更
  const updateCompanyStatus = useMutation({
    mutationFn: async ({ companyId, status }) => {
      const { data } = await api.put(`/companies/${companyId}/status`, { status });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['companies']);
      setSuccess('会社のステータスを更新しました');
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
      name: '',
      email: '',
      phone: '',
      address: '',
      website: '',
      subscriptionPlan: '',
      maxUsers: 5
    },
    validationSchema: companySchema,
    enableReinitialize: true,
    onSubmit: async (values) => {
      await saveCompany.mutateAsync(values);
    }
  });

  // ダイアログの開閉
  const handleOpenDialog = (company = null) => {
    setSelectedCompany(company);
    if (company) {
      formik.setValues({
        name: company.name,
        email: company.email,
        phone: company.phone || '',
        address: company.address || '',
        website: company.website || '',
        subscriptionPlan: company.subscription?.plan || '',
        maxUsers: company.subscription?.maxUsers || 5
      });
    } else {
      formik.resetForm();
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedCompany(null);
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
          会社管理
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          会社を追加
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
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                placeholder="会社を検索..."
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
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>プラン</InputLabel>
                <Select
                  value={filters.plan}
                  label="プラン"
                  onChange={(e) => handleFilterChange('plan', e.target.value)}
                >
                  <MenuItem value="">すべて</MenuItem>
                  {Object.entries(planLabels).map(([value, label]) => (
                    <MenuItem key={value} value={value}>
                      {label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={3}>
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
                  active={orderBy === 'name'}
                  direction={orderBy === 'name' ? order : 'asc'}
                  onClick={() => handleRequestSort('name')}
                >
                  会社名
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
              <TableCell>電話番号</TableCell>
              <TableCell>
                <TableSortLabel
                  active={orderBy === 'subscription.plan'}
                  direction={orderBy === 'subscription.plan' ? order : 'asc'}
                  onClick={() => handleRequestSort('subscription.plan')}
                >
                  プラン
                </TableSortLabel>
              </TableCell>
              <TableCell>ユーザー構成</TableCell>
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
            {data?.companies.map((company) => {
              // マネージャーとメンバーの情報を整理
              const managers = company.users?.filter(u => u.role === 'MANAGER') || [];
              const members = company.users?.filter(u => u.role === 'MEMBER') || [];
              
              return (
                <TableRow key={company.id}>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <BusinessIcon sx={{ mr: 1 }} />
                      {company.name}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <EmailIcon sx={{ mr: 1, fontSize: 'small' }} />
                      {company.email}
                    </Box>
                  </TableCell>
                  <TableCell>
                    {company.phone && (
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <PhoneIcon sx={{ mr: 1, fontSize: 'small' }} />
                        {company.phone}
                      </Box>
                    )}
                  </TableCell>
                  <TableCell>
                    <Chip
                      icon={<CreditCardIcon />}
                      label={planLabels[company.subscription?.plan] || '未設定'}
                      color={planColors[company.subscription?.plan] || 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Box sx={{ minWidth: 300 }}>
                      {managers.map((manager) => (
                        <Box key={manager.id} sx={{ mb: 1 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                            <SupervisorAccountIcon sx={{ mr: 1, fontSize: 'small', color: 'warning.main' }} />
                            <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                              {manager.firstName} {manager.lastName}
                            </Typography>
                          </Box>
                          <Box sx={{ pl: 3 }}>
                            {members
                              .filter(member => member.managerId === manager.id)
                              .map(member => (
                                <Box key={member.id} sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                                  <PersonIcon sx={{ mr: 1, fontSize: 'small', color: 'text.secondary' }} />
                                  <Typography variant="body2" color="text.secondary">
                                    {member.firstName} {member.lastName}
                                  </Typography>
                                </Box>
                              ))}
                          </Box>
                        </Box>
                      ))}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={
                        company.status === 'active'
                          ? '有効'
                          : company.status === 'inactive'
                          ? '無効'
                          : '保留中'
                      }
                      color={
                        company.status === 'active'
                          ? 'success'
                          : company.status === 'inactive'
                          ? 'error'
                          : 'warning'
                      }
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    {new Date(company.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="編集">
                      <IconButton
                        size="small"
                        onClick={() => handleOpenDialog(company)}
                      >
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="削除">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => {
                          if (window.confirm('この会社を削除してもよろしいですか？')) {
                            deleteCompany.mutate(company.id);
                          }
                        }}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              );
            })}
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

      {/* 会社作成/編集ダイアログ */}
      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
      >
        <form onSubmit={formik.handleSubmit}>
        <DialogTitle>
            {selectedCompany ? '会社を編集' : '会社を追加'}
        </DialogTitle>
          <DialogContent>
            <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)} sx={{ mb: 2 }}>
              <Tab label="基本情報" />
              <Tab label="サブスクリプション" />
            </Tabs>

            {activeTab === 0 && (
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    name="name"
                    label="会社名"
                    value={formik.values.name}
                    onChange={formik.handleChange}
                    error={formik.touched.name && Boolean(formik.errors.name)}
                    helperText={formik.touched.name && formik.errors.name}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
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
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    name="phone"
                    label="電話番号"
                    value={formik.values.phone}
                    onChange={formik.handleChange}
                    error={formik.touched.phone && Boolean(formik.errors.phone)}
                    helperText={formik.touched.phone && formik.errors.phone}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    name="address"
                    label="住所"
                    value={formik.values.address}
                    onChange={formik.handleChange}
                    error={formik.touched.address && Boolean(formik.errors.address)}
                    helperText={formik.touched.address && formik.errors.address}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    name="website"
                    label="Webサイト"
                    value={formik.values.website}
                    onChange={formik.handleChange}
                    error={formik.touched.website && Boolean(formik.errors.website)}
                    helperText={formik.touched.website && formik.errors.website}
                  />
                </Grid>
              </Grid>
            )}

            {activeTab === 1 && (
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <InputLabel>サブスクリプションプラン</InputLabel>
                    <Select
                      name="subscriptionPlan"
                      value={formik.values.subscriptionPlan}
                      label="サブスクリプションプラン"
                      onChange={formik.handleChange}
                      error={formik.touched.subscriptionPlan && Boolean(formik.errors.subscriptionPlan)}
                    >
                      {Object.entries(planLabels).map(([value, label]) => (
                        <MenuItem key={value} value={value}>
                          {label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    type="number"
                    name="maxUsers"
                    label="最大ユーザー数"
                    value={formik.values.maxUsers}
                    onChange={formik.handleChange}
                    error={formik.touched.maxUsers && Boolean(formik.errors.maxUsers)}
                    helperText={formik.touched.maxUsers && formik.errors.maxUsers}
                  />
                </Grid>
              </Grid>
            )}
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
              {selectedCompany ? '更新' : '作成'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
};

export default Companies; 