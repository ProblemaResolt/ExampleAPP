import { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Button,
  Checkbox,
  FormControlLabel,
  Link,
  TextField,
  Typography,
  Alert
} from '@mui/material';
import { useFormik } from 'formik';
import * as yup from 'yup';
import { useAuth } from '../../contexts/AuthContext';

const validationSchema = yup.object({
  email: yup
    .string()
    .email('Enter a valid email')
    .required('Email is required'),
  password: yup
    .string()
    .min(8, 'Password should be of minimum 8 characters length')
    .required('Password is required')
});

const Login = () => {
  const [error, setError] = useState('');
  const { login } = useAuth();

  const formik = useFormik({
    initialValues: {
      email: '',
      password: '',
      rememberMe: false
    },
    validationSchema: validationSchema,
    onSubmit: async (values, { setSubmitting }) => {
      try {
        setError('');
        const { success, error } = await login(values.email, values.password);
        if (!success) {
          setError(error);
        }
      } finally {
        setSubmitting(false);
      }
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    formik.handleSubmit(e);
  };

  return (
    <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 1 }}>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
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
      />
      <TextField
        margin="normal"
        required
        fullWidth
        name="password"
        label="Password"
        type="password"
        id="password"
        autoComplete="current-password"
        value={formik.values.password}
        onChange={formik.handleChange}
        onBlur={formik.handleBlur}
        error={formik.touched.password && Boolean(formik.errors.password)}
        helperText={formik.touched.password && formik.errors.password}
      />
      <FormControlLabel
        control={
          <Checkbox
            name="rememberMe"
            color="primary"
            checked={formik.values.rememberMe}
            onChange={formik.handleChange}
          />
        }
        label="Remember me"
      />
      <Button
        type="submit"
        fullWidth
        variant="contained"
        sx={{ mt: 3, mb: 2 }}
        disabled={formik.isSubmitting}
      >
        Sign In
      </Button>
      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
        <Link component={RouterLink} to="/forgot-password" variant="body2">
          Forgot password?
        </Link>
        <Link component={RouterLink} to="/register" variant="body2">
          {"Don't have an account? Sign Up"}
        </Link>
      </Box>
    </Box>
  );
};

export default Login; 