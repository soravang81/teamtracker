import { useState, useEffect } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { Search, Filter, Clock, X } from 'lucide-react';

const STATUS_LABELS = { todo: 'To Do', 'in-progress': 'In Progress', review: 'Review', done: 'Done' };

export default function Tasks() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ status: '', priority: '', search: '' });
  const [editingTask, setEditingTask] = useState(null);

  const fetchTasks = () => {
    const params = new URLSearchParams();
    if (filters.status) params.append('status', filters.status);
    if (filters.priority) params.append('priority', filters.priority);
    if (filters.search) params.append('search', filters.search);
    api.get(`/tasks?${params}`).then(res => setTasks(res.data.tasks)).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => { fetchTasks(); }, [filters.status, filters.priority]);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchTasks();
  };

  const handleStatusChange = async (taskId, status) => {
    try {
      await api.put(`/tasks/${taskId}`, { status });
      toast.success('Status updated');
      fetchTasks();
    } catch { toast.error('Failed'); }
  };

  const getInitials = (name) => name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';
  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
  const isOverdue = (d) => d && new Date(d) < new Date();

  if (loading) return <div className="loading"><div className="spinner" /></div>;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">All Tasks</h1>
        <p className="page-subtitle">{tasks.length} task{tasks.length !== 1 ? 's' : ''} across all projects</p>
      </div>

      {/* Filters */}
      <div className="card mb-4">
        <div className="flex items-center gap-3" style={{flexWrap:'wrap'}}>
          <form onSubmit={handleSearch} className="flex gap-2" style={{flex:1,minWidth:200}}>
            <input className="form-input" placeholder="Search tasks..." value={filters.search} onChange={e => setFilters({...filters, search: e.target.value})} style={{maxWidth:300}} />
            <button type="submit" className="btn btn-secondary"><Search size={14} /></button>
          </form>
          <select className="form-select" value={filters.status} onChange={e => setFilters({...filters, status: e.target.value})} style={{width:160}}>
            <option value="">All Statuses</option>
            <option value="todo">To Do</option>
            <option value="in-progress">In Progress</option>
            <option value="review">Review</option>
            <option value="done">Done</option>
          </select>
          <select className="form-select" value={filters.priority} onChange={e => setFilters({...filters, priority: e.target.value})} style={{width:160}}>
            <option value="">All Priorities</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
          {(filters.status || filters.priority || filters.search) && (
            <button className="btn btn-secondary btn-sm" onClick={() => setFilters({status:'',priority:'',search:''})}><X size={12} /> Clear</button>
          )}
        </div>
      </div>

      {/* Task Table */}
      <div className="card">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Task</th>
                <th>Project</th>
                <th>Status</th>
                <th>Priority</th>
                <th>Assignee</th>
                <th>Due Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map(task => (
                <tr key={task._id}>
                  <td>
                    <div className="task-title" style={{fontSize:13}}>{task.title}</div>
                    {task.description && <div style={{fontSize:11,color:'var(--text-muted)',marginTop:2}}>{task.description.slice(0, 60)}{task.description.length > 60 ? '...' : ''}</div>}
                  </td>
                  <td>
                    {task.project && (
                      <div className="task-project">
                        <span className="task-project-dot" style={{background: task.project.color}} />
                        {task.project.name}
                      </div>
                    )}
                  </td>
                  <td>
                    <select className="form-select" value={task.status} onChange={e => handleStatusChange(task._id, e.target.value)} style={{width:130,padding:'4px 28px 4px 8px',fontSize:12}}>
                      {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </td>
                  <td><span className={`badge badge-${task.priority}`}>{task.priority}</span></td>
                  <td>
                    {task.assignee ? (
                      <div className="flex items-center gap-2">
                        <div className="task-assignee-avatar">{getInitials(task.assignee.name)}</div>
                        <span style={{fontSize:12}}>{task.assignee.name}</span>
                      </div>
                    ) : <span style={{fontSize:12,color:'var(--text-muted)'}}>Unassigned</span>}
                  </td>
                  <td>
                    <span className={`task-due ${isOverdue(task.dueDate) && task.status !== 'done' ? 'overdue' : ''}`}>
                      {task.dueDate && <Clock size={12} />}
                      {formatDate(task.dueDate)}
                    </span>
                  </td>
                  <td>
                    <a href={`/projects/${task.project?._id}`} className="btn btn-secondary btn-sm" style={{fontSize:11}}>View</a>
                  </td>
                </tr>
              ))}
              {tasks.length === 0 && (
                <tr><td colSpan={7} style={{textAlign:'center',padding:40,color:'var(--text-muted)'}}>No tasks found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
