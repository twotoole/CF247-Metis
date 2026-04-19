import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import type { Developer, DeveloperLog, Project } from '../types';

type Tab = 'log' | 'projects';

export default function PersonDetail() {
  const { id } = useParams<{ id: string }>();
  const [person, setPerson] = useState<Developer | null>(null);
  const [logs, setLogs] = useState<DeveloperLog[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tab, setTab] = useState<Tab>('log');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ notes: '', flagged: false, log_date: new Date().toISOString().split('T')[0] });

  async function load() {
    const [{ data: dev }, { data: logData }, { data: taskData }] = await Promise.all([
      supabase.from('developers').select('*').eq('id', id).single(),
      supabase.from('developer_logs').select('*').eq('developer_id', id).order('log_date', { ascending: false }),
      supabase.from('tasks').select('project:projects(*)').eq('developer_id', id).eq('archived', false),
    ]);
    setPerson(dev);
    setLogs(logData ?? []);
    const seen = new Set<string>();
    const linked: Project[] = [];
    for (const t of (taskData ?? []) as { project: Project | null }[]) {
      if (t.project && !seen.has(t.project.id)) {
        seen.add(t.project.id);
        linked.push(t.project);
      }
    }
    setProjects(linked);
  }

  useEffect(() => { load(); }, [id]);

  async function addLog() {
    if (!form.notes.trim()) return;
    await supabase.from('developer_logs').insert({ ...form, developer_id: id });
    setForm({ notes: '', flagged: false, log_date: new Date().toISOString().split('T')[0] });
    setShowForm(false);
    load();
  }

  async function toggleFlag(logId: string, flagged: boolean) {
    await supabase.from('developer_logs').update({ flagged: !flagged }).eq('id', logId);
    load();
  }

  async function deleteLog(logId: string) {
    await supabase.from('developer_logs').delete().eq('id', logId);
    load();
  }

  if (!person) return <div className="empty">Loading...</div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <Link to="/developers" className="back-link">← People</Link>
          <h1>{person.name}</h1>
          {person.role && <p className="subtitle">{person.role}</p>}
        </div>
      </div>

      <div className="tabs">
        <button className={`tab ${tab === 'log' ? 'active' : ''}`} onClick={() => setTab('log')}>Daily Log</button>
        <button className={`tab ${tab === 'projects' ? 'active' : ''}`} onClick={() => setTab('projects')}>Projects</button>
      </div>

      {tab === 'log' && (
        <section className="section">
          <div className="section-header">
            <h2>Daily Log</h2>
            <button className="btn" onClick={() => setShowForm(s => !s)}>+ Add Entry</button>
          </div>

          {showForm && (
            <div className="form-card">
              <input type="date" value={form.log_date} onChange={e => setForm(f => ({ ...f, log_date: e.target.value }))} />
              <textarea placeholder="Notes" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
              <label className="checkbox-label">
                <input type="checkbox" checked={form.flagged} onChange={e => setForm(f => ({ ...f, flagged: e.target.checked }))} />
                Flag this entry
              </label>
              <div className="form-actions">
                <button className="btn" onClick={addLog}>Save</button>
                <button className="btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
              </div>
            </div>
          )}

          <div className="log-list">
            {logs.map(l => (
              <div key={l.id} className={`log-entry ${l.flagged ? 'flagged' : ''}`}>
                <div className="log-meta">
                  <span className="log-date">{l.log_date}</span>
                  {l.flagged && <span className="flag-badge">⚑ Flagged</span>}
                  <button className="btn-ghost sm" onClick={() => toggleFlag(l.id, l.flagged)}>
                    {l.flagged ? 'Unflag' : 'Flag'}
                  </button>
                  <button className="log-delete" onClick={() => deleteLog(l.id)} title="Delete">×</button>
                </div>
                <div className="log-notes">{l.notes}</div>
              </div>
            ))}
            {logs.length === 0 && <div className="empty">No log entries</div>}
          </div>
        </section>
      )}

      {tab === 'projects' && (
        <section className="section">
          <div className="section-header">
            <h2>Projects</h2>
          </div>
          <table className="table">
            <thead>
              <tr><th>Name</th><th>State</th><th>Start</th><th>End</th></tr>
            </thead>
            <tbody>
              {projects.map(p => (
                <tr key={p.id}>
                  <td><Link to={`/projects/${p.id}`}>{p.name}</Link></td>
                  <td><span className="badge">{p.state}</span></td>
                  <td>{p.start_date ?? '—'}</td>
                  <td>{p.end_date ?? '—'}</td>
                </tr>
              ))}
              {projects.length === 0 && <tr><td colSpan={4} className="empty">No projects assigned</td></tr>}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}
