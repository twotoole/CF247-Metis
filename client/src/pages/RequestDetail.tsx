import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import ConfirmModal from '../components/ConfirmModal';
import type { Request, RequestNote, RequestStatus } from '../types';

const STATUSES: RequestStatus[] = ['pending', 'in-progress', 'done'];

export default function RequestDetail() {
  const { id } = useParams<{ id: string }>();
  const [request, setRequest] = useState<Request | null>(null);
  const [notes, setNotes] = useState<RequestNote[]>([]);
  const [noteForm, setNoteForm] = useState({ notes: '', log_date: new Date().toISOString().split('T')[0] });
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [editingRequest, setEditingRequest] = useState(false);
  const [editForm, setEditForm] = useState({ title: '', description: '' });
  const [editingStatus, setEditingStatus] = useState(false);
  const [confirm, setConfirm] = useState<{ message: string; onConfirm: () => void } | null>(null);

  async function load() {
    const [{ data: req }, { data: noteData }] = await Promise.all([
      supabase.from('requests').select('*').eq('id', id).single(),
      supabase.from('request_notes').select('*').eq('request_id', id).order('log_date', { ascending: false }),
    ]);
    setRequest(req);
    setNotes(noteData ?? []);
  }

  useEffect(() => { load(); }, [id]);

  function startEdit() {
    if (!request) return;
    setEditForm({ title: request.title, description: request.description ?? '' });
    setEditingRequest(true);
    setEditingStatus(false);
  }

  async function saveEdit() {
    await supabase.from('requests').update({
      title: editForm.title,
      description: editForm.description || null,
    }).eq('id', id);
    setEditingRequest(false);
    load();
  }

  async function updateStatus(status: RequestStatus) {
    await supabase.from('requests').update({ status }).eq('id', id);
    setEditingStatus(false);
    load();
  }

  async function addNote() {
    if (!noteForm.notes.trim()) return;
    await supabase.from('request_notes').insert({ ...noteForm, request_id: id });
    setNoteForm({ notes: '', log_date: new Date().toISOString().split('T')[0] });
    setShowNoteForm(false);
    load();
  }

  function deleteNote(noteId: string) {
    setConfirm({ message: 'Delete this note?', onConfirm: async () => {
      await supabase.from('request_notes').delete().eq('id', noteId);
      setConfirm(null);
      load();
    }});
  }

  if (!request) return <div className="empty">Loading...</div>;

  return (
    <div>
      {confirm && <ConfirmModal message={confirm.message} onConfirm={confirm.onConfirm} onCancel={() => setConfirm(null)} />}
      <div className="page-header">
        <div>
          <Link to="/requests" className="back-link">← Requests</Link>
          {editingRequest ? (
            <div className="edit-fields">
              <input className="edit-title" value={editForm.title} onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))} />
              <input className="edit-sub" placeholder="Description" value={editForm.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} />
            </div>
          ) : (
            <>
              <h1>{request.title}</h1>
              {request.description && <p className="subtitle">{request.description}</p>}
            </>
          )}
        </div>
        <div className="header-actions">
          {editingRequest ? (
            <>
              <button className="btn" onClick={saveEdit}>Save</button>
              <button className="btn-ghost" onClick={() => setEditingRequest(false)}>Cancel</button>
            </>
          ) : (
            <>
              <button className="btn-ghost sm" onClick={startEdit}>Edit</button>
              {editingStatus ? (
                <div className="inline-select">
                  {STATUSES.map(s => (
                    <button key={s} className={`btn-ghost sm ${request.status === s ? 'active' : ''}`} onClick={() => updateStatus(s)}>{s}</button>
                  ))}
                </div>
              ) : (
                <button className="badge clickable" onClick={() => setEditingStatus(true)}>{request.status}</button>
              )}
            </>
          )}
        </div>
      </div>

      <section className="section">
        <div className="section-header">
          <h2>Notes</h2>
          <button className="btn" onClick={() => setShowNoteForm(s => !s)}>+ Add Note</button>
        </div>

        {showNoteForm && (
          <div className="form-card">
            <input type="date" value={noteForm.log_date} onChange={e => setNoteForm(f => ({ ...f, log_date: e.target.value }))} />
            <textarea placeholder="Notes" value={noteForm.notes} onChange={e => setNoteForm(f => ({ ...f, notes: e.target.value }))} />
            <div className="form-actions">
              <button className="btn" onClick={addNote}>Save</button>
              <button className="btn-ghost" onClick={() => setShowNoteForm(false)}>Cancel</button>
            </div>
          </div>
        )}

        <div className="log-list">
          {notes.map(n => (
            <div key={n.id} className="log-entry">
              <div className="log-meta">
                <span className="log-date">{n.log_date}</span>
                <button className="log-delete" onClick={() => deleteNote(n.id)} title="Delete">×</button>
              </div>
              <div className="log-notes">{n.notes}</div>
            </div>
          ))}
          {notes.length === 0 && <div className="empty">No notes yet</div>}
        </div>
      </section>
    </div>
  );
}
