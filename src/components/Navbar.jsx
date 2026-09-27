import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const getRoleBadge = (role) => {
    if (role === 'admin') return 'Administrator';
    if (role === 'staff') return 'Staff Member';
    return 'Student';
  };

  const getSubTitle = (role) => {
    if (role === 'admin') return 'Administrative Control Panel';
    if (role === 'staff') return 'Staff & Administration Portal';
    return 'Student Question Paper Portal';
  };

  const avatarLetter = (user?.name || user?.user_id || 'U').charAt(0).toUpperCase();

  return (
    <header className="navbar">
      <div className="nav-container">
        <div className="nav-brand">
          <img
            src="/gnanamani_logo.jpg"
            alt="Gnanamani College of Technology"
            className="nav-logo"
          />
          <div className="brand-text">
            <h1>Gnanamani College of Technology</h1>
            <p>{getSubTitle(user?.role)}</p>
          </div>
        </div>

        {user && (
          <div className="nav-user-panel">
            <div className="user-badge">
              <div className="user-avatar">{avatarLetter}</div>
              <div className="user-info">
                <div className="user-name">{user.name || user.user_id}</div>
                <div className="user-meta">
                  <span className={`badge-pill badge-${user.role}`}>
                    {getRoleBadge(user.role)}
                  </span>
                  {user.department && <span className="dept-tag">({user.department})</span>}
                </div>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="btn-logout"
              title="Sign out of the portal"
            >
              <span>Sign Out</span> &rarr;
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
