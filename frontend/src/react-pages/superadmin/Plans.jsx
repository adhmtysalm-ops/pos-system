import { useState, useEffect } from 'react';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import { confirmAction } from '../../utils/confirm';
import {
  Plus, Edit2, Trash2, X, Check, Star, Users, ShoppingBag,
  BarChart2, UserCheck, Power, Tag, Sparkles
} from 'lucide-react';

const DEFAULT_COLORS = [
  { name: 'رمادي', value: '#6B7280' },
  { name: 'أزرق', value: '#3B82F6' },
  { name: 'بنفسجي', value: '#8B5CF6' },
  { name: 'ذهبي', value: '#F59E0B' },
  { name: 'أخضر', value: '#10B981' },
  { name: 'وردي', value: '#EC4899' },
  { name: 'برتقالي', value: '#F97316' },
  { name: 'أحمر', value: '#EF4444' },
];

const FEATURE_SUGGESTIONS = [
  'نقطة بيع واحدة', 'نقاط بيع متعددة', 'نقاط بيع غير محدودة',
  'تقارير أساسية', 'تقارير متقدمة', 'تقارير شاملة', 'تقارير BI',
  'إدارة مخزون', 'مزامنة سحابية', 'إدارة موظفين', 'إدارة موردين',
  'دعم فني عبر البريد', 'دعم فني 24/7', 'دعم أولوية', 'مدير حساب مخصص',
  'API Access', 'Custom Branding', 'SLA 99.9%', 'تدريب فريق',
  'نسخ احتياطي يومي', 'إشعارات SMS', 'تكامل مع برامج خارجية',
];

function getPlanGradient(color) {
  const map = {
    '#6B7280': 'from-gray-500 to-gray-700',
    '#3B82F6': 'from-blue-500 to-blue-700',
    '#8B5CF6': 'from-violet-500 to-purple-700',
    '#F59E0B': 'from-amber-400 to-amber-600',
    '#10B981': 'from-emerald-500 to-emerald-700',
    '#EC4899': 'from-pink-500 to-pink-700',
    '#F97316': 'from-orange-500 to-orange-700',
    '#EF4444': 'from-red-500 to-red-700',
  };
  return map[color] || 'from-blue-500 to-blue-700';
}

