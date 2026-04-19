import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import ConfirmModal from '../components/ConfirmModal';
import type { Project, Task, ProjectLog, Developer, ProjectState, TaskStatus } from '../types';

const STATES: ProjectState[] = ['pre-production', 'production', 'post-production'];
const TASK_STATUSES: TaskStatus[] = ['todo', 'in-progress', 'done'];

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [logs, setLogs] = useState<ProjectLog[]>([]);
  const [developers, setDevelopers] = useState<Developer[]>([]);
  const [taskForm, setTaskForm] = useState({ title: '', description: '', developer_id: '', status: 'todo' as TaskStatus });
  const [logForm, setLogForm] = useState({ notes: '', log_date: new Date().toISOString().split('T')[0] });
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [showLogForm, setShowLogForm] = useState(false);
  const [editingState, setEditingState] = useState(false);
  const [confirm, setConfirm] = useState<{ message: string; onConfirm: () => void } | null>(null);

  async function load() {
    const [{ data: proj }, { data: taskData }, { data: logData }, { data: devData }] = await Promise.all([
      supabase.from('projects').select('*').eq('id', id).single(),
      supabase.from('tasks').select('*, developer:developers(id,name)').eq('project_id', id).eq('archived', false).order('created_at'),
      supabase.from('project_logs').select('*').eq('project_id', id).order('log_date', { ascending: false }),
      supabase.from('developers').select('*').eq('archived', false).order('name'),
    ]);
    setProject(proj);
    setTasks(taskData ?? []);
    setLogs(logData ?? []);
    setDevelopers(devData ?? []);
  }

  useEffect(() => { load(); }, [id]);

  async function addTask() {
    if (!taskForm.title.trim()) return;
    await supabase.from('tasks').insert({ ...taskForm, project_id: id, developer_id: taskForm.developer_id || null });
    setTaskForm({ title: '', description: '', developer_id: '', status: 'todo' });
    setShowTaskForm(false);
    load();
  }

  async function addLog() {
    if (!logForm.notes.trim()) return;
    await supabase.from('project_logs').insert({ ...logForm, project_id: id });
    setLogForm({ notes: '', log_date: new Date().toISOString().split('T')[0] });
    setShowLogForm(false);
    load();
  }

  async function updateTaskStatus(taskId: string, status: TaskStatus) {
    await supabase.from('tasks').update({ status }).eq('id', taskId);
    load();
  }

function deleteTask(taskId: string) {
    setConfirm({ message: 'Delete this task permanently?', onConfirm: async () => {
      await supabase.from('tasks').delete().eq('id', taskId);
      setConfirm(null);
      load();
    }});
  }

  function deleteLog(logId: string) {
    setConfirm({ message: 'Delete this log entry?', onConfirm: async () => {
      await supabase.from('project_logs').delete().eq('id', logId);
      setConfirm(null);
      load();
    }});
  }

  async function updateState(state: ProjectState) {
    await supabase.from('projects').update({ state }).eq('id', id);
    setEditingState(false);
    load();
  }

  if (!project) return <div className="empty">Loading...</div>;

  return (
    <div>
      {confirm && <ConfirmModal message={confirm.message} onConfirm={confirm.onConfirm} onCancel={() => setConfirm(null)} />}
      <div className="page-header">
        <div>
          <Link to="/projects" className="back-link">← Projects</Link>
          <h1>{project.name}</h1>
          {project.description && <p className="subtitle">{project.description}</p>}
          <div className="meta">
            {project.start_date && <span>{project.start_date}</span>}
            {project.end_date && <span> → {project.end_date}</span>}
          </div>
        </div>
        <div className="header-actions">
          {editingState ? (
            <div className="inline-select">
              {STATES.map(s => (
                <button key={s} className={`btn-ghost sm ${project.state === s ? 'active' : ''}`} onClick={() => updateState(s)}>{s}</button>
              ))}
            </div>
          ) : (
            <button className="badge clickable" onClick={() => setEditingState(true)}>{project.state}</button>
          )}
        </div>
      </div>

      <section className="section">
        <div className="section-header">
          <h2>Tasks</h2>
          <button className="btn" onClick={() => setShowTaskForm(s => !s)}>+ Add Task</button>
        </div>

        {showTaskForm && (
          <div className="form-card">
            <input placeholder="Task title" value={taskForm.title} onChange={e => setTaskForm(f => ({ ...f, title: e.target.value }))} />
            <input placeholder="Description" value={taskForm.description} onChange={e => setTaskForm(f => ({ ...f, description: e.target.value }))} />
            <select value={taskForm.developer_id} onChange={e => setTaskForm(f => ({ ...f, developer_id: e.target.value }))}>
              <option value="">Unassigned</option>
              {developers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
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
          <thead>
            <tr><th>Title</th><th>Assignee</th><th>Status</th><th></th></tr>
          </thead>
          <tbody>
            {tasks.map(t => (
              <tr key={t.id}>
                <td>{t.title}{t.description && <span className="sub"> — {t.description}</span>}</td>
                <td>{t.developer?.name ?? '—'}</td>
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
            {tasks.length === 0 && <tr><td colSpan={4} className="empty">No tasks</td></tr>}
          </tbody>
        </table>
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
            <div className="form-actions">
              <button className="btn" onClick={addLog}>Save</button>
              <button className="btn-ghost" onClick={() => setShowLogForm(false)}>Cancel</button>
            </div>
          </div>
        )}

        <div className="log-list">
          {logs.map(l => (
            <div key={l.id} className="log-entry">
              <div className="log-date">{l.log_date}</div>
              <div className="log-notes">{l.notes}</div>
              <button className="btn-danger sm" onClick={() => deleteLog(l.id)}>Delete</button>
            </div>
          ))}
          {logs.length === 0 && <div className="empty">No log entries</div>}
        </div>
      </section>
    </div>
  );
}
