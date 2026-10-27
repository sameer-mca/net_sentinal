import React, { useState, useEffect, useCallback } from 'react';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import Card from '../../components/Card';
import Modal from '../../components/Modal';
import ConfirmModal from '../../components/ConfirmModal';
import EmptyState from '../../components/EmptyState';
import PageHeader from '../../components/PageHeader';
import { usePageTitle } from '../../hooks/usePageTitle';
import { formatTime } from '../../utils/format';
import {
  Users as UsersIcon,
  UserPlus,
  Shield,
  UserCheck,
  Trash2,
  RotateCcw,
  AlertTriangle,
  Mail,
  User,
  Lock,
} from 'lucide-react';

const AVATAR_GRADIENTS = [
  'linear-gradient(135deg, #00e5ff, #7c5cff)',
  'linear-gradient(135deg, #7c5cff, #ff2bd6)',
  'linear-gradient(135deg, #ff2bd6, #ff7a45)',
  'linear-gradient(135deg, #2dffa0, #00e5ff)',
  'linear-gradient(135deg, #ffb020, #ff3b6b)',
];

const getAvatarGradient = (email = '') => {
  let hash = 0;
  for (let i = 0; i < email.length; i++) {
    hash = (hash << 5) - hash + email.charCodeAt(i);
    hash |= 0;
  }
  const idx = Math.abs(hash) % AVATAR_GRADIENTS.length;
  return AVATAR_GRADIENTS[idx];
};

