import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import type { Project, ProjectState } from '../types';

const STATES: ProjectState[] = ['pre-production', 'production', 'post-production'];

export default function Projects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', state: 'pre-production' as ProjectState, start_date: '', end_date: '' });

  async function load() {
    const { data } = await supabase.from('projects').select('*').eq('archived', showArchived).order('created_at', { ascending: false });
    setProjects(data ?? []);
  }

  useEffect(() => { load(); }, [showArchived]);

  async function addProject() {
    if (!form.name.trim()) return;
    await supabase.from('projects').insert({ ...form, start_date: form.start_date || null, end_date: form.end_date || null });
    setForm({ name: '', description: '', state: 'pre-production', start_date: '', end_date: '' });
    setShowForm(false);
    load();
  }

  async function archiveProject(id: string) {
    await supabase.from('projects').update({ archived: true }).eq('id', id);
    load();
  }

  async function deleteProject(id: string) {
    if (!confirm('Delete this project permanently?')) return;
    await supabase.from('projects').delete().eq('id', id);
    load();
  }

  return (
    <div>
      <div className="page-header">
        <h1>Projects</h1>
        <div className="header-actions">
          <button className="btn-ghost" onClick={() => setShowArchived(a => !a)}>
            {showArchived ? 'Active' : 'Archived'}
          </button>
          <button className="btn" onClick={() => setShowForm(s => !s)}>+ New Project</button>
        </div>
      </div>

      {showForm && (
        <div className="form-card">
          <input placeholder="Project name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          <input placeholder="Description" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          <select value={form.state} onChange={e => setForm(f => ({ ...f, state: e.target.value as ProjectState }))}>
            {STATES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <input type="date" placeholder="Start date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} />
          <input type="date" placeholder="End date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} />
          <div className="form-actions">
            <button className="btn" onClick={addProject}>Save</button>
            <button className="btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
          </div>
        </div>
      )}

      <table className="table">
        <thead>
          <tr>
            <th>Name</th>
            <th>State</th>
            <th>Start</th>
            <th>End</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {projects.map(p => (
            <tr key={p.id}>
              <td><Link to={`/projects/${p.id}`}>{p.name}</Link></td>
              <td><span className="badge">{p.state}</span></td>
              <td>{p.start_date ?? '—'}</td>
              <td>{p.end_date ?? '—'}</td>
              <td className="row-actions">
                {!p.archived && <button className="btn-ghost sm" onClick={() => archiveProject(p.id)}>Archive</button>}
                <button className="btn-danger sm" onClick={() => deleteProject(p.id)}>Delete</button>
              </td>
            </tr>
          ))}
          {projects.length === 0 && <tr><td colSpan={5} className="empty">No projects found</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
