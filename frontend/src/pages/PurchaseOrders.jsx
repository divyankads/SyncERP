import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { api, fmt } from '../api';

const statusColors = { draft: 'gray', confirmed: 'blue', received: 'green', cancelled: 'red' };

export default function PurchaseOrders() {
  const [pos, setPOs]           = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [modal, setModal]       = useState(null);
  const [detail, setDetail]     = useState(null);
  const [form, setForm]         = useState({ supplier_id: '', expected_date: '', notes: '' });
  const [items, setItems]       = useState([{ product_id: '', qty: 1, unit_price: 0 }]);

  const load = () => {
    setLoading(true);
    Promise.all([api.get('/purchase-orders'), api.get('/suppliers'), api.get('/products')])
      .then(([p, s, pr]) => { setPOs(p); setSuppliers(s); setProducts(pr); })
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const openAdd = () => {
    setForm({ supplier_id: '', expected_date: '', notes: '' });
    setItems([{ product_id: '', qty: 1, unit_price: 0 }]);
    setModal('add');
  };

  const openDetail = async (po) => {
    setDetail(null); setModal('detail');
    const d = await api.get(`/purchase-orders/${po.id}`);
    setDetail(d);
  };

  const addItem = () => setItems([...items, { product_id: '', qty: 1, unit_price: 0 }]);
  const removeItem = (i) => setItems(items.filter((_, idx) => idx !== i));
  const updateItem = (i, key, val) => {
    const updated = [...items];
    updated[i] = { ...updated[i], [key]: val };
    if (key === 'product_id') {
      const p = products.find(p => p.id === Number(val));
      if (p) updated[i].unit_price = p.purchase_price;
    }
    setItems(updated);
  };

  const save = async () => {
    try {
      await api.post('/purchase-orders', { ...form, items });
      toast.success('Purchase order created!');
      setModal(null); load();
    } catch (e) { toast.error(e.message); }
  };

  const updateStatus = async (id, status) => {
    await api.put(`/purchase-orders/${id}/status`, { status });
    toast.success(`Status updated to ${status}`);
    if (modal === 'detail') {
      const d = await api.get(`/purchase-orders/${id}`);
      setDetail(d);
    }
    load();
  };

  const totalAmount = items.reduce((s, i) => s + (i.qty * i.unit_price), 0);

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">Purchase Orders</h1>
          <div className="page-desc">Manage procurement from suppliers</div>
        </div>
        <button className="btn btn-primary" onClick={openAdd}>+ New PO</button>
      </div>

      {loading ? <div className="loading"><div className="spinner"/></div> : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>PO Number</th><th>Supplier</th><th>Order Date</th><th>Expected By</th><th>Total</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {pos.length === 0 ? (
                <tr><td colSpan={7}><div className="empty-state"><div className="empty-icon">🛒</div><h3>No purchase orders yet</h3></div></td></tr>
              ) : pos.map(po => (
                <tr key={po.id}>
                  <td><span className="mono">{po.po_number}</span></td>
                  <td style={{ fontWeight: 600 }}>{po.supplier_name}</td>
                  <td style={{ color: 'var(--text-secondary)' }}>{fmt.date(po.order_date)}</td>
                  <td style={{ color: 'var(--text-secondary)' }}>{fmt.date(po.expected_date)}</td>
                  <td className="font-bold">{fmt.currency(po.total_amount)}</td>
                  <td><span className={`badge badge-${statusColors[po.status]}`}>{po.status}</span></td>
                  <td>
                    <div className="flex gap-2">
                      <button className="btn btn-sm btn-secondary" onClick={() => openDetail(po)}>View</button>
                      {po.status === 'draft' && <button className="btn btn-sm btn-success" onClick={() => updateStatus(po.id, 'confirmed')}>Confirm</button>}
                      {po.status === 'confirmed' && <button className="btn btn-sm btn-primary" onClick={() => updateStatus(po.id, 'received')}>Mark Received</button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create PO Modal */}
      {modal === 'add' && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="modal modal-lg">
            <div className="modal-header">
              <div className="modal-title">Create Purchase Order</div>
              <button className="modal-close" onClick={() => setModal(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Supplier *</label>
                  <select className="form-control" value={form.supplier_id} onChange={e => setForm({...form, supplier_id: e.target.value})}>
                    <option value="">Select supplier...</option>
                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Expected Delivery Date</label>
                  <input className="form-control" type="date" value={form.expected_date} onChange={e => setForm({...form, expected_date: e.target.value})} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Notes</label>
                <textarea className="form-control" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} placeholder="Special instructions..." />
              </div>

              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                  <div style={{ fontWeight: 700 }}>Items</div>
                  <button className="btn btn-sm btn-secondary" onClick={addItem}>+ Add Row</button>
                </div>
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>Product</th><th>Qty</th><th>Unit Price</th><th>Total</th><th></th></tr></thead>
                    <tbody>
                      {items.map((item, i) => (
                        <tr key={i}>
                          <td>
                            <select className="form-control" style={{ minWidth: 200 }} value={item.product_id} onChange={e => updateItem(i, 'product_id', e.target.value)}>
                              <option value="">Select...</option>
                              {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
                            </select>
                          </td>
                          <td><input className="form-control" type="number" style={{ width: 80 }} value={item.qty} onChange={e => updateItem(i, 'qty', Number(e.target.value))} /></td>
                          <td><input className="form-control" type="number" style={{ width: 100 }} value={item.unit_price} onChange={e => updateItem(i, 'unit_price', Number(e.target.value))} /></td>
                          <td className="font-bold">{fmt.currency(item.qty * item.unit_price)}</td>
                          <td><button className="btn btn-sm btn-danger btn-icon" onClick={() => removeItem(i)}>✕</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div style={{ textAlign: 'right', marginTop: 12, fontWeight: 800, fontSize: 16 }}>
                  Total: <span style={{ color: 'var(--accent-light)' }}>{fmt.currency(totalAmount)}</span>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={save}>Create PO</button>
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
                <div className="modal-title">{detail?.po_number || 'Loading...'}</div>
                {detail && <span className={`badge badge-${statusColors[detail.status]}`}>{detail.status}</span>}
              </div>
              <button className="modal-close" onClick={() => setModal(null)}>✕</button>
            </div>
            {!detail ? <div className="loading" style={{ padding: 40 }}><div className="spinner"/></div> : (
              <div className="modal-body">
                <div className="form-row">
                  {[['Supplier', detail.supplier_name], ['Order Date', fmt.date(detail.order_date)], ['Expected', fmt.date(detail.expected_date)], ['Total', fmt.currency(detail.total_amount)]].map(([k,v]) => (
                    <div key={k} style={{ background: 'var(--bg-hover)', borderRadius: 8, padding: '10px 14px' }}>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 }}>{k}</div>
                      <div style={{ fontWeight: 600 }}>{v}</div>
                    </div>
                  ))}
                </div>
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>SKU</th><th>Product</th><th>Qty</th><th>Unit Price</th><th>Total</th></tr></thead>
                    <tbody>
                      {detail.items?.map(item => (
                        <tr key={item.id}>
                          <td><span className="mono">{item.sku}</span></td>
                          <td>{item.product_name}</td>
                          <td>{item.qty} {item.unit}</td>
                          <td>{fmt.currency(item.unit_price)}</td>
                          <td className="font-bold">{fmt.currency(item.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                  {detail.status === 'draft' && <button className="btn btn-success" onClick={() => updateStatus(detail.id, 'confirmed')}>Confirm PO</button>}
                  {detail.status === 'confirmed' && <button className="btn btn-primary" onClick={() => updateStatus(detail.id, 'received')}>Mark as Received</button>}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
