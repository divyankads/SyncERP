// In dev:        requests proxy to localhost:5001 via vite.config.js
// In production:  VITE_API_URL is set to the deployed backend URL
const BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api';

async function req(method, path, body) {
  const token = localStorage.getItem('syncerp_token');
  const opts = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(BASE + path, opts);

  if (res.status === 401) {
    localStorage.removeItem('syncerp_token');
    localStorage.removeItem('syncerp_user');
    window.location.href = '/login';
    return;
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Network error' }));
    throw new Error(err.error || err.message || 'Request failed');
  }
  return res.json();
}

export const api = {
  get:    (path)       => req('GET',    path),
  post:   (path, body) => req('POST',   path, body),
  put:    (path, body) => req('PUT',    path, body),
  delete: (path)       => req('DELETE', path),
};

export const fmt = {
  currency: (n) => `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`,
  date:     (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—',
  num:      (n) => Number(n || 0).toLocaleString('en-IN'),
};
