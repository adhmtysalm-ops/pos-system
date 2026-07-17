import { useState, useEffect } from 'react';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import {
  Building2, Users, TrendingUp, AlertTriangle, Ban, CheckCircle,
  Clock, RefreshCw, ArrowUpRight, Store, Calendar, Zap
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';

const PIE_COLORS = ['#3B82F6', '#8B5CF6', '#F59E0B', '#10B981', '#EF4444'];

function daysUntil(dateStr) {
  if (!dateStr) return -999;
  return Math.ceil((new Date(dateStr) - new Date()) / 86400000);
}

function ExpiryBadge({ endDate }) {
  const d = daysUntil(endDate);
  if (d < 0) return <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-red-100 text-red-700">منتهي</span>;
  if (d <= 3) return <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-red-100 text-red-700">ينتهي خلال {d}د</span>;
  if (d <= 7) return <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-orange-100 text-orange-700">ينتهي خلال {d}د</span>;
  if (d <= 30) return <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-yellow-100 text-yellow-700">{d} يوم</span>;
  return <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-green-100 text-green-700">{d} يوم</span>;
}

function StatCard({ icon: Icon, label, value, sub, color, trend }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-all group">
      <div className="flex items-start justify-between">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
          <Icon className="w-6 h-6" />
        </div>
        {trend !== undefined && (
          <span className={`flex items-center gap-1 text-xs font-medium ${trend >= 0 ? 'text-green-600' : 'text-red-500'}`}>
            <ArrowUpRight className="w-3 h-3" />
            {trend >= 0 ? '+' : ''}{trend}%
          </span>
        )}
      </div>
      <div className="mt-4">
        <p className="text-3xl font-bold text-gray-900">{value}</p>
        <p className="text-sm font-medium text-gray-600 mt-0.5">{label}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

export default function SuperDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    setLoading(true);
    api.get('/admin/dashboard')
      .then(r => setData(r.data))
      .catch(() => toast.error('فشل تحميل لوحة التحكم'))
      .finally(() => setLoading(false));
  }, [refreshKey]);

  if (loading) return (
    <div className="p-6 space-y-4 animate-pulse">
      {[...Array(6)].map((_, i) => <div key={i} className="h-24 bg-gray-100 rounded-2xl" />)}
    </div>
  );

  if (!data) return (
    <div className="p-6 text-center text-gray-400 py-20">
      <AlertTriangle className="w-12 h-12 mx-auto mb-3 opacity-30" />
      <p>تعذر تحميل البيانات</p>
    </div>
  );

  const { stats, planDistribution, monthlyGrowth, expiringSoon, recentTenants } = data;

  const arabicMonths = {
    '01': 'يناير','02': 'فبراير','03': 'مارس','04': 'أبريل',
    '05': 'مايو','06': 'يونيو','07': 'يوليو','08': 'أغسطس',
    '09': 'سبتمبر','10': 'أكتوبر','11': 'نوفمبر','12': 'ديسمبر',
  };
  const growthLabeled = (monthlyGrowth || []).map((m) => ({
    ...m, label: arabicMonths[m.month?.split('-')[1]] || m.month,
  }));

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">لوحة تحكم السوبر أدمن</h1>
          <p className="text-gray-500 text-sm mt-0.5">نظرة شاملة على منصة الـ SaaS</p>
        </div>
        <button onClick={() => setRefreshKey(k => k + 1)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
          <RefreshCw className="w-4 h-4" /> تحديث
        </button>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
        <StatCard icon={Building2} label="إجمالي المتاجر" value={stats.totalTenants} color="bg-blue-50 text-blue-600" />
        <StatCard icon={CheckCircle} label="متاجر نشطة" value={stats.activeTenants} sub={`${Math.round((stats.activeTenants / (stats.totalTenants || 1)) * 100)}% من الإجمالي`} color="bg-green-50 text-green-600" />
        <StatCard icon={AlertTriangle} label="اشتراكات منتهية" value={stats.expiredSubscriptions} color="bg-red-50 text-red-600" />
        <StatCard icon={Ban} label="متاجر موقوفة" value={stats.suspendedTenants} color="bg-orange-50 text-orange-600" />
        <StatCard icon={Users} label="إجمالي المستخدمين" value={stats.totalUsers} color="bg-purple-50 text-purple-600" />
      </div>

      {/* Alert: Expiring Soon */}
      {expiringSoon?.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-5 h-5 text-amber-600" />
            <h2 className="font-bold text-amber-800">تنبيه: {expiringSoon.length} اشتراك سينتهي خلال 14 يوماً</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {expiringSoon.map(t => (
              <div key={t.id} className="bg-white rounded-xl border border-amber-100 p-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-900">{t.store_name}</p>
                  <p className="text-xs text-gray-400">{t.owner_name} • {t.plan_name}</p>
                </div>
                <ExpiryBadge endDate={t.end_date} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Monthly Growth */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="p-5 border-b border-gray-50">
            <h2 className="font-bold text-gray-900">نمو المتاجر — آخر 6 أشهر</h2>
          </div>
          <div className="p-4">
            {growthLabeled.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={growthLabeled}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5" />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                  <Tooltip formatter={(v) => [v, 'متجر جديد']} />
                  <Bar dataKey="count" fill="#3B82F6" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-48 text-gray-300">
                <TrendingUp className="w-12 h-12" />
              </div>
            )}
          </div>
        </div>

        {/* Plan Distribution Pie */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="p-5 border-b border-gray-50">
            <h2 className="font-bold text-gray-900">توزيع الباقات</h2>
          </div>
          <div className="p-4">
            {planDistribution?.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={planDistribution.map(p => ({ name: p.plan_name, value: p.count }))}
                    cx="50%" cy="50%" outerRadius={75} dataKey="value" label={({ name, value }) => `${name} (${value})`}
                    labelLine={false}>
                    {planDistribution.map((_,i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-48 text-gray-300 flex-col gap-2">
                <Zap className="w-10 h-10 opacity-30" />
                <p className="text-sm">لا توجد بيانات</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Tenants */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
        <div className="p-5 border-b border-gray-50 flex items-center justify-between">
          <h2 className="font-bold text-gray-900">آخر المتاجر المُضافة</h2>
          <a href="/admin/tenants" className="text-sm text-blue-600 hover:underline font-medium">عرض الكل ←</a>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-5 py-3 font-semibold text-gray-600">المتجر</th>
                <th className="px-5 py-3 font-semibold text-gray-600">المالك</th>
                <th className="px-5 py-3 font-semibold text-gray-600">الباقة</th>
                <th className="px-5 py-3 font-semibold text-gray-600">انتهاء الاشتراك</th>
                <th className="px-5 py-3 font-semibold text-gray-600">الحالة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {(recentTenants || []).map(t => (
                <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm">
                        {t.store_name?.[0]}
                      </div>
                      <span className="font-medium text-gray-900">{t.store_name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-gray-600">{t.owner_name}</td>
                  <td className="px-5 py-3">
                    <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-700">{t.plan_name || '—'}</span>
                  </td>
                  <td className="px-5 py-3"><ExpiryBadge endDate={t.end_date} /></td>
                  <td className="px-5 py-3">
                    {t.status === 'active'
                      ? <span className="flex items-center gap-1 text-xs font-medium text-green-700"><CheckCircle className="w-3.5 h-3.5" />نشط</span>
                      : <span className="flex items-center gap-1 text-xs font-medium text-red-600"><Ban className="w-3.5 h-3.5" />موقوف</span>}
                  </td>
                </tr>
              ))}
              {!recentTenants?.length && (
                <tr><td colSpan={5} className="px-5 py-10 text-center text-gray-400">لا توجد متاجر مسجلة بعد</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
