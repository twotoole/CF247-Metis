import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

type RequestStatus = 'pending' | 'in-progress' | 'done';

interface Request {
  id: string;
  title: string;
  description: string | null;
  status: RequestStatus;
  created_at: string;
}

const STATUSES: RequestStatus[] = ['pending', 'in-progress', 'done'];

export default function Requests() {
  const [requests, setRequests] = useState<Request[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', status: 'pending' as RequestStatus });

  async function load() {
    const { data } = await supabase.from('requests').select('*').order('created_at', { ascending: false });
    setRequests(data ?? []);
  }

  useEffect(() => { load(); }, []);

  async function addRequest() {
    if (!form.title.trim()) return;
    await supabase.from('requests').insert({ ...form, description: form.description || null });
    setForm({ title: '', description: '', status: 'pending' });
    setShowForm(false);
    load();
  }

  async function updateStatus(id: string, status: RequestStatus) {
    await supabase.from('requests').update({ status }).eq('id', id);
    load();
  }

  async function deleteRequest(id: string) {
    if (!confirm('Delete this request permanently?')) return;
    await supabase.from('requests').delete().eq('id', id);
    load();
  }

  return (
    <div>
      <div className="page-header">
        <h1>Requests</h1>
        <button className="btn" onClick={() => setShowForm(s => !s)}>+ New Request</button>
      </div>

      {showForm && (
        <div className="form-card">
          <input placeholder="Title" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
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

      <table className="table">
        <thead>
          <tr><th>Title</th><th>Description</th><th>Status</th><th></th></tr>
        </thead>
        <tbody>
          {requests.map(r => (
            <tr key={r.id}>
              <td>{r.title}</td>
              <td className="sub">{r.description ?? '—'}</td>
              <td>
                <select value={r.status} onChange={e => updateStatus(r.id, e.target.value as RequestStatus)}>
                  {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </td>
              <td className="row-actions">
                <button className="btn-danger sm" onClick={() => deleteRequest(r.id)}>Delete</button>
              </td>
            </tr>
          ))}
          {requests.length === 0 && <tr><td colSpan={4} className="empty">No requests found</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
