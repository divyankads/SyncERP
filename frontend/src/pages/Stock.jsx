import { useState, useEffect } from 'react';
import { api, fmt } from '../api';

export default function Stock() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('inventory');
  const [search, setSearch] = useState('');

  const load = () => { setLoading(true); api.get('/stock').then(setData).finally(() => setLoading(false)); };
  useEffect(() => { load(); }, []);

  const filtered = data?.products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.sku.toLowerCase().includes(search.toLowerCase())
  ) || [];

  const stockValue = data?.products.reduce((s, p) => s + p.stock_qty * p.purchase_price, 0) || 0;
  const saleValue  = data?.products.reduce((s, p) => s + p.stock_qty * p.sale_price, 0) || 0;
  const lowStockItems = data?.products.filter(p => p.stock_qty <= p.min_stock) || [];

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">Stock Management</h1>
          <div className="page-desc">Real-time inventory levels and stock movements</div>
        </div>
        <button className="btn btn-secondary" onClick={load}>↻ Refresh</button>
      </div>

      {/* Summary Cards */}
      <div className="stats-grid" style={{ marginBottom: 24 }}>
        {[
          { icon: '📦', label: 'Total Products', value: data?.products.length || 0, color: 'var(--blue-bg)', iconColor: 'var(--blue)' },
          { icon: '⚠️', label: 'Low Stock Items', value: lowStockItems.length, color: 'var(--yellow-bg)', iconColor: 'var(--yellow)' },
          { icon: '💰', label: 'Stock Cost Value', value: fmt.currency(stockValue), color: 'var(--purple-bg)', iconColor: 'var(--purple)' },
          { icon: '📈', label: 'Sale Value', value: fmt.currency(saleValue), color: 'var(--green-bg)', iconColor: 'var(--green)' },
        ].map(stat => (
          <div className="stat-card" key={stat.label}>
            <div className="stat-icon" style={{ background: stat.color }}><span>{stat.icon}</span></div>
            <div>
              <div className="stat-value" style={{ fontSize: 20 }}>{stat.value}</div>
              <div className="stat-label">{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="tabs">
        <button className={`tab ${tab === 'inventory' ? 'active' : ''}`} onClick={() => setTab('inventory')}>📦 Inventory</button>
        <button className={`tab ${tab === 'low' ? 'active' : ''}`} onClick={() => setTab('low')}>⚠️ Low Stock ({lowStockItems.length})</button>
        <button className={`tab ${tab === 'movements' ? 'active' : ''}`} onClick={() => setTab('movements')}>📋 Recent Movements</button>
      </div>

      {loading ? <div className="loading"><div className="spinner"/></div> : (
        <>
          {(tab === 'inventory' || tab === 'low') && (
            <>
              {tab === 'inventory' && (
                <div className="filters" style={{ marginBottom: 16 }}>
                  <input className="filter-input" placeholder="🔍 Search product or SKU..." value={search} onChange={e => setSearch(e.target.value)} style={{ minWidth: 280 }} />
                </div>
              )}
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr><th>SKU</th><th>Product</th><th>Category</th><th>Unit</th><th>Stock Qty</th><th>Min Stock</th><th>Cost Price</th><th>Stock Value</th><th>Status</th></tr>
                  </thead>
                  <tbody>
                    {(tab === 'low' ? lowStockItems : filtered).map(p => {
                      const isOut  = p.stock_qty <= 0;
                      const isLow  = !isOut && p.stock_qty <= p.min_stock;
                      const status = isOut ? 'out' : isLow ? 'low' : 'ok';
                      const statusEl = isOut
                        ? <span className="badge badge-red">Out of Stock</span>
                        : isLow ? <span className="badge badge-yellow">Low Stock</span>
                        : <span className="badge badge-green">In Stock</span>;
                      return (
                        <tr key={p.id}>
                          <td><span className="mono">{p.sku}</span></td>
                          <td style={{ fontWeight: 600 }}>{p.name}</td>
                          <td>{p.category}</td>
                          <td style={{ color: 'var(--text-secondary)' }}>{p.unit}</td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <div style={{ flex: 1, background: 'var(--bg-hover)', borderRadius: 4, height: 6, overflow: 'hidden', minWidth: 60 }}>
                                <div style={{ height: '100%', width: `${Math.min(100, (p.stock_qty / Math.max(p.min_stock * 3, 1)) * 100)}%`, background: isOut ? 'var(--red)' : isLow ? 'var(--yellow)' : 'var(--green)', borderRadius: 4, transition: 'width 0.5s' }} />
                              </div>
                              <span style={{ fontWeight: 700, color: isOut ? 'var(--red)' : isLow ? 'var(--yellow)' : 'var(--text-primary)', minWidth: 30 }}>{fmt.num(p.stock_qty)}</span>
                            </div>
                          </td>
                          <td style={{ color: 'var(--text-secondary)' }}>{p.min_stock}</td>
                          <td>{fmt.currency(p.purchase_price)}</td>
                          <td className="font-bold">{fmt.currency(p.stock_qty * p.purchase_price)}</td>
                          <td>{statusEl}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {tab === 'movements' && (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Product</th><th>Type</th><th>Qty</th><th>Reference</th><th>Date</th><th>Notes</th></tr>
                </thead>
                <tbody>
                  {data?.movements.length === 0 ? (
                    <tr><td colSpan={6}><div className="empty-state"><div className="empty-icon">📋</div><h3>No movements yet</h3></div></td></tr>
                  ) : data?.movements.map(m => (
                    <tr key={m.id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{m.product_name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{m.sku}</div>
                      </td>
                      <td><span className={`badge badge-${m.type === 'purchase' ? 'green' : 'orange'}`}>{m.type}</span></td>
                      <td style={{ fontWeight: 700, color: m.qty > 0 ? 'var(--green)' : 'var(--red)' }}>{m.qty > 0 ? '+' : ''}{m.qty}</td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{m.ref_type} #{m.ref_id}</td>
                      <td style={{ color: 'var(--text-secondary)' }}>{fmt.date(m.created_at)}</td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{m.notes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
