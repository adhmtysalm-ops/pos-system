import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, ShoppingCart, Package, Tag, Users, Truck,
  ClipboardList, UserCheck, Receipt, DollarSign, BarChart3,
  Settings, LogOut, Menu, X, ChevronDown, Building2, Clock,
  CreditCard, Sparkles, Shield
} from 'lucide-react';
import api from '../api/axios';

export default function Layout({ children, currentPath = '/' }) {
  const { user, logout, isAdmin, isSuperAdmin, loading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(() => typeof window !== 'undefined' ? window.innerWidth >= 768 : true);
  const [storeName, setStoreName] = useState('نظام POS');
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef(null);

  // Route Guard: redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      window.location.href = '/login';
    }
  }, [loading, user]);

  useEffect(() => {
    if (user) {
      api.get('/settings').then(r => setStoreName(r.data.store_name || 'نظام POS')).catch(() => {});
    }
  }, [user]);

  useEffect(() => {
    const handler = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const adminLinks = [
    { to: '/', label: 'لوحة التحكم', icon: LayoutDashboard, end: true },
    { to: '/pos', label: 'الكاشير', icon: ShoppingCart },
    { to: '/sales', label: 'الفواتير', icon: Receipt },
    { to: '/products', label: 'المنتجات', icon: Package },
    { to: '/categories', label: 'التصنيفات', icon: Tag },
    { to: '/customers', label: 'العملاء', icon: Users },
    { to: '/suppliers', label: 'الموردون', icon: Truck },
    { to: '/purchases', label: 'المشتريات', icon: ClipboardList },
    { to: '/employees', label: 'الموظفون', icon: UserCheck },
    { to: '/attendance', label: 'الحضور والانصراف', icon: Clock },
    { to: '/expenses', label: 'المصروفات', icon: DollarSign },
    { to: '/reports', label: 'التقارير', icon: BarChart3 },
    { to: '/settings', label: 'الإعدادات', icon: Settings },
  ];

  const cashierLinks = [
    { to: '/pos', label: 'الكاشير', icon: ShoppingCart },
    { to: '/sales', label: 'فواتيري', icon: Receipt },
    { to: '/attendance', label: 'حضوري', icon: Clock },
  ];

  const superAdminLinks = [
    { to: '/admin/dashboard', label: 'لوحة التحكم', icon: LayoutDashboard, end: true },
    { to: '/admin/tenants', label: 'إدارة المتاجر', icon: Building2 },
    { to: '/admin/subscriptions', label: 'الاشتراكات', icon: ClipboardList },
    { to: '/admin/plans', label: 'إدارة الباقات', icon: CreditCard },
  ];

  const links = isSuperAdmin ? superAdminLinks : (isAdmin ? adminLinks : cashierLinks);

  // Role-based Route Guard
  useEffect(() => {
    if (!loading && user && currentPath !== '/login') {
      const isAllowed = links.some(link => 
        link.to === currentPath || (link.to !== '/' && currentPath.startsWith(link.to))
      );
      if (!isAllowed) {
        window.location.href = isSuperAdmin ? '/admin/dashboard' : (isAdmin ? '/' : '/pos');
      }
    }
  }, [loading, user, currentPath, isSuperAdmin, isAdmin]);

  const handleLogout = () => {
    logout();
    window.location.href = '/login';
  };

  // Show loading spinner while auth is being verified
  if (loading || !user) {
    return (
      <div className="flex h-dvh items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="flex h-dvh overflow-hidden bg-gray-50">
      {/* Mobile Backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-gray-900/50 z-30 md:hidden transition-opacity" 
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 right-0 z-40 flex flex-col border-l shadow-xl transition-all duration-300 ${
          sidebarOpen ? 'w-64' : 'w-0 overflow-hidden'
        } ${isSuperAdmin ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'}`}
      >
        {/* Logo */}
        <div className={`flex items-center gap-3 px-5 py-4 border-b ${isSuperAdmin ? 'border-gray-700' : 'border-gray-100'}`}>
          <div className={`flex items-center justify-center w-9 h-9 rounded-xl ${isSuperAdmin ? 'bg-amber-500' : 'bg-blue-600'}`}>
            {isSuperAdmin ? <Shield className="w-5 h-5 text-white" /> : <Building2 className="w-5 h-5 text-white" />}
          </div>
          <div className="min-w-0">
            <p className={`text-sm font-bold truncate ${isSuperAdmin ? 'text-white' : 'text-gray-900'}`}>
              {isSuperAdmin ? 'Super Admin' : storeName}
            </p>
            <p className={`text-xs ${isSuperAdmin ? 'text-amber-400' : 'text-gray-500'}`}>
              {isSuperAdmin ? 'لوحة إدارة SaaS' : 'نظام نقطة البيع'}
            </p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {links.map(({ to, label, icon: Icon, end }) => {
            const isActive = end ? currentPath === to : currentPath.startsWith(to);
            return (
            <a
              key={to}
              href={to}
              className={isSuperAdmin
                ? `flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-amber-500 text-white shadow-sm'
                      : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                  }`
                : `sidebar-link ${isActive ? 'active' : ''}`
              }
              onClick={() => {
                if (window.innerWidth < 768) setSidebarOpen(false);
              }}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="truncate">{label}</span>
            </a>
          )})}
        </nav>

        {/* User Info */}
        <div className={`p-3 border-t ${isSuperAdmin ? 'border-gray-700' : 'border-gray-100'}`}>
          <div className={`flex items-center gap-3 px-3 py-2 rounded-lg ${isSuperAdmin ? 'bg-gray-800' : 'bg-gray-50'}`}>
            <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold shrink-0 ${
              isSuperAdmin ? 'bg-amber-500 text-white' : 'bg-blue-100 text-blue-700'
            }`}>
              {user?.name?.[0] || 'م'}
            </div>
            <div className="min-w-0 flex-1">
              <p className={`text-sm font-medium truncate ${isSuperAdmin ? 'text-white' : 'text-gray-900'}`}>{user?.name}</p>
              <p className={`text-xs ${isSuperAdmin ? 'text-amber-400' : 'text-gray-500'}`}>
                {isSuperAdmin ? '🔐 Super Admin' : (user?.role === 'admin' ? 'مدير' : 'كاشير')}
              </p>
            </div>
            <button onClick={handleLogout} className={`transition-colors ${isSuperAdmin ? 'text-gray-500 hover:text-red-400' : 'text-gray-400 hover:text-red-500'}`} title="تسجيل الخروج">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className={`flex flex-col flex-1 min-w-0 h-dvh transition-all duration-300 ${sidebarOpen ? 'mr-0 md:mr-64' : 'mr-0'}`}>
        {/* Topbar */}
        <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between shadow-sm shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors"
            >
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <h1 className="text-base font-semibold text-gray-800">{storeName}</h1>
          </div>

          <div className="flex items-center gap-2" ref={userMenuRef}>
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="w-7 h-7 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">
                  {user?.name?.[0] || 'م'}
                </div>
                <span className="text-sm font-medium text-gray-700 hidden sm:block">{user?.name}</span>
                <ChevronDown className="w-4 h-4 text-gray-500" />
              </button>
              {userMenuOpen && (
                <div className="absolute left-0 mt-1 w-44 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50 animate-fade-in">
                  <div className="px-3 py-2 border-b border-gray-100">
                    <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                    <p className="text-xs text-gray-500">{isSuperAdmin ? 'مشرف عام (SaaS)' : (user?.role === 'admin' ? 'مدير النظام' : 'كاشير')}</p>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    تسجيل الخروج
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
