import { useState, useEffect } from 'react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { Plus, Eye, X, ClipboardList, Edit2, Tag } from 'lucide-react';

function Modal({ title, onClose, children }) {
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal animate-fade-in max-w-2xl">
        <div className="modal-header">
          <h2 className="text-base font-bold">{title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

const emptyItem = { product_id: '', product_name: '', quantity: 1, cost_price: 0, sell_price: '', total: 0 };

export default function Purchases() {
  const [orders, setOrders] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [viewOrder, setViewOrder] = useState(null);
  const [editOrderId, setEditOrderId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickProduct, setQuickProduct] = useState({ name: '', sell_price: '', cost_price: '', category_id: '' });
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({ supplier_id: '', discount: 0, paid: '', notes: '', status: 'received', items: [{ ...emptyItem }] });

  const load = () => {
    api.get('/purchases').then(r => setOrders(r.data));
    api.get('/suppliers').then(r => setSuppliers(r.data));
    api.get('/products').then(r => setProducts(r.data));
    api.get('/categories').then(r => setCategories(r.data));
  };
  useEffect(() => { load(); }, []);

  const addItem = () => setForm(f => ({ ...f, items: [...f.items, { ...emptyItem }] }));
  const removeItem = (i) => setForm(f => ({ ...f, items: f.items.filter((_, idx) => idx !== i) }));
  const updateItem = (i, key, val) => {
    setForm(f => {
      const items = [...f.items];
      
      if (key === 'product_id' && val) {
        // Prevent duplicate
        const existsIndex = items.findIndex((item, idx) => idx !== i && item.product_id == val);
        if (existsIndex > -1) {
          toast.error('هذا المنتج موجود بالفعل في الفاتورة، تم دمج الكمية');
          items[existsIndex].quantity = parseFloat(items[existsIndex].quantity) + parseFloat(items[i].quantity || 1);
          items[existsIndex].total = parseFloat(items[existsIndex].quantity) * parseFloat(items[existsIndex].cost_price);
          items.splice(i, 1);
          return { ...f, items: items.length ? items : [{ ...emptyItem }] };
        }
        
        const p = products.find(p => p.id == val);
        if (p) { 
          items[i] = { ...items[i], product_id: val, product_name: p.name, cost_price: p.cost_price, sell_price: p.sell_price }; 
        }
      } else {
        items[i] = { ...items[i], [key]: val };
      }
      
      if (key === 'quantity' || key === 'cost_price') {
        items[i].total = parseFloat(items[i].quantity || 0) * parseFloat(items[i].cost_price || 0);
      }
      return { ...f, items };
    });
  };

  const subtotal = form.items.reduce((s, i) => s + parseFloat(i.total || 0), 0);

  const handleSubmit = async (e) => {
    e.preventDefault(); setLoading(true);
    try {
      const payload = { ...form, items: form.items.map(i => ({ ...i, total: parseFloat(i.quantity) * parseFloat(i.cost_price) })) };
      if (editOrderId) {
        await api.put(`/purchases/${editOrderId}`, payload);
        toast.success('تم تحديث أمر الشراء');
      } else {
        await api.post('/purchases', payload);
        toast.success('تم إنشاء أمر الشراء');
      }
      setShowModal(false);
      setEditOrderId(null);
      setForm({ supplier_id: '', discount: 0, paid: '', notes: '', status: 'received', items: [{ ...emptyItem }] });
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'خطأ'); }
    finally { setLoading(false); }
  };

  const openEdit = async (id) => {
    try {
      const res = await api.get(`/purchases/${id}`);
      setForm({
        supplier_id: res.data.supplier_id || '',
        discount: res.data.discount || 0,
        paid: res.data.paid || 0,
        notes: res.data.notes || '',
        status: res.data.status,
        items: res.data.items.length ? res.data.items : [{ ...emptyItem }]
      });
      setEditOrderId(id);
      setShowModal(true);
    } catch (err) { toast.error('خطأ في جلب الفاتورة'); }
  };

  const viewDetails = async (id) => {
    const res = await api.get(`/purchases/${id}`);
    setViewOrder(res.data);
  };

  return (
    <div className="p-6 space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div><h1 className="text-xl font-bold">المشتريات</h1><p className="text-sm text-gray-500">{orders.length} أمر شراء</p></div>
        <button onClick={() => { setEditOrderId(null); setForm({ supplier_id: '', discount: 0, paid: '', notes: '', status: 'received', items: [{ ...emptyItem }] }); setShowModal(true); }} className="btn-primary"><Plus className="w-4 h-4" /> أمر شراء جديد</button>
      </div>

      <div className="table-container">
        <table className="table">
          <thead><tr><th>رقم الأمر</th><th>المورد</th><th>الإجمالي</th><th>المدفوع</th><th>الباقي</th><th>الحالة</th><th>التاريخ</th><th>إجراءات</th></tr></thead>
          <tbody className="divide-y divide-gray-100">
            {orders.map(o => (
              <tr key={o.id}>
                <td><span className="font-mono text-xs font-bold">{o.order_number}</span></td>
                <td>{o.supplier_name || '-'}</td>
                <td className="font-bold">{parseFloat(o.total).toFixed(2)}</td>
                <td className="text-emerald-600">{parseFloat(o.paid).toFixed(2)}</td>
                <td className="text-red-500">{parseFloat(o.remaining).toFixed(2)}</td>
                <td>{o.status === 'received' ? <span className="badge-green">مستلم</span> : o.status === 'pending' ? <span className="badge-yellow">معلق</span> : <span className="badge-red">ملغي</span>}</td>
                <td className="text-xs text-gray-500">{o.created_at ? new Date(o.created_at).toLocaleDateString('ar-EG') : '-'}</td>
                <td>
                  <div className="flex gap-1">
                    <button onClick={() => viewDetails(o.id)} className="p-1.5 rounded hover:bg-blue-50 text-blue-600"><Eye className="w-4 h-4" /></button>
                    <button onClick={() => openEdit(o.id)} className="p-1.5 rounded hover:bg-emerald-50 text-emerald-600"><Edit2 className="w-4 h-4" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {orders.length === 0 && <div className="text-center py-10 text-gray-400"><ClipboardList className="w-10 h-10 mx-auto mb-2 opacity-30" /><p>لا توجد مشتريات</p></div>}
      </div>

      {showModal && (
        <Modal title={editOrderId ? 'تعديل أمر شراء' : 'أمر شراء جديد'} onClose={() => setShowModal(false)}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">المورد</label>
                <select value={form.supplier_id} onChange={e => setForm({...form, supplier_id: e.target.value})} className="input">
                  <option value="">بدون مورد</option>
                  {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="label">الحالة</label>
                <select value={form.status} onChange={e => setForm({...form, status: e.target.value})} className="input">
                  <option value="received">مستلم</option>
                  <option value="pending">معلق</option>
                </select>
              </div>
            </div>

            {/* Items */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="label mb-0">المنتجات</label>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setShowQuickAdd(true)} className="btn-secondary btn-sm"><Tag className="w-3 h-3" /> إضافة منتج سريع</button>
                  <button type="button" onClick={addItem} className="btn-outline btn-sm"><Plus className="w-3 h-3" /> إضافة سطر</button>
                </div>
              </div>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {form.items.map((item, i) => (
                  <div key={i} className="grid grid-cols-12 gap-1.5 items-center">
                    <div className="col-span-3">
                      <select value={item.product_id} onChange={e => updateItem(i, 'product_id', e.target.value)} className="input text-xs px-1">
                        <option value="">اختر منتج</option>
                        {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    </div>
                    <div className="col-span-3"><input type="text" value={item.product_name} onChange={e => updateItem(i, 'product_name', e.target.value)} placeholder="اسم المنتج" className="input text-xs px-1" /></div>
                    <div className="col-span-2"><input type="number" value={item.quantity} onChange={e => updateItem(i, 'quantity', e.target.value)} placeholder="الكمية" className="input text-xs px-1" min="1" step="0.001" /></div>
                    <div className="col-span-2"><input type="number" value={item.cost_price} onChange={e => updateItem(i, 'cost_price', e.target.value)} placeholder="تكلفة" className="input text-xs px-1" min="0" step="0.01" /></div>
                    <div className="col-span-2 flex gap-1">
                      <input type="number" value={item.sell_price || ''} onChange={e => updateItem(i, 'sell_price', e.target.value)} placeholder="سعر البيع" className="input text-xs px-1 w-full" min="0" step="0.01" />
                      <button type="button" onClick={() => removeItem(i)} className="text-red-400 hover:text-red-600 px-1"><X className="w-4 h-4" /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="label">خصم</label>
                <input type="number" value={form.discount} onChange={e => setForm({...form, discount: e.target.value})} className="input" min="0" />
              </div>
              <div>
                <label className="label">المدفوع (الإجمالي: {(subtotal - parseFloat(form.discount || 0)).toFixed(2)})</label>
                <input type="number" value={form.paid} onChange={e => setForm({...form, paid: e.target.value})} className="input" min="0" placeholder={(subtotal - parseFloat(form.discount || 0)).toFixed(2)} />
              </div>
            </div>
            <div><label className="label">ملاحظات</label><textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} className="input" rows="2" /></div>

            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">إلغاء</button>
              <button type="submit" disabled={loading} className="btn-primary">{loading ? 'جارٍ...' : 'إنشاء الأمر'}</button>
            </div>
          </form>
        </Modal>
      )}

      {viewOrder && (
        <Modal title={`أمر شراء: ${viewOrder.order_number}`} onClose={() => setViewOrder(null)}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-gray-500">المورد:</span> <span className="font-medium">{viewOrder.supplier_name || '-'}</span></div>
              <div><span className="text-gray-500">الإجمالي:</span> <span className="font-bold">{parseFloat(viewOrder.total).toFixed(2)}</span></div>
              <div><span className="text-gray-500">المدفوع:</span> <span className="text-emerald-600 font-medium">{parseFloat(viewOrder.paid).toFixed(2)}</span></div>
              <div><span className="text-gray-500">الباقي:</span> <span className="text-red-600 font-medium">{parseFloat(viewOrder.remaining).toFixed(2)}</span></div>
            </div>
            <div className="table-container">
              <table className="table">
                <thead><tr><th>المنتج</th><th>الكمية</th><th>سعر التكلفة</th><th>الإجمالي</th></tr></thead>
                <tbody>
                  {(viewOrder.items || []).map((item, i) => (
                    <tr key={i}><td>{item.product_name}</td><td>{item.quantity}</td><td>{parseFloat(item.cost_price).toFixed(2)}</td><td className="font-medium">{parseFloat(item.total).toFixed(2)}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Modal>
      )}

      {showQuickAdd && (
        <Modal title="منتج جديد" onClose={() => setShowQuickAdd(false)}>
          <form onSubmit={async (e) => {
            e.preventDefault();
            try {
              const res = await api.post('/products', quickProduct);
              const newP = { id: res.data.id, ...quickProduct };
              setProducts([...products, newP]);
              setForm(f => ({ ...f, items: [...f.items, { product_id: newP.id, product_name: newP.name, quantity: 1, cost_price: newP.cost_price, sell_price: newP.sell_price, total: parseFloat(newP.cost_price || 0) }] }));
              setShowQuickAdd(false);
              setQuickProduct({ name: '', sell_price: '', cost_price: '', category_id: '' });
              toast.success('تم إضافة المنتج للفاتورة بنجاح');
            } catch (err) { toast.error('خطأ في إضافة المنتج'); }
          }} className="space-y-4">
            <div><label className="label">اسم المنتج *</label><input value={quickProduct.name} onChange={e=>setQuickProduct({...quickProduct, name: e.target.value})} required className="input"/></div>
            <div>
              <label className="label">التصنيف</label>
              <select value={quickProduct.category_id} onChange={e=>setQuickProduct({...quickProduct, category_id: e.target.value})} className="input">
                <option value="">بدون تصنيف</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label">التكلفة المتوقعة</label><input type="number" value={quickProduct.cost_price} onChange={e=>setQuickProduct({...quickProduct, cost_price: e.target.value})} className="input" min="0" step="0.01"/></div>
              <div><label className="label">سعر البيع</label><input type="number" value={quickProduct.sell_price} onChange={e=>setQuickProduct({...quickProduct, sell_price: e.target.value})} className="input" min="0" step="0.01"/></div>
            </div>
            <button type="submit" className="btn-primary w-full">إضافة للفاتورة</button>
          </form>
        </Modal>
      )}
    </div>
  );
}
