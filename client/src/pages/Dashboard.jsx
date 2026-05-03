import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { BarChart3, FolderKanban, ListTodo, AlertTriangle, Clock, CheckCircle2, Activity, TrendingUp } from 'lucide-react';

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/tasks/dashboard/stats')
      .then(res => setStats(res.data.stats))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading"><div className="spinner" /></div>;

  const formatDate = (d) => {
    if (!d) return '';
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };
  const formatDateTime = (d) => d ? new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
  const isOverdue = (d) => d && new Date(d) < new Date();
  const getInitials = (name) => name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';
  const completionRate = stats?.totalTasks > 0 ? Math.round((stats.doneTasks / stats.totalTasks) * 100) : 0;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Welcome back, {user?.name?.split(' ')[0]} 👋</h1>
        <p className="page-subtitle">Here's what's happening across your projects</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{background:'rgba(99,102,241,0.15)'}}><FolderKanban size={20} color="#6366f1" /></div>
          <div className="stat-value">{stats?.projectCount || 0}</div>
          <div className="stat-label">Projects</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{background:'rgba(59,130,246,0.15)'}}><ListTodo size={20} color="#3b82f6" /></div>
          <div className="stat-value">{stats?.totalTasks || 0}</div>
          <div className="stat-label">Total Tasks</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{background:'rgba(16,185,129,0.15)'}}><CheckCircle2 size={20} color="#10b981" /></div>
          <div className="stat-value">{stats?.doneTasks || 0}</div>
          <div className="stat-label">Completed</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{background:'rgba(239,68,68,0.15)'}}><AlertTriangle size={20} color="#ef4444" /></div>
          <div className="stat-value">{stats?.overdueTasks?.length || 0}</div>
          <div className="stat-label">Overdue</div>
        </div>
      </div>

      {/* Completion + Status Breakdown */}
      <div className="content-grid mb-4">
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <span className="section-title" style={{marginBottom:0}}><TrendingUp size={16} /> Completion Rate</span>
            <span style={{fontSize:20,fontWeight:800,color:'var(--accent)'}}>{completionRate}%</span>
          </div>
          <div className="progress-bar-track">
            <div className="progress-bar-fill" style={{width:`${completionRate}%`}} />
          </div>
          <div className="flex justify-between mt-2" style={{fontSize:12,color:'var(--text-muted)'}}>
            <span>{stats?.doneTasks || 0} completed</span>
            <span>{stats?.totalTasks || 0} total</span>
          </div>
        </div>
        <div className="card">
          <div className="section-title" style={{marginBottom:12}}>Status Breakdown</div>
          <div className="stats-grid" style={{gridTemplateColumns:'repeat(4,1fr)',gap:8,marginBottom:0}}>
            <div style={{textAlign:'center'}}>
              <div style={{fontSize:20,fontWeight:800,color:'var(--text-secondary)'}}>{stats?.todoTasks || 0}</div>
              <div style={{fontSize:11,color:'var(--text-muted)'}}>To Do</div>
            </div>
            <div style={{textAlign:'center'}}>
              <div style={{fontSize:20,fontWeight:800,color:'var(--info)'}}>{stats?.inProgressTasks || 0}</div>
              <div style={{fontSize:11,color:'var(--text-muted)'}}>In Progress</div>
            </div>
            <div style={{textAlign:'center'}}>
              <div style={{fontSize:20,fontWeight:800,color:'var(--warning)'}}>{stats?.reviewTasks || 0}</div>
              <div style={{fontSize:11,color:'var(--text-muted)'}}>Review</div>
            </div>
            <div style={{textAlign:'center'}}>
              <div style={{fontSize:20,fontWeight:800,color:'var(--success)'}}>{stats?.doneTasks || 0}</div>
              <div style={{fontSize:11,color:'var(--text-muted)'}}>Done</div>
            </div>
          </div>
        </div>
      </div>

      <div className="content-grid">
        <div>
          <h2 className="section-title"><Clock size={18} /> My Tasks</h2>
          {stats?.myTasks?.length > 0 ? stats.myTasks.map(task => (
            <div key={task._id} className="task-card">
              <div className="flex items-center justify-between">
                <span className="task-title">{task.title}</span>
                <span className={`badge badge-${task.status}`}>{task.status}</span>
              </div>
              <div className="task-meta mt-2">
                {task.project && (
                  <span className="task-project">
                    <span className="task-project-dot" style={{background: task.project.color}} />
                    {task.project.name}
                  </span>
                )}
                <span className={`badge badge-${task.priority}`}>{task.priority}</span>
                {task.dueDate && (
                  <span className={`task-due ${isOverdue(task.dueDate) ? 'overdue' : ''}`}>
                    <Clock size={12} /> {formatDate(task.dueDate)}
                  </span>
                )}
              </div>
            </div>
          )) : (
            <div className="empty-state"><p>No tasks assigned to you</p></div>
          )}
        </div>

        <div>
          <h2 className="section-title"><AlertTriangle size={18} color="#ef4444" /> Overdue Tasks</h2>
          {stats?.overdueTasks?.length > 0 ? stats.overdueTasks.map(task => (
            <div key={task._id} className="task-card" style={{borderColor:'rgba(239,68,68,0.2)'}}>
              <div className="flex items-center justify-between">
                <span className="task-title">{task.title}</span>
                <span className={`badge badge-${task.status}`}>{task.status}</span>
              </div>
              <div className="task-meta mt-2">
                {task.project && (
                  <span className="task-project">
                    <span className="task-project-dot" style={{background: task.project.color}} />
                    {task.project.name}
                  </span>
                )}
                <span className="task-due overdue"><Clock size={12} /> {formatDate(task.dueDate)}</span>
                {task.assignee && (
                  <div className="task-assignee-avatar" title={task.assignee.name}>
                    {getInitials(task.assignee.name)}
                  </div>
                )}
              </div>
            </div>
          )) : (
            <div className="empty-state"><CheckCircle2 size={32} /><p>No overdue tasks!</p></div>
          )}
        </div>
      </div>

      {/* Recent Activity */}
      {stats?.recentActivity?.length > 0 && (
        <div className="mt-4">
          <h2 className="section-title"><Activity size={18} /> Recent Activity</h2>
          <div className="card">
            <div className="activity-list">
              {stats.recentActivity.map(a => (
                <div key={a._id} className="activity-item">
                  <div className="task-assignee-avatar" style={{width:28,height:28,fontSize:10,flexShrink:0}}>{getInitials(a.user?.name)}</div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:13}}><strong>{a.user?.name}</strong> <span style={{color:'var(--text-muted)'}}>{a.action.replace(/_/g, ' ')}</span></div>
                    {a.targetName && <div style={{fontSize:12,color:'var(--text-secondary)'}}>{a.targetName}</div>}
                  </div>
                  <span style={{fontSize:11,color:'var(--text-muted)',flexShrink:0}}>{formatDateTime(a.createdAt)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="mt-4">
        <h2 className="section-title"><BarChart3 size={18} /> Priority Breakdown</h2>
        <div className="stats-grid" style={{gridTemplateColumns:'repeat(4,1fr)'}}>
          {['low','medium','high','critical'].map(p => (
            <div key={p} className="stat-card" style={{textAlign:'center'}}>
              <span className={`badge badge-${p}`} style={{fontSize:13,marginBottom:8}}>{p}</span>
              <div className="stat-value" style={{fontSize:22}}>{stats?.priorityStats?.[p] || 0}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
