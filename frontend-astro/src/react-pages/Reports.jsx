import { useState } from 'react';
import api from '../api/axios';
import { BarChart3, TrendingUp, Package, DollarSign, Download, Clock } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';

const today = new Date().toISOString().split('T')[0];
const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

const COLORS = ['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444'];

export default function Reports() {
  const [tab, setTab] = useState('sales');
  const [dateFrom, setDateFrom] = useState(firstOfMonth);
  const [dateTo, setDateTo] = useState(today);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const loadReport = async () => {
    setLoading(true);
    try {
      if (tab === 'sales') {
        const res = await api.get('/reports/sales', { params: { date_from: dateFrom, date_to: dateTo } });
        setData(res.data);
      } else if (tab === 'profit') {
        const res = await api.get('/reports/profit', { params: { date_from: dateFrom, date_to: dateTo } });
        setData(res.data);
      } else if (tab === 'inventory') {
        const res = await api.get('/reports/inventory');
        setData(res.data);
      } else if (tab === 'attendance') {
        const res = await api.get('/reports/attendance', { params: { date_from: dateFrom, date_to: dateTo } });
        setData(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'sales', label: 'تقرير المبيعات', icon: BarChart3 },
    { id: 'profit', label: 'تقرير الأرباح', icon: TrendingUp },
    { id: 'inventory', label: 'تقرير المخزون', icon: Package },
    { id: 'attendance', label: 'تقرير الحضور', icon: Clock },
  ];

  const fmt = (n) => parseFloat(n || 0).toLocaleString('ar-EG', { minimumFractionDigits: 2 });

  return (
    <div className="p-6 space-y-5 animate-fade-in">
      <h1 className="text-xl font-bold">التقارير المالية</h1>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200 overflow-x-auto">
        {tabs.map(t => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => { setTab(t.id); setData(null); }}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                tab === t.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon className="w-4 h-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Filters */}
      {tab !== 'inventory' && (
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="label">من</label>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="input w-auto" />
          </div>
          <div>
            <label className="label">إلى</label>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="input w-auto" />
          </div>
          <button onClick={loadReport} disabled={loading} className="btn-primary">
            {loading ? 'جارٍ التحميل...' : 'عرض التقرير'}
          </button>
        </div>
      )}

      {tab === 'inventory' && (
        <button onClick={loadReport} disabled={loading} className="btn-primary">
          {loading ? 'جارٍ التحميل...' : 'عرض تقرير المخزون'}
        </button>
      )}

      {/* Sales Report */}
      {tab === 'sales' && data && (
        <div className="space-y-5">
          {/* Summary Cards */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'إجمالي الفواتير', value: data.summary.invoices, sub: 'فاتورة' },
              { label: 'إجمالي المبيعات', value: `${fmt(data.summary.total)} ج.م`, sub: 'إجمالي' },
              { label: 'إجمالي الخصومات', value: `${fmt(data.summary.discount)} ج.م`, sub: 'خصم' },
            ].map((s, i) => (
              <div key={i} className="stat-card">
                <p className="text-2xl font-bold text-gray-900">{s.value}</p>
                <p className="text-sm font-medium text-gray-600">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Chart */}
          {data.rows.length > 0 && (
            <div className="card">
              <div className="card-header"><h2 className="font-semibold">المبيعات اليومية</h2></div>
              <div className="p-4">
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={data.rows}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="period" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip formatter={v => [`${parseFloat(v).toLocaleString('ar-EG')} ج.م`, 'المبيعات']} />
                    <Bar dataKey="total" fill="#3B82F6" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Payment Methods */}
          {data.paymentMethods.length > 0 && (
            <div className="card">
              <div className="card-header"><h2 className="font-semibold">طرق الدفع</h2></div>
              <div className="p-4 flex items-center gap-6">
                <ResponsiveContainer width={200} height={180}>
                  <PieChart>
                    <Pie data={data.paymentMethods.map(p => ({ name: p.payment_method === 'cash' ? 'نقدي' : p.payment_method === 'card' ? 'بطاقة' : 'آجل', value: parseFloat(p.total) }))} cx="50%" cy="50%" outerRadius={75} dataKey="value">
                      {data.paymentMethods.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={v => [`${parseFloat(v).toLocaleString('ar-EG')} ج.م`]} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-2">
                  {data.paymentMethods.map((p, i) => (
                    <div key={i} className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">{p.payment_method === 'cash' ? 'نقدي' : p.payment_method === 'card' ? 'بطاقة' : 'آجل'}</span>
                      <span className="font-bold">{fmt(p.total)} ج.م ({p.count} فاتورة)</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Profit Report */}
      {tab === 'profit' && data && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[
            { label: 'إيرادات المبيعات', value: fmt(data.revenue), color: 'text-blue-700', bg: 'bg-blue-50' },
            { label: 'تكلفة البضاعة', value: fmt(data.cost), color: 'text-amber-700', bg: 'bg-amber-50' },
            { label: 'إجمالي الربح', value: fmt(data.grossProfit), color: 'text-emerald-700', bg: 'bg-emerald-50' },
            { label: 'المصروفات', value: fmt(data.expenses), color: 'text-red-700', bg: 'bg-red-50' },
            { label: 'صافي الربح', value: fmt(data.netProfit), color: parseFloat(data.netProfit) >= 0 ? 'text-emerald-800' : 'text-red-800', bg: parseFloat(data.netProfit) >= 0 ? 'bg-emerald-100' : 'bg-red-100' },
          ].map((s, i) => (
            <div key={i} className={`rounded-xl p-6 ${s.bg} border border-opacity-20`}>
              <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-sm font-medium text-gray-600 mt-1">{s.label}</p>
              <p className="text-xs text-gray-400">ج.م</p>
            </div>
          ))}
        </div>
      )}

      {/* Inventory Report */}
      {tab === 'inventory' && data && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'عدد المنتجات', value: data.summary.products },
              { label: 'إجمالي الوحدات', value: parseFloat(data.summary.total_units || 0).toFixed(1) },
              { label: 'قيمة المخزون', value: `${fmt(data.summary.total_value)} ج.م` },
            ].map((s, i) => (
              <div key={i} className="stat-card">
                <p className="text-2xl font-bold">{s.value}</p>
                <p className="text-sm text-gray-500">{s.label}</p>
              </div>
            ))}
          </div>

          <div className="table-container">
            <table className="table">
              <thead><tr><th>المنتج</th><th>التصنيف</th><th>المخزون</th><th>سعر التكلفة</th><th>سعر البيع</th><th>قيمة المخزون</th></tr></thead>
              <tbody className="divide-y divide-gray-100">
                {data.rows.map(p => (
                  <tr key={p.id}>
                    <td className="font-medium">{p.name}</td>
                    <td>{p.category_name || '-'}</td>
                    <td>
                      <span className={`font-medium ${parseFloat(p.stock) <= parseFloat(p.min_stock) ? 'text-red-600' : 'text-emerald-600'}`}>
                        {parseFloat(p.stock).toFixed(1)} {p.unit}
                      </span>
                    </td>
                    <td>{fmt(p.cost_price)}</td>
                    <td>{fmt(p.sell_price)}</td>
                    <td className="font-semibold">{fmt(p.stock_value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Attendance Report */}
      {tab === 'attendance' && data && (
        <div className="space-y-4">
          <div className="table-container">
            <table className="table">
              <thead><tr><th>الموظف</th><th>أيام الحضور الفعلي</th><th>إجمالي ساعات العمل</th></tr></thead>
              <tbody className="divide-y divide-gray-100">
                {data.rows.map(r => (
                  <tr key={r.id}>
                    <td className="font-medium">{r.employee_name}</td>
                    <td><span className="badge-blue">{r.present_days} يوم</span></td>
                    <td className="font-semibold text-emerald-700">{parseFloat(r.total_hours).toFixed(1)} ساعة</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {data.rows.length === 0 && (
              <div className="text-center py-10 text-gray-400">لا توجد سجلات حضور في هذه الفترة</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
