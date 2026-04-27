import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import ConfirmModal from '../components/ConfirmModal';
import type { Project, Task, ProjectLog, Developer, Risk, Milestone, UserStory, ProjectState, TaskStatus, Severity, UserStoryStatus } from '../types';

const STATES: ProjectState[] = ['pre-production', 'production', 'post-production'];
const TASK_STATUSES: TaskStatus[] = ['todo', 'in-progress', 'done'];
const SEVERITIES: Severity[] = ['low', 'medium', 'high'];
const USER_STORY_STATUSES: UserStoryStatus[] = ['backlog', 'in-progress', 'done', 'accepted'];
const today = new Date().toISOString().split('T')[0];

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [logs, setLogs] = useState<ProjectLog[]>([]);
  const [risks, setRisks] = useState<Risk[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [userStories, setUserStories] = useState<UserStory[]>([]);
  const [developers, setDevelopers] = useState<Developer[]>([]);

  const [taskForm, setTaskForm] = useState({ title: '', description: '', developer_id: '', status: 'todo' as TaskStatus, due_date: '', user_story_id: '' });
  const [logForm, setLogForm] = useState({ notes: '', log_date: new Date().toISOString().split('T')[0], flagged: false });
  const [riskForm, setRiskForm] = useState({ description: '', severity: 'medium' as Severity });
  const [milestoneForm, setMilestoneForm] = useState({ title: '', due_date: '' });
  const [storyForm, setStoryForm] = useState({ title: '', acceptance_criteria: '', milestone_id: '', status: 'backlog' as UserStoryStatus });

  const [showTaskForm, setShowTaskForm] = useState(false);
  const [showLogForm, setShowLogForm] = useState(false);
  const [showRiskForm, setShowRiskForm] = useState(false);
  const [showMilestoneForm, setShowMilestoneForm] = useState(false);
  const [showStoryForm, setShowStoryForm] = useState(false);

  const [editingState, setEditingState] = useState(false);
  const [editingProject, setEditingProject] = useState(false);
  const [projectEditForm, setProjectEditForm] = useState({ name: '', description: '', start_date: '', end_date: '' });
  const [editingLogId, setEditingLogId] = useState<string | null>(null);
  const [logEditForm, setLogEditForm] = useState({ notes: '', log_date: '', flagged: false });
  const [editingRiskId, setEditingRiskId] = useState<string | null>(null);
  const [riskEditForm, setRiskEditForm] = useState({ description: '', severity: 'medium' as Severity });
  const [editingStoryId, setEditingStoryId] = useState<string | null>(null);
  const [storyEditForm, setStoryEditForm] = useState({ title: '', acceptance_criteria: '', milestone_id: '', status: 'backlog' as UserStoryStatus });
  const [editingPrd, setEditingPrd] = useState(false);
  const [prdDraft, setPrdDraft] = useState('');

  const [expandedLogIds, setExpandedLogIds] = useState<Set<string>>(new Set());
  const [expandedStoryIds, setExpandedStoryIds] = useState<Set<string>>(new Set());
  const [confirm, setConfirm] = useState<{ message: string; onConfirm: () => void } | null>(null);

  function toggleLog(logId: string) {
    setExpandedLogIds(s => { const n = new Set(s); n.has(logId) ? n.delete(logId) : n.add(logId); return n; });
  }
  function toggleStory(storyId: string) {
    setExpandedStoryIds(s => { const n = new Set(s); n.has(storyId) ? n.delete(storyId) : n.add(storyId); return n; });
  }

  async function load() {
    const [{ data: proj }, { data: taskData }, { data: logData }, { data: devData }, { data: riskData }, { data: milestoneData }, { data: storyData }] = await Promise.all([
      supabase.from('projects').select('*').eq('id', id).single(),
      supabase.from('tasks').select('*, developer:developers(id,name)').eq('project_id', id).eq('archived', false).order('created_at'),
      supabase.from('project_logs').select('*').eq('project_id', id).order('log_date', { ascending: false }),
      supabase.from('developers').select('*').eq('archived', false).order('name'),
      supabase.from('risks').select('*').eq('project_id', id).order('created_at'),
      supabase.from('milestones').select('*').eq('project_id', id).order('due_date', { ascending: true, nullsFirst: false }).order('created_at'),
      supabase.from('user_stories').select('*, milestone:milestones(id, title)').eq('project_id', id).order('sort_order', { ascending: true, nullsFirst: false }).order('created_at'),
    ]);
    setProject(proj);
    setTasks(taskData ?? []);
    setLogs(logData ?? []);
    setDevelopers(devData ?? []);
    setRisks(riskData ?? []);
    setMilestones(milestoneData ?? []);
    setUserStories(storyData ?? []);
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

  async function updateState(state: ProjectState) {
    await supabase.from('projects').update({ state }).eq('id', id);
    setEditingState(false);
    load();
  }

  async function savePrd() {
    await supabase.from('projects').update({ prd: prdDraft || null }).eq('id', id);
    setEditingPrd(false);
    load();
  }

  async function addMilestone() {
    if (!milestoneForm.title.trim()) return;
    await supabase.from('milestones').insert({ title: milestoneForm.title, due_date: milestoneForm.due_date || null, project_id: id });
    setMilestoneForm({ title: '', due_date: '' });
    setShowMilestoneForm(false);
    load();
  }

  async function toggleMilestone(milestoneId: string, completed: boolean) {
    await supabase.from('milestones').update({ completed: !completed }).eq('id', milestoneId);
    load();
  }

  function deleteMilestone(milestoneId: string) {
    setConfirm({ message: 'Delete this milestone?', onConfirm: async () => {
      await supabase.from('milestones').delete().eq('id', milestoneId);
      setConfirm(null); load();
    }});
  }

  async function addStory() {
    if (!storyForm.title.trim()) return;
    await supabase.from('user_stories').insert({ title: storyForm.title, acceptance_criteria: storyForm.acceptance_criteria || null, milestone_id: storyForm.milestone_id || null, status: storyForm.status, project_id: id });
    setStoryForm({ title: '', acceptance_criteria: '', milestone_id: '', status: 'backlog' });
    setShowStoryForm(false);
    load();
  }

  async function saveStoryEdit() {
    if (!editingStoryId) return;
    await supabase.from('user_stories').update({ title: storyEditForm.title, acceptance_criteria: storyEditForm.acceptance_criteria || null, milestone_id: storyEditForm.milestone_id || null, status: storyEditForm.status }).eq('id', editingStoryId);
    setEditingStoryId(null);
    load();
  }

  async function updateStoryStatus(storyId: string, status: UserStoryStatus) {
    await supabase.from('user_stories').update({ status }).eq('id', storyId);
    load();
  }

  function deleteStory(storyId: string) {
    setConfirm({ message: 'Delete this user story?', onConfirm: async () => {
      await supabase.from('user_stories').delete().eq('id', storyId);
      setConfirm(null); load();
    }});
  }

  async function addTask() {
    if (!taskForm.title.trim()) return;
    await supabase.from('tasks').insert({ title: taskForm.title, description: taskForm.description || null, developer_id: taskForm.developer_id || null, status: taskForm.status, due_date: taskForm.due_date || null, user_story_id: taskForm.user_story_id || null, project_id: id });
    setTaskForm({ title: '', description: '', developer_id: '', status: 'todo', due_date: '', user_story_id: '' });
    setShowTaskForm(false);
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

  function deleteLog(logId: string) {
    setConfirm({ message: 'Delete this log entry?', onConfirm: async () => {
      await supabase.from('project_logs').delete().eq('id', logId);
      setConfirm(null); load();
    }});
  }

  async function toggleLogFlag(logId: string, flagged: boolean) {
    await supabase.from('project_logs').update({ flagged: !flagged }).eq('id', logId);
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

  function deleteRisk(riskId: string) {
    setConfirm({ message: 'Delete this risk?', onConfirm: async () => {
      await supabase.from('risks').delete().eq('id', riskId);
      setConfirm(null); load();
    }});
  }

  if (!project) return <div className="empty">Loading...</div>;

  const milestonesDone = milestones.filter(m => m.completed).length;

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

      {/* PRD */}
      <section className="section">
        <div className="section-header">
          <h2>PRD / Brief</h2>
          {!editingPrd && (
            <button className="btn-ghost sm" onClick={() => { setPrdDraft(project.prd ?? ''); setEditingPrd(true); }}>
              {project.prd ? 'Edit' : '+ Add'}
            </button>
          )}
        </div>
        {editingPrd ? (
          <div className="form-card">
            <textarea placeholder="Describe the project goals, scope, requirements, and context..." value={prdDraft} onChange={e => setPrdDraft(e.target.value)} style={{ minHeight: 160 }} />
            <div className="form-actions">
              <button className="btn" onClick={savePrd}>Save</button>
              <button className="btn-ghost" onClick={() => setEditingPrd(false)}>Cancel</button>
            </div>
          </div>
        ) : project.prd ? (
          <div className="prd-content">{project.prd}</div>
        ) : (
          <div className="empty">No PRD added yet</div>
        )}
      </section>

      {/* Milestones */}
      <section className="section">
        <div className="section-header">
          <h2>
            Milestones
            {milestones.length > 0 && <span className="section-count">{milestonesDone}/{milestones.length}</span>}
          </h2>
          <button className="btn" onClick={() => setShowMilestoneForm(s => !s)}>+ Add Milestone</button>
        </div>
        {showMilestoneForm && (
          <div className="form-card">
            <input placeholder="Milestone title" value={milestoneForm.title} onChange={e => setMilestoneForm(f => ({ ...f, title: e.target.value }))} />
            <input type="date" value={milestoneForm.due_date} onChange={e => setMilestoneForm(f => ({ ...f, due_date: e.target.value }))} />
            <div className="form-actions">
              <button className="btn" onClick={addMilestone}>Save</button>
              <button className="btn-ghost" onClick={() => setShowMilestoneForm(false)}>Cancel</button>
            </div>
          </div>
        )}
        <div className="milestone-list">
          {milestones.map(m => (
            <div key={m.id} className={`milestone-item ${m.completed ? 'milestone-done' : ''}`}>
              <input type="checkbox" checked={m.completed} onChange={() => toggleMilestone(m.id, m.completed)} className="milestone-check" />
              <span className="milestone-title">{m.title}</span>
              {m.due_date && (
                <span className={m.due_date < today && !m.completed ? 'overdue-text' : 'sub'}>
                  {m.due_date}
                  {m.due_date < today && !m.completed && <span className="overdue-badge">overdue</span>}
                </span>
              )}
              <button className="log-delete" onClick={() => deleteMilestone(m.id)} title="Delete">×</button>
            </div>
          ))}
          {milestones.length === 0 && <div className="empty">No milestones added</div>}
        </div>
      </section>

      {/* User Stories */}
      <section className="section">
        <div className="section-header">
          <h2>User Stories</h2>
          <button className="btn" onClick={() => setShowStoryForm(s => !s)}>+ Add Story</button>
        </div>
        {showStoryForm && (
          <div className="form-card">
            <input placeholder="As a [user], I want to..." value={storyForm.title} onChange={e => setStoryForm(f => ({ ...f, title: e.target.value }))} />
            <textarea placeholder="Acceptance criteria" value={storyForm.acceptance_criteria} onChange={e => setStoryForm(f => ({ ...f, acceptance_criteria: e.target.value }))} />
            <select value={storyForm.milestone_id} onChange={e => setStoryForm(f => ({ ...f, milestone_id: e.target.value }))}>
              <option value="">No milestone</option>
              {milestones.map(m => <option key={m.id} value={m.id}>{m.title}</option>)}
            </select>
            <select value={storyForm.status} onChange={e => setStoryForm(f => ({ ...f, status: e.target.value as UserStoryStatus }))}>
              {USER_STORY_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <div className="form-actions">
              <button className="btn" onClick={addStory}>Save</button>
              <button className="btn-ghost" onClick={() => setShowStoryForm(false)}>Cancel</button>
            </div>
          </div>
        )}
        <div className="log-list">
          {userStories.map(s => {
            const expanded = expandedStoryIds.has(s.id);
            const storyTasks = tasks.filter(t => t.user_story_id === s.id);
            return (
              <div key={s.id} className="log-entry">
                {editingStoryId === s.id ? (
                  <div className="log-entry-edit">
                    <input value={storyEditForm.title} onChange={e => setStoryEditForm(f => ({ ...f, title: e.target.value }))} />
                    <textarea placeholder="Acceptance criteria" value={storyEditForm.acceptance_criteria} onChange={e => setStoryEditForm(f => ({ ...f, acceptance_criteria: e.target.value }))} />
                    <select value={storyEditForm.milestone_id} onChange={e => setStoryEditForm(f => ({ ...f, milestone_id: e.target.value }))}>
                      <option value="">No milestone</option>
                      {milestones.map(m => <option key={m.id} value={m.id}>{m.title}</option>)}
                    </select>
                    <select value={storyEditForm.status} onChange={e => setStoryEditForm(f => ({ ...f, status: e.target.value as UserStoryStatus }))}>
                      {USER_STORY_STATUSES.map(st => <option key={st} value={st}>{st}</option>)}
                    </select>
                    <div className="form-actions">
                      <button className="btn" onClick={saveStoryEdit}>Save</button>
                      <button className="btn-ghost" onClick={() => setEditingStoryId(null)}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="log-meta" onClick={() => toggleStory(s.id)}>
                      <span className={`badge story-${s.status}`}>{s.status}</span>
                      <span className="story-title">{s.title}</span>
                      {s.milestone && <span className="story-milestone">{s.milestone.title}</span>}
                      {storyTasks.length > 0 && (
                        <span className="sub" style={{ fontSize: 11 }}>
                          {storyTasks.filter(t => t.status === 'done').length}/{storyTasks.length} tasks
                        </span>
                      )}
                      {expanded && <>
                        <button className="btn-ghost sm" onClick={e => { e.stopPropagation(); setEditingStoryId(s.id); setStoryEditForm({ title: s.title, acceptance_criteria: s.acceptance_criteria ?? '', milestone_id: s.milestone_id ?? '', status: s.status }); }}>Edit</button>
                        <select className="story-status-select" value={s.status} onClick={e => e.stopPropagation()} onChange={e => updateStoryStatus(s.id, e.target.value as UserStoryStatus)}>
                          {USER_STORY_STATUSES.map(st => <option key={st} value={st}>{st}</option>)}
                        </select>
                        <button className="log-delete" onClick={e => { e.stopPropagation(); deleteStory(s.id); }} title="Delete">×</button>
                      </>}
                      <span className="log-toggle">{expanded ? '▲' : '▼'}</span>
                    </div>
                    {expanded && (
                      <div className="story-body">
                        {s.acceptance_criteria && <div className="log-notes">{s.acceptance_criteria}</div>}
                        {storyTasks.length > 0 && (
                          <div className="story-tasks">
                            {storyTasks.map(t => (
                              <div key={t.id} className="story-task-item">
                                <span className={`badge status-${t.status}`}>{t.status}</span>
                                <span className="sub">{t.title}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })}
          {userStories.length === 0 && <div className="empty">No user stories added</div>}
        </div>
      </section>

      {/* Actions */}
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
            {userStories.length > 0 && (
              <select value={taskForm.user_story_id} onChange={e => setTaskForm(f => ({ ...f, user_story_id: e.target.value }))}>
                <option value="">No user story</option>
                {userStories.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
              </select>
            )}
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
          <thead><tr><th>Title</th><th>Assignee</th><th>Story</th><th>Due</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {tasks.map(t => (
              <tr key={t.id}>
                <td>{t.title}{t.description && <span className="sub"> — {t.description}</span>}</td>
                <td className="sub">{t.developer?.name ?? '—'}</td>
                <td className="sub" style={{ fontSize: 11 }}>
                  {t.user_story_id ? (userStories.find(s => s.id === t.user_story_id)?.title ?? '—') : '—'}
                </td>
                <td className={t.due_date && t.due_date < today ? 'overdue-text' : 'sub'}>
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
            {tasks.length === 0 && <tr><td colSpan={6} className="empty">No actions</td></tr>}
          </tbody>
        </table>
      </section>

      {/* Risks */}
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

      {/* Progress Log */}
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
