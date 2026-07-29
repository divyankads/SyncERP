import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children, requiredModule }) {
  const { user, can } = useAuth();

  if (!user) return <Navigate to="/login" replace />;
  if (requiredModule && !can(requiredModule)) {
    return (
      <div className="page-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <div style={{ textAlign: 'center', padding: 60 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Access Denied</div>
          <div style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
            Your role (<strong style={{ color: 'var(--accent-light)' }}>{user.role}</strong>) does not have access to this module.
          </div>
        </div>
      </div>
    );
  }
  return children;
}
