import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/axios';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  // トークンの存在確認のみ - ユーザーデータはAPI呼び出し時に毎回取得
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      setIsAuthenticated(true);
      // ユーザーデータは各コンポーネントで必要時にAPI取得
    }
    setIsLoading(false);
  }, []);

  // 401エラー時のリダイレクト処理
  useEffect(() => {
    const handleUnauthorized = () => {
      setIsAuthenticated(false);
      setUser(null);
      navigate('/login');
    };

    window.addEventListener('unauthorized', handleUnauthorized);
    
    return () => {
      window.removeEventListener('unauthorized', handleUnauthorized);
    };
  }, [navigate]);

  const login = async (email, password) => {
    try {
      const { data } = await api.post('/auth/login', { email, password });
      if (data.status === 'success') {
        const { token } = data.data;
        // トークンのみ保存 - ユーザーデータは保存しない
        localStorage.setItem('token', token);
        setIsAuthenticated(true);
        
        return { success: true };
      } else {
        throw new Error('Invalid response format');
      }
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'An error occurred during login'
      };
    }
  };

  const register = async (userData) => {
    try {
      const { data } = await api.post('/auth/register', userData);
      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'An error occurred during registration'
      };
    }
  };

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    setUser(null);
    setIsAuthenticated(false);
    navigate('/login');
  }, [navigate]);

  // ユーザーデータを取得するヘルパー関数（各コンポーネントで使用）
  const fetchUser = useCallback(async () => {
    try {
      const { data } = await api.get('/users/me');
      if (data.status === 'success') {
        const userData = {
          ...data.data.user,
          managedCompanyId: data.data.user.managedCompany?.id || null,
          managedCompanyName: data.data.user.managedCompany?.name || null
        };
        setUser(userData);
        return userData;
      }
      throw new Error('Invalid response format');
    } catch (error) {
      console.error('Error fetching user data:', error);
      logout(); // トークンが無効な場合はログアウト
      throw error;
    }
  }, [navigate]); // navigateのみを依存配列に含める

  const updateProfile = async (userData) => {
    try {
      const { data } = await api.put('/auth/profile', userData);
      setUser(data);
      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'An error occurred while updating profile'
      };
    }
  };

  const verifyEmail = async (token) => {
    try {
      const { data } = await api.post('/auth/verify-email', { token });
      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'メールアドレスの確認に失敗しました。'
      };
    }
  };

  const value = {
    user,
    isAuthenticated,
    isLoading,
    login,
    register,
    logout,
    fetchUser, // ユーザーデータ取得関数を追加
    updateProfile,
    verifyEmail,
    navigate
  };

  if (isLoading) {
    return <div>Loading...</div>; // Or a proper loading component
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;