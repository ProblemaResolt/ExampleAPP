import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const AuthLayout = () => {
  const { isAuthenticated } = useAuth();

  // Redirect to dashboard if already authenticated
  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="w3-light-gray" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', padding: '20px 0' }}>
      <div className="w3-container" style={{ maxWidth: '500px', margin: '0 auto' }}>
        <div className="w3-round-large w3-white">
          <header className="w3-container w3-blue w3-round-large-top">
            <h2 className="w3-center w3-margin">
              サブスクリプション管理システム
            </h2>
          </header>
          <div className="w3-container w3-padding-large">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthLayout; 