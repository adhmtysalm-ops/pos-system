import { useState, useEffect } from 'react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { confirmAction } from '../utils/confirm';
import { Clock, LogIn, LogOut, Plus, X, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

function Modal({ title, onClose, children }) {
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal animate-fade-in">
        <div className="modal-header">
          <h2 className="text-base font-bold">{title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

export default function Attendance() {
  const { isAdmin } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [records, setRecords] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [showManual, setShowManual] = useState(false);
  const [manualForm, setManualForm] = useState({ employee_id: '', date: new Date().toISOString().split('T')[0], check_in: '', check_out: '', notes: '' });
  const [loading, setLoading] = useState(false);

  const loadRecords = () => {
    api.get('/attendance', { params: { date: selectedDate } }).then(r => setRecords(r.data));
  };

  useEffect(() => {
    if (isAdmin) api.get('/employees').then(r => setEmployees(r.data));
    loadRecords();
  }, [selectedDate]);

  const handleCheckIn = async (empId) => {
    try { await api.post('/attendance/checkin', { employee_id: empId }); toast.success('تم تسجيل الحضور'); loadRecords(); }
    catch (err) { toast.error(err.response?.data?.message || 'خطأ'); }
  };

  const handleCheckOut = async (empId) => {
    try { await api.post('/attendance/checkout', { employee_id: empId }); toast.success('تم تسجيل الانصراف'); loadRecords(); }
    catch (err) { toast.error(err.response?.data?.message || 'خطأ'); }
  };

  const handleManual = async (e) => {
    e.preventDefault(); setLoading(true);
    try { await api.post('/attendance', manualForm); toast.success('تم الحفظ'); setShowManual(false); loadRecords(); }
    catch (err) { toast.error(err.response?.data?.message || 'خطأ'); }
    finally { setLoading(false); }
  };

  const handleDelete = async (id) => {
    if (!(await confirmAction('حذف السجل؟'))) return;
    try {
      await api.delete(`/attendance/${id}`);
      toast.success('تم الحذف');
      loadRecords();
    } catch (err) { toast.error(err.response?.data?.message || 'خطأ في الحذف'); }
  };

  const getStatus = (emp) => {
    const rec = records.find(r => r.employee_id === emp.id);
    if (!rec) return { status: 'absent', record: null };
    if (rec.check_in && !rec.check_out) return { status: 'present', record: rec };
    if (rec.check_in && rec.check_out) return { status: 'done', record: rec };
    return { status: 'absent', record: null };
  };

  return (
    <div className="p-6 space-y-5 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="text-xl font-bold">الحضور والانصراف</h1></div>
        <div className="flex gap-2">
          <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="input w-auto" />
          {isAdmin && <button onClick={() => setShowManual(true)} className="btn-outline"><Plus className="w-4 h-4" /> إدخال يدوي</button>}
        </div>
      </div>

      {/* Quick Actions for Admin */}
      {isAdmin && employees.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {employees.filter(e => e.active).map(emp => {
            const { status, record } = getStatus(emp);
            return (
              <div key={emp.id} className={`bg-white rounded-xl border p-4 ${status === 'done' ? 'border-emerald-200' : status === 'present' ? 'border-blue-200' : 'border-gray-200'}`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-bold">{emp.name[0]}</div>
                    <div>
                      <p className="text-sm font-semibold">{emp.name}</p>
                      <p className="text-xs text-gray-400">{emp.position}</p>
                    </div>
                  </div>
                  {status === 'done' && <CheckCircle className="w-5 h-5 text-emerald-500" />}
                  {status === 'absent' && <AlertCircle className="w-5 h-5 text-gray-300" />}
                  {status === 'present' && <Clock className="w-5 h-5 text-blue-500 animate-pulse" />}
                </div>
                {record && (
                  <div className="text-xs text-gray-500 space-y-0.5 mb-3">
                    {record.check_in && <div>دخول: <span className="font-medium text-gray-700">{record.check_in}</span></div>}
                    {record.check_out && <div>خروج: <span className="font-medium text-gray-700">{record.check_out}</span></div>}
                  </div>
                )}
                <div className="flex gap-1.5">
                  {status === 'absent' && (
                    <button onClick={() => handleCheckIn(emp.id)} className="btn-primary btn-sm flex-1">
                      <LogIn className="w-3 h-3" /> حضور
                    </button>
                  )}
                  {status === 'present' && (
                    <button onClick={() => handleCheckOut(emp.id)} className="btn-warning btn-sm flex-1">
                      <LogOut className="w-3 h-3" /> انصراف
                    </button>
                  )}
                  {status === 'done' && <span className="text-xs text-emerald-600 font-medium flex-1 text-center py-1">✓ مكتمل</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Personal Action for Cashier */}
      {!isAdmin && (
        <div className="bg-white rounded-xl border p-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-gray-800">تسجيل الحضور والانصراف الخاص بي</h2>
            <p className="text-sm text-gray-500 mt-1">قم بتسجيل وقت دخولك وخروجك ليوم العمل الحالي.</p>
          </div>
          <div className="flex gap-3 w-full md:w-auto">
            <button onClick={async () => {
              try { await api.post('/attendance/me/checkin'); toast.success('تم تسجيل حضورك بنجاح'); loadRecords(); }
              catch (err) { toast.error(err.response?.data?.message || 'خطأ'); }
            }} className="btn-primary flex-1 md:flex-none py-3 px-6">
              <LogIn className="w-5 h-5" /> تسجيل الدخول (حضور)
            </button>
            <button onClick={async () => {
              try { await api.post('/attendance/me/checkout'); toast.success('تم تسجيل انصرافك بنجاح'); loadRecords(); }
              catch (err) { toast.error(err.response?.data?.message || 'خطأ'); }
            }} className="btn-warning flex-1 md:flex-none py-3 px-6">
              <LogOut className="w-5 h-5" /> تسجيل الخروج (انصراف)
            </button>
          </div>
        </div>
      )}

      {/* Attendance Table */}
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>الموظف</th>
              <th>التاريخ</th>
              <th>وقت الحضور</th>
              <th>وقت الانصراف</th>
              <th>مدة العمل</th>
              <th>الحالة</th>
              {isAdmin && <th>إجراءات</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {records.map(r => {
              let hours = '-';
              if (r.check_in && r.check_out) {
                const [h1, m1] = r.check_in.split(':').map(Number);
                const [h2, m2] = r.check_out.split(':').map(Number);
                const mins = (h2 * 60 + m2) - (h1 * 60 + m1);
                hours = `${Math.floor(mins / 60)}س ${mins % 60}د`;
              }
              return (
                <tr key={r.id}>
                  <td className="font-medium">{r.employee_name}</td>
                  <td>{r.date}</td>
                  <td className="text-emerald-600">{r.check_in || '-'}</td>
                  <td className="text-red-500">{r.check_out || '-'}</td>
                  <td>{hours}</td>
                  <td>
                    {r.check_in && r.check_out ? <span className="badge-green">مكتمل</span> :
                     r.check_in ? <span className="badge-blue">حاضر</span> :
                     <span className="badge-gray">غائب</span>}
                  </td>
                  {isAdmin && (
                    <td>
                      <button onClick={() => handleDelete(r.id)} className="p-1.5 rounded hover:bg-red-50 text-red-500">
                        <X className="w-4 h-4" />
                      </button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
        {records.length === 0 && (
          <div className="text-center py-10 text-gray-400">
            <Clock className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p>لا توجد سجلات لهذا اليوم</p>
          </div>
        )}
      </div>

      {showManual && (
        <Modal title="إدخال حضور يدوي" onClose={() => setShowManual(false)}>
          <form onSubmit={handleManual} className="space-y-3">
            <div>
              <label className="label">الموظف *</label>
              <select value={manualForm.employee_id} onChange={e => setManualForm({...manualForm, employee_id: e.target.value})} required className="input">
                <option value="">اختر موظف</option>
                {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            </div>
            <div><label className="label">التاريخ</label><input type="date" value={manualForm.date} onChange={e => setManualForm({...manualForm, date: e.target.value})} className="input" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label">وقت الحضور</label><input type="time" value={manualForm.check_in} onChange={e => setManualForm({...manualForm, check_in: e.target.value})} className="input" /></div>
              <div><label className="label">وقت الانصراف</label><input type="time" value={manualForm.check_out} onChange={e => setManualForm({...manualForm, check_out: e.target.value})} className="input" /></div>
            </div>
            <div><label className="label">ملاحظات</label><input value={manualForm.notes} onChange={e => setManualForm({...manualForm, notes: e.target.value})} className="input" /></div>
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setShowManual(false)} className="btn-secondary">إلغاء</button>
              <button type="submit" disabled={loading} className="btn-primary">{loading ? 'جارٍ...' : 'حفظ'}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
