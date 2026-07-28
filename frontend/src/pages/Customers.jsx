import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { api, fmt } from '../api';

const EMPTY = { name: '', email: '', phone: '', address: '', city: '', gstin: '', credit_limit: '', status: 'active' };

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [modal, setModal]       = useState(null); // null | 'add' | 'edit' | 'detail'
  const [form, setForm]         = useState(EMPTY);
  const [selected, setSelected] = useState(null);
  const [detail, setDetail]     = useState(null);

  const load = () => {
    setLoading(true);
    api.get(`/customers?search=${search}`).then(setCustomers).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, [search]);

  const openAdd  = () => { setForm(EMPTY); setModal('add'); };
  const openEdit = (c) => { setForm(c); setSelected(c); setModal('edit'); };
  const openDetail = async (c) => {
    setDetail(null); setModal('detail');
    const d = await api.get(`/customers/${c.id}`);
    setDetail(d);
  };

  const save = async () => {
    try {
      if (modal === 'add') { await api.post('/customers', form); toast.success('Customer created!'); }
      else { await api.put(`/customers/${selected.id}`, form); toast.success('Customer updated!'); }
      setModal(null); load();
    } catch (e) { toast.error(e.message); }
  };

  const deactivate = async (id) => {
    if (!confirm('Deactivate this customer?')) return;
    await api.delete(`/customers/${id}`);
    toast.success('Deactivated'); load();
  };

  const statusBadge = (s) => <span className={`badge badge-${s === 'active' ? 'green' : 'red'}`}>{s}</span>;

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">Customers</h1>
          <div className="page-desc">Manage your customer database and accounts</div>
        </div>
        <button className="btn btn-primary" onClick={openAdd}>+ Add Customer</button>
      </div>

      <div className="filters">
        <input className="filter-input" placeholder="🔍 Search name, email, phone..." value={search} onChange={e => setSearch(e.target.value)} style={{ minWidth: 300 }} />
      </div>

      {loading ? <div className="loading"><div className="spinner"/></div> : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Name</th>
                <th>Phone</th>
                <th>City</th>
                <th>GSTIN</th>
                <th>Credit Limit</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {customers.length === 0 ? (
                <tr><td colSpan={8}><div className="empty-state"><div className="empty-icon">👥</div><h3>No customers found</h3></div></td></tr>
              ) : customers.map((c, i) => (
                <tr key={c.id}>
                  <td style={{ color: 'var(--text-muted)' }}>{i+1}</td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{c.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{c.email}</div>
                  </td>
                  <td className="mono">{c.phone}</td>
                  <td>{c.city}</td>
                  <td><span className="mono">{c.gstin || '—'}</span></td>
                  <td className="font-bold">{fmt.currency(c.credit_limit)}</td>
                  <td>{statusBadge(c.status)}</td>
                  <td>
                    <div className="flex gap-2">
                      <button className="btn btn-sm btn-secondary" onClick={() => openDetail(c)}>View</button>
                      <button className="btn btn-sm btn-secondary" onClick={() => openEdit(c)}>Edit</button>
                      <button className="btn btn-sm btn-danger" onClick={() => deactivate(c.id)}>Deactivate</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add/Edit Modal */}
      {(modal === 'add' || modal === 'edit') && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="modal">
            <div className="modal-header">
              <div className="modal-title">{modal === 'add' ? 'Add Customer' : 'Edit Customer'}</div>
              <button className="modal-close" onClick={() => setModal(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Name *</label>
                  <input className="form-control" value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Company name" />
                </div>
                <div className="form-group">
                  <label className="form-label">Phone</label>
                  <input className="form-control" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} placeholder="9XXXXXXXXX" />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input className="form-control" type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="contact@company.com" />
                </div>
                <div className="form-group">
                  <label className="form-label">City</label>
                  <input className="form-control" value={form.city} onChange={e => setForm({...form, city: e.target.value})} placeholder="Delhi" />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Address</label>
                <textarea className="form-control" value={form.address} onChange={e => setForm({...form, address: e.target.value})} placeholder="Street, area..." />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">GSTIN</label>
                  <input className="form-control mono" value={form.gstin} onChange={e => setForm({...form, gstin: e.target.value})} placeholder="27AABCU9603R1ZX" />
                </div>
                <div className="form-group">
                  <label className="form-label">Credit Limit (₹)</label>
                  <input className="form-control" type="number" value={form.credit_limit} onChange={e => setForm({...form, credit_limit: e.target.value})} placeholder="100000" />
                </div>
              </div>
              {modal === 'edit' && (
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select className="form-control" value={form.status} onChange={e => setForm({...form, status: e.target.value})}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={save}>Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {modal === 'detail' && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="modal modal-lg">
            <div className="modal-header">
              <div className="modal-title">{detail?.name || 'Loading...'}</div>
              <button className="modal-close" onClick={() => setModal(null)}>✕</button>
            </div>
            {!detail ? <div className="loading" style={{ padding: 40 }}><div className="spinner"/></div> : (
              <div className="modal-body">
                <div className="form-row">
                  {[['Phone', detail.phone], ['Email', detail.email], ['City', detail.city], ['GSTIN', detail.gstin], ['Credit Limit', fmt.currency(detail.credit_limit)]].map(([k,v]) => (
                    <div key={k} style={{ background: 'var(--bg-hover)', borderRadius: 8, padding: '10px 14px' }}>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 }}>{k}</div>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{v || '—'}</div>
                    </div>
                  ))}
                </div>
                <div>
                  <div style={{ fontWeight: 700, marginBottom: 8 }}>Recent Invoices</div>
                  {detail.invoices?.length === 0 ? <div className="text-muted text-sm">No invoices</div> : (
                    <div className="table-wrap">
                      <table>
                        <thead><tr><th>Invoice</th><th>Date</th><th>Amount</th><th>Status</th></tr></thead>
                        <tbody>
                          {detail.invoices?.slice(0,5).map(inv => (
                            <tr key={inv.id}>
                              <td><span className="mono">{inv.invoice_no}</span></td>
                              <td>{fmt.date(inv.invoice_date)}</td>
                              <td className="font-bold">{fmt.currency(inv.total_amount)}</td>
                              <td><span className={`badge badge-${inv.status === 'paid' ? 'green' : inv.status === 'partial' ? 'yellow' : 'red'}`}>{inv.status}</span></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
                <div>
                  <div style={{ fontWeight: 700, marginBottom: 8 }}>Follow-ups</div>
                  {detail.followups?.length === 0 ? <div className="text-muted text-sm">No follow-ups</div> : (
                    detail.followups?.slice(0,3).map(f => (
                      <div key={f.id} style={{ background: 'var(--bg-hover)', borderRadius: 8, padding: '10px 14px', marginBottom: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                          <span className="badge badge-blue">{f.type}</span>
                          <span className="text-sm text-muted">{fmt.date(f.follow_date)}</span>
                          <span className={`badge badge-${f.status === 'done' ? 'green' : 'yellow'}`}>{f.status}</span>
                        </div>
                        <div style={{ fontSize: 13 }}>{f.notes}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
