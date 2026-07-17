import { useState, useEffect, useCallback } from 'react';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import { confirmAction } from '../../utils/confirm';
import {
  Calendar, RefreshCw, Search, X, Filter, AlertTriangle,
  CheckCircle, Clock, Ban, ChevronDown, TrendingUp, Users,
  Download, ArrowUpRight, Zap, Tag
} from 'lucide-react';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function daysUntil(dateStr) {
  if (!dateStr) return -999;
  return Math.ceil((new Date(dateStr) - new Date()) / 86400000);
}

function SubStatusBadge({ endDate, tenantStatus }) {
  if (tenantStatus === 'suspended')
    return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-600 flex items-center gap-1 w-fit"><Ban className="w-3 h-3" />موقوف</span>;
  const d = daysUntil(endDate);
  if (d < 0)
    return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700 flex items-center gap-1 w-fit animate-pulse"><AlertTriangle className="w-3 h-3" />منتهي منذ {Math.abs(d)}د</span>;
  if (d <= 3)
    return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700 flex items-center gap-1 w-fit"><AlertTriangle className="w-3 h-3" />ينتهي بعد {d}د</span>;
  if (d <= 7)
    return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-orange-100 text-orange-700 flex items-center gap-1 w-fit"><Clock className="w-3 h-3" />ينتهي بعد {d}د</span>;
  if (d <= 30)
    return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-yellow-100 text-yellow-700 flex items-center gap-1 w-fit"><Clock className="w-3 h-3" />{d} يوم متبقٍ</span>;
  return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700 flex items-center gap-1 w-fit"><CheckCircle className="w-3 h-3" />نشط ({d} يوم)</span>;
}

