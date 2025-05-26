import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Grid,
  Divider,
  Alert,
  CircularProgress,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  OutlinedInput,
  InputAdornment,
  Tabs,
  Tab,
  Avatar
} from '@mui/material';
import {
  Edit as EditIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Google as GoogleIcon,
  GitHub as GitHubIcon,
  Business as BusinessIcon,
  CreditCard as CreditCardIcon,
  People as PeopleIcon
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useFormik } from 'formik';
import * as yup from 'yup';
import api from '../utils/axios';

// バリデーションスキーマ
const profileSchema = yup.object({
  firstName: yup.string().required('名前（名）は必須です'),
  lastName: yup.string().required('名前（姓）は必須です'),
  email: yup.string().email('有効なメールアドレスを入力してください').required('メールアドレスは必須です'),
  phone: yup.string().matches(/^\+?[1-9]\d{1,14}$/, '有効な電話番号を入力してください'),
  company: yup.string(),
  position: yup.string()
});

const passwordSchema = yup.object({
  currentPassword: yup.string().required('現在のパスワードは必須です'),
  newPassword: yup
    .string()
    .min(8, 'パスワードは8文字以上で入力してください')
    .matches(/[A-Z]/, 'パスワードには大文字を含めてください')
    .matches(/[a-z]/, 'パスワードには小文字を含めてください')
    .matches(/[0-9]/, 'パスワードには数字を含めてください')
    .required('新しいパスワードは必須です'),
  confirmPassword: yup
    .string()
    .oneOf([yup.ref('newPassword')], 'パスワードが一致しません')
    .required('パスワードの確認は必須です')
});

