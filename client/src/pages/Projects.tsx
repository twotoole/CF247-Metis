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

function SortableProjectRow({ project, flaggedIds, isEditing, anyEditing, onToggleEdit, onArchive, onDelete }: {
  project: Project;
  flaggedIds: Set<string>;
  isEditing: boolean;
  anyEditing: boolean;
  onToggleEdit: () => void;
  onArchive: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: project.id,
    disabled: anyEditing,
  });

  const pct = getProgress(project.start_date, project.end_date);

  return (
    <tr ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }}>
      <td className="drag-cell">
        {!anyEditing && <span className="drag-handle" {...attributes} {...listeners}>⠿</span>}
      </td>
      <td>
        {flaggedIds.has(project.id) && <span className="row-flag">⚑</span>}
        <Link to={`/projects/${project.id}`}>{project.name}</Link>
      </td>
      <td><span className="badge">{project.state}</span></td>
      <td className="sub">{project.start_date ?? '—'}</td>
      <td className="sub">{project.end_date ?? '—'}</td>
      <td>
        {pct !== null ? (
          <div className="progress-wrap">
            <div className="progress-bar" style={{ width: `${pct}%` }} />
            <span className="progress-label">{pct}%</span>
          </div>
        ) : '—'}
      </td>
      <td className="row-actions">
        <button className="btn-ghost sm" onClick={onToggleEdit}>{isEditing ? 'Cancel' : 'Edit'}</button>
        {!project.archived && <button className="btn-ghost sm" onClick={onArchive}>Archive</button>}
        <button className="btn-danger sm" onClick={onDelete}>Delete</button>
      </td>
    </tr>
  );
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

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  async function load() {
    const [{ data }, { data: flaggedLogs }] = await Promise.all([
      supabase.from('projects').select('*').eq('archived', showArchived)
        .order('sort_order', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: false }),
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

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = projects.findIndex(p => p.id === active.id);
    const newIndex = projects.findIndex(p => p.id === over.id);
    const reordered = arrayMove(projects, oldIndex, newIndex);
    setProjects(reordered);
    await Promise.all(
      reordered.map((p, i) => supabase.from('projects').update({ sort_order: i }).eq('id', p.id))
    );
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

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={projects.map(p => p.id)} strategy={verticalListSortingStrategy}>
          <table className="table">
            <thead>
              <tr><th style={{ width: 28 }}></th><th>Name</th><th>State</th><th>Start</th><th>End</th><th>Progress</th><th></th></tr>
            </thead>
            <tbody>
              {projects.flatMap(p => {
                const isEditing = editingId === p.id;
                return [
                  <SortableProjectRow
                    key={p.id}
                    project={p}
                    flaggedIds={flaggedIds}
                    isEditing={isEditing}
                    anyEditing={editingId !== null}
                    onToggleEdit={() => isEditing ? setEditingId(null) : startEdit(p)}
                    onArchive={() => archiveProject(p.id)}
                    onDelete={() => deleteProject(p.id)}
                  />,
                  ...(isEditing ? [
                    <tr key={`${p.id}-edit`}>
                      <td colSpan={7}>
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
              {projects.length === 0 && <tr><td colSpan={7} className="empty">No projects found</td></tr>}
            </tbody>
          </table>
        </SortableContext>
      </DndContext>
    </div>
  );
}
