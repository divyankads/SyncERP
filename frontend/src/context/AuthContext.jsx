import { createContext, useContext, useState, useCallback } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('syncerp_user')); } catch { return null; }
  });

  const login = useCallback((userData, token) => {
    localStorage.setItem('syncerp_token', token);
    localStorage.setItem('syncerp_user', JSON.stringify(userData));
    setUser(userData);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('syncerp_token');
    localStorage.removeItem('syncerp_user');
    setUser(null);
  }, []);

  const can = useCallback((module) => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    const perms = user.permissions || [];
    return perms.includes(module) || perms.includes('*');
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, login, logout, can }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
