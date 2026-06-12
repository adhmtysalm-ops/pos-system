import { useState, useEffect } from 'react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { confirmAction } from '../utils/confirm';
import { Search, Eye, Printer, RotateCcw, Receipt, Filter, Trash2, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Sales() {
  const { isAdmin } = useAuth();
  const [sales, setSales] = useState([]);
  const [settings, setSettings] = useState({});
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [status, setStatus] = useState('');
  const [viewSale, setViewSale] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = () => {
    const params = {};
    if (search) params.search = search;
    if (dateFrom) params.date_from = dateFrom;
    if (dateTo) params.date_to = dateTo;
    if (status) params.status = status;
    api.get('/sales', { params }).then(r => setSales(r.data?.data || []));
    api.get('/settings').then(r => setSettings(r.data));
  };

  useEffect(() => { load(); }, [search, dateFrom, dateTo, status]);

  const viewDetails = async (id) => {
    const res = await api.get(`/sales/${id}`);
    setViewSale(res.data);
  };

  const handleRefund = async (id) => {
    if (!(await confirmAction('هل تريد استرجاع هذه الفاتورة؟ سيتم إعادة المخزون.'))) return;
    try { await api.put(`/sales/${id}/refund`); toast.success('تم الاسترجاع'); load(); setViewSale(null); }
    catch (err) { toast.error(err.response?.data?.message || 'خطأ'); }
  };

  const handleHardDelete = async (id) => {
    if (!(await confirmAction('تحذير: هل أنت متأكد من حذف هذه الفاتورة نهائياً؟ سيتم إعادة المخزون ومسحها من السجلات تماماً.'))) return;
    try { await api.delete(`/sales/${id}`); toast.success('تم الحذف بنجاح'); load(); setViewSale(null); }
    catch (err) { toast.error(err.response?.data?.message || 'خطأ'); }
  };

  const printInvoice = async (sale) => {
    const s = settings;
    const w = window.open('', '_blank', 'width=400,height=600');
    w.document.write(`
      <!DOCTYPE html><html dir="rtl">
      <head><meta charset="utf-8"><title>فاتورة ${sale.invoice_number}</title>
      <style>
            @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap');
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Cairo', sans-serif; font-size: 12px; margin: 0 auto; max-width: 80mm; padding: 10px; direction: rtl; color: #000; }
            @media print {
              @page { margin: 0; size: auto; }
              body { margin: 0; padding: 10px; width: 100%; max-width: 80mm; }
            }
            .center { text-align: center; }
            .bold { font-weight: 700; }
            .big { font-size: 15px; }
            hr { border: none; border-top: 1px dashed #000; margin: 6px 0; }
            table { width: 100%; border-collapse: collapse; }
            th, td { padding: 4px 2px; font-size: 11px; text-align: right; }
            th { border-bottom: 1px solid #000; }
            .center-col { text-align: center; }
            .total-row { font-weight: 700; font-size: 13px; }
            .footer { margin-top: 12px; text-align: center; font-size: 11px; color: #000; font-weight: 600; }
          </style>
        </head>
        <body>
          <div class="center">
            <div class="bold big">${s.store_name || 'متجر POS'}</div>
            ${s.store_phone ? `<div>${s.store_phone}</div>` : ''}
            ${s.store_address ? `<div>${s.store_address}</div>` : ''}
          </div>
          <hr>
          <div>رقم الفاتورة: <span class="bold">${sale.invoice_number}</span></div>
          <div>التاريخ: ${new Date(sale.created_at).toLocaleString('ar-EG')}</div>
          ${sale.customer_name && sale.customer_name !== 'عميل نقدي' ? `<div>العميل: ${sale.customer_name}</div>` : ''}
          ${sale.customer_phone ? `<div>هاتف: ${sale.customer_phone}</div>` : ''}
          ${sale.customer_address ? `<div>العنوان: ${sale.customer_address}</div>` : ''}
          <hr>
          <table>
            <thead><tr><th>الصنف</th><th class="center-col">الكمية</th><th>السعر</th><th>المجموع</th></tr></thead>
            <tbody>
              ${(sale.items || []).map(i => `
                <tr>
                  <td>${i.product_name}</td>
                  <td class="center-col">${i.quantity}</td>
                  <td>${parseFloat(i.unit_price).toFixed(2)}</td>
                  <td>${parseFloat(i.total).toFixed(2)}</td>
                </tr>
              `).join('')}
          </tbody>
        </table>
        <hr>
        <div>الإجمالي قبل الخصم: <span class="bold">${parseFloat(sale.subtotal).toFixed(2)}</span></div>
        ${parseFloat(sale.discount) > 0 ? `<div>الخصم: ${parseFloat(sale.discount).toFixed(2)}</div>` : ''}
        <div class="bold">الإجمالي: ${parseFloat(sale.total).toFixed(2)} ${s.currency || 'ج.م'}</div>
        <div>المدفوع: ${parseFloat(sale.paid).toFixed(2)}</div>
        ${parseFloat(sale.change_amount) > 0 ? `<div>الباقي: ${parseFloat(sale.change_amount).toFixed(2)}</div>` : ''}
        <hr><div class="footer">${s.receipt_footer || 'شكراً لزيارتكم'}</div>
        <script>window.onload = () => { window.print(); setTimeout(() => window.close(), 500); }</script>
      </body></html>
    `);
    w.document.close();
  };

  const fmt = n => parseFloat(n || 0).toFixed(2);

  const totalRevenue = sales.filter(s => s.status !== 'refunded' && s.status !== 'cancelled').reduce((sum, s) => sum + parseFloat(s.total || 0), 0);

  return (
    <div className="p-6 space-y-5 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold">الفواتير</h1>
          <p className="text-sm text-gray-500">{sales.length} فاتورة · إجمالي: {totalRevenue.toLocaleString('ar-EG', { minimumFractionDigits: 2 })} ج.م</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث برقم الفاتورة أو العميل..." className="input pr-9" />
        </div>
        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="input w-auto" placeholder="من" />
        <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="input w-auto" placeholder="إلى" />
        <select value={status} onChange={e => setStatus(e.target.value)} className="input w-36">
          <option value="">كل الحالات</option>
          <option value="completed">مكتملة</option>
          <option value="refunded">مسترجعة</option>
          <option value="cancelled">ملغاة</option>
        </select>
      </div>

      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>رقم الفاتورة</th>
              <th>العميل</th>
              <th>الكاشير</th>
              <th>الإجمالي</th>
              <th>طريقة الدفع</th>
              <th>الحالة</th>
              <th>التاريخ</th>
              <th>إجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sales.map(s => (
              <tr key={s.id}>
                <td><span className="font-mono text-xs font-bold text-blue-600">{s.invoice_number}</span></td>
                <td>{s.customer_name || 'عميل نقدي'}</td>
                <td className="text-gray-500">{s.cashier_name}</td>
                <td className="font-bold text-emerald-700">{fmt(s.total)}</td>
                <td>
                  <span className="text-xs">
                    {s.payment_method === 'cash' ? '💵 نقدي' : s.payment_method === 'card' ? '💳 بطاقة' : '📋 آجل'}
                  </span>
                </td>
                <td>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    s.status === 'completed' ? 'bg-emerald-50 text-emerald-700' :
                    s.status === 'paid' ? 'bg-emerald-100 text-emerald-800' :
                    s.status === 'credit' ? 'bg-amber-50 text-amber-700' :
                    s.status === 'refunded' ? 'bg-gray-100 text-gray-500' :
                    s.status === 'cancelled' ? 'bg-red-50 text-red-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {s.status === 'completed' ? 'مكتملة' : 
                     s.status === 'paid' ? 'مسددة' :
                     s.status === 'credit' ? 'آجلة' :
                     s.status === 'refunded' ? 'مسترجعة' : 'ملغاة'}
                  </span>
                </td>
                <td className="text-xs text-gray-500">{new Date(s.created_at).toLocaleString('ar-EG')}</td>
                <td>
                  <div className="flex gap-1">
                    <button onClick={() => viewDetails(s.id)} className="p-1.5 rounded hover:bg-blue-50 text-blue-600" title="عرض"><Eye className="w-4 h-4" /></button>
                    <button onClick={() => printInvoice(s)} className="p-1.5 rounded hover:bg-gray-100 text-gray-600" title="طباعة"><Printer className="w-4 h-4" /></button>
                    {(s.status === 'completed' || s.status === 'paid' || s.status === 'credit') && (
                      <button onClick={() => handleRefund(s.id)} className="p-1.5 rounded hover:bg-amber-50 text-amber-600" title="استرجاع"><RotateCcw className="w-4 h-4" /></button>
                    )}
                    {isAdmin && (
                      <button onClick={() => handleHardDelete(s.id)} className="p-1.5 rounded hover:bg-red-50 text-red-600" title="حذف نهائي"><Trash2 className="w-4 h-4" /></button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {sales.length === 0 && (
          <div className="text-center py-10 text-gray-400">
            <Receipt className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p>لا توجد فواتير</p>
          </div>
        )}
      </div>

      {/* Invoice Detail Modal */}
      {viewSale && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setViewSale(null)}>
          <div className="modal animate-fade-in max-w-2xl">
            <div className="modal-header">
              <h2 className="font-bold">تفاصيل الفاتورة {viewSale.invoice_number}</h2>
              <div className="flex gap-2">
                <button onClick={() => printInvoice(viewSale)} className="btn-outline btn-sm"><Printer className="w-4 h-4" /> طباعة</button>
                {(viewSale.status === 'completed' || viewSale.status === 'paid' || viewSale.status === 'credit') && (
                  <button onClick={() => handleRefund(viewSale.id)} className="btn-warning btn-sm"><RotateCcw className="w-4 h-4" /> استرجاع</button>
                )}
                {isAdmin && (
                  <button onClick={() => handleHardDelete(viewSale.id)} className="btn-danger btn-sm bg-red-600 text-white hover:bg-red-700 px-3 py-1.5 rounded-lg flex items-center gap-1.5"><Trash2 className="w-4 h-4" /> حذف نهائي</button>
                )}
                <button onClick={() => setViewSale(null)} className="p-1.5 rounded hover:bg-gray-100 text-gray-500"><X className="w-5 h-5" /></button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-gray-500">العميل:</span> <span className="font-medium">{viewSale.customer_name}</span></div>
                <div><span className="text-gray-500">الكاشير:</span> <span className="font-medium">{viewSale.cashier_name}</span></div>
                <div><span className="text-gray-500">التاريخ:</span> <span>{new Date(viewSale.created_at).toLocaleString('ar-EG')}</span></div>
                <div><span className="text-gray-500">طريقة الدفع:</span> <span>{viewSale.payment_method === 'cash' ? 'نقدي' : viewSale.payment_method === 'card' ? 'بطاقة' : 'آجل'}</span></div>
              </div>

              <div className="table-container">
                <table className="table">
                  <thead><tr><th>المنتج</th><th>الكمية</th><th>السعر</th><th>الإجمالي</th></tr></thead>
                  <tbody>
                    {(viewSale.items || []).map((item, i) => (
                      <tr key={i}>
                        <td>{item.product_name}</td>
                        <td>{item.quantity}</td>
                        <td>{fmt(item.unit_price)}</td>
                        <td className="font-medium">{fmt(item.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
                <div className="flex justify-between"><span>المجموع:</span><span>{fmt(viewSale.subtotal)}</span></div>
                {parseFloat(viewSale.discount) > 0 && <div className="flex justify-between text-red-600"><span>خصم:</span><span>- {fmt(viewSale.discount)}</span></div>}
                <div className="flex justify-between font-bold text-lg border-t pt-2"><span>الإجمالي:</span><span className="text-blue-700">{fmt(viewSale.total)}</span></div>
                <div className="flex justify-between text-gray-600"><span>المدفوع:</span><span>{fmt(viewSale.paid)}</span></div>
                {parseFloat(viewSale.change_amount) > 0 && <div className="flex justify-between text-emerald-600"><span>الباقي:</span><span>{fmt(viewSale.change_amount)}</span></div>}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
