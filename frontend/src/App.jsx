import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastProvider } from './context/ToastContext';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import ToastContainer from './components/ToastContainer';

// Layout & Route Guards
import Layout from './components/Layout';
import ProtectedRoute from './routes/ProtectedRoute';
import AdminRoute from './routes/AdminRoute';
import BackgroundFX from './components/BackgroundFX';

// Main Application Pages
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Traffic from './pages/Traffic';
import Alerts from './pages/Alerts';
import Devices from './pages/Devices';
import Reports from './pages/Reports';
import Rules from './pages/admin/Rules';
import Users from './pages/admin/Users';
import NotFound from './pages/NotFound';

function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <SocketProvider>
            <BackgroundFX />
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />

              {/* Protected Routes inside Common Shell Layout */}
              <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/traffic" element={<Traffic />} />
                <Route path="/alerts" element={<Alerts />} />
                <Route path="/devices" element={<Devices />} />
                <Route path="/reports" element={<Reports />} />

                {/* Admin Only Routes */}
                <Route element={<AdminRoute />}>
                  <Route path="/admin/rules" element={<Rules />} />
                  <Route path="/admin/users" element={<Users />} />
                </Route>
              </Route>

              {/* 404 Catch-All */}
              <Route path="*" element={<NotFound />} />
            </Routes>

            {/* Global Toasts */}
            <ToastContainer />
          </SocketProvider>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}

export default App;