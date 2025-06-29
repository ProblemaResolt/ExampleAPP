import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import SystemAdmin from './pages/SystemAdmin';
import Employees from './pages/Employees';
import EmployeeCreatePage from './pages/employees/EmployeeCreatePage';
import EmployeeEditPage from './pages/employees/EmployeeEditPage';
import EmployeeDetailPage from './pages/employees/EmployeeDetailPage';
import Skills from './pages/Skills';
import SkillManagement from './pages/SkillManagement';
import Projects from './pages/Projects';
import ProjectCreatePage from './pages/projects/ProjectCreatePage';
import ProjectEditPage from './pages/projects/ProjectEditPage';
import ProjectDetailPage from './pages/projects/ProjectDetailPage';
import ProjectMembersPage from './pages/projects/ProjectMembersPage';
import Companies from './pages/Companies';
import AttendanceManagement from './pages/AttendanceManagement';
import AttendanceApproval from './pages/AttendanceApproval';
import AttendanceIndividual from './pages/AttendanceIndividual';
import AttendanceStatistics from './pages/AttendanceStatistics';
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
    }, [user, isAuthenticated]); // fetchUserを依存配列から削除して無限ループを防止

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
              path="employees/create"
              element={
                <ProtectedRoute allowedRoles={['ADMIN', 'COMPANY']}>
                  <EmployeeCreatePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="employees/:id"
              element={
                <ProtectedRoute allowedRoles={['ADMIN', 'COMPANY']}>
                  <EmployeeDetailPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="employees/:id/edit"
              element={
                <ProtectedRoute allowedRoles={['ADMIN', 'COMPANY']}>
                  <EmployeeEditPage />
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
              path="projects/create"
              element={
                <ProtectedRoute allowedRoles={['ADMIN', 'COMPANY', 'MANAGER']}>
                  <ProjectCreatePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="projects/:id"
              element={
                <ProtectedRoute allowedRoles={['ADMIN', 'COMPANY', 'MANAGER', 'MEMBER']}>
                  <ProjectDetailPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="projects/:id/edit"
              element={
                <ProtectedRoute allowedRoles={['ADMIN', 'COMPANY', 'MANAGER']}>
                  <ProjectEditPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="projects/:id/members"
              element={
                <ProtectedRoute allowedRoles={['ADMIN', 'COMPANY', 'MANAGER']}>
                  <ProjectMembersPage />
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
              path="attendance-approval"
              element={
                <ProtectedRoute allowedRoles={['COMPANY', 'MANAGER']}>
                  <AttendanceApproval />
                </ProtectedRoute>
              }
            />
            <Route
              path="attendance/individual/:userId"
              element={
                <ProtectedRoute allowedRoles={['COMPANY', 'MANAGER']}>
                  <AttendanceIndividual />
                </ProtectedRoute>
              }
            />
            <Route
              path="attendance-statistics"
              element={
                <ProtectedRoute allowedRoles={['COMPANY', 'MANAGER']}>
                  <AttendanceStatistics />
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
