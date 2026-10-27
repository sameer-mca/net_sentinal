import React, { useEffect, useRef } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import Spinner from '../components/Spinner';

const AdminRoute = ({ children }) => {
  const { user, token, isAdmin, loading } = useAuth();
  const { addToast } = useToast();
  const toastFired = useRef(false);

  useEffect(() => {
    if (!loading && token && user && !isAdmin && !toastFired.current) {
      toastFired.current = true;
      addToast('Access denied: Administrator privileges required.', 'error');
    }
  }, [loading, token, user, isAdmin, addToast]);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Spinner size={42} label="Checking permissions..." />
      </div>
    );
  }

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return children ? children : <Outlet />;
};

export default AdminRoute;
