import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import type { Task, TaskStatus } from '../types';

const TASK_STATUSES: TaskStatus[] = ['todo', 'in-progress', 'done'];

export default function Actions() {
  const [actions, setActions] = useState<Task[]>([]);

  async function load() {
    const { data } = await supabase
      .from('tasks')
      .select('*, project:projects(id, name), developer:developers(id, name)')
      .eq('archived', false)
      .order('created_at', { ascending: false });
    setActions(data ?? []);
  }

  useEffect(() => { load(); }, []);

  async function updateStatus(id: string, status: TaskStatus) {
    await supabase.from('tasks').update({ status }).eq('id', id);
    load();
  }

  return (
    <div>
      <div className="page-header">
        <h1>Actions</h1>
      </div>

      <table className="table">
        <thead>
          <tr><th>Action</th><th>Project</th><th>Assignee</th><th>Status</th><th>Added</th></tr>
        </thead>
        <tbody>
          {actions.map(a => (
            <tr key={a.id}>
              <td>
                {a.title}
                {a.description && <span className="sub"> — {a.description}</span>}
              </td>
              <td>
                {a.project
                  ? <Link to={`/projects/${a.project.id}`}>{a.project.name}</Link>
                  : '—'}
              </td>
              <td>{a.developer?.name ?? '—'}</td>
              <td>
                <select value={a.status} onChange={e => updateStatus(a.id, e.target.value as TaskStatus)}>
                  {TASK_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </td>
              <td className="sub">{a.created_at.split('T')[0]}</td>
            </tr>
          ))}
          {actions.length === 0 && <tr><td colSpan={5} className="empty">No actions</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
