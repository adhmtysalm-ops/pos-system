import { useState, useEffect } from 'react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { confirmAction } from '../utils/confirm';
import { Settings as SettingsIcon, Users, Save, Plus, Edit2, X, Eye, EyeOff, Trash2 } from 'lucide-react';

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

export default function Settings() {
  const [tab, setTab] = useState('store');
  const [storeSettings, setStoreSettings] = useState({
    store_name: '', store_phone: '', store_address: '',
    currency: 'ج.م', tax_rate: 0, receipt_footer: 'شكراً لزيارتكم', thermal_width: 80
  });
  const [users, setUsers] = useState([]);
  const [showUserModal, setShowUserModal] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [showPass, setShowPass] = useState(false);
  const [saving, setSaving] = useState(false);
  const [userForm, setUserForm] = useState({ name: '', username: '', password: '', role: 'cashier', active: 1, max_discount_percent: 0, can_edit_customers: 0 });

  const loadSettings = () => api.get('/settings').then(r => setStoreSettings(s => ({ ...s, ...r.data })));
  const loadUsers = () => api.get('/users').then(r => setUsers(r.data));

  useEffect(() => { loadSettings(); loadUsers(); }, []);

  const saveSettings = async () => {
    setSaving(true);
    try { await api.put('/settings', storeSettings); toast.success('تم حفظ الإعدادات'); }
    catch (err) { toast.error('خطأ في الحفظ'); }
    finally { setSaving(false); }
  };

  const openAddUser = () => { setEditUser(null); setUserForm({ name: '', username: '', password: '', role: 'cashier', active: 1, max_discount_percent: 0, can_edit_customers: 0 }); setShowUserModal(true); };
  const openEditUser = (u) => { setEditUser(u); setUserForm({ name: u.name, username: u.username, password: '', role: u.role, active: u.active, max_discount_percent: u.max_discount_percent || 0, can_edit_customers: u.can_edit_customers || 0 }); setShowUserModal(true); };

  const handleUserSubmit = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      if (editUser) { await api.put(`/users/${editUser.id}`, userForm); toast.success('تم تحديث المستخدم'); }
      else { await api.post('/users', userForm); toast.success('تم إضافة المستخدم'); }
      setShowUserModal(false); loadUsers();
    } catch (err) { toast.error(err.response?.data?.message || 'خطأ'); }
    finally { setSaving(false); }
  };

  const handleDeleteUser = async (id) => {
    // Get current logged-in user to prevent self-deletion
    const currentUser = JSON.parse(localStorage.getItem('pos_user') || '{}');
    if (currentUser.id === id) {
      toast.error('لا يمكنك حذف حسابك الخاص!');
      return;
    }
    if (!(await confirmAction('حذف المستخدم؟'))) return;
    try { await api.delete(`/users/${id}`); toast.success('تم الحذف'); loadUsers(); }
    catch (err) { toast.error(err.response?.data?.message || 'خطأ'); }
  };

  return (
    <div className="p-6 space-y-5 animate-fade-in">
      <h1 className="text-xl font-bold">الإعدادات</h1>

      <div className="flex gap-2 border-b border-gray-200">
        {[
          { id: 'store', label: 'إعدادات المتجر', icon: SettingsIcon },
          { id: 'users', label: 'المستخدمون', icon: Users },
        ].map(t => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                tab === t.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon className="w-4 h-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Store Settings */}
      {tab === 'store' && (
        <div className="card max-w-2xl">
          <div className="card-header"><h2 className="font-semibold">بيانات المتجر</h2></div>
          <div className="p-6 space-y-4">
            <div>
              <label className="label">اسم المتجر</label>
              <input value={storeSettings.store_name} onChange={e => setStoreSettings(s => ({...s, store_name: e.target.value}))} className="input" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">رقم الهاتف</label>
                <input value={storeSettings.store_phone} onChange={e => setStoreSettings(s => ({...s, store_phone: e.target.value}))} className="input" />
              </div>
              <div>
                <label className="label">العملة</label>
                <select value={storeSettings.currency} onChange={e => setStoreSettings(s => ({...s, currency: e.target.value}))} className="input">
                  {['ج.م', 'ر.س', 'د.إ', 'ك.د', 'د.أ', 'USD', 'EUR'].map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="label">العنوان</label>
              <textarea value={storeSettings.store_address} onChange={e => setStoreSettings(s => ({...s, store_address: e.target.value}))} className="input" rows="2" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">نسبة الضريبة (%)</label>
                <input type="number" value={storeSettings.tax_rate} onChange={e => setStoreSettings(s => ({...s, tax_rate: e.target.value}))} className="input" min="0" max="100" step="0.5" />
              </div>
              <div>
                <label className="label">عرض الطابعة الحرارية (mm)</label>
                <select value={storeSettings.thermal_width} onChange={e => setStoreSettings(s => ({...s, thermal_width: e.target.value}))} className="input">
                  <option value="58">58mm</option>
                  <option value="80">80mm</option>
                </select>
              </div>
            </div>
            <div>
              <label className="label">نص نهاية الإيصال</label>
              <input value={storeSettings.receipt_footer} onChange={e => setStoreSettings(s => ({...s, receipt_footer: e.target.value}))} className="input" placeholder="شكراً لزيارتكم" />
            </div>
            <div className="flex justify-end">
              <button onClick={saveSettings} disabled={saving} className="btn-primary">
                <Save className="w-4 h-4" />
                {saving ? 'جارٍ الحفظ...' : 'حفظ الإعدادات'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Users */}
      {tab === 'users' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={openAddUser} className="btn-primary"><Plus className="w-4 h-4" /> إضافة مستخدم</button>
          </div>
          <div className="table-container">
            <table className="table">
              <thead><tr><th>#</th><th>الاسم</th><th>اسم المستخدم</th><th>الدور</th><th>أقصى خصم</th><th>الحالة</th><th>التاريخ</th><th>إجراءات</th></tr></thead>
              <tbody className="divide-y divide-gray-100">
                {users.map((u, i) => (
                  <tr key={u.id}>
                    <td className="text-gray-400">{i + 1}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-bold">{u.name[0]}</div>
                        <span className="font-medium">{u.name}</span>
                      </div>
                    </td>
                    <td><code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">{u.username}</code></td>
                    <td>{u.role === 'admin' ? <span className="badge-blue">مدير</span> : <span className="badge-gray">كاشير</span>}</td>
                    <td>
                      <span className="text-xs text-emerald-600 font-bold bg-emerald-50 px-2 py-1 rounded">
                        {u.role === 'admin' ? '100%' : `${parseFloat(u.max_discount_percent || 0)}%`}
                      </span>
                    </td>
                    <td>{u.active ? <span className="badge-green">نشط</span> : <span className="badge-red">موقوف</span>}</td>
                    <td className="text-xs text-gray-400">{new Date(u.created_at).toLocaleDateString('ar-EG')}</td>
                    <td>
                      <div className="flex gap-1">
                        <button onClick={() => openEditUser(u)} className="p-1.5 rounded hover:bg-blue-50 text-blue-600"><Edit2 className="w-4 h-4" /></button>
                        <button onClick={() => handleDeleteUser(u.id)} className="p-1.5 rounded hover:bg-red-50 text-red-500"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showUserModal && (
        <Modal title={editUser ? 'تعديل مستخدم' : 'إضافة مستخدم'} onClose={() => setShowUserModal(false)}>
          <form onSubmit={handleUserSubmit} className="space-y-3">
            <div><label className="label">الاسم *</label><input value={userForm.name} onChange={e => setUserForm({...userForm, name: e.target.value})} required className="input" /></div>
            <div><label className="label">اسم المستخدم *</label><input value={userForm.username} onChange={e => setUserForm({...userForm, username: e.target.value})} required className="input" /></div>
            <div>
              <label className="label">كلمة المرور {editUser ? '(اتركها فارغة إذا لم تريد تغييرها)' : '*'}</label>
              <div className="relative">
                <input type={showPass ? 'text' : 'password'} value={userForm.password} onChange={e => setUserForm({...userForm, password: e.target.value})} required={!editUser} className="input pl-10" />
                <button type="button" onClick={() => setShowPass(!showPass)} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">الصلاحية</label>
                <select value={userForm.role} onChange={e => setUserForm({...userForm, role: e.target.value})} className="input">
                  <option value="cashier">كاشير</option>
                  <option value="admin">مدير</option>
                </select>
              </div>
              <div>
                <label className="label">الحالة</label>
                <select value={userForm.active} onChange={e => setUserForm({...userForm, active: parseInt(e.target.value)})} className="input">
                  <option value={1}>نشط</option>
                  <option value={0}>موقوف</option>
                </select>
              </div>
            </div>
            {userForm.role === 'cashier' && (
              <>
                <div>
                  <label className="label">الحد الأقصى للخصم المسموح (%)</label>
                  <input 
                    type="number" 
                    value={userForm.max_discount_percent} 
                    onChange={e => setUserForm({...userForm, max_discount_percent: e.target.value})} 
                    className="input" 
                    min="0" 
                    max="100" 
                    step="0.01" 
                  />
                </div>
                <div className="flex items-center gap-2 mt-4 p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <input 
                    type="checkbox" 
                    id="can_edit_customers"
                    checked={userForm.can_edit_customers === 1}
                    onChange={e => setUserForm({...userForm, can_edit_customers: e.target.checked ? 1 : 0})}
                    className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                  />
                  <label htmlFor="can_edit_customers" className="text-sm font-medium text-gray-700 cursor-pointer select-none">
                    السماح بتعديل وحذف العملاء
                  </label>
                </div>
              </>
            )}
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setShowUserModal(false)} className="btn-secondary">إلغاء</button>
              <button type="submit" disabled={saving} className="btn-primary">{saving ? 'جارٍ...' : (editUser ? 'تحديث' : 'إضافة')}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
