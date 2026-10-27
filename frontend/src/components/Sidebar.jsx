import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Shield,
  LayoutDashboard,
  Activity,
  AlertTriangle,
  HardDrive,
  FileText,
  Sliders,
  Users,
  LogOut,
  Home,
  X,
} from 'lucide-react';

const Sidebar = ({ isOpen, onClose }) => {
  const { user, isAdmin, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navItems = [
    { name: 'Home', path: '/', icon: Home },
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Live Traffic', path: '/traffic', icon: Activity },
    { name: 'Alerts', path: '/alerts', icon: AlertTriangle },
    { name: 'Devices', path: '/devices', icon: HardDrive },
    { name: 'Reports', path: '/reports', icon: FileText },
  ];

  const adminItems = [
    { name: 'Detection Rules', path: '/admin/rules', icon: Sliders },
    { name: 'User Management', path: '/admin/users', icon: Users },
  ];

  const firstLetter = (user?.name || user?.email || 'A').charAt(0).toUpperCase();

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(4, 5, 12, 0.75)',
            backdropFilter: 'blur(6px)',
            zIndex: 900,
          }}
        />
      )}

      <aside
        className={`clay ${isOpen ? 'sidebar-open' : ''}`}
        style={{
          width: '270px',
          height: 'calc(100vh - 32px)',
          position: 'sticky',
          top: '16px',
          margin: '16px 0 16px 16px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          borderRadius: 'var(--radius-lg)',
          zIndex: 950,
          flexShrink: 0,
          padding: '24px 18px',
          transition: 'transform 280ms cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        <div>
          {/* Brand Block */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingBottom: '20px',
              borderBottom: '1px solid var(--border)',
              marginBottom: '20px',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                cursor: 'pointer',
              }}
              onClick={() => {
                navigate('/');
                onClose && onClose();
              }}
            >
              {/* 40px rounded square with gradient background and glow */}
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '12px',
                  background: 'var(--grad-brand)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: 'var(--glow-cyan)',
                  flexShrink: 0,
                }}
              >
                <Shield size={22} color="#070812" strokeWidth={2.5} />
              </div>
              <div>
                <span
                  className="text-gradient"
                  style={{
                    fontFamily: 'var(--font-head)',
                    fontSize: '20px',
                    fontWeight: 700,
                    letterSpacing: '-0.02em',
                    display: 'block',
                    lineHeight: 1.1,
                  }}
                >
                  NetSentinel
                </span>
                <span className="label-xs" style={{ fontSize: '10px', marginTop: '2px', display: 'block' }}>
                  Network IDS
                </span>
              </div>
            </div>

            {/* Mobile close button */}
            <button
              onClick={onClose}
              className="mobile-close-btn"
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-dim)',
                cursor: 'pointer',
                display: 'none',
                padding: '4px',
              }}
              aria-label="Close Sidebar"
            >
              <X size={20} />
            </button>
          </div>

          {/* Navigation Links */}
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span className="label-xs" style={{ padding: '0 12px 6px' }}>
              Monitoring
            </span>

            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === '/'}
                  onClick={() => onClose && onClose()}
                  className={({ isActive }) =>
                    `nav-link ${isActive ? 'nav-link-active' : ''}`
                  }
                  style={({ isActive }) => ({
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    textDecoration: 'none',
                    fontSize: '13.5px',
                    fontWeight: 500,
                    color: isActive ? 'var(--text)' : 'var(--text-dim)',
                    background: isActive
                      ? 'linear-gradient(90deg, rgba(0, 229, 255, 0.16), transparent)'
                      : 'transparent',
                    boxShadow: isActive ? 'inset 3px 0 0 var(--cyan)' : 'none',
                    transition: 'all 180ms ease',
                  })}
                >
                  {({ isActive }) => (
                    <>
                      {/* 36px rounded icon tile */}
                      <div
                        style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '10px',
                          background: isActive ? 'var(--grad-cool)' : 'rgba(255, 255, 255, 0.04)',
                          boxShadow: isActive ? 'var(--glow-cyan)' : 'none',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: isActive ? '#070812' : 'var(--text-dim)',
                          flexShrink: 0,
                          transition: 'all 180ms ease',
                        }}
                      >
                        <Icon size={18} strokeWidth={isActive ? 2.5 : 2} />
                      </div>
                      <span style={{ fontWeight: isActive ? 600 : 500 }}>{item.name}</span>
                    </>
                  )}
                </NavLink>
              );
            })}

            {/* Admin Section */}
            {isAdmin && (
              <div style={{ marginTop: '18px' }}>
                <span className="label-xs" style={{ padding: '0 12px 6px', display: 'block' }}>
                  ADMIN
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {adminItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <NavLink
                        key={item.path}
                        to={item.path}
                        onClick={() => onClose && onClose()}
                        className={({ isActive }) =>
                          `nav-link ${isActive ? 'nav-link-active' : ''}`
                        }
                        style={({ isActive }) => ({
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          padding: '8px 12px',
                          borderRadius: 'var(--radius-sm)',
                          textDecoration: 'none',
                          fontSize: '13.5px',
                          fontWeight: 500,
                          color: isActive ? 'var(--text)' : 'var(--text-dim)',
                          background: isActive
                            ? 'linear-gradient(90deg, rgba(124, 92, 255, 0.18), transparent)'
                            : 'transparent',
                          boxShadow: isActive ? 'inset 3px 0 0 var(--violet)' : 'none',
                          transition: 'all 180ms ease',
                        })}
                      >
                        {({ isActive }) => (
                          <>
                            <div
                              style={{
                                width: '36px',
                                height: '36px',
                                borderRadius: '10px',
                                background: isActive ? 'linear-gradient(135deg, var(--violet), var(--magenta))' : 'rgba(255, 255, 255, 0.04)',
                                boxShadow: isActive ? 'var(--glow-violet)' : 'none',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: isActive ? '#ffffff' : 'var(--text-dim)',
                                flexShrink: 0,
                                transition: 'all 180ms ease',
                              }}
                            >
                              <Icon size={18} strokeWidth={isActive ? 2.5 : 2} />
                            </div>
                            <span style={{ fontWeight: isActive ? 600 : 500 }}>{item.name}</span>
                          </>
                        )}
                      </NavLink>
                    );
                  })}
                </div>
              </div>
            )}
          </nav>
        </div>

        {/* Bottom User Chip & Logout */}
        {user ? (
          <div
            className="clay-inset"
            style={{
              padding: '10px 12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '10px',
              borderRadius: 'var(--radius-sm)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
              {/* Avatar circle with first letter on gradient background */}
              <div
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '50%',
                  background: 'var(--grad-brand)',
                  color: '#070812',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: 'var(--font-head)',
                  fontWeight: 700,
                  fontSize: '14px',
                  boxShadow: 'var(--glow-cyan)',
                  flexShrink: 0,
                }}
              >
                {firstLetter}
              </div>
              <div style={{ overflow: 'hidden' }}>
                <div
                  style={{
                    fontSize: '13px',
                    fontWeight: 600,
                    color: 'var(--text)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {user.name || 'Analyst'}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', marginTop: '2px' }}>
                  <span
                    className={user.role === 'admin' ? 'badge badge-high' : 'badge badge-info'}
                    style={{ fontSize: '9.5px', padding: '1px 6px' }}
                  >
                    {user.role}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="btn btn-ghost"
              style={{
                padding: '6px',
                borderRadius: '8px',
                color: 'var(--text-faint)',
              }}
              title="Sign Out"
              aria-label="Sign Out"
            >
              <LogOut size={16} />
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <NavLink to="/login" className="btn btn-secondary" style={{ width: '100%' }}>
              Login
            </NavLink>
          </div>
        )}
      </aside>

      <style>{`
        @media (max-width: 900px) {
          aside.clay {
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            bottom: 0 !important;
            height: 100vh !important;
            margin: 0 !important;
            border-radius: 0 var(--radius-lg) var(--radius-lg) 0 !important;
            transform: translateX(-105%);
          }
          aside.clay.sidebar-open {
            transform: translateX(0) !important;
          }
          .mobile-close-btn {
            display: flex !important;
          }
        }
        .nav-link:hover {
          background: rgba(255, 255, 255, 0.05);
          color: var(--text) !important;
        }
      `}</style>
    </>
  );
};

export default Sidebar;
