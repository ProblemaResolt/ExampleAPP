import { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Button,
  TextField,
  Link,
  Typography,
  Alert
} from '@mui/material';
import { useFormik } from 'formik';
import * as yup from 'yup';
import api from '../../utils/axios';

const validationSchema = yup.object({
  email: yup
    .string()
    .email('Enter a valid email')
    .required('Email is required')
});

const ForgotPassword = () => {
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const formik = useFormik({
    initialValues: {
      email: ''
    },
    validationSchema: validationSchema,
    onSubmit: async (values) => {
      setError('');
      setSuccess(false);
      setIsSubmitting(true);

      try {
        await api.post('/api/auth/forgot-password', { email: values.email });
        setSuccess('パスワードリセットのメールを送信しました');
      } catch (error) {
        setError(error.response?.data?.message || 'メールの送信に失敗しました');
      } finally {
        setIsSubmitting(false);
      }
    }
  });

  return (
    <Box component="form" onSubmit={formik.handleSubmit} noValidate sx={{ mt: 1 }}>
      <Typography component="h1" variant="h5" sx={{ mb: 2 }}>
        Reset Password
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Enter your email address and we'll send you a link to reset your password.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          Password reset instructions have been sent to your email address.
        </Alert>
      )}

      <TextField
        margin="normal"
        required
        fullWidth
        id="email"
        label="Email Address"
        name="email"
        autoComplete="email"
        autoFocus
        value={formik.values.email}
        onChange={formik.handleChange}
        onBlur={formik.handleBlur}
        error={formik.touched.email && Boolean(formik.errors.email)}
        helperText={formik.touched.email && formik.errors.email}
        disabled={success}
      />

      <Button
        type="submit"
        fullWidth
        variant="contained"
        sx={{ mt: 3, mb: 2 }}
        disabled={isSubmitting || success}
      >
        Send Reset Link
      </Button>

      <Box sx={{ textAlign: 'center' }}>
        <Link component={RouterLink} to="/login" variant="body2">
          Back to Sign In
        </Link>
      </Box>
    </Box>
  );
};

export default ForgotPassword; 