const Profile = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const queryClient = useQueryClient();

  // ユーザー情報の取得
  const { data: user, isLoading } = useQuery({
    queryKey: ['user'],
    queryFn: fetchUserProfile
  });

  // プロフィール更新
  const updateProfile = useMutation({
    mutationFn: updateUserProfile,
    onSuccess: () => {
      queryClient.invalidateQueries(['user']);
      setSuccess('プロフィールを更新しました');
      setError('');
    },
    onError: (error) => {
      setError(error.response?.data?.message || 'プロフィールの更新に失敗しました');
      setSuccess('');
    }
  });

  // パスワード変更
  const changePassword = useMutation({
    mutationFn: updateUserPassword,
    onSuccess: () => {
      setSuccess('パスワードを変更しました');
      setError('');
      passwordFormik.resetForm();
    },
    onError: (error) => {
      setError(error.response?.data?.message || 'パスワードの変更に失敗しました');
      setSuccess('');
    }
  });

  // SNS連携
  const linkSocial = useMutation({
    mutationFn: linkAuthProvider,
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: (error) => {
      setError(error.response?.data?.message || 'SNS連携に失敗しました');
    }
  });

  const unlinkSocial = useMutation({
    mutationFn: unlinkAuthProvider,
    onSuccess: () => {
      queryClient.invalidateQueries(['user']);
      setSuccess('SNS連携を解除しました');
      setError('');
    },
    onError: (error) => {
      setError(error.response?.data?.message || 'SNS連携の解除に失敗しました');
      setSuccess('');
    }
  });

  // プロフィールフォーム
  const profileFormik = useFormik({
    initialValues: {
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      email: user?.email || '',
      phone: user?.phone || '',
      company: user?.company || '',
      position: user?.position || ''
    },
    validationSchema: profileSchema,
    enableReinitialize: true,
    onSubmit: async (values) => {
      await updateProfile.mutateAsync(values);
    }
  });

  // パスワードフォーム
  const passwordFormik = useFormik({
    initialValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    },
    validationSchema: passwordSchema,
    onSubmit: async (values) => {
      await changePassword.mutateAsync(values);
    }
  });

  const fetchUserProfile = async () => {
    const { data } = await api.get('/users/me');
    return data;
  };

  const updateUserProfile = async (values) => {
    const { data } = await api.put('/users/me', values);
    return data;
  };

  const updateUserPassword = async (values) => {
    const { data } = await api.put('/users/me/password', values);
    return data;
  };

  const linkAuthProvider = async ({ provider }) => {
    const { data } = await api.post(`/auth/${provider}/link`);
    return data;
  };

  const unlinkAuthProvider = async ({ provider }) => {
    const { data } = await api.post(`/auth/${provider}/unlink`);
    return data;
  };

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', p: 3 }}>
      <Typography variant="h4" gutterBottom>
        プロフィール
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

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <Avatar
              src={user?.avatar}
              sx={{ width: 80, height: 80, mr: 2 }}
            />
            <Box>
              <Typography variant="h6">
                {user?.firstName} {user?.lastName}
              </Typography>
              <Typography color="textSecondary">
                {user?.email}
              </Typography>
              <Box sx={{ mt: 1 }}>
                <Chip
                  label={user?.role}
                  color={
                    user?.role === 'admin'
                      ? 'error'
                      : user?.role === 'manager'
                      ? 'warning'
                      : 'default'
                  }
                  size="small"
                  sx={{ mr: 1 }}
                />
                {user?.subscription && (
                  <Chip
                    icon={<CreditCardIcon />}
                    label={user.subscription.plan}
                    color="primary"
                    size="small"
                  />
                )}
              </Box>
            </Box>
          </Box>

          <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
            <Tab label="基本情報" />
            <Tab label="パスワード" />
            <Tab label="SNS連携" />
          </Tabs>

          <Box sx={{ mt: 3 }}>
            {activeTab === 0 && (
              <form onSubmit={profileFormik.handleSubmit}>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      name="firstName"
                      label="名前（名）"
                      value={profileFormik.values.firstName}
                      onChange={profileFormik.handleChange}
                      error={profileFormik.touched.firstName && Boolean(profileFormik.errors.firstName)}
                      helperText={profileFormik.touched.firstName && profileFormik.errors.firstName}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      name="lastName"
                      label="名前（姓）"
                      value={profileFormik.values.lastName}
                      onChange={profileFormik.handleChange}
                      error={profileFormik.touched.lastName && Boolean(profileFormik.errors.lastName)}
                      helperText={profileFormik.touched.lastName && profileFormik.errors.lastName}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      name="email"
                      label="メールアドレス"
                      value={profileFormik.values.email}
                      onChange={profileFormik.handleChange}
                      error={profileFormik.touched.email && Boolean(profileFormik.errors.email)}
                      helperText={profileFormik.touched.email && profileFormik.errors.email}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      name="phone"
                      label="電話番号"
                      value={profileFormik.values.phone}
                      onChange={profileFormik.handleChange}
                      error={profileFormik.touched.phone && Boolean(profileFormik.errors.phone)}
                      helperText={profileFormik.touched.phone && profileFormik.errors.phone}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      name="company"
                      label="会社名"
                      value={profileFormik.values.company}
                      onChange={profileFormik.handleChange}
                      error={profileFormik.touched.company && Boolean(profileFormik.errors.company)}
                      helperText={profileFormik.touched.company && profileFormik.errors.company}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      name="position"
                      label="役職"
                      value={profileFormik.values.position}
                      onChange={profileFormik.handleChange}
                      error={profileFormik.touched.position && Boolean(profileFormik.errors.position)}
                      helperText={profileFormik.touched.position && profileFormik.errors.position}
                    />
                  </Grid>
                </Grid>
                <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
                  <Button
                    type="submit"
                    variant="contained"
                    disabled={profileFormik.isSubmitting}
                  >
                    更新
                  </Button>
                </Box>
              </form>
            )}

            {activeTab === 1 && (
              <form onSubmit={passwordFormik.handleSubmit}>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <FormControl fullWidth variant="outlined">
                      <InputLabel>現在のパスワード</InputLabel>
                      <OutlinedInput
                        type={showPassword ? 'text' : 'password'}
                        name="currentPassword"
                        value={passwordFormik.values.currentPassword}
                        onChange={passwordFormik.handleChange}
                        error={passwordFormik.touched.currentPassword && Boolean(passwordFormik.errors.currentPassword)}
                        endAdornment={
                          <InputAdornment position="end">
                            <IconButton
                              onClick={() => setShowPassword(!showPassword)}
                              edge="end"
                            >
                              {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                            </IconButton>
                          </InputAdornment>
                        }
                        label="現在のパスワード"
                      />
                    </FormControl>
                  </Grid>
                  <Grid item xs={12}>
                    <FormControl fullWidth variant="outlined">
                      <InputLabel>新しいパスワード</InputLabel>
                      <OutlinedInput
                        type={showPassword ? 'text' : 'password'}
                        name="newPassword"
                        value={passwordFormik.values.newPassword}
                        onChange={passwordFormik.handleChange}
                        error={passwordFormik.touched.newPassword && Boolean(passwordFormik.errors.newPassword)}
                        endAdornment={
                          <InputAdornment position="end">
                            <IconButton
                              onClick={() => setShowPassword(!showPassword)}
                              edge="end"
                            >
                              {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                            </IconButton>
                          </InputAdornment>
                        }
                        label="新しいパスワード"
                      />
                    </FormControl>
                  </Grid>
                  <Grid item xs={12}>
                    <FormControl fullWidth variant="outlined">
                      <InputLabel>パスワードの確認</InputLabel>
                      <OutlinedInput
                        type={showPassword ? 'text' : 'password'}
                        name="confirmPassword"
                        value={passwordFormik.values.confirmPassword}
                        onChange={passwordFormik.handleChange}
                        error={passwordFormik.touched.confirmPassword && Boolean(passwordFormik.errors.confirmPassword)}
                        endAdornment={
                          <InputAdornment position="end">
                            <IconButton
                              onClick={() => setShowPassword(!showPassword)}
                              edge="end"
                            >
                              {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                            </IconButton>
                          </InputAdornment>
                        }
                        label="パスワードの確認"
                      />
                    </FormControl>
                  </Grid>
                </Grid>
                <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
                  <Button
                    type="submit"
                    variant="contained"
                    disabled={passwordFormik.isSubmitting}
                  >
                    パスワードを変更
                  </Button>
                </Box>
              </form>
            )}

            {activeTab === 2 && (
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Card variant="outlined">
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <GoogleIcon sx={{ mr: 1 }} />
                          <Typography>Google</Typography>
                        </Box>
                        {user?.googleId ? (
                          <Button
                            variant="outlined"
                            color="error"
                            onClick={() => unlinkSocial.mutate('google')}
                          >
                            連携解除
                          </Button>
                        ) : (
                          <Button
                            variant="contained"
                            onClick={() => linkSocial.mutate('google')}
                          >
                            連携する
                          </Button>
                        )}
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12}>
                  <Card variant="outlined">
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <GitHubIcon sx={{ mr: 1 }} />
                          <Typography>GitHub</Typography>
                        </Box>
                        {user?.githubId ? (
                          <Button
                            variant="outlined"
                            color="error"
                            onClick={() => unlinkSocial.mutate('github')}
                          >
                            連携解除
                          </Button>
                        ) : (
                          <Button
                            variant="contained"
                            onClick={() => linkSocial.mutate('github')}
                          >
                            連携する
                          </Button>
                        )}
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            )}
          </Box>
        </CardContent>
      </Card>

      {/* サブスクリプション情報 */}
      {user?.subscription && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              サブスクリプション情報
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <CreditCardIcon sx={{ mr: 1 }} />
                  <Typography>
                    プラン: {user.subscription.plan}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <BusinessIcon sx={{ mr: 1 }} />
                  <Typography>
                    会社: {user.subscription.company}
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <PeopleIcon sx={{ mr: 1 }} />
                  <Typography>
                    チーム: {user.subscription.team}
                  </Typography>
                </Box>
                <Typography>
                  有効期限: {new Date(user.subscription.expiresAt).toLocaleDateString()}
                </Typography>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default Profile; 