import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import type { Project, Task, ProjectLog, DeveloperLog } from '../types';

const today = new Date().toISOString().split('T')[0];

function daysOverdue(end: string): number {
  const diff = new Date(today).getTime() - new Date(end).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

export default function Dashboard() {
  const [flaggedProjectLogs, setFlaggedProjectLogs] = useState<ProjectLog[]>([]);
  const [flaggedDevLogs, setFlaggedDevLogs] = useState<DeveloperLog[]>([]);
  const [overdueProjects, setOverdueProjects] = useState<Project[]>([]);
  const [openActions, setOpenActions] = useState<Task[]>([]);

  useEffect(() => {
    async function load() {
      const [
        { data: projLogs },
        { data: devLogs },
        { data: projects },
        { data: tasks },
      ] = await Promise.all([
        supabase.from('project_logs')
          .select('*, project:projects(id, name)')
          .eq('flagged', true)
          .order('log_date', { ascending: false })
          .limit(20),
        supabase.from('developer_logs')
          .select('*, developer:developers(id, name)')
          .eq('flagged', true)
          .order('log_date', { ascending: false })
          .limit(20),
        supabase.from('projects')
          .select('*')
          .eq('archived', false)
          .lt('end_date', today)
          .order('end_date'),
        supabase.from('tasks')
          .select('*, project:projects(id, name), developer:developers(id, name)')
          .eq('archived', false)
          .neq('status', 'done')
          .order('due_date', { ascending: true, nullsFirst: false })
          .order('created_at')
          .limit(30),
      ]);
      setFlaggedProjectLogs(projLogs ?? []);
      setFlaggedDevLogs(devLogs ?? []);
      setOverdueProjects(projects ?? []);
      setOpenActions(tasks ?? []);
    }
    load();
  }, []);

  const totalFlagged = flaggedProjectLogs.length + flaggedDevLogs.length;

  return (
    <div>
      <div className="page-header">
        <h1>Dashboard</h1>
        <div className="dash-stats">
          <span className="dash-stat">
            <strong>{totalFlagged}</strong> flagged
          </span>
          <span className="dash-stat">
            <strong>{overdueProjects.length}</strong> overdue
          </span>
          <span className="dash-stat">
            <strong>{openActions.length}</strong> open actions
          </span>
        </div>
      </div>

      <div className="dash-grid">
        <section className="section dash-section">
          <div className="section-header">
            <h2>Flagged</h2>
          </div>
          {totalFlagged === 0 && <div className="empty">Nothing flagged</div>}
          <div className="log-list">
            {flaggedProjectLogs.map(l => (
              <div key={l.id} className="log-entry flagged">
                <div className="log-meta" style={{ cursor: 'default' }}>
                  <span className="log-date">{l.log_date}</span>
                  <span className="flag-badge">⚑</span>
                  {l.project && (
                    <Link to={`/projects/${l.project.id}`} className="dash-source">{l.project.name}</Link>
                  )}
                </div>
                <div className="log-notes">{l.notes}</div>
              </div>
            ))}
            {flaggedDevLogs.map(l => (
              <div key={l.id} className="log-entry flagged">
                <div className="log-meta" style={{ cursor: 'default' }}>
                  <span className="log-date">{l.log_date}</span>
                  <span className="flag-badge">⚑</span>
                  {l.developer && (
                    <Link to={`/people/${l.developer.id}`} className="dash-source">{l.developer.name}</Link>
                  )}
                </div>
                <div className="log-notes">{l.notes}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="section dash-section">
          <div className="section-header">
            <h2>Overdue Projects</h2>
          </div>
          {overdueProjects.length === 0 && <div className="empty">No overdue projects</div>}
          <div className="log-list">
            {overdueProjects.map(p => (
              <div key={p.id} className="log-entry">
                <div className="log-meta" style={{ cursor: 'default' }}>
                  <Link to={`/projects/${p.id}`} style={{ fontWeight: 600, fontSize: 13, color: '#111', textDecoration: 'none' }}>{p.name}</Link>
                  <span className="badge" style={{ marginLeft: 'auto' }}>{p.state}</span>
                </div>
                <div style={{ fontSize: 12, color: '#999' }}>
                  Due {p.end_date} · <strong style={{ color: '#111' }}>{daysOverdue(p.end_date!)} days overdue</strong>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="section dash-section">
          <div className="section-header">
            <h2>Open Actions</h2>
          </div>
          {openActions.length === 0 && <div className="empty">No open actions</div>}
          <table className="table">
            <thead>
              <tr><th>Action</th><th>Project</th><th>Assignee</th><th>Due</th><th>Status</th></tr>
            </thead>
            <tbody>
              {openActions.map(a => (
                <tr key={a.id}>
                  <td>{a.title}</td>
                  <td>
                    {a.project
                      ? <Link to={`/projects/${a.project.id}`}>{a.project.name}</Link>
                      : <span className="sub">—</span>}
                  </td>
                  <td className="sub">{a.developer?.name ?? '—'}</td>
                  <td className={a.due_date && a.due_date < today ? 'overdue-text' : 'sub'}>
                    {a.due_date ?? '—'}
                  </td>
                  <td><span className="badge">{a.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </div>
  );
}