function PlanBadge({ plan }) {
  const map = {
    Starter: 'bg-gray-100 text-gray-700',
    Basic: 'bg-blue-100 text-blue-700',
    Pro: 'bg-violet-100 text-violet-700',
    Enterprise: 'bg-amber-100 text-amber-700',
  };
  return <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${map[plan] || 'bg-gray-100 text-gray-600'}`}>{plan || '—'}</span>;
}

function ExpiryBar({ endDate }) {
  const d = daysUntil(endDate);
  const total = 365;
  const pct = Math.max(0, Math.min(100, (d / total) * 100));
  const color = d < 0 ? 'bg-red-500' : d <= 7 ? 'bg-orange-500' : d <= 30 ? 'bg-yellow-400' : 'bg-emerald-500';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`text-xs font-mono ${d < 0 ? 'text-red-600' : d <= 30 ? 'text-amber-600' : 'text-gray-500'}`}>
        {d < 0 ? `−${Math.abs(d)}` : `+${d}`}
      </span>
    </div>
  );
}

// ─── Quick Renew Modal ────────────────────────────────────────────────────────

function QuickRenewModal({ tenant, plans, onClose, onSave }) {
  const [months, setMonths] = useState(1);
  const [planName, setPlanName] = useState(tenant?.plan_name || 'Basic');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const newDate = () => {
    const d = new Date();
    d.setMonth(d.getMonth() + months);
    return d.toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post(`/admin/tenants/${tenant.id}/renew`, { months, plan_name: planName, notes });
      toast.success(`✅ تم تجديد "${tenant.store_name}" لـ ${months} ${months === 1 ? 'شهر' : 'أشهر'}`);
      onSave();
    } catch (err) {
      toast.error(err.response?.data?.error || 'فشل التجديد');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-scale-in">
        <div className="bg-gradient-to-r from-emerald-500 to-teal-600 p-5 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold flex items-center gap-2"><RefreshCw className="w-5 h-5" />تجديد الاشتراك</h2>
              <p className="text-white/70 text-sm mt-0.5">{tenant.store_name}</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-lg"><X className="w-5 h-5" /></button>
          </div>
          <div className="flex gap-2 mt-3 flex-wrap">
            <SubStatusBadge endDate={tenant.end_date} tenantStatus={tenant.status} />
            <PlanBadge plan={tenant.plan_name} />
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Plan */}
          <div>
            <label className="label">الباقة</label>
            <div className="grid grid-cols-2 gap-2">
              {(plans || []).filter(p => p.is_active).map(p => (
                <button key={p.id} type="button" onClick={() => setPlanName(p.name)}
                  className={`p-2.5 rounded-xl border-2 text-right text-sm transition-all ${planName === p.name ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 hover:border-gray-300'}`}>
                  <span className="font-bold block">{p.name}</span>
                  <span className="text-xs text-gray-400">{p.price_monthly > 0 ? `${p.price_monthly} ج.م/شهر` : 'مجاني'}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Duration */}
          <div>
            <label className="label">المدة</label>
            <div className="grid grid-cols-4 gap-2 mb-2">
              {[1, 3, 6, 12].map(m => (
                <button key={m} type="button" onClick={() => setMonths(m)}
                  className={`py-2 rounded-xl text-sm font-bold border-2 transition-all ${months === m ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-gray-200 text-gray-600'}`}>
                  {m}
                </button>
              ))}
            </div>
            <input type="number" value={months} onChange={e => setMonths(Math.max(1, parseInt(e.target.value) || 1))}
              min="1" max="60" className="input w-full" placeholder="أو أدخل عدداً مخصصاً..." />
          </div>

          {/* Preview */}
          <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 flex items-center gap-3">
            <Calendar className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <div>
              <p className="text-xs text-gray-500">تاريخ الانتهاء الجديد</p>
              <p className="font-bold text-emerald-700">{newDate()}</p>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="label">ملاحظة (اختياري)</label>
            <input value={notes} onChange={e => setNotes(e.target.value)} className="input" placeholder="سبب التجديد..." />
          </div>

          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">إلغاء</button>
            <button type="submit" disabled={loading} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-4 rounded-xl transition-colors disabled:opacity-50">
              {loading ? 'جارٍ التجديد...' : `تجديد ${months} ${months === 1 ? 'شهر' : 'أشهر'}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Bulk Renew Modal ─────────────────────────────────────────────────────────

function BulkRenewModal({ selected, plans, onClose, onSave }) {
  const [months, setMonths] = useState(1);
  const [loading, setLoading] = useState(false);

  const handleBulk = async () => {
    setLoading(true);
    let ok = 0; let fail = 0;
    for (const t of selected) {
      try {
        await api.post(`/admin/tenants/${t.id}/renew`, { months });
        ok++;
      } catch { fail++; }
    }
    toast.success(`✅ تم تجديد ${ok} متجر${fail > 0 ? ` — فشل ${fail}` : ''}`);
    onSave();
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="bg-gradient-to-r from-purple-600 to-violet-600 p-5 text-white">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-lg flex items-center gap-2"><Zap className="w-5 h-5" />تجديد جماعي ({selected.length})</h2>
            <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-lg"><X className="w-5 h-5" /></button>
          </div>
        </div>
        <div className="p-5 space-y-4">
          <div className="max-h-40 overflow-y-auto space-y-1.5">
            {selected.map(t => (
              <div key={t.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 text-sm">
                <span className="font-medium">{t.store_name}</span>
                <SubStatusBadge endDate={t.end_date} tenantStatus={t.status} />
              </div>
            ))}
          </div>
          <div>
            <label className="label">عدد الأشهر للتجديد</label>
            <div className="grid grid-cols-4 gap-2">
              {[1, 3, 6, 12].map(m => (
                <button key={m} type="button" onClick={() => setMonths(m)}
                  className={`py-2 rounded-xl text-sm font-bold border-2 transition-all ${months === m ? 'border-purple-500 bg-purple-50 text-purple-700' : 'border-gray-200'}`}>
                  {m}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="btn-secondary flex-1">إلغاء</button>
            <button onClick={handleBulk} disabled={loading}
              className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-bold py-2.5 px-4 rounded-xl transition-colors disabled:opacity-50">
              {loading ? `جارٍ التجديد...` : `تجديد ${selected.length} متجر`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Subscriptions Page ──────────────────────────────────────────────────

export default function Subscriptions() {
  const [tenants, setTenants] = useState([]);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expiryFilter, setExpiryFilter] = useState('');
  const [planFilter, setPlanFilter] = useState('');
  const [selected, setSelected] = useState([]);
  const [renewTenant, setRenewTenant] = useState(null);
  const [showBulk, setShowBulk] = useState(false);

  const fetchAll = useCallback(() => {
    setLoading(true);
    Promise.all([
      api.get('/admin/tenants'),
      api.get('/admin/plans'),
    ]).then(([t, p]) => {
      setTenants(t.data);
      setPlans(p.data);
    }).catch(() => toast.error('فشل تحميل البيانات'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Filter
  const filtered = tenants.filter(t => {
    const d = daysUntil(t.end_date);
    if (expiryFilter === 'expiring7' && !(d >= 0 && d <= 7)) return false;
    if (expiryFilter === 'expiring30' && !(d >= 0 && d <= 30)) return false;
    if (expiryFilter === 'expired' && d >= 0) return false;
    if (expiryFilter === 'active' && (d < 0 || t.status !== 'active')) return false;
    if (planFilter && t.plan_name !== planFilter) return false;
    if (search && !`${t.store_name} ${t.owner_name} ${t.email}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  // Stats
  const stats = {
    total: tenants.length,
    active: tenants.filter(t => { const d = daysUntil(t.end_date); return d >= 0 && t.status === 'active'; }).length,
    expiring7: tenants.filter(t => { const d = daysUntil(t.end_date); return d >= 0 && d <= 7 && t.status === 'active'; }).length,
    expiring30: tenants.filter(t => { const d = daysUntil(t.end_date); return d >= 0 && d <= 30 && t.status === 'active'; }).length,
    expired: tenants.filter(t => daysUntil(t.end_date) < 0).length,
  };

  const toggleSelect = (id) => setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);
  const toggleAll = () => setSelected(s => s.length === filtered.length ? [] : filtered.map(t => t.id));
  const selectedTenants = tenants.filter(t => selected.includes(t.id));

  const uniquePlans = [...new Set(tenants.map(t => t.plan_name).filter(Boolean))];

  return (
    <div className="p-6 space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Calendar className="w-6 h-6 text-blue-600" /> إدارة الاشتراكات
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {stats.expiring7 > 0 && <span className="text-orange-600 font-medium">{stats.expiring7} اشتراك ينتهي خلال 7 أيام • </span>}
            {stats.expired > 0 && <span className="text-red-600 font-medium">{stats.expired} اشتراك منتهٍ • </span>}
            {tenants.length} متجر إجمالاً
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchAll} className="btn-outline"><RefreshCw className="w-4 h-4" /></button>
          {selected.length > 0 && (
            <button onClick={() => setShowBulk(true)}
              className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-bold px-4 py-2 rounded-xl transition-colors">
              <Zap className="w-4 h-4" /> تجديد {selected.length} محدد
            </button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: 'الكل', value: stats.total, filter: '', color: 'border-gray-200 bg-gray-50 text-gray-700' },
          { label: 'نشطة', value: stats.active, filter: 'active', color: 'border-green-100 bg-green-50 text-green-700' },
          { label: 'تنتهي خلال 7 أيام', value: stats.expiring7, filter: 'expiring7', color: 'border-orange-100 bg-orange-50 text-orange-700' },
          { label: 'تنتهي خلال 30 يوم', value: stats.expiring30, filter: 'expiring30', color: 'border-yellow-100 bg-yellow-50 text-yellow-700' },
          { label: 'منتهية', value: stats.expired, filter: 'expired', color: 'border-red-100 bg-red-50 text-red-700' },
        ].map(s => (
          <button key={s.label} onClick={() => setExpiryFilter(prev => prev === s.filter ? '' : s.filter)}
            className={`${s.color} border rounded-xl p-3 text-right transition-all ${expiryFilter === s.filter ? 'ring-2 ring-blue-400 ring-offset-1' : 'hover:shadow-sm'}`}>
            <p className="text-2xl font-bold">{s.value}</p>
            <p className="text-xs font-medium mt-0.5">{s.label}</p>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث بالاسم أو المالك..." className="input pr-9 w-full" />
        </div>
        <select value={planFilter} onChange={e => setPlanFilter(e.target.value)} className="input w-auto">
          <option value="">كل الباقات</option>
          {uniquePlans.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        {(search || planFilter || expiryFilter) && (
          <button onClick={() => { setSearch(''); setPlanFilter(''); setExpiryFilter(''); }} className="btn-outline text-red-500 border-red-200">
            <X className="w-4 h-4" /> مسح
          </button>
        )}
        {selected.length > 0 && (
          <span className="text-sm text-purple-700 font-medium bg-purple-50 border border-purple-100 px-3 py-2 rounded-xl">
            {selected.length} محدد
          </span>
        )}
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-4 py-3">
                  <input type="checkbox" checked={selected.length === filtered.length && filtered.length > 0}
                    onChange={toggleAll} className="rounded" />
                </th>
                <th className="px-4 py-3 font-semibold text-gray-600">المتجر</th>
                <th className="px-4 py-3 font-semibold text-gray-600">الباقة</th>
                <th className="px-4 py-3 font-semibold text-gray-600">بداية الاشتراك</th>
                <th className="px-4 py-3 font-semibold text-gray-600">نهاية الاشتراك</th>
                <th className="px-4 py-3 font-semibold text-gray-600 min-w-40">المتبقي</th>
                <th className="px-4 py-3 font-semibold text-gray-600">الحالة</th>
                <th className="px-4 py-3 font-semibold text-gray-600">إجراء</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? [...Array(6)].map((_, i) => (
                <tr key={i}>{[...Array(8)].map((_, j) => (
                  <td key={j} className="px-4 py-3"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td>
                ))}</tr>
              )) : filtered.map(t => {
                const d = daysUntil(t.end_date);
                const rowBg = d < 0 ? 'bg-red-50/40' : d <= 7 ? 'bg-orange-50/40' : '';
                return (
                  <tr key={t.id} className={`hover:bg-blue-50/20 transition-colors ${rowBg}`}>
                    <td className="px-4 py-3">
                      <input type="checkbox" checked={selected.includes(t.id)} onChange={() => toggleSelect(t.id)} className="rounded" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-black text-sm flex-shrink-0">
                          {t.store_name?.[0]}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{t.store_name}</p>
                          <p className="text-xs text-gray-400">{t.owner_name}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3"><PlanBadge plan={t.plan_name} /></td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {t.sub_start ? new Date(t.sub_start).toLocaleDateString('ar-EG') : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <p className={`text-sm font-medium ${d < 0 ? 'text-red-600' : d <= 7 ? 'text-orange-600' : 'text-gray-700'}`}>
                        {t.end_date ? new Date(t.end_date).toLocaleDateString('ar-EG') : '—'}
                      </p>
                    </td>
                    <td className="px-4 py-3 min-w-40"><ExpiryBar endDate={t.end_date} /></td>
                    <td className="px-4 py-3"><SubStatusBadge endDate={t.end_date} tenantStatus={t.status} /></td>
                    <td className="px-4 py-3">
                      <button onClick={() => setRenewTenant(t)}
                        className="flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg transition-colors border border-emerald-200">
                        <RefreshCw className="w-3.5 h-3.5" />تجديد
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!loading && filtered.length === 0 && (
            <div className="text-center py-14 text-gray-400">
              <Calendar className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p className="font-medium">لا توجد اشتراكات مطابقة</p>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {renewTenant && (
        <QuickRenewModal tenant={renewTenant} plans={plans}
          onClose={() => setRenewTenant(null)}
          onSave={() => { setRenewTenant(null); fetchAll(); setSelected([]); }} />
      )}
      {showBulk && (
        <BulkRenewModal selected={selectedTenants} plans={plans}
          onClose={() => setShowBulk(false)}
          onSave={() => { setShowBulk(false); fetchAll(); setSelected([]); }} />
      )}
    </div>
  );
}
