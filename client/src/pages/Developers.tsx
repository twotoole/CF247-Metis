import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import type { Developer } from '../types';

export default function Developers() {
  const [developers, setDevelopers] = useState<Developer[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [form, setForm] = useState({ name: '', role: '' });

  async function load() {
    const { data } = await supabase.from('developers').select('*').eq('archived', showArchived).order('name');
    setDevelopers(data ?? []);
  }

  useEffect(() => { load(); }, [showArchived]);

  async function addDeveloper() {
    if (!form.name.trim()) return;
    await supabase.from('developers').insert({ name: form.name, role: form.role || null });
    setForm({ name: '', role: '' });
    setShowForm(false);
    load();
  }

  async function archiveDeveloper(id: string) {
    await supabase.from('developers').update({ archived: true }).eq('id', id);
    load();
  }

  async function deleteDeveloper(id: string) {
    if (!confirm('Delete this developer permanently?')) return;
    await supabase.from('developers').delete().eq('id', id);
    load();
  }

  return (
    <div>
      <div className="page-header">
        <h1>Developers</h1>
        <div className="header-actions">
          <button className="btn-ghost" onClick={() => setShowArchived(a => !a)}>
            {showArchived ? 'Active' : 'Archived'}
          </button>
          <button className="btn" onClick={() => setShowForm(s => !s)}>+ New Developer</button>
        </div>
      </div>

      {showForm && (
        <div className="form-card">
          <input placeholder="Name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          <input placeholder="Role" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} />
          <div className="form-actions">
            <button className="btn" onClick={addDeveloper}>Save</button>
            <button className="btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
          </div>
        </div>
      )}

      <table className="table">
        <thead>
          <tr><th>Name</th><th>Role</th><th></th></tr>
        </thead>
        <tbody>
          {developers.map(d => (
            <tr key={d.id}>
              <td><Link to={`/developers/${d.id}`}>{d.name}</Link></td>
              <td>{d.role ?? '—'}</td>
              <td className="row-actions">
                {!d.archived && <button className="btn-ghost sm" onClick={() => archiveDeveloper(d.id)}>Archive</button>}
                <button className="btn-danger sm" onClick={() => deleteDeveloper(d.id)}>Delete</button>
              </td>
            </tr>
          ))}
          {developers.length === 0 && <tr><td colSpan={3} className="empty">No developers found</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
