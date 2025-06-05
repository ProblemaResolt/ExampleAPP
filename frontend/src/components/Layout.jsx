import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  FaBars,
  FaTachometerAlt as FaGauge,
  FaUsers,
  FaBuilding,
  FaListUl,
  FaUserCircle as FaCircleUser,
  FaSignOutAlt as FaRightFromBracket,
  FaUser,
  FaCogs
} from 'react-icons/fa';
import { useAuth } from '../contexts/AuthContext';
import Header from './Header';

const drawerWidth = '240px';

const menuItems = [
  { path: '/dashboard', label: 'ダッシュボード', icon: <FaGauge />, roles: ['ADMIN', 'COMPANY', 'MANAGER', 'MEMBER'] },
  { path: '/employees', label: '社員管理', icon: <FaUsers />, roles: ['COMPANY'] },
  { path: '/skills', label: 'スキル管理', icon: <FaCogs />, roles: ['COMPANY', 'MANAGER'] },
  { path: '/skill-management', label: 'スキル統合管理', icon: <FaCogs />, roles: ['ADMIN'] },
  { path: '/projects', label: 'プロジェクト管理', icon: <FaListUl />, roles: ['COMPANY', 'MANAGER', 'MEMBER'] },
  { path: '/system-admin', label: 'システム管理', icon: <FaCogs />, roles: ['ADMIN'] },
  { path: '/companies', label: '会社管理', icon: <FaBuilding />, roles: ['ADMIN'] }
];

const Layout = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleUserMenuToggle = () => {
    setUserMenuOpen(!userMenuOpen);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // Close mobile drawer when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (mobileOpen && !event.target.closest('#mobile-sidebar')) {
        setMobileOpen(false);
      }
      if (userMenuOpen && !event.target.closest('#user-menu-container')) {
        setUserMenuOpen(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [mobileOpen, userMenuOpen]);

  const currentPageTitle = menuItems.find(item => item.path === location.pathname)?.label || 'ダッシュボード';

  return (
    <>
      {/* 全体の最上部にHeaderを配置 */}
      <Header
        currentPageTitle={currentPageTitle}
        userMenuOpen={userMenuOpen}
        setUserMenuOpen={setUserMenuOpen}
        handleLogout={handleLogout}
      />
      <div className="w3-container-fluid" style={{ padding: 0 }}>
        {/* Mobile overlay */}
        {mobileOpen && (
          <div 
            className="w3-overlay w3-animate-opacity" 
            onClick={() => setMobileOpen(false)}
            style={{ cursor: 'pointer', zIndex: 4 }}
          />
        )}

        {/* Desktop Sidebar */}
        <nav 
          className="w3-sidebar w3-blue w3-bar-block w3-card w3-animate-left w3-hide-small"
          style={{ width: drawerWidth, zIndex: 3 }}
        >
          <div className="w3-container w3-center w3-padding">
            <h4 className="w3-text-white">TimeCraft</h4>
          </div>
          <div className="w3-border-bottom w3-border-white" style={{ opacity: 0.3 }}></div>
          
          {menuItems
            .filter(item => item.roles.includes(user?.role))
            .map((item) => (
              <button
                key={item.path}
                className={`w3-bar-item w3-button w3-padding w3-hover-blue-grey ${
                  location.pathname === item.path ? 'w3-blue-grey' : ''
                }`}
                onClick={() => navigate(item.path)}
              >
                <span className="w3-margin-right">{item.icon}</span>
                {item.label}
              </button>
            ))}
        </nav>

        {/* Mobile Sidebar */}
        <nav 
          id="mobile-sidebar"
          className={`w3-sidebar w3-blue w3-bar-block w3-card w3-animate-left w3-hide-large w3-hide-medium ${
            mobileOpen ? '' : 'w3-hide'
          }`}
          style={{ width: drawerWidth, zIndex: 5 }}
        >
          <div className="w3-container w3-center w3-padding">
            <h4 className="w3-text-white">TimeCraft</h4>
          </div>
          <div className="w3-border-bottom w3-border-white" style={{ opacity: 0.3 }}></div>
          
          {menuItems
            .filter(item => item.roles.includes(user?.role))
            .map((item) => (
              <button
                key={item.path}
                className={`w3-bar-item w3-button w3-padding w3-hover-blue-grey ${
                  location.pathname === item.path ? 'w3-blue-grey' : ''
                }`}
                onClick={() => {
                  navigate(item.path);
                  setMobileOpen(false);
                }}
              >
                <span className="w3-margin-right">{item.icon}</span>
                {item.label}
              </button>
            ))}
        </nav>

        {/* Main Content */}
        <div style={{ marginLeft: '240px' }} className="w3-hide-small">
          {/* Desktop Main Content */}
          <main className="w3-container" style={{ marginTop: '60px', padding: '24px' }}>
            <Outlet />
          </main>
        </div>

        {/* Mobile Layout */}
        <div className="w3-hide-large w3-hide-medium">
          {/* Mobile Header */}
          <div className="w3-top w3-bar w3-blue w3-card">
            <button 
              className="w3-bar-item w3-button w3-hover-blue-grey"
              onClick={handleDrawerToggle}
            >
              <FaBars />
            </button>
            <div className="w3-bar-item">
              <h4 className="w3-text-white">{currentPageTitle}</h4>
            </div>
            <div className="w3-right w3-padding">
              <div id="user-menu-container" className="w3-dropdown-click">
                <button 
                  className="w3-button w3-circle w3-white w3-hover-light-grey"
                  onClick={handleUserMenuToggle}
                >
                  {user?.avatar ? (
                    <img 
                      src={user.avatar} 
                      alt={`${user.firstName} ${user.lastName}`}
                      className="w3-circle"
                      style={{ width: '24px', height: '24px' }}
                    />
                  ) : (
                    <FaCircleUser className="w3-text-blue" />
                  )}
                </button>
                <div className={`w3-dropdown-content w3-card-4 w3-bar-block w3-animate-opacity ${userMenuOpen ? 'w3-show' : ''}`}>
                  <button 
                    className="w3-bar-item w3-button w3-hover-light-grey"
                    onClick={() => {
                      navigate('/profile');
                      setUserMenuOpen(false);
                    }}
                  >
                    <FaUser className="w3-margin-right" />
                    プロフィール
                  </button>
                  <button 
                    className="w3-bar-item w3-button w3-hover-light-grey"
                    onClick={() => {
                      handleLogout();
                      setUserMenuOpen(false);
                    }}
                  >
                    <FaRightFromBracket className="w3-margin-right" />
                    ログアウト
                  </button>
                </div>
              </div>
            </div>
          </div>        {/* Mobile Main Content */}
          <main className="w3-container" style={{ marginTop: '60px', padding: '16px' }}>
            <Outlet />
          </main>
        </div>
      </div>
    </>
  );
};

export default Layout;