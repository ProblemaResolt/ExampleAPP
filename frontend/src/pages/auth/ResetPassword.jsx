import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Button,
  TextField,
  Typography,
  Alert
} from '@mui/material';
import { useFormik } from 'formik';
import * as yup from 'yup';
import api from '../../utils/axios';

const validationSchema = yup.object({
  password: yup
    .string()
    .min(8, 'Password should be of minimum 8 characters length')
    .matches(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
      'Password must contain at least one uppercase letter, one lowercase letter, one number and one special character'
    )
    .required('Password is required'),
  confirmPassword: yup
    .string()
    .oneOf([yup.ref('password'), null], 'Passwords must match')
    .required('Confirm password is required')
});

const ResetPassword = () => {
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { token } = useParams();
  const navigate = useNavigate();

  const formik = useFormik({
    initialValues: {
      password: '',
      confirmPassword: ''
    },
    validationSchema: validationSchema,
    onSubmit: async (values) => {
      setError('');
      setSuccess(false);
      setIsSubmitting(true);

      try {
        await api.post('/api/auth/reset-password', {
          token,
          password: values.password
        });
        setSuccess('パスワードをリセットしました');
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      } catch (error) {
        setError(error.response?.data?.message || 'パスワードのリセットに失敗しました');
        setSuccess('');
      } finally {
        setIsSubmitting(false);
      }
    }
  });

  return (
    <Box component="form" onSubmit={formik.handleSubmit} noValidate sx={{ mt: 1 }}>
      <Typography component="h1" variant="h5" sx={{ mb: 2 }}>
        Reset Your Password
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Please enter your new password below.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          Your password has been reset successfully. Redirecting to login...
        </Alert>
      )}

      <TextField
        margin="normal"
        required
        fullWidth
        name="password"
        label="New Password"
        type="password"
        id="password"
        autoComplete="new-password"
        value={formik.values.password}
        onChange={formik.handleChange}
        onBlur={formik.handleBlur}
        error={formik.touched.password && Boolean(formik.errors.password)}
        helperText={formik.touched.password && formik.errors.password}
        disabled={success}
      />

      <TextField
        margin="normal"
        required
        fullWidth
        name="confirmPassword"
        label="Confirm New Password"
        type="password"
        id="confirmPassword"
        value={formik.values.confirmPassword}
        onChange={formik.handleChange}
        onBlur={formik.handleBlur}
        error={formik.touched.confirmPassword && Boolean(formik.errors.confirmPassword)}
        helperText={formik.touched.confirmPassword && formik.errors.confirmPassword}
        disabled={success}
      />

      <Button
        type="submit"
        fullWidth
        variant="contained"
        sx={{ mt: 3, mb: 2 }}
        disabled={isSubmitting || success}
      >
        Reset Password
      </Button>
    </Box>
  );
};

export default ResetPassword; 