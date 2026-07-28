import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { api, fmt } from '../api';

const statusColors = { draft: 'gray', dispatched: 'orange', delivered: 'green', cancelled: 'red' };

export default function Challans() {
  const [challans, setChallans]   = useState([]);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [modal, setModal]         = useState(null);
  const [detail, setDetail]       = useState(null);
  const [form, setForm]           = useState({ customer_id: '', delivery_address: '', notes: '' });
  const [items, setItems]         = useState([{ product_id: '', qty: 1, unit_price: 0, discount: 0 }]);
  const [statusFilter, setStatus] = useState('');

  const load = () => {
    setLoading(true);
    const q = statusFilter ? `?status=${statusFilter}` : '';
    Promise.all([api.get(`/challans${q}`), api.get('/customers'), api.get('/products')])
      .then(([c, cu, p]) => { setChallans(c); setCustomers(cu); setProducts(p); })
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, [statusFilter]);

  const openAdd = () => {
    setForm({ customer_id: '', delivery_address: '', notes: '' });
    setItems([{ product_id: '', qty: 1, unit_price: 0, discount: 0 }]);
    setModal('add');
  };

  const openDetail = async (ch) => {
    setDetail(null); setModal('detail');
    const d = await api.get(`/challans/${ch.id}`);
    setDetail(d);
  };

  const addItem = () => setItems([...items, { product_id: '', qty: 1, unit_price: 0, discount: 0 }]);
  const removeItem = (i) => setItems(items.filter((_, idx) => idx !== i));
  const updateItem = (i, key, val) => {
    const updated = [...items];
    updated[i] = { ...updated[i], [key]: val };
    if (key === 'product_id') {
      const p = products.find(p => p.id === Number(val));
      if (p) updated[i].unit_price = p.sale_price;
    }
    setItems(updated);
  };

  const customerChange = (id) => {
    setForm(f => ({ ...f, customer_id: id }));
    const c = customers.find(c => c.id === Number(id));
    if (c) setForm(f => ({ ...f, customer_id: id, delivery_address: c.address || '' }));
  };

  const save = async () => {
    try {
      await api.post('/challans', { ...form, items });
      toast.success('Challan created!');
      setModal(null); load();
    } catch (e) { toast.error(e.message); }
  };

  const updateStatus = async (id, status) => {
    await api.put(`/challans/${id}/status`, { status });
    toast.success(`Challan ${status}`);
    if (modal === 'detail') { const d = await api.get(`/challans/${id}`); setDetail(d); }
    load();
  };

  const totalAmount = items.reduce((s, i) => s + (i.qty * i.unit_price * (1 - (i.discount || 0) / 100)), 0);

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">Sales Challans</h1>
          <div className="page-desc">Create delivery challans for dispatching goods</div>
        </div>
        <button className="btn btn-primary" onClick={openAdd}>+ New Challan</button>
      </div>

      <div className="filters">
        <select className="filter-input" value={statusFilter} onChange={e => setStatus(e.target.value)}>
          <option value="">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="dispatched">Dispatched</option>
          <option value="delivered">Delivered</option>
        </select>
      </div>

      {loading ? <div className="loading"><div className="spinner"/></div> : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Challan No</th><th>Customer</th><th>Date</th><th>Delivery Address</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {challans.length === 0 ? (
                <tr><td colSpan={6}><div className="empty-state"><div className="empty-icon">📋</div><h3>No challans found</h3></div></td></tr>
              ) : challans.map(ch => (
                <tr key={ch.id}>
                  <td><span className="mono">{ch.challan_no}</span></td>
                  <td style={{ fontWeight: 600 }}>{ch.customer_name}</td>
                  <td style={{ color: 'var(--text-secondary)' }}>{fmt.date(ch.challan_date)}</td>
                  <td style={{ color: 'var(--text-secondary)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ch.delivery_address}</td>
                  <td><span className={`badge badge-${statusColors[ch.status]}`}>{ch.status}</span></td>
                  <td>
                    <div className="flex gap-2">
                      <button className="btn btn-sm btn-secondary" onClick={() => openDetail(ch)}>View</button>
                      {ch.status === 'draft' && <button className="btn btn-sm btn-orange" style={{ background: 'var(--orange-bg)', color: 'var(--orange)', border: '1px solid rgba(249,115,22,0.2)' }} onClick={() => updateStatus(ch.id, 'dispatched')}>Dispatch</button>}
                      {ch.status === 'dispatched' && <button className="btn btn-sm btn-success" onClick={() => updateStatus(ch.id, 'delivered')}>Delivered</button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Modal */}
      {modal === 'add' && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="modal modal-lg">
            <div className="modal-header">
              <div className="modal-title">Create Challan</div>
              <button className="modal-close" onClick={() => setModal(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Customer *</label>
                  <select className="form-control" value={form.customer_id} onChange={e => customerChange(e.target.value)}>
                    <option value="">Select customer...</option>
                    {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Delivery Address</label>
                <textarea className="form-control" value={form.delivery_address} onChange={e => setForm({...form, delivery_address: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Notes</label>
                <textarea className="form-control" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} placeholder="Special delivery instructions..." />
              </div>
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                  <div style={{ fontWeight: 700 }}>Items</div>
                  <button className="btn btn-sm btn-secondary" onClick={addItem}>+ Add Row</button>
                </div>
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>Product</th><th>Qty</th><th>Unit Price</th><th>Disc%</th><th>Total</th><th></th></tr></thead>
                    <tbody>
                      {items.map((item, i) => {
                        const total = item.qty * item.unit_price * (1 - (item.discount || 0)/100);
                        return (
                          <tr key={i}>
                            <td>
                              <select className="form-control" style={{ minWidth: 200 }} value={item.product_id} onChange={e => updateItem(i, 'product_id', e.target.value)}>
                                <option value="">Select...</option>
                                {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                              </select>
                            </td>
                            <td><input className="form-control" type="number" style={{ width: 70 }} value={item.qty} onChange={e => updateItem(i, 'qty', Number(e.target.value))} /></td>
                            <td><input className="form-control" type="number" style={{ width: 90 }} value={item.unit_price} onChange={e => updateItem(i, 'unit_price', Number(e.target.value))} /></td>
                            <td><input className="form-control" type="number" style={{ width: 60 }} value={item.discount} onChange={e => updateItem(i, 'discount', Number(e.target.value))} /></td>
                            <td className="font-bold">{fmt.currency(total)}</td>
                            <td><button className="btn btn-sm btn-danger btn-icon" onClick={() => removeItem(i)}>✕</button></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div style={{ textAlign: 'right', marginTop: 12, fontWeight: 800, fontSize: 16 }}>
                  Subtotal: <span style={{ color: 'var(--accent-light)' }}>{fmt.currency(totalAmount)}</span>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={save}>Create Challan</button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {modal === 'detail' && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="modal modal-lg">
            <div className="modal-header">
              <div>
                <div className="modal-title">{detail?.challan_no || 'Loading...'}</div>
                {detail && <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{detail.customer_name}</span>
                  <span className={`badge badge-${statusColors[detail.status]}`}>{detail.status}</span>
                </div>}
              </div>
              <button className="modal-close" onClick={() => setModal(null)}>✕</button>
            </div>
            {!detail ? <div className="loading" style={{ padding: 40 }}><div className="spinner"/></div> : (
              <div className="modal-body">
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>SKU</th><th>Product</th><th>Qty</th><th>Unit Price</th><th>Disc%</th><th>Total</th></tr></thead>
                    <tbody>
                      {detail.items?.map(item => (
                        <tr key={item.id}>
                          <td><span className="mono">{item.sku}</span></td>
                          <td>{item.product_name}</td>
                          <td>{item.qty} {item.unit}</td>
                          <td>{fmt.currency(item.unit_price)}</td>
                          <td>{item.discount}%</td>
                          <td className="font-bold">{fmt.currency(item.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div style={{ textAlign: 'right', fontWeight: 800, fontSize: 16 }}>
                  Total: <span style={{ color: 'var(--accent-light)' }}>{fmt.currency(detail.items?.reduce((s,i) => s+i.total, 0))}</span>
                </div>
                {detail.delivery_address && <div style={{ background: 'var(--bg-hover)', borderRadius: 8, padding: 12 }}>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Delivery Address</div>
                  <div style={{ fontSize: 13 }}>{detail.delivery_address}</div>
                </div>}
                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                  {detail.status === 'draft' && <button className="btn btn-primary" onClick={() => updateStatus(detail.id, 'dispatched')}>Mark as Dispatched</button>}
                  {detail.status === 'dispatched' && <button className="btn btn-success" onClick={() => updateStatus(detail.id, 'delivered')}>Mark as Delivered</button>}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
