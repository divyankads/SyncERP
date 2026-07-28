import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { api, fmt } from '../api';

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ name: '', email: '', phone: '', address: '', gstin: '' });
  const [selected, setSelected] = useState(null);

  const load = () => { setLoading(true); api.get('/suppliers').then(setSuppliers).finally(() => setLoading(false)); };
  useEffect(() => { load(); }, []);

  const openAdd  = () => { setForm({ name: '', email: '', phone: '', address: '', gstin: '' }); setModal('add'); };
  const openEdit = (s) => { setForm(s); setSelected(s); setModal('edit'); };

  const save = async () => {
    try {
      if (modal === 'add') { await api.post('/suppliers', form); toast.success('Supplier added!'); }
      else { await api.put(`/suppliers/${selected.id}`, form); toast.success('Supplier updated!'); }
      setModal(null); load();
    } catch (e) { toast.error(e.message); }
  };

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">Suppliers</h1>
          <div className="page-desc">Manage your vendor and supplier directory</div>
        </div>
        <button className="btn btn-primary" onClick={openAdd}>+ Add Supplier</button>
      </div>

      {loading ? <div className="loading"><div className="spinner"/></div> : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>#</th><th>Supplier Name</th><th>Phone</th><th>Email</th><th>GSTIN</th><th>Address</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {suppliers.map((s, i) => (
                <tr key={s.id}>
                  <td style={{ color: 'var(--text-muted)' }}>{i+1}</td>
                  <td style={{ fontWeight: 600 }}>{s.name}</td>
                  <td className="mono">{s.phone}</td>
                  <td style={{ color: 'var(--text-secondary)' }}>{s.email}</td>
                  <td><span className="mono">{s.gstin || '—'}</span></td>
                  <td style={{ color: 'var(--text-secondary)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.address}</td>
                  <td><button className="btn btn-sm btn-secondary" onClick={() => openEdit(s)}>Edit</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="modal">
            <div className="modal-header">
              <div className="modal-title">{modal === 'add' ? 'Add Supplier' : 'Edit Supplier'}</div>
              <button className="modal-close" onClick={() => setModal(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-group"><label className="form-label">Name *</label><input className="form-control" value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></div>
              <div className="form-row">
                <div className="form-group"><label className="form-label">Phone</label><input className="form-control" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} /></div>
                <div className="form-group"><label className="form-label">Email</label><input className="form-control" value={form.email} onChange={e => setForm({...form, email: e.target.value})} /></div>
              </div>
              <div className="form-group"><label className="form-label">GSTIN</label><input className="form-control mono" value={form.gstin} onChange={e => setForm({...form, gstin: e.target.value})} /></div>
              <div className="form-group"><label className="form-label">Address</label><textarea className="form-control" value={form.address} onChange={e => setForm({...form, address: e.target.value})} /></div>
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