const Users = () => {
  usePageTitle('Admin · Operator Accounts');

  const { user: currentUser } = useAuth();
  const { addToast } = useToast();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Add User Modal State
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [addForm, setAddForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'user',
  });
  const [addingUser, setAddingUser] = useState(false);
  const [addError, setAddError] = useState('');

  // Delete User Modal State
  const [userToDelete, setUserToDelete] = useState(null);
  const [deletingUser, setDeletingUser] = useState(false);

  // Updating Role State
  const [updatingRoleId, setUpdatingRoleId] = useState(null);

  // Fetch all users
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/users');
      setUsers(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Failed to load users:', err);
      addToast(err.response?.data?.message || 'Failed to load user list', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Open Add Modal
  const handleOpenAdd = () => {
    setAddForm({
      name: '',
      email: '',
      password: '',
      role: 'user',
    });
    setAddError('');
    setIsAddOpen(true);
  };

  // Submit Add User
  const handleSaveNewUser = async (e) => {
    e.preventDefault();
    setAddError('');

    if (addForm.name.trim().length < 2) {
      setAddError('Full name must be at least 2 characters long.');
      return;
    }

    if (!addForm.email.includes('@') || !addForm.email.includes('.')) {
      setAddError('Please enter a valid email address.');
      return;
    }

    if (
      addForm.password.length < 8 ||
      !/[A-Za-z]/.test(addForm.password) ||
      !/[0-9]/.test(addForm.password)
    ) {
      setAddError(
        'Password must be at least 8 characters long and contain at least one letter and one number.'
      );
      return;
    }

    setAddingUser(true);
    try {
      const res = await api.post('/users', {
        name: addForm.name.trim(),
        email: addForm.email.trim().toLowerCase(),
        password: addForm.password,
        role: addForm.role,
      });

      addToast(res.data?.message || 'New user created successfully!', 'success');
      setIsAddOpen(false);
      fetchUsers();
    } catch (err) {
      console.error('Failed to create user:', err);
      const msg = err.response?.data?.message || 'Failed to create user account';
      setAddError(msg);
      addToast(msg, 'error');
    } finally {
      setAddingUser(false);
    }
  };

  // Change Role Handler
  const handleRoleChange = async (targetUser, newRole) => {
    if (targetUser.id === currentUser?.id) {
      addToast('You cannot alter your own administrative role', 'error');
      return;
    }

    setUpdatingRoleId(targetUser.id);
    try {
      await api.patch(`/users/${targetUser.id}/role`, { role: newRole });
      addToast(`Role for ${targetUser.name} updated to ${newRole.toUpperCase()}`, 'success');
      setUsers((prev) =>
        prev.map((u) => (u.id === targetUser.id ? { ...u, role: newRole } : u))
      );
    } catch (err) {
      console.error('Failed to update role:', err);
      addToast(err.response?.data?.message || 'Failed to update user role', 'error');
    } finally {
      setUpdatingRoleId(null);
    }
  };

  // Delete User Handler
  const handleConfirmDelete = async () => {
    if (!userToDelete) return;
    if (userToDelete.id === currentUser?.id) {
      addToast('You cannot delete your own account', 'error');
      setUserToDelete(null);
      return;
    }

    setDeletingUser(true);
    try {
      await api.delete(`/users/${userToDelete.id}`);
      addToast(`User ${userToDelete.name} deleted successfully`, 'success');
      setUserToDelete(null);
      fetchUsers();
    } catch (err) {
      console.error('Failed to delete user:', err);
      addToast(err.response?.data?.message || 'Failed to delete user', 'error');
    } finally {
      setDeletingUser(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Page Header */}
      <PageHeader
        breadcrumb="NETSENTINEL / ADMIN / USERS"
        title="Security Operators & System Users"
        description="Provision operator credentials, assign role-based permissions, and manage active analyst accounts."
        actions={
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={fetchUsers}
              disabled={loading}
              style={{ padding: '8px 16px', fontSize: '13px' }}
            >
              <RotateCcw size={14} /> Refresh
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleOpenAdd}
              style={{ padding: '8px 18px', fontSize: '13px' }}
            >
              <UserPlus size={15} /> Add User
            </button>
          </div>
        }
      />

      {/* Users Table Card */}
      <Card
        title="Registered Operators"
        subtitle={`Active security analysts and administrator directory (${users.length} accounts)`}
      >
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '16px 0' }}>
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="shimmer" style={{ height: '48px', borderRadius: '8px' }} />
            ))}
          </div>
        ) : users.length === 0 ? (
          <div style={{ padding: '24px 10px' }}>
            <EmptyState
              title="No Users Registered"
              message="No security operators were found in the database."
            />
          </div>
        ) : (
          <div className="table-responsive table-fade-mask" style={{ maxHeight: '520px', overflowY: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>User Profile</th>
                  <th>Current Role</th>
                  <th>Registered Date</th>
                  <th>Change Role</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((row) => {
                  const isCurrent = row.id === currentUser?.id;
                  const isAdminRole = row.role === 'admin';
                  const avatarGrad = getAvatarGradient(row.email);

                  return (
                    <tr key={row.id}>
                      {/* Avatar Circle with Initial Letter + Name & Email */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div
                            style={{
                              width: '38px',
                              height: '38px',
                              borderRadius: '50%',
                              background: avatarGrad,
                              color: '#04101a',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 700,
                              fontSize: '14px',
                              boxShadow: '0 0 12px rgba(0, 0, 0, 0.4)',
                              flexShrink: 0,
                            }}
                          >
                            {row.name ? row.name.charAt(0).toUpperCase() : 'U'}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, color: 'var(--text)', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span>{row.name}</span>
                              {isCurrent && (
                                <span
                                  className="badge badge-info"
                                  style={{
                                    fontSize: '9.5px',
                                    padding: '1px 7px',
                                    fontWeight: 700,
                                  }}
                                >
                                  YOU
                                </span>
                              )}
                            </div>
                            <div className="font-mono" style={{ fontSize: '12px', color: 'var(--text-dim)', marginTop: '2px' }}>
                              {row.email}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Role Badge: Admin = violet with glow, User = cyan */}
                      <td>
                        <span
                          className="badge"
                          style={{
                            fontSize: '11px',
                            padding: '3px 10px',
                            background: isAdminRole
                              ? 'rgba(124, 92, 255, 0.16)'
                              : 'rgba(0, 229, 255, 0.14)',
                            color: isAdminRole ? 'var(--violet)' : 'var(--cyan)',
                            border: `1px solid ${
                              isAdminRole ? 'rgba(124, 92, 255, 0.4)' : 'rgba(0, 229, 255, 0.35)'
                            }`,
                            boxShadow: isAdminRole ? '0 0 12px rgba(124, 92, 255, 0.35)' : 'none',
                          }}
                        >
                          {isAdminRole ? <Shield size={12} /> : <UserCheck size={12} />}
                          <span>{row.role}</span>
                        </span>
                      </td>

                      {/* Registered Date */}
                      <td className="font-mono" style={{ fontSize: '12px', color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>
                        {formatTime(row.created_at)}
                      </td>

                      {/* Role Select Dropdown in .clay-inset */}
                      <td>
                        <select
                          className="clay-inset"
                          value={row.role}
                          onChange={(e) => handleRoleChange(row, e.target.value)}
                          disabled={isCurrent || updatingRoleId === row.id}
                          title={isCurrent ? 'You cannot alter your own administrative role' : 'Change user role'}
                          style={{
                            fontSize: '12px',
                            padding: '6px 12px',
                            borderRadius: '999px',
                            color: 'var(--text)',
                            opacity: isCurrent ? 0.5 : 1,
                            cursor: isCurrent ? 'not-allowed' : 'pointer',
                          }}
                        >
                          <option value="user">User</option>
                          <option value="admin">Admin</option>
                        </select>
                      </td>

                      {/* Delete Action Button (Red icon button with disabled state) */}
                      <td style={{ textAlign: 'right' }}>
                        <button
                          type="button"
                          className="btn btn-ghost"
                          onClick={() => setUserToDelete(row)}
                          disabled={isCurrent}
                          title={isCurrent ? 'You cannot delete your own active account' : 'Delete user'}
                          style={{
                            padding: '6px 10px',
                            borderRadius: '8px',
                            color: isCurrent ? 'var(--text-faint)' : 'var(--red)',
                            opacity: isCurrent ? 0.35 : 1,
                            cursor: isCurrent ? 'not-allowed' : 'pointer',
                          }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Add User Modal */}
      <Modal
        isOpen={isAddOpen}
        onClose={() => !addingUser && setIsAddOpen(false)}
        title="Provision New Operator Account"
        maxWidth="480px"
        footer={
          <>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setIsAddOpen(false)}
              disabled={addingUser}
            >
              Cancel
            </button>
            <button
              type="submit"
              form="add-user-form"
              className="btn btn-primary"
              disabled={addingUser}
              style={{ padding: '8px 20px' }}
            >
              {addingUser ? 'Creating Account...' : 'Create Account'}
            </button>
          </>
        }
      >
        <form id="add-user-form" onSubmit={handleSaveNewUser} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label className="label-xs">Full Name</label>
            <div
              className="clay-inset"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '4px 12px',
              }}
            >
              <User size={15} color="var(--text-faint)" />
              <input
                type="text"
                placeholder="Jane Analyst"
                value={addForm.name}
                onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                style={{
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  fontSize: '13px',
                  color: 'var(--text)',
                  width: '100%',
                }}
                required
              />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label className="label-xs">Email Address</label>
            <div
              className="clay-inset"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '4px 12px',
              }}
            >
              <Mail size={15} color="var(--text-faint)" />
              <input
                type="email"
                placeholder="jane@netsentinel.local"
                value={addForm.email}
                onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                style={{
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  fontSize: '13px',
                  color: 'var(--text)',
                  width: '100%',
                }}
                required
              />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label className="label-xs">Initial Password</label>
            <div
              className="clay-inset"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '4px 12px',
              }}
            >
              <Lock size={15} color="var(--text-faint)" />
              <input
                type="password"
                placeholder="Minimum 8 characters"
                value={addForm.password}
                onChange={(e) => setAddForm({ ...addForm, password: e.target.value })}
                style={{
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  fontSize: '13px',
                  color: 'var(--text)',
                  width: '100%',
                }}
                required
              />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label className="label-xs">Security Role Assignment</label>
            <select
              className="clay-inset"
              value={addForm.role}
              onChange={(e) => setAddForm({ ...addForm, role: e.target.value })}
              style={{ padding: '10px 14px', fontSize: '13px', color: 'var(--text)' }}
            >
              <option value="user">User (Triage & Reporting)</option>
              <option value="admin">Admin (Engine Controls & Rule Config)</option>
            </select>
          </div>

          {addError && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 14px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'rgba(255, 59, 107, 0.12)',
                border: '1px solid rgba(255, 59, 107, 0.3)',
                color: 'var(--red)',
                fontSize: '13px',
              }}
            >
              <AlertTriangle size={16} />
              <span>{addError}</span>
            </div>
          )}
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!userToDelete}
        onClose={() => !deletingUser && setUserToDelete(null)}
        onConfirm={handleConfirmDelete}
        title="Revoke Operator Access"
        message={`Are you sure you want to permanently delete the account for "${userToDelete?.name}" (${userToDelete?.email})? This action cannot be undone.`}
        confirmText="Revoke Access"
        isDanger={true}
        loading={deletingUser}
      />
    </div>
  );
};

export default Users;
