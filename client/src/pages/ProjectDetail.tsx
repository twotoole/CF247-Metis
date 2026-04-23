import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import ConfirmModal from '../components/ConfirmModal';
import type { Project, Task, ProjectLog, Developer, Risk, ProjectState, TaskStatus, Severity } from '../types';

const STATES: ProjectState[] = ['pre-production', 'production', 'post-production'];
const TASK_STATUSES: TaskStatus[] = ['todo', 'in-progress', 'done'];
const SEVERITIES: Severity[] = ['low', 'medium', 'high'];

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [logs, setLogs] = useState<ProjectLog[]>([]);
  const [risks, setRisks] = useState<Risk[]>([]);
  const [developers, setDevelopers] = useState<Developer[]>([]);
  const [taskForm, setTaskForm] = useState({ title: '', description: '', developer_id: '', status: 'todo' as TaskStatus, due_date: '' });
  const [logForm, setLogForm] = useState({ notes: '', log_date: new Date().toISOString().split('T')[0], flagged: false });
  const [riskForm, setRiskForm] = useState({ description: '', severity: 'medium' as Severity });
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [showLogForm, setShowLogForm] = useState(false);
  const [showRiskForm, setShowRiskForm] = useState(false);
  const [editingState, setEditingState] = useState(false);
  const [editingProject, setEditingProject] = useState(false);
  const [projectEditForm, setProjectEditForm] = useState({ name: '', description: '', start_date: '', end_date: '' });
  const [editingLogId, setEditingLogId] = useState<string | null>(null);
  const [logEditForm, setLogEditForm] = useState({ notes: '', log_date: '', flagged: false });
  const [editingRiskId, setEditingRiskId] = useState<string | null>(null);
  const [riskEditForm, setRiskEditForm] = useState({ description: '', severity: 'medium' as Severity });
  const [confirm, setConfirm] = useState<{ message: string; onConfirm: () => void } | null>(null);
  const [expandedLogIds, setExpandedLogIds] = useState<Set<string>>(new Set());
  function toggleLog(id: string) {
    setExpandedLogIds(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  async function load() {
    const [{ data: proj }, { data: taskData }, { data: logData }, { data: devData }, { data: riskData }] = await Promise.all([
      supabase.from('projects').select('*').eq('id', id).single(),
      supabase.from('tasks').select('*, developer:developers(id,name)').eq('project_id', id).eq('archived', false).order('created_at'),
      supabase.from('project_logs').select('*').eq('project_id', id).order('log_date', { ascending: false }),
      supabase.from('developers').select('*').eq('archived', false).order('name'),
      supabase.from('risks').select('*').eq('project_id', id).order('created_at'),
    ]);
    setProject(proj);
    setTasks(taskData ?? []);
    setLogs(logData ?? []);
    setDevelopers(devData ?? []);
    setRisks(riskData ?? []);
  }

  useEffect(() => { load(); }, [id]);

  function startEditProject() {
    if (!project) return;
    setProjectEditForm({ name: project.name, description: project.description ?? '', start_date: project.start_date ?? '', end_date: project.end_date ?? '' });
    setEditingProject(true);
    setEditingState(false);
  }

  async function saveProjectEdit() {
    await supabase.from('projects').update({ name: projectEditForm.name, description: projectEditForm.description || null, start_date: projectEditForm.start_date || null, end_date: projectEditForm.end_date || null }).eq('id', id);
    setEditingProject(false);
    load();
  }

  async function addTask() {
    if (!taskForm.title.trim()) return;
    await supabase.from('tasks').insert({ ...taskForm, project_id: id, developer_id: taskForm.developer_id || null, due_date: taskForm.due_date || null });
    setTaskForm({ title: '', description: '', developer_id: '', status: 'todo', due_date: '' });
    setShowTaskForm(false);
    load();
  }

  async function addLog() {
    if (!logForm.notes.trim()) return;
    await supabase.from('project_logs').insert({ ...logForm, project_id: id });
    setLogForm({ notes: '', log_date: new Date().toISOString().split('T')[0], flagged: false });
    setShowLogForm(false);
    load();
  }

  async function saveLogEdit() {
    if (!editingLogId) return;
    await supabase.from('project_logs').update(logEditForm).eq('id', editingLogId);
    setEditingLogId(null);
    load();
  }

  async function addRisk() {
    if (!riskForm.description.trim()) return;
    await supabase.from('risks').insert({ ...riskForm, project_id: id });
    setRiskForm({ description: '', severity: 'medium' });
    setShowRiskForm(false);
    load();
  }

  async function saveRiskEdit() {
    if (!editingRiskId) return;
    await supabase.from('risks').update(riskEditForm).eq('id', editingRiskId);
    setEditingRiskId(null);
    load();
  }

  async function updateTaskStatus(taskId: string, status: TaskStatus) {
    await supabase.from('tasks').update({ status }).eq('id', taskId);
    load();
  }

  function deleteTask(taskId: string) {
    setConfirm({ message: 'Delete this action permanently?', onConfirm: async () => {
      await supabase.from('tasks').delete().eq('id', taskId);
      setConfirm(null); load();
    }});
  }

  function deleteLog(logId: string) {
    setConfirm({ message: 'Delete this log entry?', onConfirm: async () => {
      await supabase.from('project_logs').delete().eq('id', logId);
      setConfirm(null); load();
    }});
  }

  function deleteRisk(riskId: string) {
    setConfirm({ message: 'Delete this risk?', onConfirm: async () => {
      await supabase.from('risks').delete().eq('id', riskId);
      setConfirm(null); load();
    }});
  }

  async function updateState(state: ProjectState) {
    await supabase.from('projects').update({ state }).eq('id', id);
    setEditingState(false);
    load();
  }

  async function toggleLogFlag(logId: string, flagged: boolean) {
    await supabase.from('project_logs').update({ flagged: !flagged }).eq('id', logId);
    load();
  }

  if (!project) return <div className="empty">Loading...</div>;

  return (
    <div>
      {confirm && <ConfirmModal message={confirm.message} onConfirm={confirm.onConfirm} onCancel={() => setConfirm(null)} />}
      <div className="page-header">
        <div>
          <Link to="/projects" className="back-link">← Projects</Link>
          {editingProject ? (
            <div className="edit-fields">
              <input className="edit-title" value={projectEditForm.name} onChange={e => setProjectEditForm(f => ({ ...f, name: e.target.value }))} />
              <input className="edit-sub" placeholder="Description" value={projectEditForm.description} onChange={e => setProjectEditForm(f => ({ ...f, description: e.target.value }))} />
              <div className="edit-dates">
                <input type="date" value={projectEditForm.start_date} onChange={e => setProjectEditForm(f => ({ ...f, start_date: e.target.value }))} />
                <span>→</span>
                <input type="date" value={projectEditForm.end_date} onChange={e => setProjectEditForm(f => ({ ...f, end_date: e.target.value }))} />
              </div>
            </div>
          ) : (
            <>
              <h1>{project.name}</h1>
              {project.description && <p className="subtitle">{project.description}</p>}
              <div className="meta">
                {project.start_date && <span>{project.start_date}</span>}
                {project.end_date && <span> → {project.end_date}</span>}
              </div>
            </>
          )}
        </div>
        <div className="header-actions">
          {editingProject ? (
            <>
              <button className="btn" onClick={saveProjectEdit}>Save</button>
              <button className="btn-ghost" onClick={() => setEditingProject(false)}>Cancel</button>
            </>
          ) : (
            <>
              <button className="btn-ghost sm" onClick={startEditProject}>Edit</button>
              {editingState ? (
                <div className="inline-select">
                  {STATES.map(s => <button key={s} className={`btn-ghost sm ${project.state === s ? 'active' : ''}`} onClick={() => updateState(s)}>{s}</button>)}
                </div>
              ) : (
                <button className="badge clickable" onClick={() => setEditingState(true)}>{project.state}</button>
              )}
            </>
          )}
        </div>
      </div>

      <section className="section">
        <div className="section-header">
          <h2>Actions</h2>
          <button className="btn" onClick={() => setShowTaskForm(s => !s)}>+ Add Action</button>
        </div>
        {showTaskForm && (
          <div className="form-card">
            <input placeholder="Action title" value={taskForm.title} onChange={e => setTaskForm(f => ({ ...f, title: e.target.value }))} />
            <input placeholder="Description" value={taskForm.description} onChange={e => setTaskForm(f => ({ ...f, description: e.target.value }))} />
            <select value={taskForm.developer_id} onChange={e => setTaskForm(f => ({ ...f, developer_id: e.target.value }))}>
              <option value="">Unassigned</option>
              {developers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
            <input type="date" placeholder="Due date" value={taskForm.due_date} onChange={e => setTaskForm(f => ({ ...f, due_date: e.target.value }))} />
            <select value={taskForm.status} onChange={e => setTaskForm(f => ({ ...f, status: e.target.value as TaskStatus }))}>
              {TASK_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <div className="form-actions">
              <button className="btn" onClick={addTask}>Save</button>
              <button className="btn-ghost" onClick={() => setShowTaskForm(false)}>Cancel</button>
            </div>
          </div>
        )}
        <table className="table">
          <thead><tr><th>Title</th><th>Assignee</th><th>Due</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {tasks.map(t => (
              <tr key={t.id}>
                <td>{t.title}{t.description && <span className="sub"> — {t.description}</span>}</td>
                <td className="sub">{t.developer?.name ?? '—'}</td>
                <td className={t.due_date && t.due_date < new Date().toISOString().split('T')[0] ? 'overdue-text' : 'sub'}>
                  {t.due_date ?? '—'}
                </td>
                <td>
                  <select value={t.status} onChange={e => updateTaskStatus(t.id, e.target.value as TaskStatus)}>
                    {TASK_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </td>
                <td className="row-actions">
                  <button className="btn-danger sm" onClick={() => deleteTask(t.id)}>Delete</button>
                </td>
              </tr>
            ))}
            {tasks.length === 0 && <tr><td colSpan={5} className="empty">No actions</td></tr>}
          </tbody>
        </table>
      </section>

      <section className="section">
        <div className="section-header">
          <h2>Risks</h2>
          <button className="btn" onClick={() => setShowRiskForm(s => !s)}>+ Add Risk</button>
        </div>
        {showRiskForm && (
          <div className="form-card">
            <textarea placeholder="Describe the risk" value={riskForm.description} onChange={e => setRiskForm(f => ({ ...f, description: e.target.value }))} />
            <select value={riskForm.severity} onChange={e => setRiskForm(f => ({ ...f, severity: e.target.value as Severity }))}>
              {SEVERITIES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <div className="form-actions">
              <button className="btn" onClick={addRisk}>Save</button>
              <button className="btn-ghost" onClick={() => setShowRiskForm(false)}>Cancel</button>
            </div>
          </div>
        )}
        <div className="log-list">
          {risks.map(r => (
            <div key={r.id} className="log-entry">
              {editingRiskId === r.id ? (
                <div className="log-entry-edit">
                  <textarea value={riskEditForm.description} onChange={e => setRiskEditForm(f => ({ ...f, description: e.target.value }))} />
                  <select value={riskEditForm.severity} onChange={e => setRiskEditForm(f => ({ ...f, severity: e.target.value as Severity }))}>
                    {SEVERITIES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <div className="form-actions">
                    <button className="btn" onClick={saveRiskEdit}>Save</button>
                    <button className="btn-ghost" onClick={() => setEditingRiskId(null)}>Cancel</button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="log-meta">
                    <span className={`badge severity-${r.severity}`}>{r.severity}</span>
                    <button className="btn-ghost sm" onClick={() => { setEditingRiskId(r.id); setRiskEditForm({ description: r.description, severity: r.severity }); }}>Edit</button>
                    <button className="log-delete" onClick={() => deleteRisk(r.id)} title="Delete">×</button>
                  </div>
                  <div className="log-notes">{r.description}</div>
                </>
              )}
            </div>
          ))}
          {risks.length === 0 && <div className="empty">No risks logged</div>}
        </div>
      </section>

      <section className="section">
        <div className="section-header">
          <h2>Progress Log</h2>
          <button className="btn" onClick={() => setShowLogForm(s => !s)}>+ Add Entry</button>
        </div>
        {showLogForm && (
          <div className="form-card">
            <input type="date" value={logForm.log_date} onChange={e => setLogForm(f => ({ ...f, log_date: e.target.value }))} />
            <textarea placeholder="Notes" value={logForm.notes} onChange={e => setLogForm(f => ({ ...f, notes: e.target.value }))} />
            <label className="checkbox-label">
              <input type="checkbox" checked={logForm.flagged} onChange={e => setLogForm(f => ({ ...f, flagged: e.target.checked }))} />
              Flag this entry
            </label>
            <div className="form-actions">
              <button className="btn" onClick={addLog}>Save</button>
              <button className="btn-ghost" onClick={() => setShowLogForm(false)}>Cancel</button>
            </div>
          </div>
        )}
        <div className="log-list">
          {logs.map(l => {
            const expanded = expandedLogIds.has(l.id);
            return (
              <div key={l.id} className={`log-entry ${l.flagged ? 'flagged' : ''}`}>
                {editingLogId === l.id ? (
                  <div className="log-entry-edit">
                    <input type="date" value={logEditForm.log_date} onChange={e => setLogEditForm(f => ({ ...f, log_date: e.target.value }))} />
                    <textarea value={logEditForm.notes} onChange={e => setLogEditForm(f => ({ ...f, notes: e.target.value }))} />
                    <label className="checkbox-label">
                      <input type="checkbox" checked={logEditForm.flagged} onChange={e => setLogEditForm(f => ({ ...f, flagged: e.target.checked }))} />
                      Flagged
                    </label>
                    <div className="form-actions">
                      <button className="btn" onClick={saveLogEdit}>Save</button>
                      <button className="btn-ghost" onClick={() => setEditingLogId(null)}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="log-meta" onClick={() => toggleLog(l.id)}>
                      <span className="log-date">{l.log_date}</span>
                      {l.flagged && <span className="flag-badge">⚑</span>}
                      {!expanded && <span className="log-preview">{l.notes}</span>}
                      {expanded && <>
                        <button className="btn-ghost sm" onClick={e => { e.stopPropagation(); setEditingLogId(l.id); setLogEditForm({ notes: l.notes, log_date: l.log_date, flagged: l.flagged ?? false }); }}>Edit</button>
                        <button className="btn-ghost sm" onClick={e => { e.stopPropagation(); toggleLogFlag(l.id, l.flagged ?? false); }}>{l.flagged ? 'Unflag' : 'Flag'}</button>
                        <button className="log-delete" onClick={e => { e.stopPropagation(); deleteLog(l.id); }} title="Delete">×</button>
                      </>}
                      <span className="log-toggle">{expanded ? '▲' : '▼'}</span>
                    </div>
                    {expanded && <div className="log-notes">{l.notes}</div>}
                  </>
                )}
              </div>
            );
          })}
          {logs.length === 0 && <div className="empty">No log entries</div>}
        </div>
      </section>
    </div>
  );
}
