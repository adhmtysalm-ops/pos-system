import { useState, useEffect, useRef, useCallback } from 'react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import {
  Search, Plus, Minus, Trash2, ShoppingCart, User, Tag,
  Percent, CreditCard, Banknote, Printer, Check, X,
  ScanBarcode, Calculator, Package
} from 'lucide-react';

export default function POS() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [settings, setSettings] = useState({});
  const [cart, setCart] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [customer, setCustomer] = useState(null);
  const [discount, setDiscount] = useState('');
  const [discountType, setDiscountType] = useState('fixed');
  const [payMethod, setPayMethod] = useState('cash');
  const [paid, setPaid] = useState('');
  const [loading, setLoading] = useState(false);
  const [lastInvoice, setLastInvoice] = useState(null);
  const [showPayModal, setShowPayModal] = useState(false);
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [mobileCartOpen, setMobileCartOpen] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [newCustomerForm, setNewCustomerForm] = useState({ name: '', phone: '', address: '' });
  const searchRef = useRef(null);
  const barcodeRef = useRef(null);

  useEffect(() => {
    Promise.all([
      api.get('/products'),
      api.get('/categories'),
      api.get('/customers'),
      api.get('/settings'),
    ]).then(([p, c, cu, s]) => {
      setProducts(p.data);
      setCategories(c.data);
      setCustomers(cu.data.data || cu.data);
      setSettings(s.data);
    });
  }, []);

  useEffect(() => {
    searchRef.current?.focus();
  }, []);

  const filteredProducts = products.filter(p => {
    const matchCat = selectedCategory === 'all' || p.category_id == selectedCategory;
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.barcode?.includes(search);
    return matchCat && matchSearch;
  });

  const addToCart = useCallback((product) => {
    setCart(prev => {
      const existing = prev.find(i => i.product_id === product.id);
      if (existing) {
        if (existing.quantity + 1 > parseFloat(product.stock)) {
          toast.error('الكمية المطلوبة تتجاوز المخزون المتاح');
          return prev;
        }
        return prev.map(i =>
          i.product_id === product.id
            ? { ...i, quantity: i.quantity + 1, total: (i.quantity + 1) * i.unit_price }
            : i
        );
      }
      if (parseFloat(product.stock) < 1) {
        toast.error('المنتج غير متوفر في المخزون');
        return prev;
      }
      return [...prev, {
        product_id: product.id,
        product_name: product.name,
        barcode: product.barcode || '',
        unit_price: parseFloat(product.sell_price),
        quantity: 1,
        discount: 0,
        total: parseFloat(product.sell_price),
      }];
    });
    setSearch('');
  }, []);

  const handleBarcodeSearch = async (e) => {
    if (e.key === 'Enter' && search) {
      const found = products.find(p => p.barcode === search);
      if (found) {
        addToCart(found);
      } else {
        try {
          const res = await api.get(`/products/barcode/${search}`);
          addToCart(res.data);
          setProducts(prev => [...prev.filter(p => p.id !== res.data.id), res.data]);
        } catch {
          toast.error('المنتج غير موجود');
        }
      }
      setSearch('');
    }
  };

  const updateQty = (id, delta) => {
    setCart(prev => {
      return prev.map(i => {
        if (i.product_id === id) {
          const product = products.find(p => p.id === id);
          const maxStock = product ? parseFloat(product.stock) : Infinity;
          const newQty = Math.max(1, i.quantity + delta);
          if (newQty > maxStock) {
            toast.error('الكمية المطلوبة تتجاوز المخزون المتاح');
            return i;
          }
          return { ...i, quantity: newQty, total: newQty * i.unit_price };
        }
        return i;
      });
    });
  };

  const removeItem = (id) => setCart(prev => prev.filter(i => i.product_id !== id));

  const subtotal = cart.reduce((s, i) => s + i.total, 0);
  const discountAmt = discountType === 'percent'
    ? (subtotal * parseFloat(discount || 0)) / 100
    : parseFloat(discount || 0);
  const total = Math.max(0, subtotal - discountAmt);
  const paidAmt = paid === '' ? 0 : parseFloat(paid);
  const change = paidAmt - total;

  const handleCheckout = async () => {
    if (cart.length === 0) return toast.error('السلة فارغة');
    if (payMethod === 'credit' && !customer) return toast.error('يجب اختيار عميل للبيع الآجل');
    if (payMethod !== 'credit' && paid === '') return toast.error('يرجى إدخال المبلغ المدفوع أولاً لحساب الباقي');
    if (payMethod !== 'credit' && paidAmt < total) return toast.error('المبلغ المدفوع أقل من الصافي');
    
    const finalPaid = payMethod === 'credit' ? 0 : paidAmt;
    
    setLoading(true);
    try {
      const res = await api.post('/sales', {
        customer_id: customer?.id || 1,
        items: cart,
        discount: discountAmt,
        discount_type: 'fixed',
        tax: 0,
        paid: finalPaid,
        payment_method: payMethod,
      });
      toast.success('تم إنشاء الفاتورة بنجاح!');
      setLastInvoice({ ...res.data, items: cart, customer, total, paid: finalPaid, change, settings });
      setCart([]);
      setDiscount('');
      setPaid('');
      setCustomer(null);
      setShowPayModal(false);
      setTimeout(() => printInvoice(res.data.id), 300);
    } catch (err) {
      toast.error(err.response?.data?.message || 'خطأ في إنشاء الفاتورة');
    } finally {
      setLoading(false);
    }
  };

  const printInvoice = async (id) => {
    try {
      const res = await api.get(`/sales/${id}`);
      const inv = res.data;
      const s = settings;
      const w = window.open('', '_blank', 'width=400,height=600');
      w.document.write(`
        <!DOCTYPE html>
        <html dir="rtl">
        <head>
          <meta charset="utf-8">
          <title>فاتورة ${inv.invoice_number}</title>
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
          <div>رقم الفاتورة: <span class="bold">${inv.invoice_number}</span></div>
          <div>التاريخ: ${new Date(inv.created_at).toLocaleString('ar-EG')}</div>
          ${inv.customer_name && inv.customer_name !== 'عميل نقدي' ? `<div>العميل: ${inv.customer_name}</div>` : ''}
          ${customer?.phone ? `<div>هاتف: ${customer.phone}</div>` : ''}
          ${customer?.address ? `<div>العنوان: ${customer.address}</div>` : ''}
          <hr>
          <table>
            <thead><tr><th>الصنف</th><th class="center-col">الكمية</th><th>السعر</th><th>الإجمالي</th></tr></thead>
            <tbody>
              ${inv.items.map(i => `
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
          <table>
            <tr><td>الإجمالي قبل الخصم:</td><td class="bold">${parseFloat(inv.subtotal).toFixed(2)} ${s.currency || 'ج.م'}</td></tr>
            ${parseFloat(inv.discount) > 0 ? `<tr><td>الخصم:</td><td>- ${parseFloat(inv.discount).toFixed(2)}</td></tr>` : ''}
            <tr class="total-row"><td>الإجمالي:</td><td>${parseFloat(inv.total).toFixed(2)} ${s.currency || 'ج.م'}</td></tr>
            <tr><td>المدفوع:</td><td>${parseFloat(inv.paid).toFixed(2)}</td></tr>
            ${parseFloat(inv.change_amount) > 0 ? `<tr><td>الباقي:</td><td>${parseFloat(inv.change_amount).toFixed(2)}</td></tr>` : ''}
          </table>
          <hr>
          <div class="footer">${s.receipt_footer || 'شكراً لزيارتكم'}</div>
          <script>window.onload = () => { window.print(); setTimeout(() => window.close(), 500); }</script>
        </body>
        </html>
      `);
      w.document.close();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <>
      <div className="flex flex-col lg:flex-row h-[calc(100dvh-57px)] overflow-hidden relative">
      {/* Products Panel */}
      <div className="flex-1 flex flex-col overflow-hidden border-l border-gray-200">
        {/* Search + Category */}
        <div className="p-3 border-b border-gray-100 bg-white space-y-2">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              ref={searchRef}
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={handleBarcodeSearch}
              placeholder="ابحث بالاسم أو اسكن الباركود ثم Enter..."
              className="input pr-9 pl-4"
              id="pos-search"
            />
          </div>
          <div className="flex gap-1.5 overflow-x-auto pb-1 no-print">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                selectedCategory === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              الكل
            </button>
            {categories.map(c => (
              <button
                key={c.id}
                onClick={() => setSelectedCategory(c.id)}
                className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all border ${
                  selectedCategory == c.id ? 'text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                style={{ backgroundColor: selectedCategory == c.id ? c.color : '', borderColor: c.color }}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>

        {/* Product Grid */}
        <div className="flex-1 overflow-y-auto p-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-2">
            {filteredProducts.map(p => (
              <button
                key={p.id}
                onClick={() => addToCart(p)}
                disabled={p.stock <= 0}
                className={`bg-white border rounded-xl p-3 text-right hover:border-blue-400 hover:shadow-md transition-all duration-150 active:scale-95 ${
                  p.stock <= 0 ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
                }`}
              >
                <div className="w-full h-20 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-lg mb-2 flex items-center justify-center overflow-hidden border">
                  {p.image ? (
                    <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                  ) : (
                    <Package className="w-8 h-8 text-blue-400" />
                  )}
                </div>
                <p className="text-xs font-semibold text-gray-800 truncate" title={p.name}>{p.name}</p>
                <p className="text-sm font-bold text-blue-600 mt-0.5">{parseFloat(p.sell_price).toFixed(2)}</p>
                <p className="text-xs text-gray-400">مخزون: {parseFloat(p.stock).toFixed(0)}</p>
              </button>
            ))}
            {filteredProducts.length === 0 && (
              <div className="col-span-5 text-center py-10 text-gray-400">
                <Package className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p>لا توجد منتجات</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Cart Backdrop */}
      {mobileCartOpen && (
        <div 
          className="fixed inset-0 bg-gray-900/50 z-40 lg:hidden" 
          onClick={() => setMobileCartOpen(false)}
        />
      )}

      {/* Cart Panel */}
      <div className={`fixed lg:static inset-y-0 right-0 z-50 w-[85%] sm:w-80 bg-white shadow-2xl lg:shadow-none flex flex-col border-r border-gray-200 shrink-0 transition-transform duration-300 ${
        mobileCartOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'
      }`}>
        {/* Mobile Header (Close button) */}
        <div className="flex lg:hidden justify-between items-center p-3 border-b border-gray-100 bg-gray-50">
          <h2 className="font-bold text-gray-800">السلة</h2>
          <button onClick={() => setMobileCartOpen(false)} className="text-gray-500 hover:text-red-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Customer */}
        <div className="p-3 border-b border-gray-100">
          <div className="flex gap-1">
            <input
              list="customers-list"
              value={customerSearch}
              onChange={e => {
                setCustomerSearch(e.target.value);
                const match = customers.find(c => `${c.name} - ${c.phone || ''}` === e.target.value);
                setCustomer(match || null);
              }}
              placeholder="ابحث برقم الهاتف أو الاسم..."
              className="input text-sm flex-1"
            />
            <datalist id="customers-list">
              {customers.map(c => (
                <option key={c.id} value={`${c.name} - ${c.phone || ''}`} />
              ))}
            </datalist>
            <button onClick={() => setShowAddCustomer(true)} className="btn-primary px-2 bg-blue-600 hover:bg-blue-700" title="إضافة عميل جديد">
              <User className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
          {cart.length === 0 && (
            <div className="flex flex-col items-center justify-center h-40 text-gray-300">
              <ShoppingCart className="w-10 h-10 mb-2" />
              <p className="text-sm">السلة فارغة</p>
            </div>
          )}
          {cart.map(item => (
            <div key={item.product_id} className="bg-gray-50 rounded-lg p-2.5 border border-gray-100">
              <div className="flex items-start justify-between gap-1">
                <p className="text-xs font-medium text-gray-800 flex-1 leading-tight">{item.product_name}</p>
                <button onClick={() => removeItem(item.product_id)} className="text-red-400 hover:text-red-600 shrink-0">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center gap-1">
                  <button onClick={() => updateQty(item.product_id, -1)} className="w-6 h-6 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center">
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="w-8 text-center text-sm font-bold">{item.quantity}</span>
                  <button onClick={() => updateQty(item.product_id, 1)} className="w-6 h-6 rounded-full bg-blue-100 hover:bg-blue-200 text-blue-600 flex items-center justify-center">
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
                <span className="text-sm font-bold text-blue-600">{item.total.toFixed(2)}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Totals */}
        <div className="border-t border-gray-100 p-3 space-y-2">
          <div className="flex gap-1.5">
            <input
              type="number"
              value={discount}
              onChange={e => setDiscount(e.target.value)}
              placeholder="خصم"
              className="input text-sm flex-1"
              min="0"
            />
            <select
              value={discountType}
              onChange={e => setDiscountType(e.target.value)}
              className="input text-sm w-20"
            >
              <option value="fixed">ج.م</option>
              <option value="percent">%</option>
            </select>
          </div>

          <div className="bg-gray-50 rounded-lg p-2.5 space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">الإجمالي</span>
              <span className="font-medium">{subtotal.toFixed(2)}</span>
            </div>
            {discountAmt > 0 && (
              <div className="flex justify-between text-red-500">
                <span>خصم</span>
                <span>- {discountAmt.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-bold text-blue-700 border-t pt-1">
              <span>الصافي</span>
              <span>{total.toFixed(2)}</span>
            </div>
          </div>

          {/* Payment Methods */}
          <div className="grid grid-cols-3 gap-1">
            {[
              { v: 'cash', l: 'نقدي', icon: Banknote },
              { v: 'card', l: 'بطاقة', icon: CreditCard },
              { v: 'credit', l: 'آجل', icon: Tag },
            ].map(({ v, l, icon: Icon }) => (
              <button
                key={v}
                onClick={() => {
                  setPayMethod(v);
                  if (v === 'credit') setPaid(0);
                  else setPaid('');
                }}
                className={`flex flex-col items-center p-2 rounded-lg text-xs font-medium transition-all border ${
                  payMethod === v ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                }`}
              >
                <Icon className="w-4 h-4 mb-0.5" />
                {l}
              </button>
            ))}
          </div>

          <input
            type="number"
            value={paid}
            onChange={e => setPaid(e.target.value)}
            placeholder="المبلغ المدفوع (إلزامي)"
            className="input text-sm border-blue-400 focus:ring-blue-500"
            min="0"
          />

          {paidAmt >= total && (
            <div className="flex justify-between text-sm text-emerald-600 font-medium">
              <span>الباقي:</span>
              <span>{Math.max(0, change).toFixed(2)}</span>
            </div>
          )}

          <button
            onClick={handleCheckout}
            disabled={cart.length === 0 || loading}
            className="btn-success w-full py-3 text-base"
            id="checkout-btn"
          >
            {loading ? (
              <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <>
                <Check className="w-5 h-5" />
                تأكيد البيع ({total.toFixed(2)})
              </>
            )}
          </button>
        </div>
      </div>
    </div>

      {/* Mobile Floating Cart Button */}
      <button
        onClick={() => setMobileCartOpen(true)}
        className="lg:hidden fixed bottom-6 left-6 z-30 bg-blue-600 text-white rounded-full px-5 py-3 shadow-[0_8px_30px_rgb(0,0,0,0.2)] flex items-center gap-3 transition-transform active:scale-95"
      >
        <div className="relative">
          <ShoppingCart className="w-6 h-6" />
          {cart.length > 0 && (
            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-bold border-2 border-blue-600">
              {cart.reduce((s, i) => s + i.quantity, 0)}
            </span>
          )}
        </div>
        <div className="flex flex-col items-start border-r border-blue-500/50 pr-3 mr-1">
          <span className="text-[10px] text-blue-100 leading-none mb-1">الإجمالي</span>
          <span className="font-bold text-sm leading-none">{total.toFixed(2)}</span>
        </div>
      </button>
      
      {showAddCustomer && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowAddCustomer(false)}>
          <div className="modal animate-fade-in max-w-sm">
            <div className="modal-header">
              <h2 className="text-base font-bold text-gray-900">إضافة عميل جديد</h2>
              <button onClick={() => setShowAddCustomer(false)} className="p-1.5 rounded-lg hover:bg-gray-100"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={async (e) => {
              e.preventDefault();
              try {
                const res = await api.post('/customers', newCustomerForm);
                const newC = { id: res.data.id, ...newCustomerForm };
                setCustomers([...customers, newC]);
                setCustomer(newC);
                setCustomerSearch(`${newC.name} - ${newC.phone || ''}`);
                setNewCustomerForm({ name: '', phone: '', address: '' });
                setShowAddCustomer(false);
                toast.success('تم إضافة العميل بنجاح');
              } catch (err) { toast.error('خطأ في إضافة العميل'); }
            }} className="p-5 space-y-4">
              <div>
                <label className="label">اسم العميل *</label>
                <input value={newCustomerForm.name} onChange={e=>setNewCustomerForm({...newCustomerForm, name: e.target.value})} required className="input"/>
              </div>
              <div>
                <label className="label">رقم الهاتف</label>
                <input value={newCustomerForm.phone} onChange={e=>setNewCustomerForm({...newCustomerForm, phone: e.target.value})} className="input" placeholder="01..."/>
              </div>
              <div>
                <label className="label">العنوان</label>
                <input value={newCustomerForm.address} onChange={e=>setNewCustomerForm({...newCustomerForm, address: e.target.value})} className="input"/>
              </div>
              <button type="submit" className="btn-primary w-full py-2.5">إضافة العميل</button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
