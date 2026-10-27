import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

const getPageTitle = (pathname) => {
  if (pathname.startsWith('/dashboard')) return 'Dashboard Overview';
  if (pathname.startsWith('/traffic')) return 'Live Packet Stream';
  if (pathname.startsWith('/alerts')) return 'Security Alerts';
  if (pathname.startsWith('/devices')) return 'Network Devices';
  if (pathname.startsWith('/reports')) return 'Reports & Forensics';
  if (pathname.startsWith('/admin/rules')) return 'Detection Rules Management';
  if (pathname.startsWith('/admin/users')) return 'User Access Management';
  return 'NetSentinel Console';
};

const Layout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const pageTitle = getPageTitle(location.pathname);

  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100vh',
        width: '100%',
        position: 'relative',
      }}
    >
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
          maxWidth: '100%',
        }}
      >
        <Topbar title={pageTitle} onMenuClick={() => setSidebarOpen(true)} />

        <main
          className="layout-main"
          style={{
            flex: 1,
            padding: '24px',
            maxWidth: '1600px',
            width: '100%',
            margin: '0 auto',
          }}
        >
          <div key={location.pathname} className="fade-up" style={{ width: '100%' }}>
            <Outlet />
          </div>
        </main>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .layout-main {
            padding: 16px !important;
          }
        }
      `}</style>
    </div>
  );
};

export default Layout;
