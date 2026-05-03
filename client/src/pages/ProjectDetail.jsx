import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { Plus, X, ArrowLeft, UserPlus, Trash2, Clock, MessageSquare, Activity, Send, ShieldCheck, Shield } from 'lucide-react';

const STATUSES = ['todo', 'in-progress', 'review', 'done'];
const STATUS_LABELS = { todo: 'To Do', 'in-progress': 'In Progress', review: 'Review', done: 'Done' };

export default function ProjectDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [showCommentModal, setShowCommentModal] = useState(null);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [editingTask, setEditingTask] = useState(null);
  const [activeTab, setActiveTab] = useState('board');
  const [taskForm, setTaskForm] = useState({ title: '', description: '', assignee: '', priority: 'medium', dueDate: '', status: 'todo' });

  const fetchData = async () => {
    try {
      const [pRes, tRes, uRes, aRes] = await Promise.all([
        api.get(`/projects/${id}`),
        api.get(`/tasks?project=${id}`),
        api.get('/auth/users'),
        api.get(`/projects/${id}/activity`).catch(() => ({ data: { activities: [] } }))
      ]);
      setProject(pRes.data.project);
      setTasks(tRes.data.tasks);
      setAllUsers(uRes.data.users);
      setActivities(aRes.data.activities || []);
    } catch (err) {
      toast.error('Failed to load project');
      navigate('/projects');
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [id]);

  const myMemberEntry = project?.members?.find(m => m.user?._id?.toString() === user?._id?.toString());
  const isAdmin = project && (
    project.owner?._id?.toString() === user?._id?.toString() ||
    (myMemberEntry && myMemberEntry.role === 'admin') ||
    user?.role === 'admin'
  );

  const canEditTask = (task) => {
    if (isAdmin) return true;
    if (task.creator?._id === user?._id || task.creator === user?._id) return true;
    if (task.assignee?._id === user?._id) return true;
    return false;
  };

  const canDeleteTask = (task) => {
    if (isAdmin) return true;
    if (task.creator?._id === user?._id || task.creator === user?._id) return true;
    return false;
  };

  const openNewTask = () => {
    setEditingTask(null);
    setTaskForm({ title: '', description: '', assignee: '', priority: 'medium', dueDate: '', status: 'todo' });
    setShowTaskModal(true);
  };

  const openEditTask = (task) => {
    if (!canEditTask(task)) return;
    setEditingTask(task);
    setTaskForm({
      title: task.title, description: task.description || '', assignee: task.assignee?._id || '',
      priority: task.priority, dueDate: task.dueDate ? task.dueDate.split('T')[0] : '', status: task.status
    });
    setShowTaskModal(true);
  };

  const handleTaskSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...taskForm, project: id };
      if (!payload.assignee) delete payload.assignee;
      if (!payload.dueDate) delete payload.dueDate;
      if (editingTask) {
        await api.put(`/tasks/${editingTask._id}`, payload);
        toast.success('Task updated');
      } else {
        await api.post('/tasks', payload);
        toast.success('Task created');
      }
      setShowTaskModal(false);
      fetchData();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const handleStatusChange = async (taskId, status) => {
    try {
      await api.put(`/tasks/${taskId}`, { status });
      fetchData();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to update status'); }
  };

  const handleDeleteTask = async (taskId) => {
    if (!confirm('Delete this task?')) return;
    try {
      await api.delete(`/tasks/${taskId}`);
      toast.success('Task deleted');
      fetchData();
    } catch (err) { toast.error('Failed to delete'); }
  };

  const handleAddMember = async (userId) => {
    try {
      await api.post(`/projects/${id}/members`, { userId, role: 'member' });
      toast.success('Member added');
      fetchData();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const handleRemoveMember = async (userId) => {
    if (!confirm('Remove this member?')) return;
    try {
      await api.post(`/projects/${id}/members/remove`, { userId });
      toast.success('Member removed');
      fetchData();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const handleRoleChange = async (userId, role) => {
    try {
      await api.put(`/projects/${id}/members/role`, { userId, role });
      toast.success(`Role changed to ${role}`);
      fetchData();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const handleDeleteProject = async () => {
    if (!confirm('Delete this project and all its tasks?')) return;
    try {
      await api.delete(`/projects/${id}`);
      toast.success('Project deleted');
      navigate('/projects');
    } catch (err) { toast.error('Failed to delete project'); }
  };

  const openComments = async (task) => {
    setShowCommentModal(task);
    setCommentText('');
    try {
      const res = await api.get(`/tasks/${task._id}/comments`);
      setComments(res.data.comments || []);
    } catch { setComments([]); }
  };

  const handleAddComment = async () => {
    if (!commentText.trim()) return;
    try {
      await api.post(`/tasks/${showCommentModal._id}/comments`, { text: commentText });
      setCommentText('');
      const res = await api.get(`/tasks/${showCommentModal._id}/comments`);
      setComments(res.data.comments || []);
      fetchData();
    } catch (err) { toast.error('Failed to add comment'); }
  };

  const handleDeleteComment = async (commentId) => {
    try {
      await api.delete(`/tasks/${showCommentModal._id}/comments/${commentId}`);
      setComments(prev => prev.filter(c => c._id !== commentId));
    } catch { toast.error('Failed to delete'); }
  };

  const getInitials = (name) => name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';
  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
  const formatDateTime = (d) => d ? new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
  const isOverdue = (d) => d && new Date(d) < new Date();
  const nonMembers = allUsers.filter(u => !project?.members?.some(m => m.user?._id?.toString() === u._id?.toString()));

  if (loading) return <div className="loading"><div className="spinner" /></div>;
  if (!project) return null;

  return (
    <div>
      <div className="page-header">
        <button className="btn btn-secondary btn-sm mb-4" onClick={() => navigate('/projects')}><ArrowLeft size={14} /> Back</button>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div style={{width:12,height:12,borderRadius:4,background:project.color}} />
              <h1 className="page-title">{project.name}</h1>
            </div>
            <p className="page-subtitle">{project.description || 'No description'}</p>
          </div>
          <div className="flex gap-2">
            {isAdmin && <button className="btn btn-secondary btn-sm" onClick={() => setShowMemberModal(true)}><UserPlus size={14} /> Members</button>}
            <button className="btn btn-primary btn-sm" onClick={openNewTask}><Plus size={14} /> Add Task</button>
            {isAdmin && <button className="btn btn-danger btn-sm" onClick={handleDeleteProject}><Trash2 size={14} /></button>}
          </div>
        </div>
      </div>

      {/* Members Strip */}
      <div className="card mb-4">
        <div className="flex items-center gap-3" style={{flexWrap:'wrap'}}>
          <span style={{fontSize:13,fontWeight:600,color:'var(--text-muted)'}}>Team:</span>
          {project.members?.map((m, i) => (
            <div key={i} className="flex items-center gap-2" style={{background:'var(--bg-glass)',padding:'4px 10px 4px 4px',borderRadius:20}}>
              <div className="task-assignee-avatar">{getInitials(m.user?.name)}</div>
              <span style={{fontSize:12,fontWeight:500}}>{m.user?.name}</span>
              <span className={`badge badge-${m.role}`}>
                {m.role === 'admin' ? <ShieldCheck size={8} style={{marginRight:2}} /> : <Shield size={8} style={{marginRight:2}} />}
                {m.role}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="tab-bar">
        <button className={`tab ${activeTab === 'board' ? 'active' : ''}`} onClick={() => setActiveTab('board')}>Board</button>
        <button className={`tab ${activeTab === 'activity' ? 'active' : ''}`} onClick={() => setActiveTab('activity')}>Activity</button>
      </div>

      {activeTab === 'board' && (
        <div className="kanban-board">
          {STATUSES.map(status => {
            const columnTasks = tasks.filter(t => t.status === status);
            return (
              <div key={status} className="kanban-column">
                <div className="kanban-header">
                  <span className="kanban-title">{STATUS_LABELS[status]}</span>
                  <span className="kanban-count">{columnTasks.length}</span>
                </div>
                {columnTasks.map(task => (
                  <div key={task._id} className="task-card" onClick={() => openEditTask(task)}>
                    <div className="flex items-center justify-between">
                      <span className="task-title" style={{fontSize:13}}>{task.title}</span>
                      <div className="flex gap-2">
                        <button className="btn-icon" style={{padding:4}} onClick={e => { e.stopPropagation(); openComments(task); }}><MessageSquare size={12} /></button>
                        {canDeleteTask(task) && <button className="btn-icon" style={{padding:4}} onClick={e => { e.stopPropagation(); handleDeleteTask(task._id); }}><Trash2 size={12} /></button>}
                      </div>
                    </div>
                    <div className="task-meta mt-2">
                      <span className={`badge badge-${task.priority}`}>{task.priority}</span>
                      {task.dueDate && (
                        <span className={`task-due ${isOverdue(task.dueDate) && task.status !== 'done' ? 'overdue' : ''}`}>
                          <Clock size={10} /> {formatDate(task.dueDate)}
                        </span>
                      )}
                    </div>
                    {task.assignee && (
                      <div className="flex items-center gap-2 mt-2">
                        <div className="task-assignee-avatar" style={{width:20,height:20,fontSize:8}}>{getInitials(task.assignee.name)}</div>
                        <span style={{fontSize:11,color:'var(--text-muted)'}}>{task.assignee.name}</span>
                      </div>
                    )}
                    <div className="flex gap-2 mt-2" style={{flexWrap:'wrap'}}>
                      {STATUSES.filter(s => s !== task.status).map(s => (
                        <button key={s} className="btn btn-secondary btn-sm" style={{fontSize:10,padding:'2px 6px'}} onClick={e => { e.stopPropagation(); handleStatusChange(task._id, s); }}>→ {STATUS_LABELS[s]}</button>
                      ))}
                    </div>
                  </div>
                ))}
                {columnTasks.length === 0 && <div style={{textAlign:'center',padding:20,color:'var(--text-muted)',fontSize:13}}>No tasks</div>}
              </div>
            );
          })}
        </div>
      )}

      {activeTab === 'activity' && (
        <div className="card">
          <h3 className="section-title"><Activity size={16} /> Recent Activity</h3>
          {activities.length > 0 ? (
            <div className="activity-list">
              {activities.map(a => (
                <div key={a._id} className="activity-item">
                  <div className="task-assignee-avatar" style={{width:28,height:28,fontSize:10,flexShrink:0}}>{getInitials(a.user?.name)}</div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:13}}><strong>{a.user?.name}</strong> <span style={{color:'var(--text-muted)'}}>{a.action.replace(/_/g, ' ')}</span></div>
                    {a.targetName && <div style={{fontSize:12,color:'var(--text-secondary)'}}>{a.targetName}</div>}
                    {a.details && <div style={{fontSize:11,color:'var(--text-muted)'}}>{a.details}</div>}
                  </div>
                  <span style={{fontSize:11,color:'var(--text-muted)',flexShrink:0}}>{formatDateTime(a.createdAt)}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state"><p>No activity yet</p></div>
          )}
        </div>
      )}

      {/* Task Modal */}
      {showTaskModal && (
        <div className="modal-overlay" onClick={() => setShowTaskModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">{editingTask ? 'Edit Task' : 'New Task'}</h2>
              <button className="btn-icon" onClick={() => setShowTaskModal(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleTaskSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Title</label>
                  <input className="form-input" value={taskForm.title} onChange={e => setTaskForm({...taskForm, title: e.target.value})} required placeholder="Task title" />
                </div>
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea className="form-textarea" value={taskForm.description} onChange={e => setTaskForm({...taskForm, description: e.target.value})} placeholder="Details..." />
                </div>
                <div className="form-group">
                  <label className="form-label">Assignee</label>
                  <select className="form-select" value={taskForm.assignee} onChange={e => setTaskForm({...taskForm, assignee: e.target.value})}>
                    <option value="">Unassigned</option>
                    {project.members?.map(m => <option key={m.user?._id} value={m.user?._id}>{m.user?.name}</option>)}
                  </select>
                </div>
                <div className="flex gap-3">
                  <div className="form-group" style={{flex:1}}>
                    <label className="form-label">Priority</label>
                    <select className="form-select" value={taskForm.priority} onChange={e => setTaskForm({...taskForm, priority: e.target.value})}>
                      <option value="low">Low</option><option value="medium">Medium</option>
                      <option value="high">High</option><option value="critical">Critical</option>
                    </select>
                  </div>
                  <div className="form-group" style={{flex:1}}>
                    <label className="form-label">Status</label>
                    <select className="form-select" value={taskForm.status} onChange={e => setTaskForm({...taskForm, status: e.target.value})}>
                      {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Due Date</label>
                  <input className="form-input" type="date" value={taskForm.dueDate} onChange={e => setTaskForm({...taskForm, dueDate: e.target.value})} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowTaskModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editingTask ? 'Update' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Member Modal */}
      {showMemberModal && (
        <div className="modal-overlay" onClick={() => setShowMemberModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Manage Members</h2>
              <button className="btn-icon" onClick={() => setShowMemberModal(false)}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <h3 style={{fontSize:14,fontWeight:600,marginBottom:12}}>Current Members</h3>
              {project.members?.map((m, i) => (
                <div key={i} className="flex items-center justify-between" style={{padding:'8px 0',borderBottom:'1px solid var(--border)'}}>
                  <div className="flex items-center gap-2">
                    <div className="task-assignee-avatar">{getInitials(m.user?.name)}</div>
                    <span style={{fontSize:13}}>{m.user?.name}</span>
                    <span className={`badge badge-${m.role}`}>{m.role}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {m.user?._id !== project.owner?._id && isAdmin && (
                      <>
                        <select className="form-select" value={m.role} onChange={e => handleRoleChange(m.user?._id, e.target.value)} style={{width:100,padding:'3px 24px 3px 8px',fontSize:11}}>
                          <option value="member">Member</option>
                          <option value="admin">Admin</option>
                        </select>
                        <button className="btn btn-danger btn-sm" onClick={() => handleRemoveMember(m.user?._id)}>Remove</button>
                      </>
                    )}
                    {m.user?._id === project.owner?._id && <span style={{fontSize:11,color:'var(--text-muted)'}}>Owner</span>}
                  </div>
                </div>
              ))}
              {nonMembers.length > 0 && (
                <>
                  <h3 style={{fontSize:14,fontWeight:600,marginTop:20,marginBottom:12}}>Add Members</h3>
                  {nonMembers.map(u => (
                    <div key={u._id} className="flex items-center justify-between" style={{padding:'8px 0',borderBottom:'1px solid var(--border)'}}>
                      <div className="flex items-center gap-2">
                        <div className="task-assignee-avatar">{getInitials(u.name)}</div>
                        <span style={{fontSize:13}}>{u.name}</span>
                        <span className={`badge badge-${u.role}`}>{u.role}</span>
                      </div>
                      <button className="btn btn-primary btn-sm" onClick={() => handleAddMember(u._id)}>Add</button>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Comment Modal */}
      {showCommentModal && (
        <div className="modal-overlay" onClick={() => setShowCommentModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title"><MessageSquare size={16} style={{marginRight:6}} />{showCommentModal.title}</h2>
              <button className="btn-icon" onClick={() => setShowCommentModal(null)}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <div className="comment-input-row">
                <input className="form-input" value={commentText} onChange={e => setCommentText(e.target.value)} placeholder="Write a comment..." onKeyDown={e => e.key === 'Enter' && handleAddComment()} style={{flex:1}} />
                <button className="btn btn-primary btn-sm" onClick={handleAddComment}><Send size={14} /></button>
              </div>
              <div className="comment-list">
                {comments.length > 0 ? comments.map(c => (
                  <div key={c._id} className="comment-item">
                    <div className="task-assignee-avatar" style={{width:28,height:28,fontSize:10,flexShrink:0}}>{getInitials(c.author?.name)}</div>
                    <div style={{flex:1,minWidth:0}}>
                      <div className="flex items-center justify-between">
                        <span style={{fontSize:12,fontWeight:600}}>{c.author?.name}</span>
                        <span style={{fontSize:10,color:'var(--text-muted)'}}>{formatDateTime(c.createdAt)}</span>
                      </div>
                      <p style={{fontSize:13,color:'var(--text-secondary)',marginTop:2}}>{c.text}</p>
                    </div>
                    {(c.author?._id === user?._id || user?.role === 'admin') && (
                      <button className="btn-icon" style={{padding:4}} onClick={() => handleDeleteComment(c._id)}><Trash2 size={10} /></button>
                    )}
                  </div>
                )) : (
                  <div style={{textAlign:'center',padding:20,color:'var(--text-muted)',fontSize:13}}>No comments yet</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
