import { useEffect, useState } from 'react';
import api from '../api/axios';
import {
  ShoppingCart, Package, Users, TrendingUp, DollarSign,
  AlertTriangle, Receipt, ArrowUpRight, ArrowDownRight
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar
} from 'recharts';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/reports/dashboard')
      .then(r => setData(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
    </div>
  );

  if (!data) return null;

  const { today, month, products, low_stock, customers, last7Days, topProducts } = data;

  const fmt = (n) => parseFloat(n || 0).toLocaleString('ar-EG', { minimumFractionDigits: 2 });

  const stats = [
    {
      label: 'مبيعات اليوم',
      value: `${fmt(today.sales.total)} ج.م`,
      sub: `${today.sales.count} فاتورة`,
      icon: ShoppingCart,
      color: 'blue',
      change: '+12%',
    },
    {
      label: 'مبيعات الشهر',
      value: `${fmt(month.sales.total)} ج.م`,
      sub: `${month.sales.count} فاتورة`,
      icon: Receipt,
      color: 'emerald',
      change: '+8%',
    },
    {
      label: 'المنتجات',
      value: products,
      sub: low_stock > 0 ? `${low_stock} منتج منخفض` : 'المخزون جيد',
      icon: Package,
      color: low_stock > 0 ? 'amber' : 'violet',
      alert: low_stock > 0,
    },
    {
      label: 'العملاء',
      value: customers,
      sub: 'إجمالي العملاء',
      icon: Users,
      color: 'pink',
    },
    {
      label: 'مصاريف اليوم',
      value: `${fmt(today.expenses)} ج.م`,
      sub: 'إجمالي المصاريف',
      icon: DollarSign,
      color: 'red',
    },
    {
      label: 'صافي اليوم',
      value: `${fmt(parseFloat(today.sales.total || 0) - parseFloat(today.expenses || 0))} ج.م`,
      sub: 'المبيعات - المصاريف',
      icon: TrendingUp,
      color: 'teal',
    },
  ];

  const colorMap = {
    blue: 'bg-blue-50 text-blue-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
    violet: 'bg-violet-50 text-violet-600',
    pink: 'bg-pink-50 text-pink-600',
    red: 'bg-red-50 text-red-600',
    teal: 'bg-teal-50 text-teal-600',
  };

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div>
        <h1 className="text-xl font-bold text-gray-900">لوحة التحكم</h1>
        <p className="text-sm text-gray-500 mt-0.5">مرحباً! هذا ملخص نشاط متجرك</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div key={i} className="stat-card animate-fade-in" style={{ animationDelay: `${i * 50}ms` }}>
              <div className="flex items-start justify-between mb-3">
                <div className={`p-2 rounded-lg ${colorMap[stat.color]}`}>
                  <Icon className="w-4 h-4" />
                </div>
                {stat.alert && <AlertTriangle className="w-4 h-4 text-amber-500" />}
              </div>
              <p className="text-lg font-bold text-gray-900 leading-tight">{stat.value}</p>
              <p className="text-xs font-medium text-gray-500 mt-0.5">{stat.label}</p>
              <p className="text-xs text-gray-400 mt-0.5">{stat.sub}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales Chart */}
        <div className="card lg:col-span-2">
          <div className="card-header">
            <h2 className="font-semibold text-gray-800">المبيعات - آخر 7 أيام</h2>
          </div>
          <div className="p-4">
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={last7Days}>
                <defs>
                  <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(v) => [`${parseFloat(v).toLocaleString('ar-EG')} ج.م`, 'المبيعات']}
                />
                <Area type="monotone" dataKey="total" stroke="#3B82F6" strokeWidth={2} fill="url(#salesGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Products */}
        <div className="card">
          <div className="card-header">
            <h2 className="font-semibold text-gray-800">أكثر المنتجات مبيعاً</h2>
          </div>
          <div className="p-4 space-y-3">
            {topProducts.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-4">لا توجد بيانات</p>
            )}
            {topProducts.map((p, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-xs font-bold text-gray-400 w-5 shrink-0">#{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{p.name}</p>
                  <p className="text-xs text-gray-400">{parseFloat(p.qty).toLocaleString('ar-EG')} وحدة</p>
                </div>
                <span className="text-sm font-semibold text-emerald-600 shrink-0">
                  {parseFloat(p.total).toLocaleString('ar-EG')}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Monthly Bar Chart */}
      <div className="card">
        <div className="card-header">
          <h2 className="font-semibold text-gray-800">إجمالي المبيعات (شهرياً)</h2>
        </div>
        <div className="p-4">
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={last7Days}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => [`${parseFloat(v).toLocaleString('ar-EG')} ج.م`, '']} />
              <Bar dataKey="total" fill="#3B82F6" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
