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
import type { Request, RequestStatus } from '../types';

const STATUSES: RequestStatus[] = ['pending', 'in-progress', 'done'];

function SortableRequestRow({ request, onStatusChange, onDelete }: {
  request: Request;
  onStatusChange: (id: string, status: RequestStatus) => void;
  onDelete: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: request.id });

  return (
    <tr ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }}>
      <td className="drag-cell">
        <span className="drag-handle" {...attributes} {...listeners}>⠿</span>
      </td>
      <td><Link to={`/requests/${request.id}`}>{request.title}</Link></td>
      <td className="sub">{request.requester ?? '—'}</td>
      <td className="sub">{request.description ?? '—'}</td>
      <td>
        <select value={request.status} onChange={e => onStatusChange(request.id, e.target.value as RequestStatus)}>
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </td>
      <td className="row-actions">
        <button className="btn-danger sm" onClick={() => onDelete(request.id)}>Delete</button>
      </td>
    </tr>
  );
}

export default function Requests() {
  const [requests, setRequests] = useState<Request[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', requester: '', status: 'pending' as RequestStatus });
  const [confirm, setConfirm] = useState<{ message: string; onConfirm: () => void } | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  async function load() {
    const { data } = await supabase.from('requests').select('*')
      .order('sort_order', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: false });
    setRequests(data ?? []);
  }

  useEffect(() => { load(); }, []);

  async function addRequest() {
    if (!form.title.trim()) return;
    await supabase.from('requests').insert({
      title: form.title,
      description: form.description || null,
      requester: form.requester || null,
      status: form.status,
    });
    setForm({ title: '', description: '', requester: '', status: 'pending' });
    setShowForm(false);
    load();
  }

  async function updateStatus(id: string, status: RequestStatus) {
    await supabase.from('requests').update({ status }).eq('id', id);
    load();
  }

  function deleteRequest(id: string) {
    setConfirm({ message: 'Delete this request permanently?', onConfirm: async () => {
      await supabase.from('requests').delete().eq('id', id);
      setConfirm(null);
      load();
    }});
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = requests.findIndex(r => r.id === active.id);
    const newIndex = requests.findIndex(r => r.id === over.id);
    const reordered = arrayMove(requests, oldIndex, newIndex);
    setRequests(reordered);
    await Promise.all(
      reordered.map((r, i) => supabase.from('requests').update({ sort_order: i }).eq('id', r.id))
    );
  }

  return (
    <div>
      {confirm && <ConfirmModal message={confirm.message} onConfirm={confirm.onConfirm} onCancel={() => setConfirm(null)} />}
      <div className="page-header">
        <h1>Requests</h1>
        <button className="btn" onClick={() => setShowForm(s => !s)}>+ New Request</button>
      </div>

      {showForm && (
        <div className="form-card">
          <input placeholder="Title" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
          <input placeholder="Requester" value={form.requester} onChange={e => setForm(f => ({ ...f, requester: e.target.value }))} />
          <textarea placeholder="Description" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as RequestStatus }))}>
            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <div className="form-actions">
            <button className="btn" onClick={addRequest}>Save</button>
            <button className="btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
          </div>
        </div>
      )}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={requests.map(r => r.id)} strategy={verticalListSortingStrategy}>
          <table className="table">
            <thead>
              <tr><th style={{ width: 28 }}></th><th>Title</th><th>Requester</th><th>Description</th><th>Status</th><th></th></tr>
            </thead>
            <tbody>
              {requests.map(r => (
                <SortableRequestRow key={r.id} request={r} onStatusChange={updateStatus} onDelete={deleteRequest} />
              ))}
              {requests.length === 0 && <tr><td colSpan={6} className="empty">No requests found</td></tr>}
            </tbody>
          </table>
        </SortableContext>
      </DndContext>
    </div>
  );
}
