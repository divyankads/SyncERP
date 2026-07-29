import { useState, useEffect, useCallback } from 'react';
import { api, fmt } from '../api';

export default function Stock() {
  const [data,      setData]      = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [tab,       setTab]       = useState('inventory');
  const [search,    setSearch]    = useState('');
  const [movType,   setMovType]   = useState('');   // '' | 'IN' | 'OUT'

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search)  params.set('search', search);
    api.get(`/stock?${params}`).then(setData).finally(() => setLoading(false));
  }, [search]);

  useEffect(() => { load(); }, [load]);

  const filtered = (data?.products || []).filter(p =>
    !search ||
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.sku.toLowerCase().includes(search.toLowerCase())
  );

  const filteredMovements = (data?.movements || []).filter(m =>
    !movType || m.type === movType
  );

  const lowStockItems = (data?.products || []).filter(p => p.stock_qty > 0 && p.stock_qty <= p.min_stock);
  const outOfStock    = (data?.products || []).filter(p => p.stock_qty <= 0);
  const stockValue    = (data?.products || []).reduce((s, p) => s + p.stock_qty * p.purchase_price, 0);
  const saleValue     = (data?.products || []).reduce((s, p) => s + p.stock_qty * p.sale_price, 0);

  return (
    <div className="page-content">
      {/* ── Header ── */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Stock Management</h1>
          <div className="page-desc">Real-time inventory levels, warehouse locations, and full stock movement audit log</div>
        </div>
        <button className="btn btn-secondary" onClick={load}>↻ Refresh</button>
      </div>

      {/* ── Summary Cards ── */}
      <div className="stats-grid" style={{ marginBottom: 24 }}>
        {[
          { icon: '📦', label: 'Total Products',   value: data?.products?.length || 0,    color: 'var(--blue-bg)',   iconColor: 'var(--blue)'   },
          { icon: '⚠️', label: 'Low Stock',        value: lowStockItems.length,            color: 'var(--yellow-bg)', iconColor: 'var(--yellow)' },
          { icon: '🚫', label: 'Out of Stock',     value: outOfStock.length,               color: 'var(--red-bg)',    iconColor: 'var(--red)'    },
          { icon: '💰', label: 'Stock Cost Value', value: fmt.currency(stockValue),        color: 'var(--purple-bg)', iconColor: 'var(--purple)' },
          { icon: '📈', label: 'Retail Value',     value: fmt.currency(saleValue),         color: 'var(--green-bg)',  iconColor: 'var(--green)'  },
        ].map(stat => (
          <div className="stat-card" key={stat.label}>
            <div className="stat-icon" style={{ background: stat.color }}>
              <span style={{ color: stat.iconColor }}>{stat.icon}</span>
            </div>
            <div>
              <div className="stat-value" style={{ fontSize: 18 }}>{stat.value}</div>
              <div className="stat-label">{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Tabs ── */}
      <div className="tabs">
        <button className={`tab ${tab === 'inventory' ? 'active' : ''}`} onClick={() => setTab('inventory')}>
          📦 Inventory
        </button>
        <button className={`tab ${tab === 'low' ? 'active' : ''}`} onClick={() => setTab('low')}>
          ⚠️ Low Stock {lowStockItems.length > 0 && `(${lowStockItems.length})`}
        </button>
        <button className={`tab ${tab === 'movements' ? 'active' : ''}`} onClick={() => setTab('movements')}>
          📋 Movement Log {data?.movements?.length > 0 && `(${data.movements.length})`}
        </button>
      </div>

      {loading ? <div className="loading"><div className="spinner" /></div> : (
        <>
          {/* ── Inventory / Low-Stock Tab ── */}
          {(tab === 'inventory' || tab === 'low') && (
            <>
              {tab === 'inventory' && (
                <div className="filters" style={{ marginBottom: 16 }}>
                  <input
                    className="filter-input"
                    placeholder="🔍 Search product or SKU…"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    style={{ minWidth: 280 }}
                  />
                </div>
              )}

              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>SKU</th>
                      <th>Product</th>
                      <th>Category</th>
                      <th>Location / Warehouse</th>
                      <th>Unit</th>
                      <th>Stock Qty</th>
                      <th>Min Alert</th>
                      <th>Cost Price</th>
                      <th>Stock Value</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(tab === 'low' ? lowStockItems : filtered).length === 0 ? (
                      <tr><td colSpan={10}>
                        <div className="empty-state">
                          <div className="empty-icon">{tab === 'low' ? '✅' : '📦'}</div>
                          <h3>{tab === 'low' ? 'No low-stock items!' : 'No products found'}</h3>
                        </div>
                      </td></tr>
                    ) : (tab === 'low' ? lowStockItems : filtered).map(p => {
                      const isOut = p.stock_qty <= 0;
                      const isLow = !isOut && p.stock_qty <= p.min_stock;
                      const statusBadge = isOut
                        ? <span className="badge badge-red">Out of Stock</span>
                        : isLow
                          ? <span className="badge badge-yellow">Low Stock</span>
                          : <span className="badge badge-green">In Stock</span>;
                      const barPct = Math.min(100, (p.stock_qty / Math.max(p.min_stock * 3, 1)) * 100);
                      return (
                        <tr key={p.id}>
                          <td><span className="mono">{p.sku}</span></td>
                          <td style={{ fontWeight: 600 }}>{p.name}</td>
                          <td>{p.category ? <span className="badge badge-purple">{p.category}</span> : '—'}</td>
                          <td>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12.5 }}>
                              <span>🏭</span>
                              <span className="mono">{p.location || 'Warehouse A'}</span>
                            </span>
                          </td>
                          <td style={{ color: 'var(--text-secondary)' }}>{p.unit}</td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <div style={{ flex: 1, background: 'var(--bg-hover)', borderRadius: 4, height: 5, overflow: 'hidden', minWidth: 60 }}>
                                <div style={{
                                  height: '100%', width: `${barPct}%`,
                                  background: isOut ? 'var(--red)' : isLow ? 'var(--yellow)' : 'var(--green)',
                                  borderRadius: 4, transition: 'width 0.5s',
                                }} />
                              </div>
                              <span style={{ fontWeight: 700, color: isOut ? 'var(--red)' : isLow ? 'var(--yellow)' : 'var(--text-primary)', minWidth: 36 }}>
                                {fmt.num(p.stock_qty)}
                              </span>
                            </div>
                          </td>
                          <td style={{ color: 'var(--text-secondary)' }}>{p.min_stock}</td>
                          <td>{fmt.currency(p.purchase_price)}</td>
                          <td className="font-bold">{fmt.currency(p.stock_qty * p.purchase_price)}</td>
                          <td>{statusBadge}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* ── Movement Log Tab ── */}
          {tab === 'movements' && (
            <>
              <div className="filters" style={{ marginBottom: 16 }}>
                <select className="filter-input" value={movType} onChange={e => setMovType(e.target.value)}>
                  <option value="">All Movements</option>
                  <option value="IN">▲ IN only</option>
                  <option value="OUT">▼ OUT only</option>
                </select>
              </div>

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
                    {filteredMovements.length === 0 ? (
                      <tr><td colSpan={7}>
                        <div className="empty-state">
                          <div className="empty-icon">📋</div>
                          <h3>No movements found</h3>
                          <p>Movements are logged when challans are confirmed or purchase orders received.</p>
                        </div>
                      </td></tr>
                    ) : filteredMovements.map(m => {
                      const isIn = m.type === 'IN' || Number(m.qty) > 0;
                      return (
                        <tr key={m.id}>
                          <td>
                            <div style={{ fontWeight: 600 }}>{m.product_name}</div>
                            <div className="mono" style={{ fontSize: 11, color: 'var(--text-muted)' }}>{m.sku}</div>
                          </td>
                          <td>
                            <span className={`badge ${isIn ? 'badge-green' : 'badge-red'}`}>
                              {isIn ? '▲ IN' : '▼ OUT'}
                            </span>
                          </td>
                          <td style={{ fontWeight: 800, fontSize: 15, color: isIn ? 'var(--green)' : 'var(--red)' }}>
                            {isIn ? '+' : '-'}{Math.abs(Number(m.qty))}
                          </td>
                          <td style={{ fontSize: 13 }}>{m.notes || '—'}</td>
                          <td>
                            {m.ref_type
                              ? <span className="mono" style={{ fontSize: 11, color: 'var(--text-muted)' }}>{m.ref_type.toUpperCase()} #{m.ref_id}</span>
                              : '—'
                            }
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
            </>
          )}
        </>
      )}
    </div>
  );
}