function PlanModal({ plan, onClose, onSave }) {
  const [form, setForm] = useState({
    name: '', description: '', price_monthly: 0,
    max_employees: 5, max_cashiers: 2, max_products: 500, max_sales_per_month: 1000,
    features: [], color: '#3B82F6', is_active: 1, sort_order: 0,
  });
  const [newFeature, setNewFeature] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (plan) {
      setForm({
        ...plan,
        features: typeof plan.features === 'string' ? JSON.parse(plan.features || '[]') : (plan.features || []),
      });
    }
  }, [plan]);

  const addFeature = (f) => {
    const text = f || newFeature.trim();
    if (!text || form.features.includes(text)) return;
    setForm(s => ({ ...s, features: [...s.features, text] }));
    setNewFeature('');
  };

  const removeFeature = (i) => setForm(s => ({ ...s, features: s.features.filter((_, idx) => idx !== i) }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name) return toast.error('اسم الباقة مطلوب');
    setLoading(true);
    try {
      if (plan?.id) {
        await api.put(`/admin/plans/${plan.id}`, form);
        toast.success('تم تحديث الباقة');
      } else {
        await api.post('/admin/plans', form);
        toast.success('تم إنشاء الباقة');
      }
      onSave();
    } catch (err) {
      toast.error(err.response?.data?.error || 'خطأ في الحفظ');
    } finally {
      setLoading(false);
    }
  };

  const set = (k, v) => setForm(s => ({ ...s, [k]: v }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white flex items-center justify-between px-6 py-4 border-b">
          <h2 className="font-bold text-gray-900 text-lg">{plan ? 'تعديل الباقة' : 'إنشاء باقة جديدة'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500"><X className="w-5 h-5" /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Name & Description */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">اسم الباقة *</label>
              <input value={form.name} onChange={e => set('name', e.target.value)} required className="input" placeholder="مثال: Pro" />
            </div>
            <div>
              <label className="label">السعر الشهري (ج.م)</label>
              <input type="number" value={form.price_monthly} onChange={e => set('price_monthly', parseFloat(e.target.value) || 0)} className="input" min="0" />
            </div>
          </div>

          <div>
            <label className="label">وصف الباقة</label>
            <input value={form.description} onChange={e => set('description', e.target.value)} className="input" placeholder="وصف مختصر يظهر للعميل" />
          </div>

          {/* Limits Grid */}
          <div>
            <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-1.5"><BarChart2 className="w-4 h-4 text-blue-500" />حدود الباقة</h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'أقصى عدد موظفين', key: 'max_employees', icon: UserCheck },
                { label: 'أقصى عدد كاشيرين', key: 'max_cashiers', icon: Users },
                { label: 'أقصى عدد منتجات', key: 'max_products', icon: ShoppingBag },
                { label: 'أقصى مبيعات/شهر', key: 'max_sales_per_month', icon: BarChart2 },
              ].map(({ label, key, icon: Icon }) => (
                <div key={key} className="bg-gray-50 rounded-xl p-3">
                  <label className="flex items-center gap-1 text-xs font-medium text-gray-600 mb-2"><Icon className="w-3.5 h-3.5" />{label}</label>
                  <input type="number" value={form[key]} onChange={e => set(key, parseInt(e.target.value) || 0)} className="input text-center font-bold" min="1" />
                  <p className="text-xs text-center text-gray-400 mt-1">{form[key] >= 999 ? 'غير محدود' : form[key]}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Color */}
          <div>
            <label className="label">لون الباقة</label>
            <div className="flex gap-2 flex-wrap">
              {DEFAULT_COLORS.map(c => (
                <button key={c.value} type="button" title={c.name}
                  onClick={() => set('color', c.value)}
                  className={`w-8 h-8 rounded-full border-4 transition-all ${form.color === c.value ? 'border-gray-800 scale-110' : 'border-transparent'}`}
                  style={{ backgroundColor: c.value }} />
              ))}
            </div>
          </div>

          {/* Features */}
          <div>
            <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-1.5"><Star className="w-4 h-4 text-amber-500" />مميزات الباقة</h3>
            {/* Current features */}
            <div className="flex flex-wrap gap-2 mb-3 min-h-8">
              {form.features.map((f, i) => (
                <span key={i} className="flex items-center gap-1 pl-1 pr-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-full border border-blue-200">
                  <Check className="w-3 h-3" />{f}
                  <button type="button" onClick={() => removeFeature(i)} className="hover:text-red-500 ml-0.5"><X className="w-3 h-3" /></button>
                </span>
              ))}
            </div>
            {/* Add custom feature */}
            <div className="flex gap-2 mb-2">
              <input value={newFeature} onChange={e => setNewFeature(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addFeature())}
                className="input flex-1 text-sm" placeholder="اكتب ميزة جديدة..." />
              <button type="button" onClick={() => addFeature()} className="btn-primary text-sm px-3">إضافة</button>
            </div>
            {/* Suggestions */}
            <div className="flex flex-wrap gap-1.5">
              {FEATURE_SUGGESTIONS.filter(f => !form.features.includes(f)).slice(0, 10).map(f => (
                <button key={f} type="button" onClick={() => addFeature(f)}
                  className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full hover:bg-blue-50 hover:text-blue-600 transition-colors">
                  + {f}
                </button>
              ))}
            </div>
          </div>

          {/* Sort Order & Active */}
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="label">ترتيب العرض</label>
              <input type="number" value={form.sort_order} onChange={e => set('sort_order', parseInt(e.target.value) || 0)} className="input" min="0" />
            </div>
            <div className="flex items-center gap-2 mt-5">
              <button type="button" onClick={() => set('is_active', form.is_active ? 0 : 1)}
                className={`relative w-12 h-6 rounded-full transition-colors ${form.is_active ? 'bg-green-500' : 'bg-gray-300'}`}>
                <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${form.is_active ? 'right-0.5' : 'left-0.5'}`} />
              </button>
              <span className="text-sm font-medium text-gray-700">{form.is_active ? 'الباقة نشطة' : 'باقة معطلة'}</span>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">إلغاء</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1">
              {loading ? 'جارٍ الحفظ...' : (plan ? 'حفظ التعديلات' : 'إنشاء الباقة')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Plans() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editPlan, setEditPlan] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const load = () => {
    setLoading(true);
    api.get('/admin/plans')
      .then(r => setPlans(r.data))
      .catch(() => toast.error('فشل تحميل الباقات'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleToggle = async (plan) => {
    try {
      await api.put(`/admin/plans/${plan.id}`, {
        ...plan,
        features: typeof plan.features === 'string' ? JSON.parse(plan.features || '[]') : plan.features,
        is_active: plan.is_active ? 0 : 1
      });
      toast.success(plan.is_active ? 'تم تعطيل الباقة' : 'تم تفعيل الباقة');
      load();
    } catch { toast.error('خطأ'); }
  };

  const handleDelete = async (plan) => {
    if (plan.subscriber_count > 0) return toast.error(`لا يمكن حذف الباقة — ${plan.subscriber_count} متجر مشترك بها`);
    if (!(await confirmAction(`حذف باقة "${plan.name}"؟`))) return;
    try {
      await api.delete(`/admin/plans/${plan.id}`);
      toast.success('تم حذف الباقة');
      load();
    } catch { toast.error('فشل الحذف'); }
  };

  const openEdit = (plan) => { setEditPlan(plan); setShowModal(true); };
  const openAdd = () => { setEditPlan(null); setShowModal(true); };

  const formatLimit = (v) => v >= 999 ? '∞' : v?.toLocaleString('ar-EG');

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-amber-500" /> إدارة الباقات
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">{plans.length} باقة مُعرَّفة — ابنِ نظام تسعير مرن ومتكامل</p>
        </div>
        <button onClick={openAdd} className="btn-primary">
          <Plus className="w-4 h-4" /> باقة جديدة
        </button>
      </div>

      {/* Summary bar */}
      <div className="flex gap-4 flex-wrap">
        {[
          { label: 'الكل', value: plans.length, color: 'bg-gray-100 text-gray-700' },
          { label: 'نشطة', value: plans.filter(p => p.is_active).length, color: 'bg-green-100 text-green-700' },
          { label: 'معطلة', value: plans.filter(p => !p.is_active).length, color: 'bg-red-100 text-red-700' },
          { label: 'إجمالي المشتركين', value: plans.reduce((s, p) => s + (p.subscriber_count || 0), 0), color: 'bg-blue-100 text-blue-700' },
        ].map(s => (
          <div key={s.label} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold ${s.color}`}>
            {s.label}: <span className="font-bold">{s.value}</span>
          </div>
        ))}
      </div>

      {/* Plans Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-80 bg-gray-100 rounded-2xl animate-pulse" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {plans.map(plan => {
            const features = typeof plan.features === 'string' ? JSON.parse(plan.features || '[]') : (plan.features || []);
            const gradient = getPlanGradient(plan.color);
            return (
              <div key={plan.id} className={`rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all ${!plan.is_active ? 'opacity-60' : ''}`}>
                {/* Card Header */}
                <div className={`bg-gradient-to-br ${gradient} p-5 text-white relative`}>
                  {!plan.is_active && (
                    <div className="absolute top-2 right-2 bg-black/30 text-white text-xs px-2 py-0.5 rounded-full">معطّلة</div>
                  )}
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="text-xl font-bold">{plan.name}</h3>
                      <p className="text-white/80 text-sm">{plan.description}</p>
                    </div>
                    <Tag className="w-6 h-6 opacity-60" />
                  </div>
                  <div className="mt-4">
                    <span className="text-3xl font-black">{plan.price_monthly > 0 ? plan.price_monthly.toLocaleString('ar-EG') : 'مجاني'}</span>
                    {plan.price_monthly > 0 && <span className="text-sm opacity-80"> ج.م / شهر</span>}
                  </div>
                  <div className="mt-2 text-sm opacity-80">
                    {plan.subscriber_count > 0
                      ? <span className="bg-white/20 px-2 py-0.5 rounded-full">{plan.subscriber_count} متجر مشترك</span>
                      : <span className="opacity-50">لا يوجد مشتركون</span>}
                  </div>
                </div>

                {/* Card Body */}
                <div className="bg-white p-4 space-y-3">
                  {/* Limits */}
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { icon: UserCheck, label: 'موظفين', value: formatLimit(plan.max_employees) },
                      { icon: Users, label: 'كاشيرين', value: formatLimit(plan.max_cashiers) },
                      { icon: ShoppingBag, label: 'منتجات', value: formatLimit(plan.max_products) },
                      { icon: BarChart2, label: 'مبيعات/شهر', value: formatLimit(plan.max_sales_per_month) },
                    ].map(({ icon: Icon, label, value }) => (
                      <div key={label} className="bg-gray-50 rounded-lg p-2 text-center">
                        <Icon className="w-3.5 h-3.5 text-gray-400 mx-auto mb-0.5" />
                        <p className="text-sm font-bold text-gray-900">{value}</p>
                        <p className="text-xs text-gray-400">{label}</p>
                      </div>
                    ))}
                  </div>

                  {/* Features */}
                  <div className="space-y-1">
                    {features.slice(0, 4).map((f, i) => (
                      <div key={i} className="flex items-center gap-1.5 text-xs text-gray-600">
                        <Check className="w-3 h-3 text-green-500 flex-shrink-0" />
                        <span className="truncate">{f}</span>
                      </div>
                    ))}
                    {features.length > 4 && (
                      <p className="text-xs text-gray-400 mr-4">+{features.length - 4} ميزة أخرى</p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-1 border-t border-gray-100">
                    <button onClick={() => openEdit(plan)} className="flex-1 flex items-center justify-center gap-1 text-xs font-medium text-blue-600 hover:bg-blue-50 py-1.5 rounded-lg transition-colors">
                      <Edit2 className="w-3.5 h-3.5" />تعديل
                    </button>
                    <button onClick={() => handleToggle(plan)} className={`flex-1 flex items-center justify-center gap-1 text-xs font-medium py-1.5 rounded-lg transition-colors ${plan.is_active ? 'text-orange-600 hover:bg-orange-50' : 'text-green-600 hover:bg-green-50'}`}>
                      <Power className="w-3.5 h-3.5" />{plan.is_active ? 'تعطيل' : 'تفعيل'}
                    </button>
                    <button onClick={() => handleDelete(plan)} className="flex-1 flex items-center justify-center gap-1 text-xs font-medium text-red-500 hover:bg-red-50 py-1.5 rounded-lg transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />حذف
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Add Plan Card */}
          <button onClick={openAdd}
            className="rounded-2xl border-2 border-dashed border-gray-200 p-8 flex flex-col items-center justify-center gap-3 text-gray-400 hover:border-blue-300 hover:text-blue-400 transition-all min-h-80">
            <Plus className="w-10 h-10" />
            <p className="font-medium">إضافة باقة جديدة</p>
          </button>
        </div>
      )}

      {showModal && <PlanModal plan={editPlan} onClose={() => setShowModal(false)} onSave={() => { setShowModal(false); load(); }} />}
    </div>
  );
}
