import { useState, useEffect } from 'react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { confirmAction } from '../utils/confirm';
import { Plus, Edit2, Trash2, X, Search, Truck } from 'lucide-react';

function Modal({ title, onClose, children }) {
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal animate-fade-in">
        <div className="modal-header">
          <h2 className="text-base font-bold">{title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

export default function Suppliers() {
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', email: '', address: '', notes: '' });

  const load = () => api.get('/suppliers', { params: search ? { search } : {} }).then(r => setItems(r.data));
  useEffect(() => { load(); }, [search]);

  const openAdd = () => { setEditItem(null); setForm({ name: '', phone: '', email: '', address: '', notes: '' }); setShowModal(true); };
  const openEdit = (i) => { setEditItem(i); setForm({ name: i.name, phone: i.phone, email: i.email, address: i.address, notes: i.notes }); setShowModal(true); };

  const handleSubmit = async (e) => {
    e.preventDefault(); setLoading(true);
    try {
      if (editItem) { await api.put(`/suppliers/${editItem.id}`, form); toast.success('تم التحديث'); }
      else { await api.post('/suppliers', form); toast.success('تم الإضافة'); }
      setShowModal(false); load();
    } catch (err) { toast.error(err.response?.data?.message || 'خطأ'); }
    finally { setLoading(false); }
  };

  const handleDelete = async (id) => {
    if (!(await confirmAction('حذف المورد؟'))) return;
    try { await api.delete(`/suppliers/${id}`); toast.success('تم الحذف'); load(); }
    catch (err) { toast.error(err.response?.data?.message || 'خطأ'); }
  };

  return (
    <div className="p-6 space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div><h1 className="text-xl font-bold">الموردون</h1><p className="text-sm text-gray-500">{items.length} مورد</p></div>
        <button onClick={openAdd} className="btn-primary"><Plus className="w-4 h-4" /> إضافة مورد</button>
      </div>
      <div className="relative max-w-sm">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث..." className="input pr-9" />
      </div>
      <div className="table-container">
        <table className="table">
          <thead><tr><th>#</th><th>الاسم</th><th>الهاتف</th><th>البريد</th><th>العنوان</th><th>الإجراءات</th></tr></thead>
          <tbody className="divide-y divide-gray-100">
            {items.map((item, i) => (
              <tr key={item.id}>
                <td className="text-gray-400">{i + 1}</td>
                <td>
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center text-xs font-bold">{item.name[0]}</div>
                    <span className="font-medium">{item.name}</span>
                  </div>
                </td>
                <td>{item.phone || '-'}</td>
                <td>{item.email || '-'}</td>
                <td className="max-w-32 truncate">{item.address || '-'}</td>
                <td>
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(item)} className="p-1.5 rounded hover:bg-blue-50 text-blue-600"><Edit2 className="w-4 h-4" /></button>
                    <button onClick={() => handleDelete(item.id)} className="p-1.5 rounded hover:bg-red-50 text-red-500"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {items.length === 0 && <div className="text-center py-10 text-gray-400">لا يوجد موردون</div>}
      </div>

      {showModal && (
        <Modal title={editItem ? 'تعديل مورد' : 'إضافة مورد'} onClose={() => setShowModal(false)}>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="label">الاسم *</label>
              <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} required className="input" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label">الهاتف</label><input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="input" /></div>
              <div><label className="label">البريد</label><input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="input" /></div>
            </div>
            <div><label className="label">العنوان</label><input value={form.address} onChange={e => setForm({...form, address: e.target.value})} className="input" /></div>
            <div><label className="label">ملاحظات</label><textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} className="input" rows="2" /></div>
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">إلغاء</button>
              <button type="submit" disabled={loading} className="btn-primary">{loading ? 'جارٍ...' : (editItem ? 'تحديث' : 'إضافة')}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
