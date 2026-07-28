import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { api, fmt } from '../api';

const statusColors = { paid: 'green', partial: 'yellow', unpaid: 'red', overdue: 'red' };

export default function Invoices() {
  const [invoices, setInvoices]   = useState([]);
  const [customers, setCustomers] = useState([]);
  const [challans, setChallans]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [modal, setModal]         = useState(null);
  const [detail, setDetail]       = useState(null);
  const [statusFilter, setStatus] = useState('');
  const [form, setForm] = useState({ customer_id: '', challan_id: '', due_date: '', notes: '', discount_amount: 0 });
  const [payAmount, setPayAmount] = useState('');

  const load = () => {
    setLoading(true);
    const q = statusFilter ? `?status=${statusFilter}` : '';
    Promise.all([api.get(`/invoices${q}`), api.get('/customers'), api.get('/challans?status=delivered')])
      .then(([inv, cu, ch]) => { setInvoices(inv); setCustomers(cu); setChallans(ch); })
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, [statusFilter]);

  const openAdd = () => {
    setForm({ customer_id: '', challan_id: '', due_date: '', notes: '', discount_amount: 0 });
    setModal('add');
  };

  const openDetail = async (inv) => {
    setDetail(null); setModal('detail'); setPayAmount('');
    const d = await api.get(`/invoices/${inv.id}`);
    setDetail(d);
  };

  const challanChange = (id) => {
    setForm(f => ({ ...f, challan_id: id }));
    const ch = challans.find(c => c.id === Number(id));
    if (ch) setForm(f => ({ ...f, challan_id: id, customer_id: String(ch.customer_id) }));
  };

  const save = async () => {
    try {
      const challan = form.challan_id ? await api.get(`/challans/${form.challan_id}`) : null;
      const items = challan?.items || [];
      await api.post('/invoices', { ...form, items });
      toast.success('Invoice created!');
      setModal(null); load();
    } catch (e) { toast.error(e.message); }
  };

  const recordPayment = async () => {
    if (!payAmount || Number(payAmount) <= 0) { toast.error('Enter a valid amount'); return; }
    await api.put(`/invoices/${detail.id}/payment`, { amount: Number(payAmount) });
    toast.success('Payment recorded!');
    const d = await api.get(`/invoices/${detail.id}`);
    setDetail(d);
    setPayAmount('');
    load();
  };

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">Invoices</h1>
          <div className="page-desc">GST-ready invoices and payment tracking</div>
        </div>
        <button className="btn btn-primary" onClick={openAdd}>+ New Invoice</button>
      </div>

      <div className="filters">
        <select className="filter-input" value={statusFilter} onChange={e => setStatus(e.target.value)}>
          <option value="">All Statuses</option>
          <option value="unpaid">Unpaid</option>
          <option value="partial">Partial</option>
          <option value="paid">Paid</option>
        </select>
      </div>

      {loading ? <div className="loading"><div className="spinner"/></div> : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Invoice #</th><th>Customer</th><th>Date</th><th>Due Date</th><th>Amount</th><th>Paid</th><th>Balance</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {invoices.length === 0 ? (
                <tr><td colSpan={9}><div className="empty-state"><div className="empty-icon">🧾</div><h3>No invoices found</h3></div></td></tr>
              ) : invoices.map(inv => (
                <tr key={inv.id}>
                  <td><span className="mono">{inv.invoice_no}</span></td>
                  <td style={{ fontWeight: 600 }}>{inv.customer_name}</td>
                  <td style={{ color: 'var(--text-secondary)' }}>{fmt.date(inv.invoice_date)}</td>
                  <td style={{ color: 'var(--text-secondary)' }}>{fmt.date(inv.due_date)}</td>
                  <td className="font-bold">{fmt.currency(inv.total_amount)}</td>
                  <td style={{ color: 'var(--green)' }}>{fmt.currency(inv.paid_amount)}</td>
                  <td style={{ color: inv.total_amount - inv.paid_amount > 0 ? 'var(--red)' : 'var(--green)', fontWeight: 700 }}>{fmt.currency(inv.total_amount - inv.paid_amount)}</td>
                  <td><span className={`badge badge-${statusColors[inv.status]}`}>{inv.status}</span></td>
                  <td>
                    <div className="flex gap-2">
                      <button className="btn btn-sm btn-secondary" onClick={() => openDetail(inv)}>View</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Invoice Modal */}
      {modal === 'add' && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="modal">
            <div className="modal-header">
              <div className="modal-title">Create Invoice</div>
              <button className="modal-close" onClick={() => setModal(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Link to Challan</label>
                <select className="form-control" value={form.challan_id} onChange={e => challanChange(e.target.value)}>
                  <option value="">No challan (direct invoice)</option>
                  {challans.map(c => <option key={c.id} value={c.id}>{c.challan_no} — {c.customer_name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Customer *</label>
                <select className="form-control" value={form.customer_id} onChange={e => setForm({...form, customer_id: e.target.value})}>
                  <option value="">Select customer...</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Due Date</label>
                  <input className="form-control" type="date" value={form.due_date} onChange={e => setForm({...form, due_date: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Extra Discount (₹)</label>
                  <input className="form-control" type="number" value={form.discount_amount} onChange={e => setForm({...form, discount_amount: e.target.value})} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Notes</label>
                <textarea className="form-control" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={save}>Generate Invoice</button>
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
                <div className="modal-title">{detail?.invoice_no || 'Loading...'}</div>
                {detail && <span className={`badge badge-${statusColors[detail.status]}`}>{detail.status}</span>}
              </div>
              <button className="modal-close" onClick={() => setModal(null)}>✕</button>
            </div>
            {!detail ? <div className="loading" style={{ padding: 40 }}><div className="spinner"/></div> : (
              <div className="modal-body">
                {/* Customer Info */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div style={{ background: 'var(--bg-hover)', borderRadius: 8, padding: 14 }}>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 8 }}>Bill To</div>
                    <div style={{ fontWeight: 700 }}>{detail.customer_name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{detail.address}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{detail.phone} · {detail.email}</div>
                    {detail.gstin && <div style={{ fontSize: 12, marginTop: 4 }}><span className="mono">GSTIN: {detail.gstin}</span></div>}
                  </div>
                  <div style={{ background: 'var(--bg-hover)', borderRadius: 8, padding: 14 }}>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 8 }}>Invoice Details</div>
                    {[['Invoice No', <span className="mono">{detail.invoice_no}</span>], ['Date', fmt.date(detail.invoice_date)], ['Due Date', fmt.date(detail.due_date)]].map(([k,v]) => (
                      <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '3px 0' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>{k}</span>
                        <span style={{ fontWeight: 600 }}>{v}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Items */}
                {detail.items && (
                  <div className="table-wrap">
                    <table>
                      <thead><tr><th>Product</th><th>Qty</th><th>Rate</th><th>Disc%</th><th>Taxable</th><th>GST</th><th>Total</th></tr></thead>
                      <tbody>
                        {detail.items.map(item => {
                          const taxable = item.total;
                          const gst = taxable * (item.tax_rate || 18) / 100;
                          return (
                            <tr key={item.id}>
                              <td>{item.product_name}</td>
                              <td>{item.qty} {item.unit}</td>
                              <td>{fmt.currency(item.unit_price)}</td>
                              <td>{item.discount}%</td>
                              <td>{fmt.currency(taxable)}</td>
                              <td>{fmt.currency(gst)}</td>
                              <td className="font-bold">{fmt.currency(taxable + gst)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Totals */}
                <div className="invoice-total">
                  {[['Subtotal', fmt.currency(detail.subtotal)], ['GST', fmt.currency(detail.tax_amount)], ['Discount', `-${fmt.currency(detail.discount_amount)}`]].map(([k,v]) => (
                    <div key={k} className="invoice-total-row">
                      <span style={{ color: 'var(--text-secondary)' }}>{k}</span>
                      <span>{v}</span>
                    </div>
                  ))}
                  <div className="invoice-total-row grand">
                    <span>Grand Total</span>
                    <span>{fmt.currency(detail.total_amount)}</span>
                  </div>
                  <div className="invoice-total-row">
                    <span style={{ color: 'var(--green)' }}>Paid</span>
                    <span style={{ color: 'var(--green)' }}>{fmt.currency(detail.paid_amount)}</span>
                  </div>
                  <div className="invoice-total-row">
                    <span style={{ color: 'var(--red)', fontWeight: 700 }}>Balance Due</span>
                    <span style={{ color: 'var(--red)', fontWeight: 700 }}>{fmt.currency(detail.total_amount - detail.paid_amount)}</span>
                  </div>
                </div>

                {/* Payment */}
                {detail.status !== 'paid' && (
                  <div style={{ background: 'var(--bg-hover)', borderRadius: 8, padding: 14 }}>
                    <div style={{ fontWeight: 700, marginBottom: 10 }}>Record Payment</div>
                    <div style={{ display: 'flex', gap: 10 }}>
                      <input className="form-control" type="number" placeholder="Enter amount..." value={payAmount} onChange={e => setPayAmount(e.target.value)} style={{ flex: 1 }} />
                      <button className="btn btn-success" onClick={recordPayment}>Record</button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
