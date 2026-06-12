import { useState, useEffect } from 'react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { confirmAction } from '../utils/confirm';
import { Plus, Edit2, Trash2, X, DollarSign } from 'lucide-react';

const CATEGORIES = ['إيجار', 'رواتب', 'كهرباء', 'مياه', 'نظافة', 'صيانة', 'مواصلات', 'عام', 'أخرى'];

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

export default function Expenses() {
  const [items, setItems] = useState([]);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [cat, setCat] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ category: 'عام', amount: '', description: '', date: new Date().toISOString().split('T')[0] });

  const load = () => {
    const params = {};
    if (dateFrom) params.date_from = dateFrom;
    if (dateTo) params.date_to = dateTo;
    if (cat) params.category = cat;
    api.get('/expenses', { params }).then(r => setItems(r.data));
  };

  useEffect(() => { load(); }, [dateFrom, dateTo, cat]);

  const openAdd = () => { setEditItem(null); setForm({ category: 'عام', amount: '', description: '', date: new Date().toISOString().split('T')[0] }); setShowModal(true); };
  const openEdit = (i) => { setEditItem(i); setForm({ category: i.category, amount: i.amount, description: i.description, date: i.date }); setShowModal(true); };

  const handleSubmit = async (e) => {
    e.preventDefault(); setLoading(true);
    try {
      if (editItem) { await api.put(`/expenses/${editItem.id}`, form); toast.success('تم التحديث'); }
      else { await api.post('/expenses', form); toast.success('تم الإضافة'); }
      setShowModal(false); load();
    } catch (err) { toast.error(err.response?.data?.message || 'خطأ'); }
    finally { setLoading(false); }
  };

  const handleDelete = async (id) => {
    if (!(await confirmAction('حذف المصروف؟'))) return;
    try {
      await api.delete(`/expenses/${id}`);
      toast.success('تم الحذف');
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'خطأ في الحذف'); }
  };

  const total = items.reduce((s, i) => s + parseFloat(i.amount || 0), 0);

  return (
    <div className="p-6 space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">المصروفات</h1>
          <p className="text-sm text-gray-500">الإجمالي: {total.toLocaleString('ar-EG', { minimumFractionDigits: 2 })} ج.م</p>
        </div>
        <button onClick={openAdd} className="btn-primary"><Plus className="w-4 h-4" /> إضافة مصروف</button>
      </div>

      <div className="flex flex-wrap gap-2">
        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="input w-auto" />
        <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="input w-auto" />
        <select value={cat} onChange={e => setCat(e.target.value)} className="input w-36">
          <option value="">كل الأنواع</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <div className="table-container">
        <table className="table">
          <thead><tr><th>التاريخ</th><th>النوع</th><th>المبلغ</th><th>الوصف</th><th>المسؤول</th><th>إجراءات</th></tr></thead>
          <tbody className="divide-y divide-gray-100">
            {items.map(item => (
              <tr key={item.id}>
                <td>{item.date}</td>
                <td><span className="badge-blue">{item.category}</span></td>
                <td className="font-bold text-red-600">{parseFloat(item.amount).toFixed(2)}</td>
                <td className="max-w-40 truncate">{item.description || '-'}</td>
                <td className="text-gray-500">{item.user_name || '-'}</td>
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
        {items.length === 0 && <div className="text-center py-10 text-gray-400">لا توجد مصروفات</div>}
      </div>

      {showModal && (
        <Modal title={editItem ? 'تعديل مصروف' : 'إضافة مصروف'} onClose={() => setShowModal(false)}>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="label">نوع المصروف</label>
              <select value={form.category} onChange={e => setForm({...form, category: e.target.value})} className="input">
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="label">المبلغ *</label>
              <input type="number" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} required className="input" min="0" step="0.01" />
            </div>
            <div>
              <label className="label">التاريخ</label>
              <input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} className="input" />
            </div>
            <div>
              <label className="label">الوصف</label>
              <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="input" rows="2" />
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
