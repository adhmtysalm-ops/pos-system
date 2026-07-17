import { useState, useEffect, useCallback } from 'react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { confirmAction } from '../../utils/confirm';
import {
  Building2, Plus, Store, User, Mail, Ban, CheckCircle, Search,
  X, Filter, Eye, RefreshCw, Trash2, Edit2, Calendar, TrendingUp,
  Users, ShoppingBag, BarChart2, UserCheck, ChevronDown, Phone,
  Package, DollarSign, Clock, AlertTriangle, ArrowUpRight, Save
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function daysUntil(dateStr) {
  if (!dateStr) return -999;
  return Math.ceil((new Date(dateStr) - new Date()) / 86400000);
}

function SubBadge({ endDate, status }) {
  if (status === 'suspended') return <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-600">موقوف</span>;
  const d = daysUntil(endDate);
  if (d < 0) return <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700 animate-pulse">اشتراك منتهي</span>;
  if (d <= 3) return <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700">ينتهي خلال {d}د</span>;
  if (d <= 7) return <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-orange-100 text-orange-700">ينتهي خلال {d}د</span>;
  if (d <= 30) return <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-yellow-100 text-yellow-700">{d} يوم متبقٍ</span>;
  return <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-700">نشط ({d} يوم)</span>;
}

function PlanBadge({ plan }) {
  const map = { Starter: 'bg-gray-100 text-gray-700', Basic: 'bg-blue-100 text-blue-700', Pro: 'bg-violet-100 text-violet-700', Enterprise: 'bg-amber-100 text-amber-700' };
  const cls = map[plan] || 'bg-gray-100 text-gray-600';
  return <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${cls}`}>{plan || '—'}</span>;
}

function ProgressBar({ label, value, max, color = 'blue' }) {
  const pct = max ? Math.min(100, Math.round((value / max) * 100)) : 0;
  const isOver = pct >= 90;
  const colorMap = { blue: 'bg-blue-500', green: 'bg-emerald-500', orange: 'bg-amber-500', red: 'bg-red-500' };
  const finalColor = isOver ? 'bg-red-500' : colorMap[color] || colorMap.blue;
  return (
    <div>
      <div className="flex justify-between text-xs text-gray-600 mb-1">
        <span>{label}</span>
        <span className={isOver ? 'text-red-600 font-bold' : ''}>{value} / {max >= 999 ? '∞' : max}</span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full ${finalColor} rounded-full transition-all`} style={{ width: max >= 999 ? '10%' : `${pct}%` }} />
      </div>
    </div>
  );
}

// ─── Detail Panel ─────────────────────────────────────────────────────────────

