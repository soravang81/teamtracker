import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { User, Mail, Phone, Building2, Shield, Calendar, FolderKanban, ListTodo, CheckCircle2, AlertTriangle, Edit3, Lock, X, Save } from 'lucide-react';

export default function Profile() {
  const { user, updateUser } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [changingPw, setChangingPw] = useState(false);
  const [form, setForm] = useState({ name: '', bio: '', phone: '', department: '' });
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [recentTasks, setRecentTasks] = useState([]);

  useEffect(() => {
    if (!user?._id) return;
    Promise.all([
      api.get(`/auth/users/${user._id}`),
      api.get('/tasks?assignee=' + user._id)
    ]).then(([profileRes, tasksRes]) => {
      setStats(profileRes.data.stats);
      setForm({ name: profileRes.data.user.name || '', bio: profileRes.data.user.bio || '', phone: profileRes.data.user.phone || '', department: profileRes.data.user.department || '' });
      setRecentTasks(tasksRes.data.tasks?.slice(0, 8) || []);
    }).catch(console.error).finally(() => setLoading(false));
  }, [user?._id]);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    try {
      const res = await api.put('/auth/me', form);
      updateUser(res.data.user);
      toast.success('Profile updated!');
      setEditing(false);
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to update'); }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      return toast.error('Passwords do not match');
    }
    try {
      await api.put('/auth/me/password', { currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword });
      toast.success('Password changed!');
      setChangingPw(false);
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const initials = user?.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';
  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
  const memberSince = user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long' }) : '';

  if (loading) return <div className="loading"><div className="spinner" /></div>;

  return (
    <div>
      {/* Profile Header */}
      <div className="profile-header">
        <div className="profile-header-bg" />
        <div className="profile-header-content">
          <div className="profile-avatar-lg">{initials}</div>
          <div className="profile-info">
            <div className="flex items-center gap-3">
              <h1 className="profile-name">{user?.name}</h1>
              <span className={`badge badge-${user?.role}`}>{user?.role}</span>
            </div>
            <p className="profile-email"><Mail size={14} /> {user?.email}</p>
            {user?.department && <p className="profile-dept"><Building2 size={14} /> {user.department}</p>}
            {user?.bio && <p className="profile-bio">{user.bio}</p>}
            <p className="profile-joined"><Calendar size={14} /> Joined {memberSince}</p>
          </div>
          <div className="profile-actions">
            <button className="btn btn-secondary" onClick={() => setEditing(true)}><Edit3 size={14} /> Edit Profile</button>
            <button className="btn btn-secondary" onClick={() => setChangingPw(true)}><Lock size={14} /> Change Password</button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-grid" style={{ marginTop: 24 }}>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(99,102,241,0.15)' }}><FolderKanban size={20} color="#6366f1" /></div>
          <div className="stat-value">{stats?.projectCount || 0}</div>
          <div className="stat-label">Projects</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(59,130,246,0.15)' }}><ListTodo size={20} color="#3b82f6" /></div>
          <div className="stat-value">{stats?.totalTasks || 0}</div>
          <div className="stat-label">Total Tasks</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(16,185,129,0.15)' }}><CheckCircle2 size={20} color="#10b981" /></div>
          <div className="stat-value">{stats?.completionRate || 0}%</div>
          <div className="stat-label">Completion Rate</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(239,68,68,0.15)' }}><AlertTriangle size={20} color="#ef4444" /></div>
          <div className="stat-value">{stats?.overdueTasks || 0}</div>
          <div className="stat-label">Overdue</div>
        </div>
      </div>

      {/* Completion Bar */}
      <div className="card mb-4">
        <div className="flex items-center justify-between mb-4">
          <span style={{ fontSize: 14, fontWeight: 600 }}>Overall Completion</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--accent)' }}>{stats?.completionRate || 0}%</span>
        </div>
        <div className="progress-bar-track">
          <div className="progress-bar-fill" style={{ width: `${stats?.completionRate || 0}%` }} />
        </div>
        <div className="flex justify-between mt-2" style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          <span>{stats?.completedTasks || 0} completed</span>
          <span>{stats?.totalTasks || 0} total</span>
        </div>
      </div>

      {/* My Tasks */}
      <h2 className="section-title"><ListTodo size={18} /> My Assigned Tasks</h2>
      <div className="card">
        {recentTasks.length > 0 ? (
          <div className="table-container">
            <table>
              <thead>
                <tr><th>Task</th><th>Project</th><th>Status</th><th>Priority</th><th>Due</th></tr>
              </thead>
              <tbody>
                {recentTasks.map(task => (
                  <tr key={task._id}>
                    <td><span className="task-title" style={{ fontSize: 13 }}>{task.title}</span></td>
                    <td>{task.project && <span className="task-project"><span className="task-project-dot" style={{ background: task.project.color }} />{task.project.name}</span>}</td>
                    <td><span className={`badge badge-${task.status}`}>{task.status}</span></td>
                    <td><span className={`badge badge-${task.priority}`}>{task.priority}</span></td>
                    <td style={{ fontSize: 12 }}>{formatDate(task.dueDate) || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state"><p>No tasks assigned to you</p></div>
        )}
      </div>

      {/* Edit Profile Modal */}
      {editing && (
        <div className="modal-overlay" onClick={() => setEditing(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Edit Profile</h2>
              <button className="btn-icon" onClick={() => setEditing(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleSaveProfile}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <input className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Bio</label>
                  <textarea className="form-textarea" value={form.bio} onChange={e => setForm({ ...form, bio: e.target.value })} placeholder="Tell us about yourself..." maxLength={300} style={{ minHeight: 80 }} />
                </div>
                <div className="form-group">
                  <label className="form-label">Phone</label>
                  <input className="form-input" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="+1 234 567 8900" />
                </div>
                <div className="form-group">
                  <label className="form-label">Department</label>
                  <input className="form-input" value={form.department} onChange={e => setForm({ ...form, department: e.target.value })} placeholder="Engineering, Design, Marketing..." />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setEditing(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary"><Save size={14} /> Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {changingPw && (
        <div className="modal-overlay" onClick={() => setChangingPw(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Change Password</h2>
              <button className="btn-icon" onClick={() => setChangingPw(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleChangePassword}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Current Password</label>
                  <input className="form-input" type="password" value={pwForm.currentPassword} onChange={e => setPwForm({ ...pwForm, currentPassword: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label className="form-label">New Password</label>
                  <input className="form-input" type="password" value={pwForm.newPassword} onChange={e => setPwForm({ ...pwForm, newPassword: e.target.value })} required minLength={6} />
                </div>
                <div className="form-group">
                  <label className="form-label">Confirm New Password</label>
                  <input className="form-input" type="password" value={pwForm.confirmPassword} onChange={e => setPwForm({ ...pwForm, confirmPassword: e.target.value })} required minLength={6} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setChangingPw(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary"><Lock size={14} /> Update Password</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
