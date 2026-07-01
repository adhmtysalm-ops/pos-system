import React, { useState, useEffect, Fragment } from 'react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { confirmAction } from '../utils/confirm';
import { Plus, Edit2, Trash2, X, Search, Phone, BookOpen, DollarSign, CheckCircle, Clock, AlertCircle, ChevronRight, ChevronLeft, Filter } from 'lucide-react';

function Modal({ title, onClose, children, wide = false }) {
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={`modal animate-fade-in ${wide ? 'max-w-3xl' : ''}`}>
        <div className="modal-header">
          <h2 className="text-base font-bold">{title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

export default function Customers() {
  const [items, setItems] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const limit = 50;
  
  const [search, setSearch] = useState('');
  const [hasDebt, setHasDebt] = useState(false);
  
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', email: '', address: '', notes: '' });

  // Credit ledger state
  const [creditCustomer, setCreditCustomer] = useState(null);
  const [creditData, setCreditData] = useState(null);
  const [payingSaleId, setPayingSaleId] = useState(null);
  const [payAmount, setPayAmount] = useState('');
  const [payLoading, setPayLoading] = useState(false);

  const load = () => {
    const params = { page, limit };
    if (search) params.search = search;
    if (hasDebt) params.has_debt = true;
    
    api.get('/customers', { params }).then(r => {
      setItems(r.data.data || []);
      setTotalCount(r.data.total || 0);
    }).catch(() => toast.error('خطأ في جلب بيانات العملاء'));
  };

  useEffect(() => { load(); }, [search, hasDebt, page]);

  const openAdd = () => { setEditItem(null); setForm({ name: '', phone: '', email: '', address: '', notes: '' }); setShowModal(true); };
  const openEdit = (i) => { setEditItem(i); setForm({ name: i.name, phone: i.phone, email: i.email, address: i.address, notes: i.notes }); setShowModal(true); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editItem) { await api.put(`/customers/${editItem.id}`, form); toast.success('تم التحديث'); }
      else { await api.post('/customers', form); toast.success('تم الإضافة'); }
      setShowModal(false); load();
    } catch (err) { toast.error(err.response?.data?.message || 'خطأ'); }
    finally { setLoading(false); }
  };

  const handleDelete = async (id) => {
    if (!(await confirmAction('حذف العميل؟'))) return;
    try { await api.delete(`/customers/${id}`); toast.success('تم الحذف'); load(); }
    catch (err) { toast.error(err.response?.data?.message || 'خطأ'); }
  };

  const openCreditLedger = async (customer) => {
    setCreditCustomer(customer);
    setCreditData(null);
    try {
      const res = await api.get(`/customers/${customer.id}/credit`);
      setCreditData(res.data);
    } catch { toast.error('خطأ في جلب سجل الديون'); }
  };

  const refreshCredit = async () => {
    if (!creditCustomer) return;
    const res = await api.get(`/customers/${creditCustomer.id}/credit`);
    setCreditData(res.data);
  };

  const handlePay = async (saleId) => {
    const amt = parseFloat(payAmount);
    if (!amt || amt <= 0) return toast.error('أدخل مبلغاً صحيحاً');
    setPayLoading(true);
    try {
      await api.post(`/customers/sale/${saleId}/pay`, { amount: amt });
      toast.success('تم تسجيل الدفعة بنجاح ✅');
      setPayingSaleId(null);
      setPayAmount('');
      await refreshCredit();
      load(); // Refresh table to update total_debt
    } catch (err) { toast.error(err.response?.data?.message || 'خطأ'); }
    finally { setPayLoading(false); }
  };

  const statusBadge = (sale) => {
    if (sale.status === 'completed') return <span className="inline-flex items-center gap-1 text-xs bg-emerald-50 text-emerald-700 font-semibold px-2 py-0.5 rounded-full"><CheckCircle className="w-3 h-3" /> مكتملة</span>;
    if (sale.status === 'paid') return <span className="inline-flex items-center gap-1 text-xs bg-emerald-100 text-emerald-800 font-semibold px-2 py-0.5 rounded-full"><CheckCircle className="w-3 h-3" /> مسددة</span>;
    if (sale.status === 'refunded') return <span className="inline-flex items-center gap-1 text-xs bg-gray-100 text-gray-500 font-semibold px-2 py-0.5 rounded-full">مسترجعة</span>;
    if (sale.status === 'cancelled') return <span className="inline-flex items-center gap-1 text-xs bg-red-50 text-red-700 font-semibold px-2 py-0.5 rounded-full">ملغاة</span>;
    return <span className="inline-flex items-center gap-1 text-xs bg-amber-50 text-amber-700 font-semibold px-2 py-0.5 rounded-full"><Clock className="w-3 h-3" /> آجلة</span>;
  };

  const totalPages = Math.ceil(totalCount / limit);

  return (
    <div className="p-6 space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">العملاء</h1>
          <p className="text-sm text-gray-500">إجمالي: {totalCount} عميل</p>
        </div>
        <button onClick={openAdd} className="btn-primary"><Plus className="w-4 h-4" /> إضافة عميل</button>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="بحث بالاسم أو الهاتف..." className="input pr-9" />
        </div>
        
        <label className="flex items-center gap-2 cursor-pointer bg-white px-3 py-2 border rounded-lg hover:bg-gray-50 transition-colors">
          <input type="checkbox" checked={hasDebt} onChange={e => { setHasDebt(e.target.checked); setPage(1); }} className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4" />
          <span className="text-sm font-medium text-gray-700 flex items-center gap-1"><Filter className="w-4 h-4 text-amber-500"/> عليهم ديون فقط</span>
        </label>
      </div>

      <div className="table-container">
        <table className="table">
          <thead><tr><th>#</th><th>الاسم</th><th>الهاتف</th><th>الديون المستحقة</th><th>العنوان</th><th>الإجراءات</th></tr></thead>
          <tbody className="divide-y divide-gray-100">
            {items.map((item, i) => (
              <tr key={item.id}>
                <td className="text-gray-400">{(page - 1) * limit + i + 1}</td>
                <td>
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-bold">{item.name[0]}</div>
                    <span className="font-medium">{item.name}</span>
                  </div>
                </td>
                <td>{item.phone || '-'}</td>
                <td>
                  {parseFloat(item.total_debt) > 0 ? (
                    <span className="text-red-600 font-bold bg-red-50 px-2 py-1 rounded-lg border border-red-100 inline-flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5"/> {parseFloat(item.total_debt).toFixed(2)} ج.م
                    </span>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </td>
                <td className="max-w-32 truncate">{item.address || '-'}</td>
                <td>
                  <div className="flex gap-1">
                    <button onClick={() => openCreditLedger(item)} className="p-1.5 rounded hover:bg-amber-50 text-amber-600" title="سجل الديون"><BookOpen className="w-4 h-4" /></button>
                    <button onClick={() => openEdit(item)} className="p-1.5 rounded hover:bg-blue-50 text-blue-600"><Edit2 className="w-4 h-4" /></button>
                    {item.id !== 1 && <button onClick={() => handleDelete(item.id)} className="p-1.5 rounded hover:bg-red-50 text-red-500"><Trash2 className="w-4 h-4" /></button>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {items.length === 0 && <div className="text-center py-10 text-gray-400">لا يوجد بيانات</div>}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 py-4">
          <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="btn-outline px-3 py-1.5"><ChevronRight className="w-4 h-4"/> السابق</button>
          <span className="text-sm text-gray-600 font-medium">صفحة {page} من {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="btn-outline px-3 py-1.5">التالي <ChevronLeft className="w-4 h-4"/></button>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <Modal title={editItem ? 'تعديل عميل' : 'إضافة عميل'} onClose={() => setShowModal(false)}>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="label">الاسم *</label>
              <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} required className="input" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">الهاتف</label>
                <input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="input" />
              </div>
              <div>
                <label className="label">البريد الإلكتروني</label>
                <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="input" />
              </div>
            </div>
            <div>
              <label className="label">العنوان</label>
              <input value={form.address} onChange={e => setForm({...form, address: e.target.value})} className="input" />
            </div>
            <div>
              <label className="label">ملاحظات</label>
              <textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} className="input" rows="2" />
            </div>
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">إلغاء</button>
              <button type="submit" disabled={loading} className="btn-primary">{loading ? 'جارٍ...' : (editItem ? 'تحديث' : 'إضافة')}</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Credit Ledger Modal */}
      {creditCustomer && (
        <Modal title={`سجل ديون: ${creditCustomer.name}`} onClose={() => { setCreditCustomer(null); setCreditData(null); setPayingSaleId(null); }} wide>
          {!creditData ? (
            <div className="text-center py-10 text-gray-400">جارٍ التحميل...</div>
          ) : (
            <div className="space-y-4">
              {/* Summary */}
              <div className={`rounded-xl p-4 flex items-center justify-between ${creditData.totalDebt > 0 ? 'bg-red-50 border border-red-100' : 'bg-emerald-50 border border-emerald-100'}`}>
                <div className="flex items-center gap-3">
                  {creditData.totalDebt > 0
                    ? <AlertCircle className="w-8 h-8 text-red-500" />
                    : <CheckCircle className="w-8 h-8 text-emerald-500" />
                  }
                  <div>
                    <p className="text-sm text-gray-600">إجمالي الديون المستحقة</p>
                    <p className={`text-2xl font-bold ${creditData.totalDebt > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                      {creditData.totalDebt.toFixed(2)} ج.م
                    </p>
                  </div>
                </div>
                {creditCustomer.phone && (
                  <a href={`tel:${creditCustomer.phone}`} className="btn-secondary flex items-center gap-1 text-sm">
                    <Phone className="w-4 h-4" /> {creditCustomer.phone}
                  </a>
                )}
              </div>

              {/* Sales Table */}
              {creditData.sales.length === 0 ? (
                <div className="text-center py-8 text-gray-400">لا توجد فواتير آجلة لهذا العميل</div>
              ) : (
                <div className="table-container">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>رقم الفاتورة</th>
                        <th>التاريخ</th>
                        <th>الإجمالي</th>
                        <th>المدفوع</th>
                        <th>المتبقي</th>
                        <th>الحالة</th>
                        <th>دفع</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {creditData.sales.map(sale => (
                        <Fragment key={sale.id}>
                          <tr className={sale.status === 'paid' ? 'bg-emerald-50/50' : sale.status === 'refunded' ? 'opacity-50' : ''}>
                            <td><span className="font-mono text-xs font-bold">{sale.invoice_number}</span></td>
                            <td className="text-xs text-gray-500">{new Date(sale.created_at).toLocaleDateString('ar-EG')}</td>
                            <td className="font-medium">{parseFloat(sale.total).toFixed(2)}</td>
                            <td className="text-emerald-600 font-medium">{parseFloat(sale.paid).toFixed(2)}</td>
                            <td className={`font-bold ${parseFloat(sale.remaining) > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                              {parseFloat(sale.remaining).toFixed(2)}
                            </td>
                            <td>{statusBadge(sale)}</td>
                            <td>
                              {sale.status !== 'paid' && sale.status !== 'refunded' && sale.status !== 'cancelled' && (
                                payingSaleId === sale.id ? (
                                  <div className="flex items-center gap-1">
                                    <input
                                      type="number"
                                      value={payAmount}
                                      onChange={e => setPayAmount(e.target.value)}
                                      placeholder={parseFloat(sale.remaining).toFixed(2)}
                                      className="input text-xs w-24 py-1 px-2"
                                      min="0.01"
                                      step="0.01"
                                      autoFocus
                                      onKeyDown={e => e.key === 'Escape' && setPayingSaleId(null)}
                                    />
                                    <button
                                      type="button"
                                      onClick={() => handlePay(sale.id)}
                                      disabled={payLoading}
                                      className="p-1.5 rounded bg-emerald-600 text-white hover:bg-emerald-700"
                                    >
                                      <CheckCircle className="w-3.5 h-3.5" />
                                    </button>
                                    <button type="button" onClick={() => setPayingSaleId(null)} className="p-1.5 rounded hover:bg-gray-100 text-gray-400">
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => { setPayingSaleId(sale.id); setPayAmount(''); }}
                                    className="flex items-center gap-1 text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700"
                                  >
                                    <DollarSign className="w-3 h-3" /> تسديد
                                  </button>
                                )
                              )}
                            </td>
                          </tr>
                          {sale.payments && sale.payments.length > 0 && (
                            <tr>
                              <td colSpan="7" className="bg-gray-50/50 p-2">
                                <div className="text-xs text-gray-500 pr-8">
                                  <strong className="text-gray-700 inline-block mb-1">سجل الدفعات:</strong>
                                  <div className="flex flex-col gap-1">
                                    {sale.payments.map((p, idx) => (
                                      <div key={p.id} className="flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400"></div>
                                        <span>الدفعة {idx + 1}:</span>
                                        <span className="font-bold text-emerald-600">{parseFloat(p.amount).toFixed(2)} ج.م</span>
                                        <span className="text-gray-400">({new Date(p.created_at).toLocaleString('ar-EG')})</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
