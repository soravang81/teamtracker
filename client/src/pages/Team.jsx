import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { Users, Search, Shield, ShieldCheck, Mail, Building2, Calendar, X } from 'lucide-react';

export default function Team() {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [userStats, setUserStats] = useState(null);

  useEffect(() => {
    api.get('/auth/users').then(res => setUsers(res.data.users)).catch(console.error).finally(() => setLoading(false));
  }, []);

  const handleRoleChange = async (userId, newRole) => {
    try {
      const res = await api.put(`/auth/users/${userId}/role`, { role: newRole });
      setUsers(prev => prev.map(u => u._id === userId ? { ...u, role: res.data.user.role } : u));
      toast.success(`Role changed to ${newRole}`);
      if (selectedUser?._id === userId) setSelectedUser(prev => ({ ...prev, role: res.data.user.role }));
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const openUserProfile = async (u) => {
    setSelectedUser(u);
    try {
      const res = await api.get(`/auth/users/${u._id}`);
      setUserStats(res.data.stats);
    } catch { setUserStats(null); }
  };

  const filtered = users.filter(u => {
    const matchSearch = !search || u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase());
    const matchRole = !filter || u.role === filter;
    return matchSearch && matchRole;
  });

  const getInitials = (name) => name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';
  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '';

  if (loading) return <div className="loading"><div className="spinner" /></div>;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title"><Users size={28} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 8 }} />Team Management</h1>
        <p className="page-subtitle">{users.length} team member{users.length !== 1 ? 's' : ''} — Manage roles and permissions</p>
      </div>

      {/* Filters */}
      <div className="card mb-4">
        <div className="flex items-center gap-3" style={{ flexWrap: 'wrap' }}>
          <div className="flex gap-2" style={{ flex: 1, minWidth: 200 }}>
            <input className="form-input" placeholder="Search by name or email..." value={search} onChange={e => setSearch(e.target.value)} style={{ maxWidth: 300 }} />
          </div>
          <select className="form-select" value={filter} onChange={e => setFilter(e.target.value)} style={{ width: 150 }}>
            <option value="">All Roles</option>
            <option value="admin">Admin</option>
            <option value="member">Member</option>
          </select>
          {(search || filter) && (
            <button className="btn btn-secondary btn-sm" onClick={() => { setSearch(''); setFilter(''); }}><X size={12} /> Clear</button>
          )}
        </div>
      </div>

      {/* Stats Row */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: 20 }}>
        <div className="stat-card" style={{ textAlign: 'center' }}>
          <div className="stat-value">{users.length}</div>
          <div className="stat-label">Total Members</div>
        </div>
        <div className="stat-card" style={{ textAlign: 'center' }}>
          <div className="stat-value" style={{ color: 'var(--accent)' }}>{users.filter(u => u.role === 'admin').length}</div>
          <div className="stat-label">Admins</div>
        </div>
        <div className="stat-card" style={{ textAlign: 'center' }}>
          <div className="stat-value" style={{ color: 'var(--text-secondary)' }}>{users.filter(u => u.role === 'member').length}</div>
          <div className="stat-label">Members</div>
        </div>
      </div>

      {/* Users Table */}
      <div className="card">
        <div className="table-container">
          <table>
            <thead>
              <tr><th>User</th><th>Email</th><th>Department</th><th>Role</th><th>Joined</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {filtered.map(u => (
                <tr key={u._id}>
                  <td>
                    <div className="flex items-center gap-3" style={{ cursor: 'pointer' }} onClick={() => openUserProfile(u)}>
                      <div className="user-avatar" style={{ width: 32, height: 32, fontSize: 12 }}>{getInitials(u.name)}</div>
                      <span style={{ fontWeight: 600, fontSize: 13 }}>{u.name}</span>
                    </div>
                  </td>
                  <td style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{u.email}</td>
                  <td style={{ fontSize: 13, color: 'var(--text-muted)' }}>{u.department || '—'}</td>
                  <td>
                    <span className={`badge badge-${u.role}`}>
                      {u.role === 'admin' ? <ShieldCheck size={10} style={{ marginRight: 4 }} /> : <Shield size={10} style={{ marginRight: 4 }} />}
                      {u.role}
                    </span>
                  </td>
                  <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{formatDate(u.createdAt)}</td>
                  <td>
                    {u._id !== user._id ? (
                      <select className="form-select" value={u.role} onChange={e => handleRoleChange(u._id, e.target.value)}
                        style={{ width: 110, padding: '4px 28px 4px 8px', fontSize: 12 }}>
                        <option value="member">Member</option>
                        <option value="admin">Admin</option>
                      </select>
                    ) : (
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>You</span>
                    )}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No users found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* User Profile Modal */}
      {selectedUser && (
        <div className="modal-overlay" onClick={() => { setSelectedUser(null); setUserStats(null); }}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">User Profile</h2>
              <button className="btn-icon" onClick={() => { setSelectedUser(null); setUserStats(null); }}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <div className="flex items-center gap-4 mb-4">
                <div className="profile-avatar-lg" style={{ width: 56, height: 56, fontSize: 20 }}>{getInitials(selectedUser.name)}</div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 style={{ fontSize: 18, fontWeight: 700 }}>{selectedUser.name}</h3>
                    <span className={`badge badge-${selectedUser.role}`}>{selectedUser.role}</span>
                  </div>
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}><Mail size={12} style={{ marginRight: 4 }} />{selectedUser.email}</p>
                  {selectedUser.department && <p style={{ fontSize: 12, color: 'var(--text-muted)' }}><Building2 size={12} style={{ marginRight: 4 }} />{selectedUser.department}</p>}
                  {selectedUser.bio && <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 8 }}>{selectedUser.bio}</p>}
                </div>
              </div>
              {userStats && (
                <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
                  <div className="stat-card" style={{ textAlign: 'center', padding: 14 }}>
                    <div className="stat-value" style={{ fontSize: 20 }}>{userStats.projectCount}</div>
                    <div className="stat-label">Projects</div>
                  </div>
                  <div className="stat-card" style={{ textAlign: 'center', padding: 14 }}>
                    <div className="stat-value" style={{ fontSize: 20 }}>{userStats.totalTasks}</div>
                    <div className="stat-label">Tasks</div>
                  </div>
                  <div className="stat-card" style={{ textAlign: 'center', padding: 14 }}>
                    <div className="stat-value" style={{ fontSize: 20, color: 'var(--success)' }}>{userStats.completionRate}%</div>
                    <div className="stat-label">Completion</div>
                  </div>
                  <div className="stat-card" style={{ textAlign: 'center', padding: 14 }}>
                    <div className="stat-value" style={{ fontSize: 20, color: 'var(--danger)' }}>{userStats.overdueTasks}</div>
                    <div className="stat-label">Overdue</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
