import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import SystemAdmin from './pages/SystemAdmin';
import Employees from './pages/Employees';
import Skills from './pages/Skills';
import SkillManagement from './pages/SkillManagement';
import Projects from './pages/Projects';
import Companies from './pages/Companies';
import AttendanceManagement from './pages/AttendanceManagement';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import './App.css';  // グローバルCSSのインポート - HMRテスト用コメント

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // 永久リロード問題の根本解決のため全ての自動更新を無効化
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnReconnect: false,
      refetchInterval: false,
      retry: false,
      retryOnMount: false,
      // キャッシュ時間を長く設定
      staleTime: 10 * 60 * 1000, // 10分
      cacheTime: 15 * 60 * 1000, // 15分
    },
    mutations: {
      retry: false,
      retryDelay: 0
    }
  }
});

// 認証が必要なルートを保護するコンポーネント
const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { user, isAuthenticated, isLoading, fetchUser } = useAuth();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  // ユーザーデータが必要でロールチェックが必要な場合
  if (allowedRoles.length > 0) {
    // ユーザーデータがまだ取得されていない場合は取得
    React.useEffect(() => {
      if (!user && isAuthenticated) {
        fetchUser().catch(() => {
          // ユーザーデータ取得に失敗した場合はログインページにリダイレクト
        });
      }
    }, [user, isAuthenticated, fetchUser]);

    // ユーザーデータがまだない場合はローディング表示
    if (!user) {
      return <div>Loading user data...</div>;
    }

    // ロールチェック
    if (!allowedRoles.includes(user.role)) {
      return <Navigate to="/dashboard" />;
    }
  }

  return children;
};

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route
              path="system-admin"
              element={
                <ProtectedRoute allowedRoles={['ADMIN']}>
                  <SystemAdmin />
                </ProtectedRoute>
              }
            />
            <Route
              path="employees"
              element={
                <ProtectedRoute allowedRoles={['ADMIN', 'COMPANY']}>
                  <Employees />
                </ProtectedRoute>
              }
            />
            <Route
              path="skills"
              element={
                <ProtectedRoute allowedRoles={['ADMIN', 'COMPANY', 'MANAGER']}>
                  <Skills />
                </ProtectedRoute>
              }
            />
            <Route
              path="skill-management"
              element={
                <ProtectedRoute allowedRoles={['ADMIN']}>
                  <SkillManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="skill-management"
              element={
                <ProtectedRoute allowedRoles={['ADMIN']}>
                  <SkillManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="projects"
              element={
                <ProtectedRoute allowedRoles={['ADMIN', 'COMPANY', 'MANAGER', 'MEMBER']}>
                  <Projects />
                </ProtectedRoute>
              }
            />
            <Route
              path="attendance"
              element={
                <ProtectedRoute allowedRoles={['ADMIN', 'COMPANY', 'MANAGER', 'MEMBER']}>
                  <AttendanceManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="companies"
              element={
                <ProtectedRoute allowedRoles={['ADMIN']}>
                  <Companies />
                </ProtectedRoute>
              }
            />
          </Route>
        </Routes>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
