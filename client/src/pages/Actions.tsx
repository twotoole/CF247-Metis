import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor,
  useSensor, useSensors, type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates,
  useSortable, verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { supabase } from '../lib/supabase';
import ConfirmModal from '../components/ConfirmModal';
import type { Task, TaskStatus, Project, Developer } from '../types';

type SortMode = 'default' | 'asc' | 'desc';
const TASK_STATUSES: TaskStatus[] = ['todo', 'in-progress', 'done'];
const today = new Date().toISOString().split('T')[0];

function SortableActionRow({ action, sortMode, onStatusChange, onDelete }: {
  action: Task;
  sortMode: SortMode;
  onStatusChange: (id: string, status: TaskStatus) => void;
  onDelete: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: action.id,
    disabled: sortMode !== 'default',
  });

  const source = action.standup
    ? `Stand-up ${action.standup.standup_date}`
    : action.meeting
      ? action.meeting.title
      : null;

  return (
    <tr ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }}>
      <td className="drag-cell">
        {sortMode === 'default' && <span className="drag-handle" {...attributes} {...listeners}>⠿</span>}
      </td>
      <td>
        {action.title}
        {action.description && <span className="sub"> — {action.description}</span>}
        {source && <span className="sub"> · {source}</span>}
      </td>
      <td>
        {action.project
          ? <Link to={`/projects/${action.project.id}`}>{action.project.name}</Link>
          : '—'}
      </td>
      <td className="sub">{action.developer?.name ?? '—'}</td>
      <td className={action.due_date && action.due_date < today ? 'overdue-text' : 'sub'}>
        {action.due_date ?? '—'}
      </td>
      <td>
        <select value={action.status} onChange={e => onStatusChange(action.id, e.target.value as TaskStatus)}>
          {TASK_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </td>
      <td className="sub">{action.created_at.split('T')[0]}</td>
      <td className="row-actions">
        <button className="btn-danger sm" onClick={() => onDelete(action.id)}>Delete</button>
      </td>
    </tr>
  );
}

export default function Actions() {
  const [actions, setActions] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [developers, setDevelopers] = useState<Developer[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', project_id: '', developer_id: '', status: 'todo' as TaskStatus, due_date: '' });
  const [sortMode, setSortMode] = useState<SortMode>('default');
  const [confirm, setConfirm] = useState<{ message: string; onConfirm: () => void } | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  async function load() {
    const [{ data: taskData }, { data: projectData }, { data: devData }] = await Promise.all([
      supabase.from('tasks')
        .select('*, project:projects(id, name), developer:developers(id, name), standup:standups(id, standup_date), meeting:meetings(id, title)')
        .eq('archived', false)
        .order('sort_order', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: false }),
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
      due_date: form.due_date || null,
    });
    setForm({ title: '', description: '', project_id: '', developer_id: '', status: 'todo', due_date: '' });
    setShowForm(false);
    load();
  }

  function deleteAction(id: string) {
    setConfirm({ message: 'Delete this action permanently?', onConfirm: async () => {
      await supabase.from('tasks').delete().eq('id', id);
      setConfirm(null);
      load();
    }});
  }

  async function updateStatus(id: string, status: TaskStatus) {
    await supabase.from('tasks').update({ status }).eq('id', id);
    load();
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = actions.findIndex(a => a.id === active.id);
    const newIndex = actions.findIndex(a => a.id === over.id);
    const reordered = arrayMove(actions, oldIndex, newIndex);
    setActions(reordered);
    await Promise.all(
      reordered.map((a, i) => supabase.from('tasks').update({ sort_order: i }).eq('id', a.id))
    );
  }

  function cycleSortMode() {
    setSortMode(m => m === 'default' ? 'asc' : m === 'asc' ? 'desc' : 'default');
  }

  const displayedActions = sortMode === 'default'
    ? actions
    : [...actions].sort((a, b) => {
        const ta = new Date(a.created_at).getTime();
        const tb = new Date(b.created_at).getTime();
        return sortMode === 'asc' ? ta - tb : tb - ta;
      });

  const sortIndicator = sortMode === 'asc' ? ' ↑' : sortMode === 'desc' ? ' ↓' : '';

  return (
    <div>
      {confirm && <ConfirmModal message={confirm.message} onConfirm={confirm.onConfirm} onCancel={() => setConfirm(null)} />}
      <div className="page-header">
        <h1>Actions</h1>
        <button className="btn" onClick={() => setShowForm(s => !s)}>+ New Action</button>
      </div>

      {showForm && (
        <div className="form-card">
          <input placeholder="Action title" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
          <input placeholder="Description (optional)" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          <select value={form.project_id} onChange={e => setForm(f => ({ ...f, project_id: e.target.value }))}>
            <option value="">No project</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <select value={form.developer_id} onChange={e => setForm(f => ({ ...f, developer_id: e.target.value }))}>
            <option value="">Unassigned</option>
            {developers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          <input type="date" placeholder="Due date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} />
          <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as TaskStatus }))}>
            {TASK_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <div className="form-actions">
            <button className="btn" onClick={addAction}>Save</button>
            <button className="btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
          </div>
        </div>
      )}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={displayedActions.map(a => a.id)} strategy={verticalListSortingStrategy}>
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: 28 }}></th>
                <th>Action</th>
                <th>Project</th>
                <th>Assignee</th>
                <th>Due</th>
                <th>Status</th>
                <th className="sort-header" onClick={cycleSortMode}>Added{sortIndicator}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {displayedActions.map(a => (
                <SortableActionRow key={a.id} action={a} sortMode={sortMode} onStatusChange={updateStatus} onDelete={deleteAction} />
              ))}
              {displayedActions.length === 0 && <tr><td colSpan={8} className="empty">No actions</td></tr>}
            </tbody>
          </table>
        </SortableContext>
      </DndContext>
    </div>
  );
}
