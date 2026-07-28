import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { api, fmt } from '../api';

const EMPTY = { sku: '', name: '', category: '', unit: 'pcs', purchase_price: '', sale_price: '', tax_rate: 18, stock_qty: 0, min_stock: 10 };

export default function Products() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [lowStock, setLowStock] = useState(false);
  const [modal, setModal]       = useState(null);
  const [form, setForm]         = useState(EMPTY);
  const [selected, setSelected] = useState(null);

  const load = () => {
    setLoading(true);
    const q = `?search=${search}${lowStock ? '&low_stock=true' : ''}`;
    api.get(`/products${q}`).then(setProducts).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, [search, lowStock]);

  const openAdd  = () => { setForm(EMPTY); setModal('add'); };
  const openEdit = (p) => { setForm(p); setSelected(p); setModal('edit'); };

  const save = async () => {
    try {
      if (modal === 'add') { await api.post('/products', form); toast.success('Product created!'); }
      else { await api.put(`/products/${selected.id}`, form); toast.success('Product updated!'); }
      setModal(null); load();
    } catch (e) { toast.error(e.message); }
  };

  const deleteProduct = async (id) => {
    if (!confirm('Delete this product?')) return;
    await api.delete(`/products/${id}`);
    toast.success('Deleted'); load();
  };

  const stockBadge = (p) => {
    if (p.stock_qty <= 0) return <span className="badge badge-red">Out of Stock</span>;
    if (p.stock_qty <= p.min_stock) return <span className="badge badge-yellow">Low Stock</span>;
    return <span className="badge badge-green">In Stock</span>;
  };

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">Products</h1>
          <div className="page-desc">Product catalogue with pricing and stock visibility</div>
        </div>
        <button className="btn btn-primary" onClick={openAdd}>+ Add Product</button>
      </div>

      <div className="filters">
        <input className="filter-input" placeholder="🔍 Search SKU or name..." value={search} onChange={e => setSearch(e.target.value)} style={{ minWidth: 280 }} />
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer', color: lowStock ? 'var(--yellow)' : 'var(--text-secondary)' }}>
          <input type="checkbox" checked={lowStock} onChange={e => setLowStock(e.target.checked)} />
          Low Stock Only
        </label>
      </div>

      {loading ? <div className="loading"><div className="spinner"/></div> : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>SKU</th>
                <th>Product Name</th>
                <th>Category</th>
                <th>Unit</th>
                <th>Purchase Price</th>
                <th>Sale Price</th>
                <th>GST %</th>
                <th>Stock</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.length === 0 ? (
                <tr><td colSpan={10}><div className="empty-state"><div className="empty-icon">📦</div><h3>No products found</h3></div></td></tr>
              ) : products.map(p => (
                <tr key={p.id}>
                  <td><span className="mono">{p.sku}</span></td>
                  <td style={{ fontWeight: 600 }}>{p.name}</td>
                  <td><span className="badge badge-purple">{p.category}</span></td>
                  <td style={{ color: 'var(--text-secondary)' }}>{p.unit}</td>
                  <td>{fmt.currency(p.purchase_price)}</td>
                  <td className="font-bold">{fmt.currency(p.sale_price)}</td>
                  <td>{p.tax_rate}%</td>
                  <td>
                    <span style={{ fontWeight: 700, color: p.stock_qty <= 0 ? 'var(--red)' : p.stock_qty <= p.min_stock ? 'var(--yellow)' : 'var(--green)' }}>
                      {fmt.num(p.stock_qty)}
                    </span>
                    <span style={{ color: 'var(--text-muted)', fontSize: 11 }}> / {p.min_stock} min</span>
                  </td>
                  <td>{stockBadge(p)}</td>
                  <td>
                    <div className="flex gap-2">
                      <button className="btn btn-sm btn-secondary" onClick={() => openEdit(p)}>Edit</button>
                      <button className="btn btn-sm btn-danger" onClick={() => deleteProduct(p.id)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="modal">
            <div className="modal-header">
              <div className="modal-title">{modal === 'add' ? 'Add Product' : 'Edit Product'}</div>
              <button className="modal-close" onClick={() => setModal(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">SKU *</label>
                  <input className="form-control mono" value={form.sku} onChange={e => setForm({...form, sku: e.target.value})} placeholder="SKU-001" />
                </div>
                <div className="form-group">
                  <label className="form-label">Unit</label>
                  <select className="form-control" value={form.unit} onChange={e => setForm({...form, unit: e.target.value})}>
                    {['pcs', 'kg', 'ltr', 'mtr', 'set', 'box', 'roll'].map(u => <option key={u}>{u}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Product Name *</label>
                <input className="form-control" value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Product name" />
              </div>
              <div className="form-group">
                <label className="form-label">Category</label>
                <input className="form-control" value={form.category} onChange={e => setForm({...form, category: e.target.value})} placeholder="Hardware, Electrical..." />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Purchase Price</label>
                  <input className="form-control" type="number" value={form.purchase_price} onChange={e => setForm({...form, purchase_price: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Sale Price</label>
                  <input className="form-control" type="number" value={form.sale_price} onChange={e => setForm({...form, sale_price: e.target.value})} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">GST Rate %</label>
                  <select className="form-control" value={form.tax_rate} onChange={e => setForm({...form, tax_rate: e.target.value})}>
                    {[0, 5, 12, 18, 28].map(r => <option key={r}>{r}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Current Stock</label>
                  <input className="form-control" type="number" value={form.stock_qty} onChange={e => setForm({...form, stock_qty: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Min Stock Alert</label>
                  <input className="form-control" type="number" value={form.min_stock} onChange={e => setForm({...form, min_stock: e.target.value})} />
                </div>
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
