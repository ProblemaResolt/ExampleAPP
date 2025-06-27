import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FaUser, FaSignOutAlt as FaRightFromBracket } from 'react-icons/fa';
import { useAuth } from '../contexts/AuthContext';

const Header = ({ currentPageTitle, userMenuOpen, setUserMenuOpen, handleLogout }) => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleUserMenuToggle = () => setUserMenuOpen(!userMenuOpen);

  return (
    <header className="w3-top w3-bar w3-white w3-card w3-hide-small">
      <div className="w3-bar-item">
        <h3 className="w3-margin-left">{currentPageTitle}</h3>
      </div>
      <div className="w3-right w3-padding">
        <div id="user-menu-container" className="w3-dropdown-click">
          <button 
            className="w3-button w3-circle w3-blue w3-hover-blue-grey"
            onClick={handleUserMenuToggle}
          >
            {user?.avatar ? (
              <img 
                src={user.avatar} 
                alt={`${user.lastName} ${user.firstName}`}
                className="w3-circle"
                style={{ width: '32px', height: '32px' }}
              />
            ) : (
              <FaUser />
            )}
          </button>
          <div className={`w3-dropdown-content w3-bar-block w3-animate-opacity ${userMenuOpen ? 'w3-show' : ''}`}
            style={{ right: 0, minWidth: 180, maxWidth: '90vw', left: 'auto' }}
          >
            <button 
              className="w3-bar-item w3-button w3-hover-light-grey"
              onClick={() => {
                navigate('/profile');
                setUserMenuOpen(false);
              }}
            >
              <FaUser className="w3-margin-right" />
              Profile
            </button>
            <button 
              className="w3-bar-item w3-button w3-hover-light-grey"
              onClick={() => {
                handleLogout();
                setUserMenuOpen(false);
              }}
            >
              <FaRightFromBracket className="w3-margin-right" />
              Logout
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
