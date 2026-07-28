import { useState, useEffect } from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { api, fmt } from '../api';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload?.length) {
    return (
      <div style={{ background: '#181c28', border: '1px solid #252a3a', borderRadius: 8, padding: '8px 14px' }}>
        <div style={{ fontSize: 11, color: '#8892a4', marginBottom: 4 }}>{label}</div>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#f0f2f8' }}>{fmt.currency(payload[0]?.value)}</div>
      </div>
    );
  }
  return null;
};

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/dashboard').then(setData).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="page-content"><div className="loading"><div className="spinner"/></div></div>;
  if (!data) return null;

  const statusBadge = (s) => {
    const map = { paid: 'green', partial: 'yellow', unpaid: 'red', overdue: 'red', draft: 'gray', confirmed: 'blue', dispatched: 'orange', delivered: 'green', received: 'green' };
    return <span className={`badge badge-${map[s] || 'gray'}`}>{s}</span>;
  };

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <div className="page-desc">Welcome back — here's what's happening today</div>
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{fmt.date(new Date().toISOString())}</div>
      </div>

      {/* KPI Cards */}
      <div className="stats-grid">
        {[
          { icon: '👥', label: 'Active Customers', value: data.totalCustomers, color: 'var(--blue-bg)', iconColor: 'var(--blue)' },
          { icon: '📦', label: 'Total Products', value: data.totalProducts, color: 'var(--purple-bg)', iconColor: 'var(--purple)' },
          { icon: '⚠️', label: 'Low Stock Items', value: data.lowStockCount, color: 'var(--yellow-bg)', iconColor: 'var(--yellow)' },
          { icon: '💰', label: 'Total Revenue', value: fmt.currency(data.totalRevenue), color: 'var(--green-bg)', iconColor: 'var(--green)' },
          { icon: '🔴', label: 'Pending Amount', value: fmt.currency(data.pendingAmount), color: 'var(--red-bg)', iconColor: 'var(--red)' },
          { icon: '🛒', label: 'Open POs', value: data.openPOs, color: 'var(--orange-bg)', iconColor: 'var(--orange)' },
          { icon: '📞', label: 'Pending Follow-ups', value: data.pendingFollowups, color: 'var(--accent-glow)', iconColor: 'var(--accent-light)' },
        ].map(stat => (
          <div className="stat-card" key={stat.label}>
            <div className="stat-icon" style={{ background: stat.color }}><span>{stat.icon}</span></div>
            <div>
              <div className="stat-value">{stat.value}</div>
              <div className="stat-label">{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid-2">
        {/* Monthly Sales Chart */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Monthly Revenue</div>
              <div className="card-subtitle">Last 6 months</div>
            </div>
          </div>
          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.monthlySales} barSize={32}>
                <CartesianGrid strokeDasharray="3 3" stroke="#252a3a" vertical={false} />
                <XAxis dataKey="month" tick={{ fill: '#8892a4', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#8892a4', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="total" fill="#6c63ff" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Products */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Top Products</div>
              <div className="card-subtitle">By units sold</div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {data.topProducts.map((p, i) => (
              <div key={p.sku} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 24, height: 24, borderRadius: 6, background: 'var(--accent-glow)', color: 'var(--accent-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, flexShrink: 0 }}>{i+1}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{fmt.num(p.total_sold)} units · {fmt.currency(p.revenue)}</div>
                </div>
                <div style={{ fontSize: 11, color: 'var(--accent-light)', fontWeight: 700 }}>{fmt.num(p.total_sold)}</div>
              </div>
            ))}
            {data.topProducts.length === 0 && <div className="text-muted text-sm">No sales data yet</div>}
          </div>
        </div>
      </div>

      {/* Recent Invoices */}
      <div className="card mt-6">
        <div className="card-header">
          <div className="card-title">Recent Invoices</div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Invoice #</th>
                <th>Customer</th>
                <th>Date</th>
                <th>Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {data.recentInvoices.map(inv => (
                <tr key={inv.id}>
                  <td><span className="mono">{inv.invoice_no}</span></td>
                  <td>{inv.customer_name}</td>
                  <td style={{ color: 'var(--text-secondary)' }}>{fmt.date(inv.invoice_date)}</td>
                  <td className="font-bold">{fmt.currency(inv.total_amount)}</td>
                  <td>{statusBadge(inv.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
