import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { api, fmt } from '../api';

const EMPTY = {
  name: '',
  mobile_number: '',
  email: '',
  business_name: '',
  gstin: '',
  customer_type: 'Retail',
  address: '',
  city: '',
  credit_limit: 0,
  status: 'Lead',
  follow_up_date: '',
  notes: ''
};

const CUSTOMER_TYPES = ['Retail', 'Wholesale', 'Distributor'];
const STATUSES = ['Lead', 'Active', 'Inactive'];

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [modal, setModal] = useState(null); // null | 'add' | 'edit'
  const [form, setForm] = useState(EMPTY);
  const [selected, setSelected] = useState(null);
  const navigate = useNavigate();

  const load = () => {
    setLoading(true);
    let url = `/customers?search=${search}`;
    if (statusFilter) url += `&status=${statusFilter}`;
    if (typeFilter) url += `&customer_type=${typeFilter}`;
    api.get(url)
      .then(setCustomers)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [search, statusFilter, typeFilter]);

  const openAdd = () => {
    setForm(EMPTY);
    setModal('add');
  };

  const openEdit = (c) => {
    setForm({ ...c });
    setSelected(c);
    setModal('edit');
  };

  const save = async (e) => {
    e.preventDefault();
    if (!form.name) {
      toast.error('Customer name is required');
      return;
    }
    try {
      if (modal === 'add') {
        await api.post('/customers', form);
        toast.success('Customer created!');
      } else {
        await api.put(`/customers/${selected.id}`, form);
        toast.success('Customer updated!');
      }
      setModal(null);
      load();
    } catch (e) {
      toast.error(e.message);
    }
  };

  const deactivate = async (id) => {
    if (!confirm('Deactivate this customer?')) return;
    try {
      await api.delete(`/customers/${id}`);
      toast.success('Customer deactivated');
      load();
    } catch (e) {
      toast.error(e.message);
    }
  };

  const statusBadge = (s) => {
    let cl = 'badge-blue';
    if (s === 'Active') cl = 'badge-green';
    if (s === 'Lead') cl = 'badge-yellow';
    if (s === 'Inactive') cl = 'badge-red';
    return <span className={`badge ${cl}`}>{s}</span>;
  };

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">Customer CRM</h1>
          <div className="page-desc">Manage profiles, leads, status, and CRM history</div>
        </div>
        <button className="btn btn-primary" onClick={openAdd}>+ Add Customer</button>
      </div>

      <div className="filters" style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        <input
          className="filter-input"
          placeholder="🔍 Search name, business, mobile, email..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ minWidth: 260, flex: 1 }}
        />
        <select
          className="form-control"
          style={{ width: 150 }}
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
        >
          <option value="">All Statuses</option>
          {STATUSES.map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select
          className="form-control"
          style={{ width: 150 }}
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value)}
        >
          <option value="">All Types</option>
          {CUSTOMER_TYPES.map(t => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      {loading ? <div className="loading"><div className="spinner" /></div> : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Name / Business</th>
                <th>Mobile</th>
                <th>Type</th>
                <th>GSTIN</th>
                <th>Follow-up Date</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {customers.length === 0 ? (
                <tr>
                  <td colSpan={8}>
                    <div className="empty-state">
                      <div className="empty-icon">👥</div>
                      <h3>No customers found</h3>
                    </div>
                  </td>
                </tr>
              ) : customers.map((c, i) => (
                <tr key={c.id}>
                  <td style={{ color: 'var(--text-muted)' }}>{i + 1}</td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{c.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      {c.business_name || 'Retail Customer'} {c.email ? `• ${c.email}` : ''}
                    </div>
                  </td>
                  <td className="mono">{c.mobile_number || '—'}</td>
                  <td>{c.customer_type}</td>
                  <td><span className="mono">{c.gstin || '—'}</span></td>
                  <td className="mono">{fmt.date(c.follow_up_date)}</td>
                  <td>{statusBadge(c.status)}</td>
                  <td>
                    <div className="flex gap-2">
                      <button className="btn btn-sm btn-secondary" onClick={() => navigate(`/customers/${c.id}`)}>
                        👁️ View Detail
                      </button>
                      <button className="btn btn-sm btn-secondary" onClick={() => openEdit(c)}>
                        ✏️ Edit
                      </button>
                      <button className="btn btn-sm btn-danger" onClick={() => deactivate(c.id)}>
                        Deactivate
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add / Edit Modal */}
      {(modal === 'add' || modal === 'edit') && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="modal">
            <div className="modal-header">
              <div className="modal-title">{modal === 'add' ? 'Add Customer Profile' : 'Edit Customer Profile'}</div>
              <button className="modal-close" onClick={() => setModal(null)}>✕</button>
            </div>
            <form onSubmit={save}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Customer Name *</label>
                    <input
                      className="form-control"
                      value={form.name || ''}
                      onChange={e => setForm({ ...form, name: e.target.value })}
                      placeholder="e.g. John Doe"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Business Name</label>
                    <input
                      className="form-control"
                      value={form.business_name || ''}
                      onChange={e => setForm({ ...form, business_name: e.target.value })}
                      placeholder="e.g. Acme Corp"
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
                      placeholder="e.g. 9876543210"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Email Address</label>
                    <input
                      className="form-control"
                      type="email"
                      value={form.email || ''}
                      onChange={e => setForm({ ...form, email: e.target.value })}
                      placeholder="e.g. john@acme.com"
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
                      placeholder="e.g. Delhi"
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
                    placeholder="e.g. 12, Industrial Area"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Initial Notes</label>
                  <textarea
                    className="form-control"
                    rows="3"
                    value={form.notes || ''}
                    onChange={e => setForm({ ...form, notes: e.target.value })}
                    placeholder="General comments or requirements..."
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setModal(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Profile</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
