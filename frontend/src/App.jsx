import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Users from './pages/Users';
import Employees from './pages/Employees';
import Projects from './pages/Projects';
import Companies from './pages/Companies';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import './App.css';  // グローバルCSSのインポート

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: false
    }
  }
});

// 認証が必要なルートを保護するコンポーネント
const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return null;
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" />;
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
              path="users"
              element={
                <ProtectedRoute allowedRoles={['ADMIN', 'COMPANY']}>
                  <Users />
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
              path="projects"
              element={
                <ProtectedRoute allowedRoles={['ADMIN', 'COMPANY', 'MANAGER']}>
                  <Projects />
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
