import { useState, useEffect } from 'react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { confirmAction } from '../utils/confirm';
import { Plus, Edit2, X, UserCheck, Phone } from 'lucide-react';

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

export default function Employees() {
  const [items, setItems] = useState([]);
  const [users, setUsers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: '', phone: '', email: '', address: '', position: '',
    salary: '', hire_date: '', user_id: ''
  });

  const load = () => {
    Promise.all([api.get('/employees'), api.get('/users')]).then(([e, u]) => {
      setItems(e.data);
      setUsers(u.data);
    });
  };
  useEffect(() => { load(); }, []);

  const openAdd = () => { setEditItem(null); setForm({ name: '', phone: '', email: '', address: '', position: '', salary: '', hire_date: '', user_id: '' }); setShowModal(true); };
  const openEdit = (i) => { setEditItem(i); setForm({ name: i.name, phone: i.phone, email: i.email, address: i.address, position: i.position, salary: i.salary, hire_date: i.hire_date ? i.hire_date.split('T')[0] : '', user_id: i.user_id || '' }); setShowModal(true); };

  const handleSubmit = async (e) => {
    e.preventDefault(); setLoading(true);
    try {
      const payload = { ...form, user_id: form.user_id || null, salary: parseFloat(form.salary) || 0 };
      if (editItem) { await api.put(`/employees/${editItem.id}`, payload); toast.success('تم التحديث'); }
      else { await api.post('/employees', payload); toast.success('تم الإضافة'); }
      setShowModal(false); load();
    } catch (err) { toast.error(err.response?.data?.message || 'خطأ'); }
    finally { setLoading(false); }
  };

  const handleDeactivate = async (id) => {
    if (!(await confirmAction('إلغاء تفعيل الموظف؟'))) return;
    const emp = items.find(i => i.id === id);
    await api.put(`/employees/${id}`, { ...emp, active: 0 });
    toast.success('تم إلغاء التفعيل'); load();
  };

  return (
    <div className="p-6 space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div><h1 className="text-xl font-bold">الموظفون</h1><p className="text-sm text-gray-500">{items.filter(i => i.active).length} موظف نشط</p></div>
        <button onClick={openAdd} className="btn-primary"><Plus className="w-4 h-4" /> إضافة موظف</button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {items.map(emp => (
          <div key={emp.id} className={`bg-white rounded-xl border shadow-sm p-4 ${!emp.active ? 'opacity-50' : 'hover:shadow-md'} transition-shadow`}>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center font-bold text-sm">{emp.name[0]}</div>
                <div>
                  <p className="font-semibold text-gray-900 text-sm">{emp.name}</p>
                  <p className="text-xs text-gray-500">{emp.position || 'موظف'}</p>
                </div>
              </div>
              <div className="flex gap-1">
                <button onClick={() => openEdit(emp)} className="p-1.5 rounded hover:bg-blue-50 text-blue-600"><Edit2 className="w-3.5 h-3.5" /></button>
                {emp.active === 1 && <button onClick={() => handleDeactivate(emp.id)} className="p-1.5 rounded hover:bg-red-50 text-red-500"><X className="w-3.5 h-3.5" /></button>}
              </div>
            </div>
            <div className="mt-3 space-y-1">
              {emp.phone && <div className="flex items-center gap-2 text-xs text-gray-500"><Phone className="w-3 h-3" />{emp.phone}</div>}
              {emp.salary > 0 && <div className="text-xs text-emerald-600 font-medium">الراتب: {parseFloat(emp.salary).toLocaleString('ar-EG')} ج.م</div>}
              {emp.username && <div className="text-xs text-blue-500">حساب: {emp.username}</div>}
            </div>
          </div>
        ))}
        {items.length === 0 && <div className="col-span-4 text-center py-10 text-gray-400">لا يوجد موظفون</div>}
      </div>

      {showModal && (
        <Modal title={editItem ? 'تعديل موظف' : 'إضافة موظف'} onClose={() => setShowModal(false)}>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2"><label className="label">الاسم *</label><input value={form.name} onChange={e => setForm({...form, name: e.target.value})} required className="input" /></div>
              <div><label className="label">الهاتف</label><input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="input" /></div>
              <div><label className="label">الوظيفة</label><input value={form.position} onChange={e => setForm({...form, position: e.target.value})} className="input" /></div>
              <div><label className="label">الراتب</label><input type="number" value={form.salary} onChange={e => setForm({...form, salary: e.target.value})} className="input" min="0" /></div>
              <div><label className="label">تاريخ التعيين</label><input type="date" value={form.hire_date} onChange={e => setForm({...form, hire_date: e.target.value})} className="input" /></div>
              <div className="col-span-2"><label className="label">ربط بحساب مستخدم</label>
                <select value={form.user_id} onChange={e => setForm({...form, user_id: e.target.value})} className="input">
                  <option value="">بدون ربط</option>
                  {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.role === 'admin' ? 'مدير' : 'كاشير'})</option>)}
                </select>
              </div>
              <div className="col-span-2"><label className="label">العنوان</label><input value={form.address} onChange={e => setForm({...form, address: e.target.value})} className="input" /></div>
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
