import { NavLink, useLocation } from 'react-router-dom';

const nav = [
  {
    label: 'Main',
    items: [
      { icon: '📊', label: 'Dashboard', to: '/' },
    ]
  },
  {
    label: 'Sales',
    items: [
      { icon: '👥', label: 'Customers', to: '/customers' },
      { icon: '📋', label: 'Challans', to: '/challans' },
      { icon: '🧾', label: 'Invoices', to: '/invoices' },
      { icon: '🤝', label: 'CRM Follow-ups', to: '/crm' },
    ]
  },
  {
    label: 'Inventory',
    items: [
      { icon: '📦', label: 'Products', to: '/products' },
      { icon: '🏭', label: 'Suppliers', to: '/suppliers' },
      { icon: '🛒', label: 'Purchase Orders', to: '/purchase-orders' },
      { icon: '🗃️', label: 'Stock', to: '/stock' },
    ]
  },
];

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-icon">⚡</div>
        <div className="logo-text"><span>Sync</span>ERP</div>
      </div>

      {nav.map(section => (
        <div className="nav-section" key={section.label}>
          <div className="nav-label">{section.label}</div>
          {section.items.map(item => (
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
      ))}

      <div className="sidebar-footer">
        <div className="user-card">
          <div className="user-avatar">SA</div>
          <div className="user-info">
            <div className="user-name">Sales Admin</div>
            <div className="user-role">Administrator</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
