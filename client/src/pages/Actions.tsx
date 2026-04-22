import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import type { Task, TaskStatus, Project, Developer } from '../types';

const TASK_STATUSES: TaskStatus[] = ['todo', 'in-progress', 'done'];

export default function Actions() {
  const [actions, setActions] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [developers, setDevelopers] = useState<Developer[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', project_id: '', developer_id: '', status: 'todo' as TaskStatus });

  async function load() {
    const [{ data: taskData }, { data: projectData }, { data: devData }] = await Promise.all([
      supabase.from('tasks').select('*, project:projects(id, name), developer:developers(id, name)').eq('archived', false).order('created_at', { ascending: false }),
      supabase.from('projects').select('*').eq('archived', false).order('name'),
      supabase.from('developers').select('*').eq('archived', false).order('name'),
    ]);
    setActions(taskData ?? []);
    setProjects(projectData ?? []);
    setDevelopers(devData ?? []);
  }

  useEffect(() => { load(); }, []);

  async function addAction() {
    if (!form.title.trim()) return;
    await supabase.from('tasks').insert({
      title: form.title,
      description: form.description || null,
      project_id: form.project_id || null,
      developer_id: form.developer_id || null,
      status: form.status,
    });
    setForm({ title: '', description: '', project_id: '', developer_id: '', status: 'todo' });
    setShowForm(false);
    load();
  }

  async function updateStatus(id: string, status: TaskStatus) {
    await supabase.from('tasks').update({ status }).eq('id', id);
    load();
  }

  return (
    <div>
      <div className="page-header">
        <h1>Actions</h1>
        <button className="btn" onClick={() => setShowForm(s => !s)}>+ New Action</button>
      </div>

      {showForm && (
        <div className="form-card">
          <input placeholder="Action title" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
          <input placeholder="Description" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          <select value={form.project_id} onChange={e => setForm(f => ({ ...f, project_id: e.target.value }))}>
            <option value="">No project</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <select value={form.developer_id} onChange={e => setForm(f => ({ ...f, developer_id: e.target.value }))}>
            <option value="">Unassigned</option>
            {developers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as TaskStatus }))}>
            {TASK_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <div className="form-actions">
            <button className="btn" onClick={addAction}>Save</button>
            <button className="btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
          </div>
        </div>
      )}

      <table className="table">
        <thead>
          <tr><th>Action</th><th>Project</th><th>Assignee</th><th>Status</th><th>Added</th></tr>
        </thead>
        <tbody>
          {actions.map(a => (
            <tr key={a.id}>
              <td>
                {a.title}
                {a.description && <span className="sub"> — {a.description}</span>}
              </td>
              <td>
                {a.project
                  ? <Link to={`/projects/${a.project.id}`}>{a.project.name}</Link>
                  : '—'}
              </td>
              <td>{a.developer?.name ?? '—'}</td>
              <td>
                <select value={a.status} onChange={e => updateStatus(a.id, e.target.value as TaskStatus)}>
                  {TASK_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </td>
              <td className="sub">{a.created_at.split('T')[0]}</td>
            </tr>
          ))}
          {actions.length === 0 && <tr><td colSpan={5} className="empty">No actions</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
