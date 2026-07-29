import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { api, fmt } from '../api';

const EMPTY = {
  sku: '',
  name: '',
  category: '',
  unit: 'pcs',
  purchase_price: '',
  sale_price: '',
  tax_rate: 18,
  stock_qty: 0,
  min_stock: 10,
  location: 'Warehouse A',
};

const UNITS = ['pcs', 'kg', 'ltr', 'mtr', 'set', 'box', 'roll', 'pair', 'dozen'];
const TAX_RATES = [0, 5, 12, 18, 28];
const WAREHOUSES = ['Warehouse A', 'Warehouse B', 'Warehouse C', 'Cold Storage', 'Open Yard'];

export default function Products() {
  const [products, setProducts]     = useState([]);
  const [movements, setMovements]   = useState([]);
  const [loading, setLoading]       = useState(true);
  const [movLoading, setMovLoading] = useState(false);
  const [search, setSearch]         = useState('');
  const [category, setCategory]     = useState('');
  const [lowStock, setLowStock]     = useState(false);
  const [tab, setTab]               = useState('products');   // 'products' | 'movements'
  const [modal, setModal]           = useState(null);         // null | 'add' | 'edit'
  const [form, setForm]             = useState(EMPTY);
  const [selected, setSelected]     = useState(null);
  const [saving, setSaving]         = useState(false);
  const [movFilter, setMovFilter]   = useState('');           // '' | 'IN' | 'OUT'

  // ── Load products ──────────────────────────────────────────────────────────
  const loadProducts = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search)            params.set('search', search);
    if (lowStock)          params.set('low_stock', 'true');
    if (category)          params.set('category', category);
    api.get(`/products?${params}`).then(setProducts).finally(() => setLoading(false));
  }, [search, lowStock, category]);

  // ── Load movements ─────────────────────────────────────────────────────────
  const loadMovements = useCallback(() => {
    setMovLoading(true);
    const params = new URLSearchParams();
    if (movFilter) params.set('type', movFilter);
    api.get(`/stock/movements?${params}&limit=100`)
      .then(d => setMovements(d.movements || []))
      .catch(() => setMovements([]))
      .finally(() => setMovLoading(false));
  }, [movFilter]);

  useEffect(() => { loadProducts(); }, [loadProducts]);
  useEffect(() => { if (tab === 'movements') loadMovements(); }, [tab, loadMovements]);

  // ── Unique categories from loaded products ─────────────────────────────────
  const categories = [...new Set(products.map(p => p.category).filter(Boolean))].sort();

  // ── Stats ──────────────────────────────────────────────────────────────────
  const lowStockCount = products.filter(p => p.stock_qty > 0 && p.stock_qty <= p.min_stock).length;
  const outOfStock    = products.filter(p => p.stock_qty <= 0).length;
  const totalStockVal = products.reduce((s, p) => s + p.stock_qty * p.purchase_price, 0);

  // ── Modal helpers ──────────────────────────────────────────────────────────
  const openAdd  = () => { setForm(EMPTY); setModal('add'); };
  const openEdit = (p) => { setForm({ ...p }); setSelected(p); setModal('edit'); };
  const closeModal = () => { setModal(null); setSelected(null); };

  const f = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const save = async () => {
    if (!form.sku?.trim())  { toast.error('SKU is required'); return; }
    if (!form.name?.trim()) { toast.error('Product name is required'); return; }
    if (Number(form.sale_price) <= 0) { toast.error('Sale price must be greater than 0'); return; }
    setSaving(true);
    try {
      if (modal === 'add') {
        await api.post('/products', { ...form, sale_price: Number(form.sale_price), purchase_price: Number(form.purchase_price) });
        toast.success('Product created!');
      } else {
        await api.put(`/products/${selected.id}`, { ...form, sale_price: Number(form.sale_price), purchase_price: Number(form.purchase_price) });
        toast.success('Product updated!');
      }
      closeModal();
      loadProducts();
    } catch (e) {
      toast.error(e.message || 'Failed to save product');
    } finally {
      setSaving(false);
    }
  };

  const deleteProduct = async (p) => {
    if (!confirm(`Delete "${p.name}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/products/${p.id}`);
      toast.success('Product deleted');
      loadProducts();
    } catch (e) {
      toast.error(e.message || 'Failed to delete product');
    }
  };

  const stockBadge = (p) => {
    if (p.stock_qty <= 0)            return <span className="badge badge-red">Out of Stock</span>;
    if (p.stock_qty <= p.min_stock)  return <span className="badge badge-yellow">Low Stock</span>;
    return                                  <span className="badge badge-green">In Stock</span>;
  };

  return (
    <div className="page-content">
      {/* ── Header ── */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Product & Inventory</h1>
          <div className="page-desc">Manage products, pricing, stock levels, and movement history</div>
        </div>
        <div className="page-actions">
          <button className="btn btn-secondary" onClick={() => { loadProducts(); loadMovements(); }}>↻ Refresh</button>
          <button className="btn btn-primary" onClick={openAdd}>+ Add Product</button>
        </div>
      </div>

      {/* ── Summary Cards ── */}
      <div className="stats-grid" style={{ marginBottom: 24 }}>
        {[
          { icon: '📦', label: 'Total Products',   value: products.length,           color: 'var(--blue-bg)',   iconColor: 'var(--blue)'   },
          { icon: '⚠️', label: 'Low Stock',        value: lowStockCount,             color: 'var(--yellow-bg)', iconColor: 'var(--yellow)' },
          { icon: '🚫', label: 'Out of Stock',     value: outOfStock,                color: 'var(--red-bg)',    iconColor: 'var(--red)'    },
          { icon: '💰', label: 'Stock Cost Value', value: fmt.currency(totalStockVal), color: 'var(--green-bg)', iconColor: 'var(--green)'  },
        ].map(stat => (
          <div className="stat-card" key={stat.label}>
            <div className="stat-icon" style={{ background: stat.color }}>
              <span style={{ color: stat.iconColor }}>{stat.icon}</span>
            </div>
            <div>
              <div className="stat-value" style={{ fontSize: 20 }}>{stat.value}</div>
              <div className="stat-label">{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Tabs ── */}
      <div className="tabs">
        <button className={`tab ${tab === 'products' ? 'active' : ''}`} onClick={() => setTab('products')}>
          📦 Product Catalogue
        </button>
        <button className={`tab ${tab === 'movements' ? 'active' : ''}`} onClick={() => setTab('movements')}>
          📋 Stock Movement Log
        </button>
      </div>

      {/* ── Product Table Tab ── */}
      {tab === 'products' && (
        <>
          <div className="filters">
            <input
              className="filter-input"
              placeholder="🔍 Search SKU or name…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ minWidth: 240 }}
            />
            <select className="filter-input" value={category} onChange={e => setCategory(e.target.value)}>
              <option value="">All Categories</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer', color: lowStock ? 'var(--yellow)' : 'var(--text-secondary)' }}>
              <input type="checkbox" checked={lowStock} onChange={e => setLowStock(e.target.checked)} />
              Low Stock Only
            </label>
          </div>

          {loading ? <div className="loading"><div className="spinner" /></div> : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>SKU</th>
                    <th>Product Name</th>
                    <th>Category</th>
                    <th>Location / Warehouse</th>
                    <th>Unit</th>
                    <th>Unit Price (Sale)</th>
                    <th>Current Stock</th>
                    <th>Min Alert</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {products.length === 0 ? (
                    <tr><td colSpan={10}>
                      <div className="empty-state">
                        <div className="empty-icon">📦</div>
                        <h3>No products found</h3>
                        <p>Add your first product using the button above.</p>
                      </div>
                    </td></tr>
                  ) : products.map(p => (
                    <tr key={p.id}>
                      <td><span className="mono">{p.sku}</span></td>
                      <td style={{ fontWeight: 600 }}>{p.name}</td>
                      <td>{p.category ? <span className="badge badge-purple">{p.category}</span> : '—'}</td>
                      <td>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12.5 }}>
                          <span style={{ fontSize: 14 }}>🏭</span>
                          <span className="mono">{p.location || 'Warehouse A'}</span>
                        </span>
                      </td>
                      <td style={{ color: 'var(--text-secondary)' }}>{p.unit}</td>
                      <td className="font-bold" style={{ color: 'var(--accent-light)' }}>{fmt.currency(p.sale_price)}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ flex: 1, background: 'var(--bg-hover)', borderRadius: 4, height: 5, overflow: 'hidden', minWidth: 50 }}>
                            <div style={{
                              height: '100%',
                              width: `${Math.min(100, (p.stock_qty / Math.max(p.min_stock * 3, 1)) * 100)}%`,
                              background: p.stock_qty <= 0 ? 'var(--red)' : p.stock_qty <= p.min_stock ? 'var(--yellow)' : 'var(--green)',
                              borderRadius: 4, transition: 'width 0.5s',
                            }} />
                          </div>
                          <span style={{ fontWeight: 700, minWidth: 36, color: p.stock_qty <= 0 ? 'var(--red)' : p.stock_qty <= p.min_stock ? 'var(--yellow)' : 'var(--text-primary)' }}>
                            {fmt.num(p.stock_qty)}
                          </span>
                        </div>
                      </td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{p.min_stock}</td>
                      <td>{stockBadge(p)}</td>
                      <td>
                        <div className="flex gap-2">
                          <button className="btn btn-sm btn-secondary" onClick={() => openEdit(p)}>✏️ Edit</button>
                          <button className="btn btn-sm btn-danger" onClick={() => deleteProduct(p)}>🗑️</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* ── Stock Movement Log Tab ── */}
      {tab === 'movements' && (
        <>
          <div className="filters">
            <select className="filter-input" value={movFilter} onChange={e => setMovFilter(e.target.value)}>
              <option value="">All Movements</option>
              <option value="IN">IN only</option>
              <option value="OUT">OUT only</option>
            </select>
          </div>

          {movLoading ? <div className="loading"><div className="spinner" /></div> : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Movement Type</th>
                    <th>Qty Changed</th>
                    <th>Reason / Notes</th>
                    <th>Reference</th>
                    <th>Created By</th>
                    <th>Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {movements.length === 0 ? (
                    <tr><td colSpan={7}>
                      <div className="empty-state">
                        <div className="empty-icon">📋</div>
                        <h3>No stock movements yet</h3>
                        <p>Movements are recorded when challans are confirmed or purchase orders received.</p>
                      </div>
                    </td></tr>
                  ) : movements.map(m => {
                    const isIn = m.type === 'IN' || Number(m.qty) > 0;
                    return (
                      <tr key={m.id}>
                        <td>
                          <div style={{ fontWeight: 600 }}>{m.product_name}</div>
                          <div className="mono" style={{ fontSize: 11, color: 'var(--text-muted)' }}>{m.sku}</div>
                        </td>
                        <td>
                          <span className={`badge ${isIn ? 'badge-green' : 'badge-red'}`} style={{ fontSize: 12 }}>
                            {isIn ? '▲ IN' : '▼ OUT'}
                          </span>
                        </td>
                        <td style={{ fontWeight: 800, color: isIn ? 'var(--green)' : 'var(--red)', fontSize: 15 }}>
                          {isIn ? '+' : '-'}{Math.abs(m.qty)}
                        </td>
                        <td style={{ fontSize: 13 }}>{m.notes || '—'}</td>
                        <td>
                          {m.ref_type ? (
                            <span className="mono" style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                              {m.ref_type.toUpperCase()} #{m.ref_id}
                            </span>
                          ) : '—'}
                        </td>
                        <td>
                          {m.user_name
                            ? <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                <span style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--accent-glow)', border: '1px solid var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: 'var(--accent-light)', flexShrink: 0 }}>
                                  {m.user_name[0]}
                                </span>
                                {m.user_name}
                              </span>
                            : <span style={{ color: 'var(--text-muted)' }}>System</span>
                          }
                        </td>
                        <td className="mono" style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                          {fmt.date(m.created_at)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* ── Add / Edit Modal ── */}
      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && closeModal()}>
          <div className="modal">
            <div className="modal-header">
              <div className="modal-title">{modal === 'add' ? '+ Add Product' : '✏️ Edit Product'}</div>
              <button className="modal-close" onClick={closeModal}>✕</button>
            </div>
            <div className="modal-body">
              {/* SKU + Unit */}
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">SKU / Code *</label>
                  <input className="form-control mono" value={form.sku} onChange={e => f('sku', e.target.value)} placeholder="e.g. SKU-009" />
                </div>
                <div className="form-group">
                  <label className="form-label">Unit</label>
                  <select className="form-control" value={form.unit} onChange={e => f('unit', e.target.value)}>
                    {UNITS.map(u => <option key={u}>{u}</option>)}
                  </select>
                </div>
              </div>

              {/* Name */}
              <div className="form-group">
                <label className="form-label">Product Name *</label>
                <input className="form-control" value={form.name} onChange={e => f('name', e.target.value)} placeholder="Product name" />
              </div>

              {/* Category + Location */}
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Category</label>
                  <input className="form-control" value={form.category} onChange={e => f('category', e.target.value)} placeholder="e.g. Hardware, Electrical…" list="cat-list" />
                  <datalist id="cat-list">
                    {['Hardware', 'Electrical', 'Pipes & Fittings', 'Safety', 'Mechanical', 'Lubricants', 'Tools'].map(c => <option key={c} value={c} />)}
                  </datalist>
                </div>
                <div className="form-group">
                  <label className="form-label">Location / Warehouse</label>
                  <select className="form-control" value={form.location} onChange={e => f('location', e.target.value)}>
                    {WAREHOUSES.map(w => <option key={w}>{w}</option>)}
                  </select>
                </div>
              </div>

              {/* Pricing */}
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Purchase Price (₹)</label>
                  <input className="form-control" type="number" min="0" value={form.purchase_price} onChange={e => f('purchase_price', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Sale / Unit Price (₹) *</label>
                  <input className="form-control" type="number" min="0" value={form.sale_price} onChange={e => f('sale_price', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">GST Rate %</label>
                  <select className="form-control" value={form.tax_rate} onChange={e => f('tax_rate', Number(e.target.value))}>
                    {TAX_RATES.map(r => <option key={r} value={r}>{r}%</option>)}
                  </select>
                </div>
              </div>

              {/* Stock */}
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Current Stock ({form.unit})</label>
                  <input className="form-control" type="number" min="0" value={form.stock_qty} onChange={e => f('stock_qty', Number(e.target.value))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Min Stock Alert</label>
                  <input className="form-control" type="number" min="0" value={form.min_stock} onChange={e => f('min_stock', Number(e.target.value))} />
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>
                    Alert when stock falls below this level
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={closeModal} disabled={saving}>Cancel</button>
              <button className="btn btn-primary" onClick={save} disabled={saving}>
                {saving ? '⏳ Saving…' : (modal === 'add' ? '+ Create Product' : '✓ Save Changes')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
