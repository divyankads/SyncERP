import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { api, fmt } from '../api';

const typeIcons = { call: '📞', email: '📧', visit: '🤝', whatsapp: '💬' };
const statusColors = { pending: 'yellow', done: 'green', cancelled: 'red' };

export default function CRM() {
  const [followups, setFollowups] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [modal, setModal]         = useState(null);
  const [selected, setSelected]   = useState(null);
  const [statusFilter, setStatus] = useState('');
  const [form, setForm] = useState({ customer_id: '', type: 'call', notes: '', status: 'pending', follow_date: new Date().toISOString().split('T')[0] });

  const load = () => {
    setLoading(true);
    const q = statusFilter ? `?status=${statusFilter}` : '';
    Promise.all([api.get(`/crm${q}`), api.get('/customers')])
      .then(([f, c]) => { setFollowups(f); setCustomers(c); })
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, [statusFilter]);

  const openAdd  = () => { setForm({ customer_id: '', type: 'call', notes: '', status: 'pending', follow_date: new Date().toISOString().split('T')[0] }); setModal('add'); };
  const openEdit = (f) => { setForm(f); setSelected(f); setModal('edit'); };

  const save = async () => {
    try {
      if (modal === 'add') { await api.post('/crm', form); toast.success('Follow-up created!'); }
      else { await api.put(`/crm/${selected.id}`, form); toast.success('Updated!'); }
      setModal(null); load();
    } catch (e) { toast.error(e.message); }
  };

  const markDone = async (id) => {
    const fu = followups.find(f => f.id === id);
    await api.put(`/crm/${id}`, { ...fu, status: 'done' });
    toast.success('Marked done!'); load();
  };

  const deleteFU = async (id) => {
    await api.delete(`/crm/${id}`);
    toast.success('Deleted'); load();
  };

  const pendingCount = followups.filter(f => f.status === 'pending').length;

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">CRM Follow-ups</h1>
          <div className="page-desc">
            Track calls, emails and customer interactions
            {pendingCount > 0 && <span className="badge badge-yellow" style={{ marginLeft: 10 }}>{pendingCount} pending</span>}
          </div>
        </div>
        <button className="btn btn-primary" onClick={openAdd}>+ Add Follow-up</button>
      </div>

      <div className="filters">
        <select className="filter-input" value={statusFilter} onChange={e => setStatus(e.target.value)}>
          <option value="">All</option>
          <option value="pending">Pending</option>
          <option value="done">Done</option>
        </select>
      </div>

      {loading ? <div className="loading"><div className="spinner"/></div> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {followups.length === 0 ? (
            <div className="empty-state"><div className="empty-icon">🤝</div><h3>No follow-ups found</h3></div>
          ) : followups.map(fu => (
            <div key={fu.id} className="card" style={{ padding: 16, display: 'flex', alignItems: 'flex-start', gap: 16, transition: 'var(--transition)' }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: fu.status === 'done' ? 'var(--green-bg)' : 'var(--yellow-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
                {typeIcons[fu.type] || '📋'}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                  <span style={{ fontWeight: 700 }}>{fu.customer_name}</span>
                  <span className={`badge badge-${statusColors[fu.status]}`}>{fu.status}</span>
                  <span className="badge badge-blue">{fu.type}</span>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 'auto' }}>{fmt.date(fu.follow_date)}</span>
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{fu.notes}</div>
              </div>
              <div className="flex gap-2" style={{ flexShrink: 0 }}>
                {fu.status === 'pending' && <button className="btn btn-sm btn-success" onClick={() => markDone(fu.id)}>✓ Done</button>}
                <button className="btn btn-sm btn-secondary" onClick={() => openEdit(fu)}>Edit</button>
                <button className="btn btn-sm btn-danger" onClick={() => deleteFU(fu.id)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="modal">
            <div className="modal-header">
              <div className="modal-title">{modal === 'add' ? 'Add Follow-up' : 'Edit Follow-up'}</div>
              <button className="modal-close" onClick={() => setModal(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Customer *</label>
                <select className="form-control" value={form.customer_id} onChange={e => setForm({...form, customer_id: e.target.value})}>
                  <option value="">Select customer...</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Type</label>
                  <select className="form-control" value={form.type} onChange={e => setForm({...form, type: e.target.value})}>
                    {['call', 'email', 'visit', 'whatsapp'].map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Date</label>
                  <input className="form-control" type="date" value={form.follow_date} onChange={e => setForm({...form, follow_date: e.target.value})} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Status</label>
                <select className="form-control" value={form.status} onChange={e => setForm({...form, status: e.target.value})}>
                  <option value="pending">Pending</option>
                  <option value="done">Done</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Notes</label>
                <textarea className="form-control" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} placeholder="Describe the interaction..." style={{ minHeight: 100 }} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={save}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
