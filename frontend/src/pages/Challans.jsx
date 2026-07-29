import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { api, fmt } from '../api';

const STATUS_COLORS = { Draft: 'gray', Confirmed: 'green', Cancelled: 'red' };
const STATUS_ICONS  = { Draft: '📝', Confirmed: '✅', Cancelled: '❌' };

export default function Challans() {
  const [challans,      setChallans]      = useState([]);
  const [customers,     setCustomers]     = useState([]);
  const [products,      setProducts]      = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [modal,         setModal]         = useState(null); // null | 'add' | 'detail'
  const [detail,        setDetail]        = useState(null);
  const [statusFilter,  setStatusFilter]  = useState('');
  const [saving,        setSaving]        = useState(false);

  // ── Create-form state ──────────────────────────────────────────────────────
  const [form, setForm] = useState({ customer_id: '', delivery_address: '', notes: '' });
  const [items, setItems] = useState([{ product_id: '', qty: 1, unit_price: 0, discount: 0 }]);

  // ── Data Loading ───────────────────────────────────────────────────────────
  const load = () => {
    setLoading(true);
    const q = statusFilter ? `?status=${statusFilter}` : '';
    Promise.all([api.get(`/challans${q}`), api.get('/customers'), api.get('/products')])
      .then(([c, cu, p]) => { setChallans(c); setCustomers(cu); setProducts(p); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [statusFilter]); // eslint-disable-line

  // ── Item helpers ───────────────────────────────────────────────────────────
  const addItem    = () => setItems(prev => [...prev, { product_id: '', qty: 1, unit_price: 0, discount: 0 }]);
  const removeItem = (i) => setItems(prev => prev.filter((_, idx) => idx !== i));

  const updateItem = (i, key, val) => {
    setItems(prev => {
      const updated = [...prev];
      updated[i] = { ...updated[i], [key]: val };
      if (key === 'product_id') {
        const p = products.find(p => p.id === Number(val));
        if (p) updated[i].unit_price = Number(p.sale_price);
      }
      return updated;
    });
  };

  const customerChange = (id) => {
    const c = customers.find(c => c.id === Number(id));
    setForm(f => ({ ...f, customer_id: id, delivery_address: c?.address || '' }));
  };

  // ── Open / close modals ────────────────────────────────────────────────────
  const openAdd = () => {
    setForm({ customer_id: '', delivery_address: '', notes: '' });
    setItems([{ product_id: '', qty: 1, unit_price: 0, discount: 0 }]);
    setModal('add');
  };

  const openDetail = async (ch) => {
    setDetail(null);
    setModal('detail');
    try {
      setDetail(await api.get(`/challans/${ch.id}`));
    } catch (e) {
      toast.error('Failed to load challan: ' + e.message);
      setModal(null);
    }
  };

  // ── Save challan (Draft or Confirmed) ──────────────────────────────────────
  const save = async (status) => {
    if (!form.customer_id) { toast.error('Please select a customer'); return; }
    if (items.some(i => !i.product_id || Number(i.qty) <= 0)) {
      toast.error('All items must have a product and quantity > 0'); return;
    }
    setSaving(true);
    try {
      const res = await api.post('/challans', { ...form, items, status });
      toast.success(`Challan ${res.challan_no} saved as ${status}!`);
      setModal(null);
      load();
    } catch (e) {
      toast.error(e.message || 'Failed to save challan');
    } finally {
      setSaving(false);
    }
  };

  // ── Status update ──────────────────────────────────────────────────────────
  const updateStatus = async (id, status) => {
    try {
      await api.put(`/challans/${id}/status`, { status });
      toast.success(`Challan ${status === 'Confirmed' ? 'confirmed — stock deducted' : 'cancelled'}`);
      if (modal === 'detail') setDetail(await api.get(`/challans/${id}`));
      load();
    } catch (e) {
      toast.error(e.message || 'Failed to update status');
    }
  };

  // ── Computed totals ────────────────────────────────────────────────────────
  const subtotal = items.reduce((s, i) => s + Number(i.qty) * Number(i.unit_price) * (1 - (Number(i.discount) || 0) / 100), 0);
  const totalQty = items.reduce((s, i) => s + Number(i.qty || 0), 0);

  return (
    <div className="page-content">
      {/* ── Header ── */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Sales Challans</h1>
          <div className="page-desc">Create delivery challans, save as drafts, and confirm to deduct stock</div>
        </div>
        <div className="page-actions">
          <button className="btn btn-secondary" onClick={load}>↻ Refresh</button>
          <button className="btn btn-primary" onClick={openAdd}>+ New Challan</button>
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="filters">
        {['', 'Draft', 'Confirmed', 'Cancelled'].map(s => (
          <button
            key={s}
            className={`btn btn-sm ${statusFilter === s ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setStatusFilter(s)}
          >
            {s === '' ? 'All' : `${STATUS_ICONS[s]} ${s}`}
          </button>
        ))}
      </div>

      {/* ── Table ── */}
      {loading ? <div className="loading"><div className="spinner" /></div> : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Challan No</th>
                <th>Customer</th>
                <th>Date</th>
                <th>Total Qty</th>
                <th>Status</th>
                <th>Created By</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {challans.length === 0 ? (
                <tr><td colSpan={7}>
                  <div className="empty-state">
                    <div className="empty-icon">📋</div>
                    <h3>No challans found</h3>
                    <p>Create your first sales challan using the button above.</p>
                  </div>
                </td></tr>
              ) : challans.map(ch => (
                <tr key={ch.id}>
                  <td><span className="mono font-bold" style={{ color: 'var(--accent-light)' }}>{ch.challan_no}</span></td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{ch.customer_name}</div>
                  </td>
                  <td style={{ color: 'var(--text-secondary)' }}>{fmt.date(ch.challan_date)}</td>
                  <td>
                    <span style={{ fontWeight: 700 }}>{fmt.num(ch.total_qty || 0)}</span>
                    <span style={{ color: 'var(--text-muted)', fontSize: 11 }}> units</span>
                  </td>
                  <td>
                    <span className={`badge badge-${STATUS_COLORS[ch.status]}`}>
                      {STATUS_ICONS[ch.status]} {ch.status}
                    </span>
                  </td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: 12.5 }}>
                    {ch.created_by_name || '—'}
                  </td>
                  <td>
                    <div className="flex gap-2">
                      <button className="btn btn-sm btn-secondary" onClick={() => openDetail(ch)}>View</button>
                      {ch.status === 'Draft' && (
                        <button className="btn btn-sm btn-success" onClick={() => updateStatus(ch.id, 'Confirmed')}>
                          ✓ Confirm
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ══ Create Challan Modal ══ */}
      {modal === 'add' && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="modal modal-lg">
            <div className="modal-header">
              <div>
                <div className="modal-title">Create Sales Challan</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                  Challan no. will be auto-generated on save
                </div>
              </div>
              <button className="modal-close" onClick={() => setModal(null)}>✕</button>
            </div>
            <div className="modal-body">
              {/* Customer */}
              <div className="form-group">
                <label className="form-label">Customer *</label>
                <select className="form-control" value={form.customer_id} onChange={e => customerChange(e.target.value)}>
                  <option value="">Select customer…</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name}{c.business_name ? ` — ${c.business_name}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Delivery Address + Notes */}
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Delivery Address</label>
                  <textarea
                    className="form-control"
                    rows="2"
                    value={form.delivery_address}
                    onChange={e => setForm(f => ({ ...f, delivery_address: e.target.value }))}
                    placeholder="Delivery address…"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Notes / Instructions</label>
                  <textarea
                    className="form-control"
                    rows="2"
                    value={form.notes}
                    onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                    placeholder="Special instructions…"
                  />
                </div>
              </div>

              {/* Items section */}
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div style={{ fontWeight: 700 }}>
                    Products <span style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: 12 }}>({items.length} line{items.length !== 1 ? 's' : ''})</span>
                  </div>
                  <button className="btn btn-sm btn-secondary" onClick={addItem}>+ Add Row</button>
                </div>

                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th>Available</th>
                        <th>Qty</th>
                        <th>Unit Price (₹)</th>
                        <th>Disc %</th>
                        <th>Line Total</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item, i) => {
                        const prod = products.find(p => p.id === Number(item.product_id));
                        const lineTotal = Number(item.qty) * Number(item.unit_price) * (1 - (Number(item.discount) || 0) / 100);
                        const insufficientStock = prod && Number(item.qty) > prod.stock_qty;
                        return (
                          <tr key={i}>
                            <td>
                              <select
                                className="form-control"
                                style={{ minWidth: 200 }}
                                value={item.product_id}
                                onChange={e => updateItem(i, 'product_id', e.target.value)}
                              >
                                <option value="">Select product…</option>
                                {products.map(p => (
                                  <option key={p.id} value={p.id} disabled={p.stock_qty <= 0}>
                                    {p.name} [{p.sku}]{p.stock_qty <= 0 ? ' — OUT' : ''}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td>
                              {prod ? (
                                <span style={{ color: prod.stock_qty <= 0 ? 'var(--red)' : prod.stock_qty <= prod.min_stock ? 'var(--yellow)' : 'var(--green)', fontWeight: 700, fontSize: 13 }}>
                                  {fmt.num(prod.stock_qty)} {prod.unit}
                                </span>
                              ) : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                            </td>
                            <td>
                              <input
                                className="form-control"
                                type="number"
                                min="1"
                                style={{ width: 80, borderColor: insufficientStock ? 'var(--red)' : undefined }}
                                value={item.qty}
                                onChange={e => updateItem(i, 'qty', Number(e.target.value))}
                              />
                              {insufficientStock && (
                                <div style={{ fontSize: 10, color: 'var(--red)', marginTop: 2, whiteSpace: 'nowrap' }}>
                                  Exceeds stock!
                                </div>
                              )}
                            </td>
                            <td>
                              <input
                                className="form-control"
                                type="number"
                                min="0"
                                style={{ width: 100 }}
                                value={item.unit_price}
                                onChange={e => updateItem(i, 'unit_price', Number(e.target.value))}
                              />
                            </td>
                            <td>
                              <input
                                className="form-control"
                                type="number"
                                min="0"
                                max="100"
                                style={{ width: 65 }}
                                value={item.discount}
                                onChange={e => updateItem(i, 'discount', Number(e.target.value))}
                              />
                            </td>
                            <td className="font-bold" style={{ color: 'var(--accent-light)', whiteSpace: 'nowrap' }}>
                              {fmt.currency(lineTotal)}
                            </td>
                            <td>
                              <button className="btn btn-sm btn-danger btn-icon" onClick={() => removeItem(i)} disabled={items.length === 1}>✕</button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Summary row */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 24, marginTop: 12, padding: '12px 16px', background: 'var(--bg-hover)', borderRadius: 8 }}>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                    Total Qty: <strong style={{ color: 'var(--text-primary)' }}>{fmt.num(totalQty)} units</strong>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 800 }}>
                    Subtotal: <span style={{ color: 'var(--accent-light)' }}>{fmt.currency(subtotal)}</span>
                  </div>
                </div>

                {/* Stock warning */}
                {items.some(it => { const p = products.find(p => p.id === Number(it.product_id)); return p && Number(it.qty) > p.stock_qty; }) && (
                  <div style={{ background: 'var(--red-bg)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '10px 14px', marginTop: 10, fontSize: 13, color: 'var(--red)', display: 'flex', gap: 8, alignItems: 'center' }}>
                    ⚠️ Some items have insufficient stock. You can save as Draft, but <strong>Confirming will fail</strong> until stock is available.
                  </div>
                )}
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setModal(null)} disabled={saving}>Cancel</button>
              <button className="btn btn-secondary" onClick={() => save('Draft')} disabled={saving}>
                {saving ? '⏳…' : '📝 Save as Draft'}
              </button>
              <button className="btn btn-primary" onClick={() => save('Confirmed')} disabled={saving}>
                {saving ? '⏳…' : '✓ Confirm & Deduct Stock'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ Detail Modal ══ */}
      {modal === 'detail' && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="modal modal-lg">
            <div className="modal-header">
              <div>
                <div className="modal-title">{detail?.challan_no || 'Loading…'}</div>
                {detail && (
                  <div style={{ display: 'flex', gap: 8, marginTop: 4, alignItems: 'center' }}>
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{detail.customer_name}</span>
                    <span className={`badge badge-${STATUS_COLORS[detail.status]}`}>
                      {STATUS_ICONS[detail.status]} {detail.status}
                    </span>
                  </div>
                )}
              </div>
              <button className="modal-close" onClick={() => setModal(null)}>✕</button>
            </div>

            {!detail ? <div className="loading" style={{ padding: 40 }}><div className="spinner" /></div> : (
              <div className="modal-body">
                {/* Meta info */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                  {[
                    { label: 'Challan No',  value: detail.challan_no },
                    { label: 'Date',        value: fmt.date(detail.challan_date) },
                    { label: 'Status',      value: <span className={`badge badge-${STATUS_COLORS[detail.status]}`}>{STATUS_ICONS[detail.status]} {detail.status}</span> },
                    { label: 'Customer',    value: detail.customer_name },
                    { label: 'Total Qty',   value: `${fmt.num(detail.total_qty || detail.items?.reduce((s, i) => s + Number(i.qty), 0) || 0)} units` },
                    { label: 'Created By',  value: detail.created_by_name || 'N/A' },
                  ].map(r => (
                    <div key={r.label} style={{ background: 'var(--bg-hover)', borderRadius: 8, padding: '10px 14px' }}>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 4 }}>{r.label}</div>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{r.value}</div>
                    </div>
                  ))}
                </div>

                {/* Products table with snapshot data */}
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>SKU</th>
                        <th>Product (Snapshot)</th>
                        <th>Qty</th>
                        <th>Unit Price</th>
                        <th>Disc %</th>
                        <th>Line Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detail.items?.map(item => {
                        const lineTotal = Number(item.qty) * Number(item.unit_price) * (1 - (Number(item.discount) || 0) / 100);
                        return (
                          <tr key={item.id}>
                            <td><span className="mono">{item.product_sku || item.sku || '—'}</span></td>
                            <td style={{ fontWeight: 600 }}>{item.product_name || item.name}</td>
                            <td>{fmt.num(item.qty)} <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>{item.product_unit || item.unit}</span></td>
                            <td>{fmt.currency(item.unit_price)}</td>
                            <td>{item.discount || 0}%</td>
                            <td className="font-bold" style={{ color: 'var(--accent-light)' }}>{fmt.currency(lineTotal)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Total */}
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <div style={{ background: 'var(--bg-hover)', borderRadius: 8, padding: '12px 20px', textAlign: 'right' }}>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>GRAND TOTAL</div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--accent-light)' }}>
                      {fmt.currency(detail.items?.reduce((s, i) => s + Number(i.qty) * Number(i.unit_price) * (1 - (Number(i.discount) || 0) / 100), 0))}
                    </div>
                  </div>
                </div>

                {/* Address / Notes */}
                {(detail.delivery_address || detail.notes) && (
                  <div className="form-row">
                    {detail.delivery_address && (
                      <div style={{ background: 'var(--bg-hover)', borderRadius: 8, padding: 12 }}>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Delivery Address</div>
                        <div style={{ fontSize: 13 }}>{detail.delivery_address}</div>
                      </div>
                    )}
                    {detail.notes && (
                      <div style={{ background: 'var(--bg-hover)', borderRadius: 8, padding: 12 }}>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Notes</div>
                        <div style={{ fontSize: 13 }}>{detail.notes}</div>
                      </div>
                    )}
                  </div>
                )}

                {/* Action buttons */}
                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', borderTop: '1px solid var(--border)', paddingTop: 16 }}>
                  {detail.status === 'Draft' && (
                    <>
                      <button className="btn btn-danger" onClick={() => updateStatus(detail.id, 'Cancelled')}>
                        ❌ Cancel Challan
                      </button>
                      <button className="btn btn-primary" onClick={() => updateStatus(detail.id, 'Confirmed')}>
                        ✓ Confirm & Deduct Stock
                      </button>
                    </>
                  )}
                  {detail.status === 'Confirmed' && (
                    <button className="btn btn-danger" onClick={() => updateStatus(detail.id, 'Cancelled')}>
                      ❌ Cancel & Revert Stock
                    </button>
                  )}
                  {detail.status === 'Cancelled' && (
                    <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>This challan has been cancelled.</span>
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
