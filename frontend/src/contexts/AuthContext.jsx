import { createContext, useContext, useState, useEffect } from 'react';
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
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      // Fetch user data
      api.get('/users/me')
        .then(({ data }) => {
          if (data.status === 'success') {
            const userData = {
              ...data.data.user,
              managedCompanyId: data.data.user.managedCompanyId || null,
              managedCompanyName: data.data.user.managedCompanyName || null
            };
            setUser(userData);
            setIsAuthenticated(true);
          } else {
            throw new Error('Invalid response format');
          }
        })
        .catch((error) => {
          console.error('Error fetching user data:', error);
          localStorage.removeItem('token');
          setIsAuthenticated(false);
          setUser(null);
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else {
      setIsLoading(false);
    }
  }, []);
  const login = async (email, password) => {
    try {
      const { data } = await api.post('/auth/login', { email, password });
      if (data.status === 'success') {
        const { token, user } = data.data;
        const userData = {
          ...user,
          managedCompanyId: user.managedCompanyId || null,
          managedCompanyName: user.managedCompanyName || null
        };
        localStorage.setItem('token', token);
        setUser(userData);
        setIsAuthenticated(true);
        navigate('/');
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

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    setIsAuthenticated(false);
    navigate('/login');
  };
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