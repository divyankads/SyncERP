import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const ROLE_COLORS = { admin: '#6c63ff', sales: '#22c55e', warehouse: '#f97316', accounts: '#3b82f6' };

const nav = [
  { section: 'Main',      items: [{ icon: '📊', label: 'Dashboard',       to: '/',               module: null }] },
  { section: 'Sales',     items: [
    { icon: '👥', label: 'Customers',         to: '/customers',       module: 'customers' },
    { icon: '📋', label: 'Challans',           to: '/challans',        module: 'challans' },
    { icon: '🧾', label: 'Invoices',           to: '/invoices',        module: 'invoices' },
    { icon: '🤝', label: 'CRM Follow-ups',     to: '/crm',             module: 'crm' },
  ]},
  { section: 'Inventory', items: [
    { icon: '📦', label: 'Products',           to: '/products',        module: 'products' },
    { icon: '🏭', label: 'Suppliers',           to: '/suppliers',       module: null },
    { icon: '🛒', label: 'Purchase Orders',     to: '/purchase-orders', module: 'purchase-orders' },
    { icon: '🗃️', label: 'Stock',              to: '/stock',           module: 'stock' },
  ]},
];

export default function Sidebar() {
  const { user, logout, can } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
    navigate('/login');
  };

  const roleColor = ROLE_COLORS[user?.role] || '#6c63ff';

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-icon">⚡</div>
        <div className="logo-text"><span>Sync</span>ERP</div>
      </div>

      {nav.map(section => {
        const visible = section.items.filter(item => !item.module || can(item.module) || user?.role === 'admin');
        if (visible.length === 0) return null;
        return (
          <div className="nav-section" key={section.section}>
            <div className="nav-label">{section.section}</div>
            {visible.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
              >
                <span className="nav-icon">{item.icon}</span>
                {item.label}
              </NavLink>
            ))}
          </div>
        );
      })}

      <div className="sidebar-footer">
        <div style={{ marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 8px 4px' }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: `linear-gradient(135deg, ${roleColor}, ${roleColor}88)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
              {user?.name?.charAt(0)}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.name}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: roleColor }} />
                <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'capitalize' }}>{user?.role}</div>
              </div>
            </div>
          </div>
        </div>
        <button
          onClick={handleLogout}
          style={{ width: '100%', background: 'var(--red-bg)', border: '1px solid rgba(239,68,68,0.2)', color: 'var(--red)', borderRadius: 8, padding: '8px 12px', cursor: 'pointer', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center', transition: 'var(--transition)', fontFamily: 'inherit' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--red)'; e.currentTarget.style.color = 'white'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'var(--red-bg)'; e.currentTarget.style.color = 'var(--red)'; }}
        >
          🚪 Sign Out
        </button>
      </div>
    </aside>
  );
}
