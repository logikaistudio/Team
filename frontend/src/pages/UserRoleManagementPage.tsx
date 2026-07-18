import React, { useEffect, useMemo, useState } from 'react';
import { request } from '../services/api';

type ManagedUser = {
  id: string;
  tenantId: string;
  name: string;
  email: string;
  status: 'active' | 'inactive' | 'pending';
  roles: string[];
  createdAt?: string;
  updatedAt?: string;
};

type RoleItem = {
  id: string;
  tenantId?: string;
  name: string;
  code: string;
  description?: string;
};

export const UserRoleManagementPage: React.FC = () => {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserStatus, setNewUserStatus] = useState<'active' | 'inactive' | 'pending'>('active');
  const [newUserRoleCode, setNewUserRoleCode] = useState('');

  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleCode, setNewRoleCode] = useState('');
  const [newRoleDescription, setNewRoleDescription] = useState('');

  const roleOptions = useMemo(() => roles.map((r) => r.code), [roles]);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [usersRes, rolesRes] = await Promise.all([
        request<ManagedUser[]>('/management/users'),
        request<RoleItem[]>('/management/roles'),
      ]);
      setUsers(usersRes);
      setRoles(rolesRes);
      if (!newUserRoleCode && rolesRes.length > 0) {
        setNewUserRoleCode(rolesRes[0].code);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load users and roles');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await request<ManagedUser>('/management/users', {
        method: 'POST',
        body: JSON.stringify({
          name: newUserName,
          email: newUserEmail,
          password: newUserPassword,
          status: newUserStatus,
          roleCodes: newUserRoleCode ? [newUserRoleCode] : [],
        }),
      });
      setNewUserName('');
      setNewUserEmail('');
      setNewUserPassword('');
      setNewUserStatus('active');
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to create user');
    }
  };

  const handleUpdateUser = async (user: ManagedUser, roleCode: string) => {
    setError('');
    try {
      await request<ManagedUser>(`/management/users/${user.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          status: user.status,
          roleCodes: roleCode ? [roleCode] : user.roles,
        }),
      });
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to update user');
    }
  };

  const handleChangePassword = async (user: ManagedUser) => {
    const nextPassword = window.prompt(`Set new password for ${user.email}`);
    if (!nextPassword) return;

    setError('');
    try {
      await request<{ message: string }>(`/management/users/${user.id}/password`, {
        method: 'PUT',
        body: JSON.stringify({ password: nextPassword }),
      });
      window.alert('Password updated successfully');
    } catch (err: any) {
      setError(err.message || 'Failed to update password');
    }
  };

  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await request<RoleItem>('/management/roles', {
        method: 'POST',
        body: JSON.stringify({
          name: newRoleName,
          code: newRoleCode,
          description: newRoleDescription || undefined,
        }),
      });
      setNewRoleName('');
      setNewRoleCode('');
      setNewRoleDescription('');
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to create role');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">User & Role Management</h1>
        <p className="text-zinc-500 text-sm">Manage tenant users, assign roles, and manually reset existing passwords.</p>
      </div>

      {error && (
        <div className="p-3 rounded-lg border border-red-300 bg-red-50 text-red-700 text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 bg-white dark:bg-[#0c0c0e] border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-zinc-200 dark:border-zinc-800">
            <h2 className="font-semibold text-sm">Existing Users</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-50 dark:bg-zinc-900/40 text-zinc-500 uppercase text-xs">
                <tr>
                  <th className="p-3">Name</th>
                  <th className="p-3">Email</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Role</th>
                  <th className="p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td className="p-4" colSpan={5}>Loading...</td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td className="p-4" colSpan={5}>No users found</td>
                  </tr>
                ) : (
                  users.map((u) => {
                    const currentRole = u.roles[0] || '';
                    return (
                      <tr key={u.id} className="border-t border-zinc-100 dark:border-zinc-900">
                        <td className="p-3">{u.name}</td>
                        <td className="p-3">{u.email}</td>
                        <td className="p-3">
                          <select
                            value={u.status}
                            onChange={(e) => {
                              const next = e.target.value as ManagedUser['status'];
                              setUsers((prev) => prev.map((item) => (item.id === u.id ? { ...item, status: next } : item)));
                            }}
                            className="px-2 py-1 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900"
                          >
                            <option value="active">active</option>
                            <option value="inactive">inactive</option>
                            <option value="pending">pending</option>
                          </select>
                        </td>
                        <td className="p-3">
                          <select
                            value={currentRole}
                            onChange={(e) => {
                              const nextRole = e.target.value;
                              setUsers((prev) => prev.map((item) => (item.id === u.id ? { ...item, roles: nextRole ? [nextRole] : [] } : item)));
                            }}
                            className="px-2 py-1 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900"
                          >
                            {roleOptions.map((code) => (
                              <option key={code} value={code}>{code}</option>
                            ))}
                          </select>
                        </td>
                        <td className="p-3 space-x-2">
                          <button
                            onClick={() => handleUpdateUser(u, u.roles[0] || '')}
                            className="px-2 py-1 rounded bg-brand-600 text-white text-xs"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => handleChangePassword(u)}
                            className="px-2 py-1 rounded border border-zinc-300 dark:border-zinc-700 text-xs"
                          >
                            Set Password
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white dark:bg-[#0c0c0e] border border-zinc-200 dark:border-zinc-800 rounded-xl p-4">
            <h2 className="font-semibold text-sm mb-3">Create User</h2>
            <form onSubmit={handleCreateUser} className="space-y-2">
              <input
                required
                value={newUserName}
                onChange={(e) => setNewUserName(e.target.value)}
                placeholder="Name"
                className="w-full px-3 py-2 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm"
              />
              <input
                required
                type="email"
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
                placeholder="Email"
                className="w-full px-3 py-2 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm"
              />
              <input
                required
                type="password"
                value={newUserPassword}
                onChange={(e) => setNewUserPassword(e.target.value)}
                placeholder="Password"
                className="w-full px-3 py-2 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm"
              />
              <select
                value={newUserStatus}
                onChange={(e) => setNewUserStatus(e.target.value as ManagedUser['status'])}
                className="w-full px-3 py-2 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm"
              >
                <option value="active">active</option>
                <option value="inactive">inactive</option>
                <option value="pending">pending</option>
              </select>
              <select
                value={newUserRoleCode}
                onChange={(e) => setNewUserRoleCode(e.target.value)}
                className="w-full px-3 py-2 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm"
              >
                <option value="">Select role</option>
                {roleOptions.map((code) => (
                  <option key={code} value={code}>{code}</option>
                ))}
              </select>
              <button type="submit" className="w-full px-3 py-2 rounded bg-brand-600 text-white text-sm">
                Create User
              </button>
            </form>
          </div>

          <div className="bg-white dark:bg-[#0c0c0e] border border-zinc-200 dark:border-zinc-800 rounded-xl p-4">
            <h2 className="font-semibold text-sm mb-3">Create Role</h2>
            <form onSubmit={handleCreateRole} className="space-y-2">
              <input
                required
                value={newRoleName}
                onChange={(e) => setNewRoleName(e.target.value)}
                placeholder="Role name"
                className="w-full px-3 py-2 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm"
              />
              <input
                required
                value={newRoleCode}
                onChange={(e) => setNewRoleCode(e.target.value)}
                placeholder="role_code"
                className="w-full px-3 py-2 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm"
              />
              <textarea
                value={newRoleDescription}
                onChange={(e) => setNewRoleDescription(e.target.value)}
                placeholder="Description (optional)"
                className="w-full px-3 py-2 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm"
              />
              <button type="submit" className="w-full px-3 py-2 rounded bg-zinc-800 text-white text-sm">
                Create Role
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserRoleManagementPage;
