import { useState, useEffect } from 'react';
import api from '../../api/axios';
import { Building2, Plus, Store, User, Mail, Ban, CheckCircle, Save, X } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Tenants() {
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  
  const [form, setForm] = useState({
    store_name: '',
    owner_name: '',
    email: '',
    admin_username: '',
    admin_password: '',
    plan_name: 'Basic',
    months: '1'
  });

  const fetchTenants = async () => {
    try {
      const res = await api.get('/protected/admin/tenants');
      setTenants(res.data);
    } catch (err) {
      toast.error('فشل في جلب المتاجر');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTenants();
  }, []);

  const handleToggleStatus = async (id, currentStatus) => {
    const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
    try {
      await api.put(`/protected/admin/tenants/${id}/status`, { status: newStatus });
      toast.success(newStatus === 'active' ? 'تم تفعيل المتجر' : 'تم إيقاف المتجر');
      fetchTenants();
    } catch (err) {
      toast.error('فشل في تغيير حالة المتجر');
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await api.post('/protected/admin/tenants', form);
      toast.success('تم إنشاء المتجر بنجاح');
      setShowModal(false);
      setForm({ store_name: '', owner_name: '', email: '', admin_username: '', admin_password: '', plan_name: 'Basic', months: '1' });
      fetchTenants();
    } catch (err) {
      toast.error('فشل في إنشاء المتجر');
    }
  };

  if (loading) return <div className="p-6">جاري التحميل...</div>;

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Building2 className="w-6 h-6 text-blue-600" />
            إدارة المتاجر (Tenants)
          </h1>
          <p className="text-gray-500 text-sm mt-1">التحكم في المتاجر المشتركة في نظام الـ SaaS</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="btn-primary"
        >
          <Plus className="w-4 h-4" />
          إنشاء متجر جديد
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-sm font-semibold text-gray-900">المتجر</th>
                <th className="px-6 py-4 text-sm font-semibold text-gray-900">المالك</th>
                <th className="px-6 py-4 text-sm font-semibold text-gray-900">حساب المدير</th>
                <th className="px-6 py-4 text-sm font-semibold text-gray-900">الباقة والانتهاء</th>
                <th className="px-6 py-4 text-sm font-semibold text-gray-900">الحالة</th>
                <th className="px-6 py-4 text-sm font-semibold text-gray-900">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {tenants.map(t => (
                <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                        <Store className="w-5 h-5" />
                      </div>
                      <span className="font-medium text-gray-900">{t.store_name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-gray-900">{t.owner_name}</span>
                      <span className="text-xs text-gray-500">{t.email}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2.5 py-1 bg-gray-100 text-gray-700 rounded-lg text-xs font-medium font-mono">
                      {t.admin_username || '-'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-blue-600">{t.plan_name || 'بدون باقة'}</span>
                      <span className="text-xs text-gray-500">{t.end_date ? new Date(t.end_date).toLocaleDateString('ar-EG') : '-'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                      t.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {t.status === 'active' ? <CheckCircle className="w-3 h-3" /> : <Ban className="w-3 h-3" />}
                      {t.status === 'active' ? 'نشط' : 'موقوف'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => handleToggleStatus(t.id, t.status)}
                      className={`text-sm font-medium ${t.status === 'active' ? 'text-red-600 hover:text-red-700' : 'text-green-600 hover:text-green-700'}`}
                    >
                      {t.status === 'active' ? 'إيقاف المتجر' : 'تفعيل المتجر'}
                    </button>
                  </td>
                </tr>
              ))}
              {tenants.length === 0 && (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                    لا يوجد متاجر مسجلة حالياً
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50">
              <h3 className="font-bold text-gray-900">إنشاء متجر جديد</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">اسم المتجر</label>
                  <input required value={form.store_name} onChange={e => setForm({...form, store_name: e.target.value})} className="input-field" placeholder="مثال: سوبر ماركت الأمل" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">اسم المالك</label>
                  <input required value={form.owner_name} onChange={e => setForm({...form, owner_name: e.target.value})} className="input-field" placeholder="مثال: أحمد محمد" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">البريد الإلكتروني</label>
                  <input required type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="input-field" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">اسم مستخدم المدير</label>
                  <input required value={form.admin_username} onChange={e => setForm({...form, admin_username: e.target.value})} className="input-field" placeholder="admin123" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">كلمة المرور للمدير</label>
                  <input required type="password" value={form.admin_password} onChange={e => setForm({...form, admin_password: e.target.value})} className="input-field" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">الباقة</label>
                  <select value={form.plan_name} onChange={e => setForm({...form, plan_name: e.target.value})} className="input-field">
                    <option value="Basic">الأساسية (Basic)</option>
                    <option value="Pro">المتقدمة (Pro)</option>
                    <option value="Enterprise">الشركات (Enterprise)</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">مدة الاشتراك (شهور)</label>
                  <input required type="number" min="1" value={form.months} onChange={e => setForm({...form, months: e.target.value})} className="input-field" />
                </div>
              </div>
              
              <div className="pt-4 flex gap-3">
                <button type="submit" className="btn-primary flex-1">
                  <Save className="w-4 h-4" />
                  إنشاء المتجر وتسليم الحساب
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
