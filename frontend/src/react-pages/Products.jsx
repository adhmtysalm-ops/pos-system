import { useState, useEffect } from 'react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { confirmAction } from '../utils/confirm';
import { Plus, Search, Edit2, Trash2, X, Package, Tag, Image as ImageIcon } from 'lucide-react';

function Modal({ title, onClose, children }) {
  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal animate-fade-in">
        <div className="modal-header">
          <h2 className="text-base font-bold text-gray-900">{title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

export default function Products() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [lowStock, setLowStock] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: '', barcode: '', category_id: '', cost_price: '', sell_price: '',
    stock: '', min_stock: '', unit: 'قطعة', description: '', image: null
  });

  const load = () => {
    const params = {};
    if (search) params.search = search;
    if (catFilter) params.category_id = catFilter;
    if (lowStock) params.low_stock = '1';
    Promise.all([
      api.get('/products', { params }),
      api.get('/categories'),
    ]).then(([p, c]) => {
      setProducts(p.data);
      setCategories(c.data);
    });
  };

  useEffect(() => { load(); }, [search, catFilter, lowStock]);

  const openAdd = () => {
    setEditItem(null);
    setForm({ name: '', barcode: '', category_id: '', cost_price: '', sell_price: '', stock: '', min_stock: '', unit: 'قطعة', description: '', image: null });
    setShowModal(true);
  };

  const openEdit = (p) => {
    setEditItem(p);
    setForm({
      name: p.name, barcode: p.barcode || '', category_id: p.category_id || '',
      cost_price: p.cost_price, sell_price: p.sell_price, stock: p.stock,
      min_stock: p.min_stock, unit: p.unit, description: p.description || '', image: null, image_url: p.image_url
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Build plain object payload
      const payload = { ...form };
      
      if (form.image instanceof File) {
        payload.image_base64 = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.readAsDataURL(form.image);
        });
      }
      delete payload.image;

      if (editItem) {
        await api.put(`/products/${editItem.id}`, payload);
        toast.success('تم تحديث المنتج');
      } else {
        await api.post('/products', payload);
        toast.success('تم إضافة المنتج');
      }
      setShowModal(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'خطأ');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!(await confirmAction('هل تريد حذف هذا المنتج؟'))) return;
    try {
      await api.delete(`/products/${id}`);
      toast.success('تم الحذف');
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'خطأ في الحذف'); }
  };

  return (
    <div className="p-6 space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">المنتجات</h1>
          <p className="text-sm text-gray-500">{products.length} منتج</p>
        </div>
        <button onClick={openAdd} className="btn-primary" id="add-product-btn">
          <Plus className="w-4 h-4" /> إضافة منتج
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="بحث بالاسم أو الباركود..."
            className="input pr-9"
          />
        </div>
        <select value={catFilter} onChange={e => setCatFilter(e.target.value)} className="input w-48">
          <option value="">كل التصنيفات</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <label className="flex items-center gap-2 cursor-pointer bg-white px-3 py-2 border rounded-lg hover:bg-gray-50 transition-colors">
          <input type="checkbox" checked={lowStock} onChange={e => setLowStock(e.target.checked)} className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4" />
          <span className="text-sm font-medium text-gray-700 flex items-center gap-1"><Package className="w-4 h-4 text-amber-500"/> النواقص فقط</span>
        </label>
      </div>

      {/* Table */}
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>#</th>
              <th>المنتج</th>
              <th>الباركود</th>
              <th>التصنيف</th>
              <th>سعر التكلفة</th>
              <th>سعر البيع</th>
              <th>المخزون</th>
              <th>الوحدة</th>
              <th>الإجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {products.map((p, i) => (
              <tr key={p.id}>
                <td className="text-gray-400">{i + 1}</td>
                <td>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center shrink-0 overflow-hidden border">
                      {p.image_url ? (
                        <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
                      ) : (
                        <Package className="w-4 h-4 text-blue-500" />
                      )}
                    </div>
                    <span className="font-medium">{p.name}</span>
                  </div>
                </td>
                <td><code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">{p.barcode || '-'}</code></td>
                <td>
                  {p.category_name ? (
                    <span className="badge-blue">{p.category_name}</span>
                  ) : '-'}
                </td>
                <td className="text-gray-600">{parseFloat(p.cost_price).toFixed(2)}</td>
                <td className="font-semibold text-blue-700">{parseFloat(p.sell_price).toFixed(2)}</td>
                <td>
                  <span className={`font-medium ${parseFloat(p.stock) <= parseFloat(p.min_stock) ? 'text-red-600' : 'text-emerald-600'}`}>
                    {parseFloat(p.stock).toFixed(1)}
                  </span>
                </td>
                <td className="text-gray-500">{p.unit}</td>
                <td>
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(p)} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(p.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {products.length === 0 && (
          <div className="text-center py-10 text-gray-400">
            <Package className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p>لا توجد منتجات</p>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <Modal title={editItem ? 'تعديل منتج' : 'إضافة منتج جديد'} onClose={() => setShowModal(false)}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="label">اسم المنتج *</label>
                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required className="input" placeholder="اسم المنتج" />
              </div>
              <div>
                <label className="label">الباركود</label>
                <input value={form.barcode} onChange={e => setForm({ ...form, barcode: e.target.value })} className="input" placeholder="الباركود" />
              </div>
              <div>
                <label className="label">التصنيف</label>
                <select value={form.category_id} onChange={e => setForm({ ...form, category_id: e.target.value })} className="input">
                  <option value="">بدون تصنيف</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="label">سعر التكلفة</label>
                <input type="number" value={form.cost_price} onChange={e => setForm({ ...form, cost_price: e.target.value })} className="input" placeholder="0.00" min="0" step="0.01" />
              </div>
              <div>
                <label className="label">سعر البيع *</label>
                <input type="number" value={form.sell_price} onChange={e => setForm({ ...form, sell_price: e.target.value })} required className="input" placeholder="0.00" min="0" step="0.01" />
              </div>
              <div>
                <label className="label">المخزون الحالي</label>
                <input type="number" value={form.stock} onChange={e => setForm({ ...form, stock: e.target.value })} className="input" placeholder="0" min="0" step="0.001" />
              </div>
              <div>
                <label className="label">الحد الأدنى للمخزون</label>
                <input type="number" value={form.min_stock} onChange={e => setForm({ ...form, min_stock: e.target.value })} className="input" placeholder="0" min="0" />
              </div>
              <div>
                <label className="label">الوحدة</label>
                <select value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} className="input">
                  {['قطعة', 'كيلو', 'جرام', 'لتر', 'متر', 'علبة', 'كرتون', 'باكيت'].map(u => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
              </div>
              <div className="col-span-2">
                <label className="label">صورة المنتج</label>
                <div className="flex items-center gap-2">
                  <input type="file" accept="image/*" onChange={e => setForm({ ...form, image: e.target.files[0] })} className="input text-sm file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
                  {form.image && <span className="text-xs text-emerald-600 font-medium">تم إرفاق صورة</span>}
                </div>
              </div>
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">إلغاء</button>
              <button type="submit" disabled={loading} className="btn-primary">
                {loading ? 'جارٍ الحفظ...' : (editItem ? 'تحديث' : 'إضافة')}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
