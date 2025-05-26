import { Navigate, Outlet } from 'react-router-dom';
import { Box, Container, Paper, Typography } from '@mui/material';
import { useAuth } from '../contexts/AuthContext';

const AuthLayout = () => {
  const { isAuthenticated } = useAuth();

  // Redirect to dashboard if already authenticated
  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        bgcolor: 'background.default',
        py: 4
      }}
    >
      <Container maxWidth="sm">
        <Paper
          elevation={3}
          sx={{
            p: 4,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center'
          }}
        >
          <Typography
            component="h1"
            variant="h4"
            sx={{ mb: 4, color: 'primary.main' }}
          >
            Subscription Management
          </Typography>
          <Outlet />
        </Paper>
      </Container>
    </Box>
  );
};

export default AuthLayout; 