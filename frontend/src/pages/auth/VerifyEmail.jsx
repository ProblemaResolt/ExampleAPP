import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Typography, CircularProgress, Alert, Button } from '@mui/material';
import { useAuth } from '../../contexts/AuthContext';

const VerifyEmail = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const { verifyEmail } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const verify = async () => {
      if (token) {
        const result = await verifyEmail(token);
        if (result.success) {
          // 成功メッセージを表示してからログインページへリダイレクト
          setTimeout(() => {
            navigate('/login', {
              state: { message: 'メールアドレスの確認が完了しました。ログインしてください。' }
            });
          }, 3000);
        } else {
          setError(result.error);
        }
      }
      setIsLoading(false);
    };

    verify();
  }, [token, verifyEmail, navigate]);

  if (isLoading) {
    return (
      <Box
        display="flex"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        minHeight="100vh"
        gap={2}
      >
        <CircularProgress />
        <Typography>メールアドレスを確認中...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box
        display="flex"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        minHeight="100vh"
        gap={2}
        p={2}
      >
        <Alert severity="error" sx={{ width: '100%', maxWidth: 400 }}>
          {error}
        </Alert>
        <Button
          variant="contained"
          color="primary"
          onClick={() => navigate('/login')}
        >
          ログインページへ戻る
        </Button>
      </Box>
    );
  }

  return (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      minHeight="100vh"
      gap={2}
    >
      <Alert severity="success" sx={{ width: '100%', maxWidth: 400 }}>
        メールアドレスの確認が完了しました。ログインページへリダイレクトします...
      </Alert>
    </Box>
  );
};

export default VerifyEmail; 