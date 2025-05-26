import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TableSortLabel,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
  Tooltip,
  IconButton,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Paper,
  useTheme
} from '@mui/material';
import {
  Check as CheckIcon,
  Close as CloseIcon,
  CreditCard as CreditCardIcon,
  Business as BusinessIcon,
  CalendarToday as CalendarIcon,
  Payment as PaymentIcon,
  Receipt as ReceiptIcon,
  ArrowUpward as ArrowUpwardIcon,
  ArrowDownward as ArrowDownwardIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../utils/axios';

// プラン情報
const plans = {
  free: {
    name: 'フリープラン',
    price: 0,
    features: [
      '最大5人のマネージャー',
      '基本的な機能',
      'メールサポート',
      '基本的な分析'
    ],
    color: 'default'
  },
  basic: {
    name: 'ベーシックプラン',
    price: 5000,
    features: [
      '最大20人のマネージャー',
      'すべての基本機能',
      '優先メールサポート',
      '詳細な分析',
      'カスタムレポート'
    ],
    color: 'primary'
  },
  premium: {
    name: 'プレミアムプラン',
    price: 15000,
    features: [
      '無制限のマネージャー',
      'すべての機能',
      '24時間サポート',
      '高度な分析',
      'APIアクセス',
      'カスタムインテグレーション'
    ],
    color: 'warning'
  },
  enterprise: {
    name: 'エンタープライズプラン',
    price: null,
    features: [
      'カスタムソリューション',
      '専任サポート',
      'カスタムインテグレーション',
      'SLA保証',
      'オンプレミス対応',
      'セキュリティ監査'
    ],
    color: 'error'
  }
};

const Subscriptions = () => {
  const theme = useTheme();
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [orderBy, setOrderBy] = useState('createdAt');
  const [order, setOrder] = useState('desc');
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const queryClient = useQueryClient();

  // 現在のサブスクリプション情報の取得
  const fetchCurrentSubscription = async () => {
    const { data } = await api.get('/subscriptions/current');
    return data;
  };

  // 支払い履歴の取得
  const fetchPayments = async ({ queryKey }) => {
    const [_, params] = queryKey;
    const { data } = await api.get(`/subscriptions/payments?${params}`);
    return data;
  };

  // プラン変更
  const changePlan = async ({ planId }) => {
    const { data } = await api.post('/subscriptions/change-plan', { planId });
    return data;
  };

  // ダイアログの開閉
  const handleOpenDialog = (plan) => {
    setSelectedPlan(plan);
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedPlan(null);
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

  if (isLoadingCurrent || isLoadingHistory) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ mb: 3 }}>
        サブスクリプション管理
      </Typography>

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

      {/* 現在のプラン情報 */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom>
                現在のプラン
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Chip
                  icon={<CreditCardIcon />}
                  label={plans[currentSubscription?.plan]?.name || '未設定'}
                  color={plans[currentSubscription?.plan]?.color || 'default'}
                  sx={{ mr: 2 }}
                />
                {currentSubscription?.status === 'active' ? (
                  <Chip
                    icon={<CheckIcon />}
                    label="有効"
                    color="success"
                    size="small"
                  />
                ) : (
                  <Chip
                    icon={<CloseIcon />}
                    label="無効"
                    color="error"
                    size="small"
                  />
                )}
              </Box>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                更新日: {new Date(currentSubscription?.updatedAt).toLocaleDateString()}
              </Typography>
              {currentSubscription?.nextBillingDate && (
                <Typography variant="body2" color="text.secondary">
                  次回請求日: {new Date(currentSubscription?.nextBillingDate).toLocaleDateString()}
                </Typography>
              )}
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom>
                プラン詳細
              </Typography>
              <List dense>
                {plans[currentSubscription?.plan]?.features.map((feature, index) => (
                  <ListItem key={index}>
                    <ListItemIcon>
                      <CheckIcon color="success" />
                    </ListItemIcon>
                    <ListItemText primary={feature} />
                  </ListItem>
                ))}
              </List>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* プラン一覧 */}
      <Typography variant="h5" sx={{ mb: 3 }}>
        利用可能なプラン
      </Typography>
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {Object.entries(plans).map(([key, plan]) => (
          <Grid item xs={12} md={3} key={key}>
            <Paper
              elevation={currentSubscription?.plan === key ? 8 : 1}
              sx={{
                p: 3,
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                position: 'relative',
                border: currentSubscription?.plan === key ? `2px solid ${theme.palette[plan.color].main}` : 'none'
              }}
            >
              {currentSubscription?.plan === key && (
                <Chip
                  label="現在のプラン"
                  color={plan.color}
                  size="small"
                  sx={{ position: 'absolute', top: 8, right: 8 }}
                />
              )}
              <Typography variant="h6" gutterBottom>
                {plan.name}
              </Typography>
              <Typography variant="h4" sx={{ mb: 2 }}>
                {plan.price === null ? 'カスタム' : `¥${plan.price.toLocaleString()}/月`}
              </Typography>
              <List dense sx={{ flexGrow: 1 }}>
                {plan.features.map((feature, index) => (
                  <ListItem key={index}>
                    <ListItemIcon>
                      <CheckIcon color="success" />
                    </ListItemIcon>
                    <ListItemText primary={feature} />
                  </ListItem>
                ))}
              </List>
              <Button
                variant={currentSubscription?.plan === key ? 'outlined' : 'contained'}
                color={plan.color}
                fullWidth
                sx={{ mt: 2 }}
                onClick={() => handleOpenDialog(key)}
                disabled={currentSubscription?.plan === key}
              >
                {currentSubscription?.plan === key ? '現在のプラン' : 'プランを変更'}
              </Button>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* 支払い履歴 */}
      <Typography variant="h5" sx={{ mb: 3 }}>
        支払い履歴
      </Typography>
      <TableContainer component={Card}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>
                <TableSortLabel
                  active={orderBy === 'createdAt'}
                  direction={orderBy === 'createdAt' ? order : 'asc'}
                  onClick={() => handleRequestSort('createdAt')}
                >
                  日付
                </TableSortLabel>
              </TableCell>
              <TableCell>プラン</TableCell>
              <TableCell>金額</TableCell>
              <TableCell>ステータス</TableCell>
              <TableCell>支払い方法</TableCell>
              <TableCell>請求書</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paymentHistory?.payments.map((payment) => (
              <TableRow key={payment.id}>
                  <TableCell>
                  {new Date(payment.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <Chip
                    icon={<CreditCardIcon />}
                    label={plans[payment.plan]?.name}
                    color={plans[payment.plan]?.color}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                  ¥{payment.amount.toLocaleString()}
                </TableCell>
                <TableCell>
                  <Chip
                    label={
                      payment.status === 'succeeded'
                        ? '支払い完了'
                        : payment.status === 'pending'
                        ? '処理中'
                        : '失敗'
                    }
                    color={
                      payment.status === 'succeeded'
                        ? 'success'
                        : payment.status === 'pending'
                        ? 'warning'
                        : 'error'
                    }
                        size="small"
                  />
                </TableCell>
                <TableCell>
                  {payment.paymentMethod}
                </TableCell>
                <TableCell>
                  <Tooltip title="請求書を表示">
                      <IconButton
                        size="small"
                      onClick={() => window.open(payment.invoiceUrl, '_blank')}
                    >
                      <ReceiptIcon />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      <TablePagination
        component="div"
          count={paymentHistory?.total || 0}
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

      {/* プラン変更確認ダイアログ */}
      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          プランの変更
        </DialogTitle>
        <DialogContent>
          <Typography gutterBottom>
            以下のプランに変更しますか？
          </Typography>
          {selectedPlan && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="h6">
                {plans[selectedPlan].name}
              </Typography>
              <Typography variant="h4" sx={{ my: 2 }}>
                {plans[selectedPlan].price === null
                  ? 'カスタム価格'
                  : `¥${plans[selectedPlan].price.toLocaleString()}/月`}
              </Typography>
              <List dense>
                {plans[selectedPlan].features.map((feature, index) => (
                  <ListItem key={index}>
                    <ListItemIcon>
                      <CheckIcon color="success" />
                    </ListItemIcon>
                    <ListItemText primary={feature} />
                  </ListItem>
                ))}
              </List>
            </Box>
          )}
          <Alert severity="info" sx={{ mt: 2 }}>
            プランを変更すると、次回の請求サイクルから新しいプランが適用されます。
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>
            キャンセル
          </Button>
          <Button
            variant="contained"
            color={selectedPlan ? plans[selectedPlan].color : 'primary'}
            onClick={() => changePlan.mutate(selectedPlan)}
            disabled={changePlan.isLoading}
          >
            プランを変更
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Subscriptions; 