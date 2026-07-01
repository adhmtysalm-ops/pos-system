import { useState, useEffect } from 'react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { confirmAction } from '../utils/confirm';
import { Plus, Edit2, Trash2, X, Tag } from 'lucide-react';

function Modal({ title, onClose, children }) {
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal animate-fade-in">
        <div className="modal-header">
          <h2 className="text-base font-bold text-gray-900">{title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

const COLORS = ['#3B82F6','#10B981','#8B5CF6','#F59E0B','#EF4444','#EC4899','#14B8A6','#F97316'];

export default function Categories() {
  const [items, setItems] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState({ name: '', description: '', color: '#3B82F6' });
  const [loading, setLoading] = useState(false);

  const load = () => api.get('/categories').then(r => setItems(r.data));
  useEffect(() => { load(); }, []);

  const openAdd = () => { setEditItem(null); setForm({ name: '', description: '', color: '#3B82F6' }); setShowModal(true); };
  const openEdit = (item) => { setEditItem(item); setForm({ name: item.name, description: item.description || '', color: item.color }); setShowModal(true); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editItem) { await api.put(`/categories/${editItem.id}`, form); toast.success('تم التحديث'); }
      else { await api.post('/categories', form); toast.success('تم الإضافة'); }
      setShowModal(false); load();
    } catch (err) { toast.error(err.response?.data?.message || 'خطأ'); }
    finally { setLoading(false); }
  };

  const handleDelete = async (id) => {
    if (!(await confirmAction('هل تريد حذف هذا التصنيف؟'))) return;
    try { await api.delete(`/categories/${id}`); toast.success('تم الحذف'); load(); }
    catch (err) { toast.error(err.response?.data?.message || 'لا يمكن الحذف'); }
  };

  return (
    <div className="p-6 space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">التصنيفات</h1>
          <p className="text-sm text-gray-500">{items.length} تصنيف</p>
        </div>
        <button onClick={openAdd} className="btn-primary"><Plus className="w-4 h-4" /> إضافة تصنيف</button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-3">
        {items.map(item => (
          <div key={item.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: item.color + '20' }}>
                <Tag className="w-5 h-5" style={{ color: item.color }} />
              </div>
              <div className="flex gap-1">
                <button onClick={() => openEdit(item)} className="p-1 rounded hover:bg-gray-100 text-blue-600"><Edit2 className="w-3.5 h-3.5" /></button>
                <button onClick={() => handleDelete(item.id)} className="p-1 rounded hover:bg-gray-100 text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            </div>
            <p className="font-semibold text-gray-800 text-sm">{item.name}</p>
            {item.description && <p className="text-xs text-gray-400 mt-0.5 truncate">{item.description}</p>}
          </div>
        ))}
        {items.length === 0 && <div className="col-span-6 text-center py-10 text-gray-400">لا توجد تصنيفات</div>}
      </div>

      {showModal && (
        <Modal title={editItem ? 'تعديل تصنيف' : 'إضافة تصنيف'} onClose={() => setShowModal(false)}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">اسم التصنيف *</label>
              <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} required className="input" placeholder="اسم التصنيف" />
            </div>
            <div>
              <label className="label">الوصف</label>
              <input value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="input" placeholder="وصف اختياري" />
            </div>
            <div>
              <label className="label">اللون</label>
              <div className="flex gap-2 flex-wrap">
                {COLORS.map(c => (
                  <button key={c} type="button" onClick={() => setForm({...form, color: c})}
                    className={`w-8 h-8 rounded-full border-2 transition-all ${form.color === c ? 'border-gray-800 scale-110' : 'border-transparent'}`}
                    style={{ backgroundColor: c }} />
                ))}
              </div>
            </div>
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