function TenantDetail({ tenantId, onClose, onRenew, plans }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    api.get(`/admin/tenants/${tenantId}/stats`)
      .then(r => setData(r.data))
      .catch(() => toast.error('فشل تحميل تفاصيل المتجر'))
      .finally(() => setLoading(false));
  }, [tenantId]);

  if (loading) return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="w-full max-w-xl bg-white shadow-2xl flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    </div>
  );

  if (!data) return null;
  const { tenant, subscription: sub, users, products, employees, sales, recentSales, monthlySales } = data;
  const days = daysUntil(sub?.end_date);
  const adminUsers = (users || []).filter(u => u.role === 'admin');
  const cashiers = (users || []).filter(u => u.role !== 'admin');

  const tabs = [
    { id: 'overview', label: 'نظرة عامة' },
    { id: 'subscription', label: 'الاشتراك' },
    { id: 'users', label: `المستخدمون (${users?.length || 0})` },
    { id: 'activity', label: 'النشاط' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="flex-1 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="w-full max-w-2xl bg-white shadow-2xl flex flex-col overflow-hidden animate-slide-in-right">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-5 text-white flex-shrink-0">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center font-black text-xl">
                {tenant?.store_name?.[0]}
              </div>
              <div>
                <h2 className="text-xl font-bold">{tenant?.store_name}</h2>
                <p className="text-white/70 text-sm">{tenant?.owner_name} • {tenant?.email}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-lg"><X className="w-5 h-5" /></button>
          </div>
          <div className="flex gap-2 mt-4 flex-wrap">
            <SubBadge endDate={sub?.end_date} status={tenant?.status} />
            <PlanBadge plan={sub?.plan_name} />
            <span className="px-2 py-0.5 rounded-full text-xs bg-white/20">{new Date(tenant?.created_at).toLocaleDateString('ar-EG')}</span>
          </div>
          <button onClick={() => onRenew(tenant)} className="mt-3 text-xs font-medium bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg transition-colors">
            <RefreshCw className="w-3.5 h-3.5 inline ml-1" />تجديد / تغيير الباقة
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 flex-shrink-0">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap ${activeTab === t.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">

          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { icon: Users, label: 'المستخدمون', value: users?.length || 0, color: 'text-blue-600 bg-blue-50' },
                  { icon: UserCheck, label: 'الموظفون النشطون', value: employees?.active || 0, color: 'text-green-600 bg-green-50' },
                  { icon: ShoppingBag, label: 'المنتجات النشطة', value: products?.active || 0, color: 'text-purple-600 bg-purple-50' },
                  { icon: TrendingUp, label: 'إجمالي الفواتير', value: sales?.count || 0, color: 'text-amber-600 bg-amber-50' },
                ].map(({ icon: Icon, label, value, color }) => (
                  <div key={label} className="bg-gray-50 rounded-xl p-3 flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color}`}>
                      <Icon className="w-4.5 h-4.5" />
                    </div>
                    <div>
                      <p className="text-lg font-bold text-gray-900">{value}</p>
                      <p className="text-xs text-gray-500">{label}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-100 rounded-xl p-4">
                <p className="text-xs text-gray-500 mb-1">إجمالي الإيرادات</p>
                <p className="text-2xl font-black text-emerald-700">
                  {parseFloat(sales?.revenue || 0).toLocaleString('ar-EG', { minimumFractionDigits: 2 })} ج.م
                </p>
              </div>
            </>
          )}

          {/* Subscription Tab */}
          {activeTab === 'subscription' && (
            <>
              <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><p className="text-gray-400 text-xs">الباقة</p><p className="font-bold">{sub?.plan_name || '—'}</p></div>
                  <div><p className="text-gray-400 text-xs">حالة الاشتراك</p><SubBadge endDate={sub?.end_date} status={tenant?.status} /></div>
                  <div><p className="text-gray-400 text-xs">تاريخ البدء</p><p className="font-medium">{sub?.start_date ? new Date(sub.start_date).toLocaleDateString('ar-EG') : '—'}</p></div>
                  <div><p className="text-gray-400 text-xs">تاريخ الانتهاء</p><p className={`font-medium ${days < 7 ? 'text-red-600' : ''}`}>{sub?.end_date ? new Date(sub.end_date).toLocaleDateString('ar-EG') : '—'}</p></div>
                </div>
              </div>
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-gray-700">استخدام الحدود</h3>
                <ProgressBar label="الموظفون" value={employees?.active || 0} max={sub?.max_employees} color="green" />
                <ProgressBar label="الكاشيرون (حسابات)" value={cashiers.length} max={sub?.max_cashiers} color="blue" />
                <ProgressBar label="المنتجات" value={products?.active || 0} max={sub?.max_products} color="orange" />
              </div>
              {sub?.notes && (
                <div className="bg-blue-50 rounded-xl p-3 text-sm text-blue-700">
                  <p className="font-medium mb-1">ملاحظات:</p>
                  <p>{sub.notes}</p>
                </div>
              )}
            </>
          )}

          {/* Users Tab */}
          {activeTab === 'users' && (
            <div className="space-y-2">
              {(users || []).map(u => (
                <div key={u.id} className="flex items-center gap-3 bg-gray-50 rounded-xl p-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${u.role === 'admin' ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-600'}`}>
                    {u.name?.[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{u.name}</p>
                    <p className="text-xs text-gray-400">@{u.username}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${u.role === 'admin' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                    {u.role === 'admin' ? 'مدير' : 'كاشير'}
                  </span>
                  <span className={`w-2 h-2 rounded-full ${u.active ? 'bg-green-500' : 'bg-gray-300'}`} />
                </div>
              ))}
              {!users?.length && <p className="text-center text-gray-400 py-6">لا يوجد مستخدمون</p>}
            </div>
          )}

          {/* Activity Tab */}
          {activeTab === 'activity' && (
            <>
              {monthlySales?.length > 0 && (
                <div className="bg-gray-50 rounded-xl p-4">
                  <h3 className="text-sm font-bold text-gray-700 mb-3">المبيعات الشهرية (آخر 6 أشهر)</h3>
                  <ResponsiveContainer width="100%" height={160}>
                    <BarChart data={monthlySales}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                      <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip formatter={v => [`${parseFloat(v).toLocaleString('ar-EG')} ج.م`, 'إيرادات']} />
                      <Bar dataKey="revenue" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
              <div className="space-y-2">
                <h3 className="text-sm font-bold text-gray-700">آخر الفواتير</h3>
                {(recentSales || []).map(s => (
                  <div key={s.invoice_number} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 text-xs">
                    <span className="font-mono text-gray-500">{s.invoice_number}</span>
                    <span className="font-bold text-gray-800">{parseFloat(s.total).toFixed(2)} ج.م</span>
                    <span className={`px-1.5 py-0.5 rounded text-xs ${s.status === 'completed' ? 'bg-green-100 text-green-700' : s.status === 'credit' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                      {s.status === 'completed' ? 'مكتمل' : s.status === 'credit' ? 'آجل' : s.status}
                    </span>
                    <span className="text-gray-400">{new Date(s.created_at).toLocaleDateString('ar-EG')}</span>
                  </div>
                ))}
                {!recentSales?.length && <p className="text-center text-gray-400 py-4">لا توجد فواتير</p>}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Renew Modal ─────────────────────────────────────────────────────────────

function RenewModal({ tenant, plans, onClose, onSave }) {
  const [form, setForm] = useState({ months: 1, plan_name: tenant?.plan_name || 'Basic', notes: '' });
  const [customLimits, setCustomLimits] = useState(false);
  const [limits, setLimits] = useState({ max_employees: 5, max_cashiers: 2, max_products: 500, max_sales_per_month: 1000 });
  const [loading, setLoading] = useState(false);

  const selectedPlan = plans.find(p => p.name === form.plan_name);
  useEffect(() => {
    if (selectedPlan && !customLimits) {
      setLimits({
        max_employees: selectedPlan.max_employees,
        max_cashiers: selectedPlan.max_cashiers,
        max_products: selectedPlan.max_products,
        max_sales_per_month: selectedPlan.max_sales_per_month,
      });
    }
  }, [form.plan_name, selectedPlan, customLimits]);

  const newEndDate = () => {
    const d = new Date();
    d.setMonth(d.getMonth() + form.months);
    return d.toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post(`/admin/tenants/${tenant.id}/renew`, {
        ...form, ...(customLimits ? limits : {}),
      });
      toast.success(`تم تجديد اشتراك "${tenant.store_name}" بنجاح!`);
      onSave();
    } catch (err) {
      toast.error(err.response?.data?.error || 'فشل التجديد');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-5 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold">تجديد الاشتراك</h2>
              <p className="text-white/70 text-sm">{tenant?.store_name}</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-lg"><X className="w-5 h-5" /></button>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Plan Selection */}
          <div>
            <label className="label">الباقة الجديدة</label>
            <div className="grid grid-cols-2 gap-2">
              {plans.filter(p => p.is_active).map(p => (
                <button key={p.id} type="button"
                  onClick={() => setForm(s => ({ ...s, plan_name: p.name }))}
                  className={`p-3 rounded-xl border-2 text-right transition-all ${form.plan_name === p.name ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                  <p className="font-bold text-sm">{p.name}</p>
                  <p className="text-xs text-gray-400">{p.price_monthly > 0 ? `${p.price_monthly} ج.م/شهر` : 'مجاني'}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Duration */}
          <div>
            <label className="label">مدة التجديد (أشهر)</label>
            <div className="flex gap-2">
              {[1, 3, 6, 12].map(m => (
                <button key={m} type="button"
                  onClick={() => setForm(s => ({ ...s, months: m }))}
                  className={`flex-1 py-2 rounded-xl text-sm font-bold border-2 transition-all ${form.months === m ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                  {m} {m === 1 ? 'شهر' : 'أشهر'}
                </button>
              ))}
            </div>
            <input type="number" value={form.months} onChange={e => setForm(s => ({ ...s, months: parseInt(e.target.value) || 1 }))}
              className="input mt-2" min="1" max="60" placeholder="أو أدخل عدد مخصص..." />
          </div>

          {/* New Expiry Preview */}
          <div className="bg-green-50 border border-green-100 rounded-xl p-3 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-green-600" />
            <p className="text-sm text-green-700">تاريخ الانتهاء الجديد: <span className="font-bold">{newEndDate()}</span></p>
          </div>

          {/* Custom Limits Toggle */}
          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={customLimits} onChange={e => setCustomLimits(e.target.checked)} className="rounded" />
              <span className="text-sm font-medium text-gray-700">تخصيص حدود الباقة</span>
            </label>
          </div>

          {customLimits && (
            <div className="grid grid-cols-2 gap-3 bg-gray-50 rounded-xl p-3">
              {[
                { label: 'أقصى موظفين', key: 'max_employees' },
                { label: 'أقصى كاشيرين', key: 'max_cashiers' },
                { label: 'أقصى منتجات', key: 'max_products' },
                { label: 'أقصى مبيعات/شهر', key: 'max_sales_per_month' },
              ].map(({ label, key }) => (
                <div key={key}>
                  <label className="text-xs text-gray-500 mb-1 block">{label}</label>
                  <input type="number" value={limits[key]} onChange={e => setLimits(l => ({ ...l, [key]: parseInt(e.target.value) || 0 }))}
                    className="input text-sm" min="1" />
                </div>
              ))}
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="label">ملاحظات (اختياري)</label>
            <input value={form.notes} onChange={e => setForm(s => ({ ...s, notes: e.target.value }))} className="input" placeholder="سبب التجديد أو ملاحظة..." />
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">إلغاء</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1">
              {loading ? 'جارٍ التجديد...' : `تجديد ${form.months} ${form.months === 1 ? 'شهر' : 'أشهر'}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Create/Edit Tenant Modal ─────────────────────────────────────────────────

function TenantModal({ tenant, plans, onClose, onSave }) {
  const isEdit = !!tenant;
  const [form, setForm] = useState({
    store_name: tenant?.store_name || '',
    owner_name: tenant?.owner_name || '',
    email: tenant?.email || '',
    admin_username: tenant?.admin_username || '',
    admin_password: '',
    plan_name: 'Basic',
    months: 1,
    max_employees: 5,
    max_cashiers: 2,
    max_products: 500,
    max_sales_per_month: 1000,
  });
  const [loading, setLoading] = useState(false);

  const selectedPlan = plans.find(p => p.name === form.plan_name);
  useEffect(() => {
    if (selectedPlan && !isEdit) {
      setForm(s => ({
        ...s,
        max_employees: selectedPlan.max_employees,
        max_cashiers: selectedPlan.max_cashiers,
        max_products: selectedPlan.max_products,
        max_sales_per_month: selectedPlan.max_sales_per_month,
      }));
    }
  }, [form.plan_name]);

  const set = (k, v) => setForm(s => ({ ...s, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isEdit) {
        await api.put(`/admin/tenants/${tenant.id}`, { store_name: form.store_name, owner_name: form.owner_name, email: form.email });
        toast.success('تم تحديث بيانات المتجر');
      } else {
        await api.post('/admin/tenants', form);
        toast.success(`تم إنشاء متجر "${form.store_name}" بنجاح!`);
      }
      onSave();
    } catch (err) {
      toast.error(err.response?.data?.error || 'فشل الحفظ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white flex items-center justify-between px-6 py-4 border-b">
          <h2 className="font-bold text-gray-900 text-lg">{isEdit ? 'تعديل بيانات المتجر' : 'إنشاء متجر جديد'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">اسم المتجر *</label>
              <input value={form.store_name} onChange={e => set('store_name', e.target.value)} required className="input" placeholder="سوبر ماركت الأمل" />
            </div>
            <div>
              <label className="label">اسم المالك *</label>
              <input value={form.owner_name} onChange={e => set('owner_name', e.target.value)} required className="input" placeholder="أحمد محمد" />
            </div>
          </div>
          <div>
            <label className="label">البريد الإلكتروني</label>
            <input type="email" value={form.email} onChange={e => set('email', e.target.value)} className="input" />
          </div>
          {!isEdit && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">اسم مستخدم المدير *</label>
                  <input value={form.admin_username} onChange={e => set('admin_username', e.target.value)} required className="input" placeholder="admin_store" />
                </div>
                <div>
                  <label className="label">كلمة المرور *</label>
                  <input type="password" value={form.admin_password} onChange={e => set('admin_password', e.target.value)} required className="input" />
                </div>
              </div>
              <div>
                <label className="label">الباقة</label>
                <div className="grid grid-cols-2 gap-2">
                  {plans.filter(p => p.is_active).map(p => (
                    <button key={p.id} type="button"
                      onClick={() => set('plan_name', p.name)}
                      className={`p-3 rounded-xl border-2 text-right ${form.plan_name === p.name ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}>
                      <p className="font-bold text-sm">{p.name}</p>
                      <p className="text-xs text-gray-400">{p.price_monthly > 0 ? `${p.price_monthly} ج.م/شهر` : 'مجاني'}</p>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="label">مدة الاشتراك (أشهر)</label>
                <div className="flex gap-2">
                  {[1, 3, 6, 12].map(m => (
                    <button key={m} type="button" onClick={() => set('months', m)}
                      className={`flex-1 py-2 rounded-xl text-sm font-bold border-2 transition-all ${form.months === m ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200'}`}>
                      {m}
                    </button>
                  ))}
                </div>
              </div>
              {/* Plan limits preview */}
              {selectedPlan && (
                <div className="bg-gray-50 rounded-xl p-3 text-xs text-gray-600 grid grid-cols-2 gap-2">
                  <span>موظفون: {selectedPlan.max_employees >= 999 ? 'غير محدود' : selectedPlan.max_employees}</span>
                  <span>كاشيرون: {selectedPlan.max_cashiers >= 999 ? 'غير محدود' : selectedPlan.max_cashiers}</span>
                  <span>منتجات: {selectedPlan.max_products >= 999 ? 'غير محدود' : selectedPlan.max_products}</span>
                  <span>مبيعات/شهر: {selectedPlan.max_sales_per_month >= 999 ? 'غير محدود' : selectedPlan.max_sales_per_month}</span>
                </div>
              )}
            </>
          )}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">إلغاء</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1">
              {loading ? 'جارٍ الحفظ...' : (isEdit ? 'حفظ التعديلات' : 'إنشاء المتجر')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Tenants Page ────────────────────────────────────────────────────────

export default function Tenants() {
  const [tenants, setTenants] = useState([]);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [planFilter, setPlanFilter] = useState('');
  const [expiryFilter, setExpiryFilter] = useState('');
  const [selectedTenantId, setSelectedTenantId] = useState(null);
  const [renewTenant, setRenewTenant] = useState(null);
  const [editTenant, setEditTenant] = useState(null);
  const [showCreate, setShowCreate] = useState(false);

  const fetchAll = useCallback(() => {
    setLoading(true);
    Promise.all([
      api.get('/admin/tenants', { params: { search, status: statusFilter, plan: planFilter, expiry: expiryFilter } }),
      api.get('/admin/plans'),
    ]).then(([t, p]) => {
      setTenants(t.data);
      setPlans(p.data);
    }).catch(() => toast.error('فشل تحميل البيانات'))
      .finally(() => setLoading(false));
  }, [search, statusFilter, planFilter, expiryFilter]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleToggleStatus = async (t) => {
    const newStatus = t.status === 'active' ? 'suspended' : 'active';
    if (!(await confirmAction(`${newStatus === 'suspended' ? 'إيقاف' : 'تفعيل'} متجر "${t.store_name}"؟`))) return;
    try {
      await api.put(`/admin/tenants/${t.id}/status`, { status: newStatus });
      toast.success(newStatus === 'active' ? 'تم تفعيل المتجر' : 'تم إيقاف المتجر');
      fetchAll();
    } catch { toast.error('خطأ'); }
  };

  const handleDelete = async (t) => {
    if (!(await confirmAction(`حذف متجر "${t.store_name}" نهائياً؟ سيُحذف كل شيء!`))) return;
    try {
      await api.delete(`/admin/tenants/${t.id}`);
      toast.success('تم حذف المتجر');
      fetchAll();
    } catch { toast.error('فشل الحذف'); }
  };

  // Stats
  const active = tenants.filter(t => t.status === 'active').length;
  const expired = tenants.filter(t => daysUntil(t.end_date) < 0 && t.status === 'active').length;
  const expiring7 = tenants.filter(t => { const d = daysUntil(t.end_date); return d >= 0 && d <= 7 && t.status === 'active'; }).length;

  return (
    <div className="p-6 space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Building2 className="w-6 h-6 text-blue-600" /> إدارة المتاجر
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">{tenants.length} متجر مسجل</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchAll} className="btn-outline"><RefreshCw className="w-4 h-4" /></button>
          <button onClick={() => setShowCreate(true)} className="btn-primary"><Plus className="w-4 h-4" /> متجر جديد</button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'إجمالي المتاجر', value: tenants.length, color: 'bg-gray-50 border-gray-200 text-gray-700', filter: '' },
          { label: 'متاجر نشطة', value: active, color: 'bg-green-50 border-green-100 text-green-700', filter: 'active' },
          { label: 'ينتهون قريباً (7 أيام)', value: expiring7, color: 'bg-amber-50 border-amber-100 text-amber-700', filter: 'expiring7' },
          { label: 'اشتراكات منتهية', value: expired, color: 'bg-red-50 border-red-100 text-red-700', filter: 'expired' },
        ].map(s => (
          <button key={s.label} onClick={() => setExpiryFilter(s.filter === expiryFilter ? '' : s.filter)}
            className={`${s.color} border rounded-xl p-3 text-right transition-all ${expiryFilter === s.filter && s.filter ? 'ring-2 ring-offset-1 ring-blue-400' : 'hover:shadow-sm'}`}>
            <p className="text-2xl font-bold">{s.value}</p>
            <p className="text-xs font-medium mt-0.5">{s.label}</p>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث بالاسم، المالك، البريد..." className="input pr-9 w-full" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="input w-auto">
          <option value="">كل الحالات</option>
          <option value="active">نشط</option>
          <option value="suspended">موقوف</option>
        </select>
        <select value={planFilter} onChange={e => setPlanFilter(e.target.value)} className="input w-auto">
          <option value="">كل الباقات</option>
          {[...new Set(tenants.map(t => t.plan_name).filter(Boolean))].map(p => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
        {(search || statusFilter || planFilter || expiryFilter) && (
          <button onClick={() => { setSearch(''); setStatusFilter(''); setPlanFilter(''); setExpiryFilter(''); }}
            className="btn-outline text-red-500 border-red-200 hover:bg-red-50">
            <X className="w-4 h-4" /> مسح الفلاتر
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-4 py-3 font-semibold text-gray-600">المتجر</th>
                <th className="px-4 py-3 font-semibold text-gray-600">المالك / البريد</th>
                <th className="px-4 py-3 font-semibold text-gray-600">الباقة</th>
                <th className="px-4 py-3 font-semibold text-gray-600">الاشتراك</th>
                <th className="px-4 py-3 font-semibold text-gray-600">الإحصائيات</th>
                <th className="px-4 py-3 font-semibold text-gray-600">الحالة</th>
                <th className="px-4 py-3 font-semibold text-gray-600">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? [...Array(5)].map((_, i) => (
                <tr key={i}>
                  {[...Array(7)].map((_, j) => <td key={j} className="px-4 py-3"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td>)}
                </tr>
              )) : tenants.map(t => (
                <tr key={t.id} className="hover:bg-blue-50/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-100 to-blue-200 text-blue-700 flex items-center justify-center font-black text-sm flex-shrink-0">
                        {t.store_name?.[0]}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{t.store_name}</p>
                        <p className="text-xs text-gray-400 font-mono">@{t.admin_username}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-gray-700 font-medium">{t.owner_name}</p>
                    <p className="text-xs text-gray-400">{t.email}</p>
                  </td>
                  <td className="px-4 py-3"><PlanBadge plan={t.plan_name} /></td>
                  <td className="px-4 py-3"><SubBadge endDate={t.end_date} status={t.status} /></td>
                  <td className="px-4 py-3">
                    <div className="flex gap-3 text-xs text-gray-500">
                      <span title="مستخدمون"><Users className="w-3 h-3 inline ml-0.5" />{t.user_count}</span>
                      <span title="موظفون"><UserCheck className="w-3 h-3 inline ml-0.5" />{t.employee_count}</span>
                      <span title="منتجات"><ShoppingBag className="w-3 h-3 inline ml-0.5" />{t.product_count}</span>
                      <span title="مبيعات"><BarChart2 className="w-3 h-3 inline ml-0.5" />{t.sales_count}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {t.status === 'active'
                      ? <span className="flex items-center gap-1 text-xs font-medium text-green-700"><CheckCircle className="w-3.5 h-3.5" />نشط</span>
                      : <span className="flex items-center gap-1 text-xs font-medium text-red-600"><Ban className="w-3.5 h-3.5" />موقوف</span>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => setSelectedTenantId(t.id)} title="التفاصيل" className="p-1.5 rounded-lg hover:bg-blue-100 text-blue-600"><Eye className="w-4 h-4" /></button>
                      <button onClick={() => setRenewTenant(t)} title="تجديد" className="p-1.5 rounded-lg hover:bg-green-100 text-green-600"><RefreshCw className="w-4 h-4" /></button>
                      <button onClick={() => setEditTenant(t)} title="تعديل" className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600"><Edit2 className="w-4 h-4" /></button>
                      <button onClick={() => handleToggleStatus(t)} title={t.status === 'active' ? 'إيقاف' : 'تفعيل'}
                        className={`p-1.5 rounded-lg transition-colors ${t.status === 'active' ? 'hover:bg-orange-100 text-orange-600' : 'hover:bg-green-100 text-green-600'}`}>
                        {t.status === 'active' ? <Ban className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                      </button>
                      <button onClick={() => handleDelete(t)} title="حذف" className="p-1.5 rounded-lg hover:bg-red-100 text-red-500"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && tenants.length === 0 && (
            <div className="text-center py-16 text-gray-400">
              <Building2 className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p className="font-medium">لا توجد متاجر تطابق البحث</p>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {selectedTenantId && (
        <TenantDetail tenantId={selectedTenantId} onClose={() => setSelectedTenantId(null)}
          onRenew={(t) => { setSelectedTenantId(null); setRenewTenant(t); }} plans={plans} />
      )}
      {renewTenant && (
        <RenewModal tenant={renewTenant} plans={plans} onClose={() => setRenewTenant(null)} onSave={() => { setRenewTenant(null); fetchAll(); }} />
      )}
      {(showCreate || editTenant) && (
        <TenantModal tenant={editTenant} plans={plans}
          onClose={() => { setShowCreate(false); setEditTenant(null); }}
          onSave={() => { setShowCreate(false); setEditTenant(null); fetchAll(); }} />
      )}
    </div>
  );
}
