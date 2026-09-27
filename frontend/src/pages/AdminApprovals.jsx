import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api.js';

export default function AdminApprovals() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    setError('');
    try { setRequests(await api.getApprovalRequests()); }
    catch (e) { setError(e.message || 'Unable to load approval requests.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function review(userId, status) {
    setBusyId(userId); setError(''); setMessage('');
    try {
      await api.reviewApproval(userId, status);
      setMessage(status === 'approved' ? 'Tournament Manager approved. They can now create tournaments.' : 'Request rejected.');
      await load();
    } catch (e) { setError(e.message || 'Could not update approval.'); }
    finally { setBusyId(''); }
  }

  const pending = requests.filter((r) => r.status === 'pending');
  const reviewed = requests.filter((r) => r.status !== 'pending');

  return <div className="admin-page">
    <div className="page-head"><div><span className="eyebrow">ADMIN CONTROL</span><h1>Tournament approvals</h1><p className="muted">Review Tournament Manager access requests before tournament creation is enabled.</p></div><Link className="btn btn-ghost" to="/admin">← Admin dashboard</Link></div>
    {message && <div className="admin-success">✓ {message}</div>}
    {error && <div className="alert error" role="alert">{error}</div>}
    <section className="admin-card">
      <div className="section-heading"><div><span className="eyebrow">NEEDS REVIEW</span><h2>Pending requests <span className="status">{pending.length}</span></h2></div><button type="button" className="btn btn-ghost" onClick={load}>Refresh</button></div>
      {loading ? <p className="muted">Loading requests…</p> : pending.length === 0 ? <p className="muted">No pending approval requests.</p> : <div className="manager-team-list">{pending.map((r) => <div key={r.user_id} className="approval-row"><span><b>{r.display_name || r.email || 'Tournament Manager'}</b><small>{r.email || r.user_id}</small><small>Requested {r.requested_at ? new Date(r.requested_at).toLocaleString() : 'recently'}</small></span><div className="fixture-actions"><button disabled={!!busyId} onClick={() => review(r.user_id, 'rejected')}>Reject</button><button className="btn btn-primary" disabled={!!busyId} onClick={() => review(r.user_id, 'approved')}>{busyId === r.user_id ? 'Saving…' : 'Approve manager →'}</button></div></div>)}</div>}
    </section>
    <section className="admin-card">
      <span className="eyebrow">HISTORY</span><h2>Reviewed requests</h2>
      {!reviewed.length ? <p className="muted">No reviewed requests yet.</p> : <div className="manager-team-list">{reviewed.map((r) => <div key={r.user_id}><span><b>{r.display_name || r.email || 'Tournament Manager'}</b><small>{r.email || r.user_id}</small></span><span className={r.status === 'approved' ? 'status status-approved' : 'status'}>{r.status.toUpperCase()}</span></div>)}</div>}
    </section>
  </div>;
}
