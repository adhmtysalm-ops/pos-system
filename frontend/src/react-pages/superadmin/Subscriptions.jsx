import { useState, useEffect } from 'react';
import api from '../../api/axios';
import { ClipboardList, Calendar, CreditCard, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Subscriptions() {
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchTenants = async () => {
    try {
      const res = await api.get('/protected/admin/tenants');
      setTenants(res.data);
    } catch (err) {
      toast.error('فشل في جلب الاشتراكات');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTenants();
  }, []);

  if (loading) return <div className="p-6">جاري التحميل...</div>;

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <ClipboardList className="w-6 h-6 text-blue-600" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">الاشتراكات والباقات</h1>
          <p className="text-gray-500 text-sm mt-1">متابعة اشتراكات المتاجر وتواريخ الاستحقاق</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">
            <CreditCard className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">إجمالي المتاجر المشتركة</p>
            <h3 className="text-2xl font-bold text-gray-900">{tenants.length}</h3>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-sm font-semibold text-gray-900">المتجر</th>
                <th className="px-6 py-4 text-sm font-semibold text-gray-900">الباقة الحالية</th>
                <th className="px-6 py-4 text-sm font-semibold text-gray-900">تاريخ الانتهاء</th>
                <th className="px-6 py-4 text-sm font-semibold text-gray-900">حالة الاشتراك</th>
                <th className="px-6 py-4 text-sm font-semibold text-gray-900">تجديد الاشتراك</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {tenants.map(t => {
                const isExpired = t.end_date && new Date(t.end_date) < new Date();
                return (
                <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-gray-900">{t.store_name}</td>
                  <td className="px-6 py-4 font-bold text-blue-600">{t.plan_name || '-'}</td>
                  <td className="px-6 py-4">
                    <span className="flex items-center gap-2 text-gray-700 font-mono">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      {t.end_date ? new Date(t.end_date).toLocaleDateString('ar-EG') : '-'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                      isExpired ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                    }`}>
                      {isExpired ? 'منتهي' : 'ساري'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <button className="flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700">
                      <RefreshCw className="w-4 h-4" />
                      تجديد
                    </button>
                  </td>
                </tr>
              )})}
              {tenants.length === 0 && (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                    لا يوجد اشتراكات حالياً
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
