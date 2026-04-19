import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import type { Developer, DeveloperLog } from '../types';

export default function DeveloperDetail() {
  const { id } = useParams<{ id: string }>();
  const [developer, setDeveloper] = useState<Developer | null>(null);
  const [logs, setLogs] = useState<DeveloperLog[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ notes: '', flagged: false, log_date: new Date().toISOString().split('T')[0] });

  async function load() {
    const [{ data: dev }, { data: logData }] = await Promise.all([
      supabase.from('developers').select('*').eq('id', id).single(),
      supabase.from('developer_logs').select('*').eq('developer_id', id).order('log_date', { ascending: false }),
    ]);
    setDeveloper(dev);
    setLogs(logData ?? []);
  }

  useEffect(() => { load(); }, [id]);

  async function addLog() {
    if (!form.notes.trim()) return;
    await supabase.from('developer_logs').insert({ ...form, developer_id: id });
    setForm({ notes: '', flagged: false, log_date: new Date().toISOString().split('T')[0] });
    setShowForm(false);
    load();
  }

  async function toggleFlag(logId: string, flagged: boolean) {
    await supabase.from('developer_logs').update({ flagged: !flagged }).eq('id', logId);
    load();
  }

  async function deleteLog(logId: string) {
    if (!confirm('Delete this log entry?')) return;
    await supabase.from('developer_logs').delete().eq('id', logId);
    load();
  }

  if (!developer) return <div className="empty">Loading...</div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <Link to="/developers" className="back-link">← Developers</Link>
          <h1>{developer.name}</h1>
          {developer.role && <p className="subtitle">{developer.role}</p>}
        </div>
      </div>

      <section className="section">
        <div className="section-header">
          <h2>Daily Log</h2>
          <button className="btn" onClick={() => setShowForm(s => !s)}>+ Add Entry</button>
        </div>

        {showForm && (
          <div className="form-card">
            <input type="date" value={form.log_date} onChange={e => setForm(f => ({ ...f, log_date: e.target.value }))} />
            <textarea placeholder="Notes" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            <label className="checkbox-label">
              <input type="checkbox" checked={form.flagged} onChange={e => setForm(f => ({ ...f, flagged: e.target.checked }))} />
              Flag this entry
            </label>
            <div className="form-actions">
              <button className="btn" onClick={addLog}>Save</button>
              <button className="btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </div>
        )}

        <div className="log-list">
          {logs.map(l => (
            <div key={l.id} className={`log-entry ${l.flagged ? 'flagged' : ''}`}>
              <div className="log-meta">
                <span className="log-date">{l.log_date}</span>
                {l.flagged && <span className="flag-badge">⚑ Flagged</span>}
              </div>
              <div className="log-notes">{l.notes}</div>
              <div className="row-actions">
                <button className="btn-ghost sm" onClick={() => toggleFlag(l.id, l.flagged)}>
                  {l.flagged ? 'Unflag' : 'Flag'}
                </button>
                <button className="btn-danger sm" onClick={() => deleteLog(l.id)}>Delete</button>
              </div>
            </div>
          ))}
          {logs.length === 0 && <div className="empty">No log entries</div>}
        </div>
      </section>
    </div>
  );
}
