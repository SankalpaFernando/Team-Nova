import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import ProfileModal from './ProfileModal';
import './AdminSidebar.css';

function AdminSidebar({ activePage }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const accountMenuRef = useRef(null);

  const isEngineer = user?.role === 'site_engineer';

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (accountMenuRef.current && !accountMenuRef.current.contains(e.target)) {
        setAccountMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (user?.role === 'admin') {
      const fetchPendingCount = async () => {
        try {
          const res = await api.get('/change-requests/pending-count');
          if (res.data?.success) {
            setPendingCount(res.data.count || 0);
          }
        } catch (err) {
          console.error('Failed to fetch pending requests count', err);
        }
      };
      fetchPendingCount();
      const interval = setInterval(fetchPendingCount, 15000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  // Admin Navigation Links
  const adminNavItems = [
    { key: 'dashboard',        to: '/admin-dashboard', icon: '⬛', label: 'Dashboard' },
    { key: 'pending-requests', to: '/pending-requests', icon: '📝', label: `Pending Requests${pendingCount > 0 ? ` (${pendingCount})` : ''}`, badge: pendingCount },
    { key: 'users',            to: '/manage-users',    icon: '👥', label: 'Users' },
    { key: 'devices',          to: '/manage-devices',  icon: '📡', label: 'Devices' },
    { key: 'sensors',          to: '/manage-sensors',  icon: '🔬', label: 'Sensors' },
    { key: 'parameters',       to: '/parameter-admin', icon: '⚙️', label: 'Parameters' },
    { key: 'alerts',           to: '/admin-alerts',    icon: '🔔', label: 'Alerts' },
    { key: 'sites',            to: '/admin-maps',      icon: '📍', label: 'Sites' },
    { key: 'messages',         to: '/admin-messages',  icon: '✉️', label: 'Messages' }
  ];

  // Site Engineer Navigation Links
  const engineerNavItems = [
    { key: 'dashboard',   to: '/site-engineer-dashboard', icon: '📊', label: 'Dashboard' },
    { key: 'my-requests', to: '/my-requests',             icon: '📋', label: 'My Requests' },
    { key: 'devices',     to: '/manage-devices',          icon: '📡', label: 'Devices' },
    { key: 'sensors',     to: '/manage-sensors',          icon: '🔬', label: 'Sensors' },
    { key: 'parameters',  to: '/parameter-admin',         icon: '⚙️', label: 'Parameters' },
    { key: 'alerts',      to: '/admin-alerts',           icon: '🔔', label: 'Alerts' },
    { key: 'messages',    to: '/admin-messages',         icon: '✉️', label: 'Messages' }
  ];

  const navItems = isEngineer ? engineerNavItems : adminNavItems;

  return (
    <>
      <aside className="mu-sidebar">
        <div className="mu-brand">
          <span className="mu-brand-icon">🌿</span>
          <div>
            <div className="mu-brand-name">MangroveGuard</div>
            <div className="mu-brand-role">
              {isEngineer ? 'Site Engineer' : 'Admin Panel'}
            </div>
          </div>
        </div>

        <nav className="mu-nav">
          {navItems.map(({ key, to, icon, label }) => {
            const isActive = activePage === key;
            return (
              <Link
                key={key}
                to={to}
                className={`mu-nav-link ${isActive ? 'mu-nav-link--active' : ''}`}
              >
                <span className="mu-nav-icon">{icon}</span>
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Account Card & Dropdown Menu */}
        <div className="mu-sidebar-bottom" ref={accountMenuRef}>
          <div
            className="mu-user-card mu-user-card--clickable"
            onClick={() => setAccountMenuOpen(!accountMenuOpen)}
            title="Click to open profile options"
          >
            <div className="mu-user-avatar">
              {user?.name?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="mu-user-info">
              <div className="mu-user-name">{user?.name || 'User'}</div>
              <div className="mu-user-email">{user?.email || ''}</div>
            </div>
            <span className="mu-dropdown-arrow">{accountMenuOpen ? '▲' : '▼'}</span>
          </div>

          {accountMenuOpen && (
            <div className="mu-account-dropdown">
              <button
                className="mu-account-item"
                onClick={() => {
                  setAccountMenuOpen(false);
                  setIsProfileOpen(true);
                }}
              >
                👤 Profile / Settings
              </button>
              <button
                className="mu-account-item mu-account-item--logout"
                onClick={handleLogout}
              >
                🚪 Logout
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Profile Modal Overlay */}
      <ProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
      />
    </>
  );
}

export default AdminSidebar;
