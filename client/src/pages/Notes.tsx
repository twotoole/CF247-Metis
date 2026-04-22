import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import ConfirmModal from '../components/ConfirmModal';
import type { Standup, Meeting, Action, ActionStatus } from '../types';

type Tab = 'standups' | 'meetings' | 'actions';
const ACTION_STATUSES: ActionStatus[] = ['open', 'in-progress', 'done'];
const today = new Date().toISOString().split('T')[0];

export default function Notes() {
  const [tab, setTab] = useState<Tab>('standups');
  const [showArchived, setShowArchived] = useState(false);
  const [standups, setStandups] = useState<Standup[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [actions, setActions] = useState<Action[]>([]);
  const [confirm, setConfirm] = useState<{ message: string; onConfirm: () => void } | null>(null);

  const [showStandupForm, setShowStandupForm] = useState(false);
  const [standupForm, setStandupForm] = useState({ notes: '', standup_date: today });

  const [showMeetingForm, setShowMeetingForm] = useState(false);
  const [meetingForm, setMeetingForm] = useState({ title: '', group_name: '', notes: '', meeting_date: today });

  const [showActionFormFor, setShowActionFormFor] = useState<string | null>(null);
  const [actionForm, setActionForm] = useState({ description: '', status: 'open' as ActionStatus });

  const [editingStandupId, setEditingStandupId] = useState<string | null>(null);
  const [standupEditForm, setStandupEditForm] = useState({ notes: '', standup_date: '' });

  const [editingMeetingId, setEditingMeetingId] = useState<string | null>(null);
  const [meetingEditForm, setMeetingEditForm] = useState({ title: '', group_name: '', notes: '', meeting_date: '' });

  const [editingActionId, setEditingActionId] = useState<string | null>(null);
  const [actionEditForm, setActionEditForm] = useState({ description: '', status: 'open' as ActionStatus });

  async function load() {
    const [{ data: su }, { data: mt }, { data: ac }] = await Promise.all([
      supabase.from('standups').select('*').eq('archived', showArchived).order('standup_date', { ascending: false }),
      supabase.from('meetings').select('*').eq('archived', showArchived).order('meeting_date', { ascending: false }),
      supabase.from('actions')
        .select('*, standup:standups(id, standup_date), meeting:meetings(id, title, group_name)')
        .order('created_at', { ascending: false }),
    ]);
    setStandups(su ?? []);
    setMeetings(mt ?? []);
    setActions(ac ?? []);
  }

  useEffect(() => { load(); }, [showArchived]);

  async function addStandup() {
    if (!standupForm.notes.trim()) return;
    await supabase.from('standups').insert(standupForm);
    setStandupForm({ notes: '', standup_date: today });
    setShowStandupForm(false);
    load();
  }

  async function saveStandupEdit() {
    if (!editingStandupId) return;
    await supabase.from('standups').update(standupEditForm).eq('id', editingStandupId);
    setEditingStandupId(null);
    load();
  }

  async function archiveStandup(id: string) {
    await supabase.from('standups').update({ archived: !showArchived }).eq('id', id);
    load();
  }

  function deleteStandup(id: string) {
    setConfirm({ message: 'Delete this stand-up?', onConfirm: async () => {
      await supabase.from('standups').delete().eq('id', id);
      setConfirm(null);
      load();
    }});
  }

  async function addMeeting() {
    if (!meetingForm.title.trim()) return;
    await supabase.from('meetings').insert({ ...meetingForm, group_name: meetingForm.group_name || null, notes: meetingForm.notes || null });
    setMeetingForm({ title: '', group_name: '', notes: '', meeting_date: today });
    setShowMeetingForm(false);
    load();
  }

  async function saveMeetingEdit() {
    if (!editingMeetingId) return;
    await supabase.from('meetings').update({
      ...meetingEditForm,
      group_name: meetingEditForm.group_name || null,
      notes: meetingEditForm.notes || null,
    }).eq('id', editingMeetingId);
    setEditingMeetingId(null);
    load();
  }

  async function archiveMeeting(id: string) {
    await supabase.from('meetings').update({ archived: !showArchived }).eq('id', id);
    load();
  }

  function deleteMeeting(id: string) {
    setConfirm({ message: 'Delete this meeting?', onConfirm: async () => {
      await supabase.from('meetings').delete().eq('id', id);
      setConfirm(null);
      load();
    }});
  }

  async function addAction(sourceType: 'standup' | 'meeting', sourceId: string) {
    if (!actionForm.description.trim()) return;
    await supabase.from('actions').insert({
      description: actionForm.description,
      status: actionForm.status,
      standup_id: sourceType === 'standup' ? sourceId : null,
      meeting_id: sourceType === 'meeting' ? sourceId : null,
    });
    setActionForm({ description: '', status: 'open' });
    setShowActionFormFor(null);
    load();
  }

  async function saveActionEdit() {
    if (!editingActionId) return;
    await supabase.from('actions').update(actionEditForm).eq('id', editingActionId);
    setEditingActionId(null);
    load();
  }

  async function updateActionStatus(id: string, status: ActionStatus) {
    await supabase.from('actions').update({ status }).eq('id', id);
    load();
  }

  function deleteAction(id: string) {
    setConfirm({ message: 'Delete this action?', onConfirm: async () => {
      await supabase.from('actions').delete().eq('id', id);
      setConfirm(null);
      load();
    }});
  }

  const actionsBySource = new Map<string, Action[]>();
  for (const a of actions) {
    const key = a.standup_id ?? a.meeting_id ?? '';
    if (!key) continue;
    if (!actionsBySource.has(key)) actionsBySource.set(key, []);
    actionsBySource.get(key)!.push(a);
  }

  const groupedMeetings = new Map<string, Meeting[]>();
  for (const m of meetings) {
    const key = m.group_name ?? 'Other';
    if (!groupedMeetings.has(key)) groupedMeetings.set(key, []);
    groupedMeetings.get(key)!.push(m);
  }

  function renderNoteActions(sourceType: 'standup' | 'meeting', sourceId: string) {
    const sourceActions = actionsBySource.get(sourceId) ?? [];
    return (
      <>
        {sourceActions.length > 0 && (
          <div className="note-actions">
            {sourceActions.map(a => (
              <div key={a.id} className="action-item">
                <span className={`badge status-${a.status}`}>{a.status}</span>
                <span className="action-desc">{a.description}</span>
              </div>
            ))}
          </div>
        )}
        {showActionFormFor === sourceId ? (
          <div className="action-form">
            <input placeholder="Action description" value={actionForm.description} onChange={e => setActionForm(f => ({ ...f, description: e.target.value }))} />
            <select value={actionForm.status} onChange={e => setActionForm(f => ({ ...f, status: e.target.value as ActionStatus }))}>
              {ACTION_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <div className="form-actions">
              <button className="btn" onClick={() => addAction(sourceType, sourceId)}>Save</button>
              <button className="btn-ghost" onClick={() => setShowActionFormFor(null)}>Cancel</button>
            </div>
          </div>
        ) : (
          <button className="btn-ghost sm" style={{ marginTop: '0.5rem', alignSelf: 'flex-start' }} onClick={() => { setShowActionFormFor(sourceId); setActionForm({ description: '', status: 'open' }); }}>+ Action</button>
        )}
      </>
    );
  }

  return (
    <div>
      {confirm && <ConfirmModal message={confirm.message} onConfirm={confirm.onConfirm} onCancel={() => setConfirm(null)} />}
      <div className="page-header">
        <h1>Notes</h1>
        <div className="header-actions">
          {tab !== 'actions' && (
            <button className="btn-ghost" onClick={() => setShowArchived(a => !a)}>
              {showArchived ? 'Active' : 'Archived'}
            </button>
          )}
          {tab === 'standups' && <button className="btn" onClick={() => setShowStandupForm(s => !s)}>+ New Stand-up</button>}
          {tab === 'meetings' && <button className="btn" onClick={() => setShowMeetingForm(s => !s)}>+ New Meeting</button>}
        </div>
      </div>

      <div className="tabs">
        <button className={`tab ${tab === 'standups' ? 'active' : ''}`} onClick={() => setTab('standups')}>Stand-ups</button>
        <button className={`tab ${tab === 'meetings' ? 'active' : ''}`} onClick={() => setTab('meetings')}>Meetings</button>
        <button className={`tab ${tab === 'actions' ? 'active' : ''}`} onClick={() => setTab('actions')}>Actions</button>
      </div>

      {tab === 'standups' && (
        <section className="section">
          {showStandupForm && (
            <div className="form-card">
              <input type="date" value={standupForm.standup_date} onChange={e => setStandupForm(f => ({ ...f, standup_date: e.target.value }))} />
              <textarea placeholder="Notes" value={standupForm.notes} onChange={e => setStandupForm(f => ({ ...f, notes: e.target.value }))} />
              <div className="form-actions">
                <button className="btn" onClick={addStandup}>Save</button>
                <button className="btn-ghost" onClick={() => setShowStandupForm(false)}>Cancel</button>
              </div>
            </div>
          )}
          <div className="log-list">
            {standups.map(s => (
              <div key={s.id} className="log-entry">
                {editingStandupId === s.id ? (
                  <div className="log-entry-edit">
                    <input type="date" value={standupEditForm.standup_date} onChange={e => setStandupEditForm(f => ({ ...f, standup_date: e.target.value }))} />
                    <textarea value={standupEditForm.notes} onChange={e => setStandupEditForm(f => ({ ...f, notes: e.target.value }))} />
                    <div className="form-actions">
                      <button className="btn" onClick={saveStandupEdit}>Save</button>
                      <button className="btn-ghost" onClick={() => setEditingStandupId(null)}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="log-meta">
                      <span className="log-date">{s.standup_date}</span>
                      <button className="btn-ghost sm" onClick={() => { setEditingStandupId(s.id); setStandupEditForm({ notes: s.notes, standup_date: s.standup_date }); }}>Edit</button>
                      <button className="btn-ghost sm" onClick={() => archiveStandup(s.id)}>{showArchived ? 'Unarchive' : 'Archive'}</button>
                      <button className="log-delete" onClick={() => deleteStandup(s.id)} title="Delete">×</button>
                    </div>
                    <div className="log-notes">{s.notes}</div>
                    {renderNoteActions('standup', s.id)}
                  </>
                )}
              </div>
            ))}
            {standups.length === 0 && <div className="empty">No stand-ups</div>}
          </div>
        </section>
      )}

      {tab === 'meetings' && (
        <section className="section">
          {showMeetingForm && (
            <div className="form-card">
              <input placeholder="Meeting title" value={meetingForm.title} onChange={e => setMeetingForm(f => ({ ...f, title: e.target.value }))} />
              <input placeholder="Group (e.g. Meta, Sprint Review)" value={meetingForm.group_name} onChange={e => setMeetingForm(f => ({ ...f, group_name: e.target.value }))} />
              <input type="date" value={meetingForm.meeting_date} onChange={e => setMeetingForm(f => ({ ...f, meeting_date: e.target.value }))} />
              <textarea placeholder="Notes" value={meetingForm.notes} onChange={e => setMeetingForm(f => ({ ...f, notes: e.target.value }))} />
              <div className="form-actions">
                <button className="btn" onClick={addMeeting}>Save</button>
                <button className="btn-ghost" onClick={() => setShowMeetingForm(false)}>Cancel</button>
              </div>
            </div>
          )}
          {[...groupedMeetings.entries()].map(([group, groupMeetings]) => (
            <div key={group} className="meeting-group">
              <div className="meeting-group-title">{group}</div>
              <div className="log-list">
                {groupMeetings.map(m => (
                  <div key={m.id} className="log-entry">
                    {editingMeetingId === m.id ? (
                      <div className="log-entry-edit">
                        <input placeholder="Title" value={meetingEditForm.title} onChange={e => setMeetingEditForm(f => ({ ...f, title: e.target.value }))} />
                        <input placeholder="Group" value={meetingEditForm.group_name} onChange={e => setMeetingEditForm(f => ({ ...f, group_name: e.target.value }))} />
                        <input type="date" value={meetingEditForm.meeting_date} onChange={e => setMeetingEditForm(f => ({ ...f, meeting_date: e.target.value }))} />
                        <textarea placeholder="Notes" value={meetingEditForm.notes} onChange={e => setMeetingEditForm(f => ({ ...f, notes: e.target.value }))} />
                        <div className="form-actions">
                          <button className="btn" onClick={saveMeetingEdit}>Save</button>
                          <button className="btn-ghost" onClick={() => setEditingMeetingId(null)}>Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="log-meta">
                          <span className="log-date">{m.meeting_date}</span>
                          <button className="btn-ghost sm" onClick={() => { setEditingMeetingId(m.id); setMeetingEditForm({ title: m.title, group_name: m.group_name ?? '', notes: m.notes ?? '', meeting_date: m.meeting_date }); }}>Edit</button>
                          <button className="btn-ghost sm" onClick={() => archiveMeeting(m.id)}>{showArchived ? 'Unarchive' : 'Archive'}</button>
                          <button className="log-delete" onClick={() => deleteMeeting(m.id)} title="Delete">×</button>
                        </div>
                        <div className="meeting-title">{m.title}</div>
                        {m.notes && <div className="log-notes">{m.notes}</div>}
                        {renderNoteActions('meeting', m.id)}
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
          {meetings.length === 0 && <div className="empty">No meetings</div>}
        </section>
      )}

      {tab === 'actions' && (
        <section className="section">
          <div className="log-list">
            {actions.map(a => (
              <div key={a.id} className="log-entry">
                {editingActionId === a.id ? (
                  <div className="log-entry-edit">
                    <input placeholder="Description" value={actionEditForm.description} onChange={e => setActionEditForm(f => ({ ...f, description: e.target.value }))} />
                    <select value={actionEditForm.status} onChange={e => setActionEditForm(f => ({ ...f, status: e.target.value as ActionStatus }))}>
                      {ACTION_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <div className="form-actions">
                      <button className="btn" onClick={saveActionEdit}>Save</button>
                      <button className="btn-ghost" onClick={() => setEditingActionId(null)}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="log-meta">
                      <span className={`badge status-${a.status}`}>{a.status}</span>
                      <span className="sub">
                        {a.standup ? `Stand-up ${a.standup.standup_date}` : a.meeting ? `${a.meeting.title}${a.meeting.group_name ? ` · ${a.meeting.group_name}` : ''}` : '—'}
                      </span>
                      <select className="status-select" value={a.status} onChange={e => updateActionStatus(a.id, e.target.value as ActionStatus)}>
                        {ACTION_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                      <button className="btn-ghost sm" onClick={() => { setEditingActionId(a.id); setActionEditForm({ description: a.description, status: a.status }); }}>Edit</button>
                      <button className="log-delete" onClick={() => deleteAction(a.id)} title="Delete">×</button>
                    </div>
                    <div className="log-notes">{a.description}</div>
                  </>
                )}
              </div>
            ))}
            {actions.length === 0 && <div className="empty">No actions</div>}
          </div>
        </section>
      )}
    </div>
  );
}
