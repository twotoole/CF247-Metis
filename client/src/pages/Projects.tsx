import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import ConfirmModal from '../components/ConfirmModal';
import type { Project, ProjectState } from '../types';

const STATES: ProjectState[] = ['pre-production', 'production', 'post-production'];

function getProgress(start: string | null, end: string | null): number | null {
  if (!start || !end) return null;
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  const now = Date.now();
  if (e <= s) return null;
  return Math.min(100, Math.max(0, Math.round((now - s) / (e - s) * 100)));
}

export default function Projects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [flaggedIds, setFlaggedIds] = useState<Set<string>>(new Set());
  const [showForm, setShowForm] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', state: 'pre-production' as ProjectState, start_date: '', end_date: '' });
  const [confirm, setConfirm] = useState<{ message: string; onConfirm: () => void } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: '', description: '', state: 'pre-production' as ProjectState, start_date: '', end_date: '' });

  async function load() {
    const [{ data }, { data: flaggedLogs }] = await Promise.all([
      supabase.from('projects').select('*').eq('archived', showArchived).order('created_at', { ascending: false }),
      supabase.from('project_logs').select('project_id').eq('flagged', true),
    ]);
    setProjects(data ?? []);
    setFlaggedIds(new Set((flaggedLogs ?? []).map((l: { project_id: string }) => l.project_id)));
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

  function deleteProject(id: string) {
    setConfirm({ message: 'Delete this project permanently?', onConfirm: async () => {
      await supabase.from('projects').delete().eq('id', id);
      setConfirm(null);
      load();
    }});
  }

  function startEdit(p: Project) {
    setEditingId(p.id);
    setEditForm({ name: p.name, description: p.description ?? '', state: p.state, start_date: p.start_date ?? '', end_date: p.end_date ?? '' });
  }

  async function saveEdit() {
    if (!editingId) return;
    await supabase.from('projects').update({
      name: editForm.name,
      description: editForm.description || null,
      state: editForm.state,
      start_date: editForm.start_date || null,
      end_date: editForm.end_date || null,
    }).eq('id', editingId);
    setEditingId(null);
    load();
  }

  return (
    <div>
      {confirm && <ConfirmModal message={confirm.message} onConfirm={confirm.onConfirm} onCancel={() => setConfirm(null)} />}
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
          <tr><th>Name</th><th>State</th><th>Progress</th><th></th></tr>
        </thead>
        <tbody>
          {projects.flatMap(p => {
            const pct = getProgress(p.start_date, p.end_date);
            const isEditing = editingId === p.id;
            return [
              <tr key={p.id}>
                <td>
                  {flaggedIds.has(p.id) && <span className="row-flag">⚑</span>}
                  <Link to={`/projects/${p.id}`}>{p.name}</Link>
                </td>
                <td><span className="badge">{p.state}</span></td>
                <td>
                  {pct !== null ? (
                    <div className="progress-wrap">
                      <div className="progress-bar" style={{ width: `${pct}%` }} />
                      <span className="progress-label">{pct}%</span>
                    </div>
                  ) : '—'}
                </td>
                <td className="row-actions">
                  <button className="btn-ghost sm" onClick={() => isEditing ? setEditingId(null) : startEdit(p)}>
                    {isEditing ? 'Cancel' : 'Edit'}
                  </button>
                  {!p.archived && <button className="btn-ghost sm" onClick={() => archiveProject(p.id)}>Archive</button>}
                  <button className="btn-danger sm" onClick={() => deleteProject(p.id)}>Delete</button>
                </td>
              </tr>,
              ...(isEditing ? [
                <tr key={`${p.id}-edit`}>
                  <td colSpan={4}>
                    <div className="inline-edit-form">
                      <input placeholder="Name" value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} />
                      <input placeholder="Description" value={editForm.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} />
                      <select value={editForm.state} onChange={e => setEditForm(f => ({ ...f, state: e.target.value as ProjectState }))}>
                        {STATES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                      <input type="date" value={editForm.start_date} onChange={e => setEditForm(f => ({ ...f, start_date: e.target.value }))} />
                      <input type="date" value={editForm.end_date} onChange={e => setEditForm(f => ({ ...f, end_date: e.target.value }))} />
                      <div className="form-actions">
                        <button className="btn" onClick={saveEdit}>Save</button>
                        <button className="btn-ghost" onClick={() => setEditingId(null)}>Cancel</button>
                      </div>
                    </div>
                  </td>
                </tr>,
              ] : []),
            ];
          })}
          {projects.length === 0 && <tr><td colSpan={4} className="empty">No projects found</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
