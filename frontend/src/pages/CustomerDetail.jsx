import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { api, fmt } from '../api';

const CUSTOMER_TYPES = ['Retail', 'Wholesale', 'Distributor'];
const STATUSES = ['Lead', 'Active', 'Inactive'];
const FOLLOWUP_TYPES = ['call', 'email', 'visit', 'whatsapp'];

export default function CustomerDetail() {
  const { id } = useParams();
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('crm'); // 'crm' | 'challans' | 'invoices'

  // Edit Modal State
  const [editModal, setEditModal] = useState(false);
  const [form, setForm] = useState({});

  // New Follow-up State
  const [newFollowup, setNewFollowup] = useState({
    type: 'call',
    notes: '',
    status: 'done',
    follow_date: new Date().toISOString().split('T')[0]
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get(`/customers/${id}`);
      setCustomer(data);
      setForm(data);
    } catch (e) {
      toast.error('Failed to load customer: ' + e.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleUpdateCustomer = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/customers/${id}`, form);
      toast.success('Customer details updated');
      setEditModal(false);
      loadData();
    } catch (e) {
      toast.error(e.message);
    }
  };

  const handleAddFollowup = async (e) => {
    e.preventDefault();
    if (!newFollowup.notes.trim()) {
      toast.error('Please enter follow-up notes');
      return;
    }
    try {
      await api.post(`/customers/${id}/followups`, newFollowup);
      toast.success('Follow-up note added');
      setNewFollowup({
        type: 'call',
        notes: '',
        status: 'done',
        follow_date: new Date().toISOString().split('T')[0]
      });
      loadData();
    } catch (e) {
      toast.error(e.message);
    }
  };

  if (loading) {
    return (
      <div className="page-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '80vh' }}>
        <div className="spinner" />
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="page-content">
        <div className="empty-state">
          <div className="empty-icon">👥</div>
          <h3>Customer not found</h3>
          <Link to="/customers" className="btn btn-primary" style={{ marginTop: 12 }}>Back to Customers</Link>
        </div>
      </div>
    );
  }

  const getStatusClass = (status) => {
    switch (status) {
      case 'Active': return 'badge-green';
      case 'Lead': return 'badge-yellow';
      default: return 'badge-red';
    }
  };

  return (
    <div className="page-content">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
            <Link to="/customers" style={{ textDecoration: 'none', color: 'var(--text-secondary)', fontSize: 13 }}>← Back to Customers</Link>
          </div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {customer.name}
            <span className={`badge ${getStatusClass(customer.status)}`}>{customer.status}</span>
          </h1>
          <div className="page-desc">{customer.business_name || 'Individual Retail Account'}</div>
        </div>
        <button className="btn btn-secondary" onClick={() => setEditModal(true)}>⚙️ Edit Details</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 24, alignItems: 'start' }}>
        {/* Left Side: General Profile Card */}
        <div className="card" style={{ padding: 24 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, borderBottom: '1px solid var(--border)', paddingBottom: 10 }}>
            Profile Details
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 2 }}>Business Name</div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{customer.business_name || '—'}</div>
            </div>

            <div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 2 }}>Mobile Number</div>
              <div style={{ fontSize: 14, fontWeight: 600 }} className="mono">{customer.mobile_number || '—'}</div>
            </div>

            <div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 2 }}>Email Address</div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{customer.email || '—'}</div>
            </div>

            <div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 2 }}>GSTIN</div>
              <div style={{ fontSize: 14, fontWeight: 600 }} className="mono">{customer.gstin || '—'}</div>
            </div>

            <div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 2 }}>Customer Type</div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{customer.customer_type}</div>
            </div>

            <div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 2 }}>Credit Limit</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--accent)' }}>{fmt.currency(customer.credit_limit)}</div>
            </div>

            <div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 2 }}>Follow-up Date</div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{fmt.date(customer.follow_up_date)}</div>
            </div>

            <div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 2 }}>Address</div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                {customer.address ? `${customer.address}${customer.city ? ', ' + customer.city : ''}` : '—'}
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Tab Panels */}
        <div>
          {/* Tab selector */}
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: 20 }}>
            {[
              { id: 'crm', label: '🤝 CRM Follow-ups' },
              { id: 'challans', label: '📋 Challans' },
              { id: 'invoices', label: '🧾 Invoices' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  background: 'none', border: 'none',
                  borderBottom: activeTab === tab.id ? '2px solid var(--accent)' : '2px solid transparent',
                  color: activeTab === tab.id ? 'var(--text-primary)' : 'var(--text-muted)',
                  padding: '12px 20px', cursor: 'pointer', fontSize: 14, fontWeight: 600,
                  transition: 'var(--transition)'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* CRM / Follow-up Notes Panel */}
          {activeTab === 'crm' && (
            <div>
              {/* Add Follow-up card */}
              <div className="card" style={{ padding: 20, marginBottom: 24 }}>
                <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>New Follow-up Note</h4>
                <form onSubmit={handleAddFollowup}>
                  <div className="form-row" style={{ marginBottom: 12 }}>
                    <div className="form-group" style={{ flex: 1 }}>
                      <label className="form-label">Contact Type</label>
                      <select
                        className="form-control"
                        value={newFollowup.type}
                        onChange={e => setNewFollowup({ ...newFollowup, type: e.target.value })}
                      >
                        {FOLLOWUP_TYPES.map(t => (
                          <option key={t} value={t}>{t.toUpperCase()}</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group" style={{ flex: 1 }}>
                      <label className="form-label">Next Date / Action Date</label>
                      <input
                        className="form-control"
                        type="date"
                        value={newFollowup.follow_date}
                        onChange={e => setNewFollowup({ ...newFollowup, follow_date: e.target.value })}
                      />
                    </div>
                    <div className="form-group" style={{ flex: 1 }}>
                      <label className="form-label">Status</label>
                      <select
                        className="form-control"
                        value={newFollowup.status}
                        onChange={e => setNewFollowup({ ...newFollowup, status: e.target.value })}
                      >
                        <option value="done">Completed</option>
                        <option value="pending">Pending</option>
                      </select>
                    </div>
                  </div>
                  <div className="form-group" style={{ marginBottom: 16 }}>
                    <label className="form-label">Conversation / Follow-up Notes</label>
                    <textarea
                      className="form-control"
                      rows="3"
                      value={newFollowup.notes}
                      onChange={e => setNewFollowup({ ...newFollowup, notes: e.target.value })}
                      placeholder="Discussed requirements, customer requested pricing sheet..."
                    />
                  </div>
                  <button type="submit" className="btn btn-primary">+ Save Follow-up</button>
                </form>
              </div>

              {/* Follow-up Timeline */}
              <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>Timeline & History</h4>
              {customer.followups?.length === 0 ? (
                <div className="empty-state" style={{ padding: 32 }}>
                  <div style={{ fontSize: 24, marginBottom: 8 }}>🤝</div>
                  <p className="text-muted" style={{ fontSize: 13 }}>No interaction logs recorded yet.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {customer.followups?.map(f => (
                    <div className="card" key={f.id} style={{ padding: 16 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span className={`badge ${f.type === 'call' ? 'badge-blue' : f.type === 'visit' ? 'badge-green' : 'badge-yellow'}`}>
                            {f.type.toUpperCase()}
                          </span>
                          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                            by {f.created_by_name || 'Staff'}
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 12, color: 'var(--text-muted)' }} className="mono">
                            {fmt.date(f.follow_date)}
                          </span>
                          <span className={`badge ${f.status === 'done' ? 'badge-green' : 'badge-red'}`}>
                            {f.status}
                          </span>
                        </div>
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>
                        {f.notes}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Challans Panel */}
          {activeTab === 'challans' && (
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Challan No</th>
                      <th>Delivery Address</th>
                      <th>Status</th>
                      <th>Date</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customer.challans?.length === 0 ? (
                      <tr>
                        <td colSpan={5} style={{ textAlign: 'center', padding: 32 }}>
                          No challans created for this customer.
                        </td>
                      </tr>
                    ) : (
                      customer.challans?.map(ch => (
                        <tr key={ch.id}>
                          <td className="mono font-bold">{ch.challan_no}</td>
                          <td style={{ fontSize: 13 }}>{ch.delivery_address || '—'}</td>
                          <td>
                            <span className={`badge ${ch.status === 'Confirmed' ? 'badge-green' : ch.status === 'Cancelled' ? 'badge-red' : 'badge-yellow'}`}>
                              {ch.status}
                            </span>
                          </td>
                          <td className="mono">{fmt.date(ch.challan_date)}</td>
                          <td>
                            <Link to="/challans" className="btn btn-sm btn-secondary">Go to Challans</Link>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Invoices Panel */}
          {activeTab === 'invoices' && (
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Invoice No</th>
                      <th>Due Date</th>
                      <th>Total Amount</th>
                      <th>Balance</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customer.invoices?.length === 0 ? (
                      <tr>
                        <td colSpan={5} style={{ textAlign: 'center', padding: 32 }}>
                          No invoices generated yet.
                        </td>
                      </tr>
                    ) : (
                      customer.invoices?.map(inv => (
                        <tr key={inv.id}>
                          <td className="mono font-bold">{inv.invoice_no}</td>
                          <td className="mono">{fmt.date(inv.due_date)}</td>
                          <td className="font-bold">{fmt.currency(inv.total_amount)}</td>
                          <td className="font-bold mono" style={{ color: 'var(--red)' }}>
                            {fmt.currency(inv.total_amount - inv.paid_amount)}
                          </td>
                          <td>
                            <span className={`badge ${inv.status === 'paid' ? 'badge-green' : inv.status === 'partial' ? 'badge-yellow' : 'badge-red'}`}>
                              {inv.status.toUpperCase()}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Edit Customer Modal */}
      {editModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setEditModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <div className="modal-title">Edit Customer Details</div>
              <button className="modal-close" onClick={() => setEditModal(false)}>✕</button>
            </div>
            <form onSubmit={handleUpdateCustomer}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Customer Name *</label>
                    <input
                      className="form-control"
                      value={form.name || ''}
                      onChange={e => setForm({ ...form, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Business Name</label>
                    <input
                      className="form-control"
                      value={form.business_name || ''}
                      onChange={e => setForm({ ...form, business_name: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Mobile Number</label>
                    <input
                      className="form-control"
                      value={form.mobile_number || ''}
                      onChange={e => setForm({ ...form, mobile_number: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Email Address</label>
                    <input
                      className="form-control"
                      type="email"
                      value={form.email || ''}
                      onChange={e => setForm({ ...form, email: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">GSTIN (Optional)</label>
                    <input
                      className="form-control mono"
                      value={form.gstin || ''}
                      onChange={e => setForm({ ...form, gstin: e.target.value })}
                      placeholder="e.g. 07AABCU9603R1ZX"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Customer Type</label>
                    <select
                      className="form-control"
                      value={form.customer_type || 'Retail'}
                      onChange={e => setForm({ ...form, customer_type: e.target.value })}
                    >
                      {CUSTOMER_TYPES.map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">City</label>
                    <input
                      className="form-control"
                      value={form.city || ''}
                      onChange={e => setForm({ ...form, city: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Credit Limit (₹)</label>
                    <input
                      className="form-control"
                      type="number"
                      value={form.credit_limit || 0}
                      onChange={e => setForm({ ...form, credit_limit: Number(e.target.value) })}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Status</label>
                    <select
                      className="form-control"
                      value={form.status || 'Lead'}
                      onChange={e => setForm({ ...form, status: e.target.value })}
                    >
                      {STATUSES.map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Follow-up Date</label>
                    <input
                      className="form-control"
                      type="date"
                      value={form.follow_up_date || ''}
                      onChange={e => setForm({ ...form, follow_up_date: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Address</label>
                  <input
                    className="form-control"
                    value={form.address || ''}
                    onChange={e => setForm({ ...form, address: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">General Notes</label>
                  <textarea
                    className="form-control"
                    rows="3"
                    value={form.notes || ''}
                    onChange={e => setForm({ ...form, notes: e.target.value })}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setEditModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
