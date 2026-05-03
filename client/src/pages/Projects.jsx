import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { Plus, X } from 'lucide-react';

const COLORS = ['#6366f1','#8b5cf6','#ec4899','#f43f5e','#f97316','#eab308','#22c55e','#14b8a6','#06b6d4','#3b82f6'];

export default function Projects() {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', color: '#6366f1' });
  const navigate = useNavigate();

  const fetchProjects = () => {
    api.get('/projects').then(res => setProjects(res.data.projects)).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => { fetchProjects(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await api.post('/projects', form);
      toast.success('Project created!');
      setShowModal(false);
      setForm({ name: '', description: '', color: '#6366f1' });
      fetchProjects();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create project');
    }
  };

  const getInitials = (name) => name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';

  if (loading) return <div className="loading"><div className="spinner" /></div>;

  return (
    <div>
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title">Projects</h1>
          <p className="page-subtitle">{projects.length} project{projects.length !== 1 ? 's' : ''}</p>
        </div>
        {user?.role === 'admin' && (
          <button id="create-project-btn" className="btn btn-primary" onClick={() => setShowModal(true)}><Plus size={16} /> New Project</button>
        )}
      </div>

      {projects.length > 0 ? (
        <div className="projects-grid">
          {projects.map(project => (
            <div key={project._id} className="project-card" onClick={() => navigate(`/projects/${project._id}`)}>
              <div className="project-card-accent" style={{background: project.color}} />
              <h3 className="project-card-title">{project.name}</h3>
              <p className="project-card-desc">{project.description || 'No description'}</p>
              <div className="project-members">
                {project.members?.slice(0, 5).map((m, i) => (
                  <div key={i} className="project-member-avatar" title={m.user?.name}>{getInitials(m.user?.name)}</div>
                ))}
                {project.members?.length > 5 && <div className="project-member-avatar">+{project.members.length - 5}</div>}
              </div>
              <div className="project-stats">
                <span className="project-stat"><strong>{project.taskCount || 0}</strong> tasks</span>
                <span className="project-stat"><strong>{project.members?.length || 0}</strong> members</span>
                <span className={`badge badge-${project.status === 'active' ? 'in-progress' : project.status === 'completed' ? 'done' : 'todo'}`}>{project.status}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <h3>No projects yet</h3>
          <p>{user?.role === 'admin' ? 'Create your first project to get started' : 'Ask an admin to add you to a project'}</p>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">New Project</h2>
              <button className="btn-icon" onClick={() => setShowModal(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Project Name</label>
                  <input id="project-name" className="form-input" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required placeholder="My Awesome Project" />
                </div>
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea id="project-desc" className="form-textarea" value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="What's this project about?" />
                </div>
                <div className="form-group">
                  <label className="form-label">Color</label>
                  <div className="flex gap-2" style={{flexWrap:'wrap'}}>
                    {COLORS.map(c => (
                      <div key={c} onClick={() => setForm({...form, color: c})} style={{width:32,height:32,borderRadius:8,background:c,cursor:'pointer',border: form.color === c ? '2px solid #fff' : '2px solid transparent',transition:'all 0.2s'}} />
                    ))}
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button id="project-submit" type="submit" className="btn btn-primary">Create Project</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
