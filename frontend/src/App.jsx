import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import POS from './pages/POS';
import Products from './pages/Products';
import Categories from './pages/Categories';
import Customers from './pages/Customers';
import Suppliers from './pages/Suppliers';
import Employees from './pages/Employees';
import Attendance from './pages/Attendance';
import Sales from './pages/Sales';
import Purchases from './pages/Purchases';
import Expenses from './pages/Expenses';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import ReloadPrompt from './components/ReloadPrompt';
import { initWebRTC } from './utils/webrtcManager';
import { startBackgroundSync } from './utils/syncManager';
import { useEffect } from 'react';

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
    </div>
  );
  return user ? children : <Navigate to="/login" replace />;
}

function AdminRoute({ children }) {
  const { user, isAdmin, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/pos" replace />;
  return children;
}

function AppRoutes() {
  const { user, isAdmin } = useAuth();

  useEffect(() => {
    if (user) {
      // Initialize Background Sync
      const token = localStorage.getItem('pos_token') || 'offline-token';
      startBackgroundSync(token);
      
      // Initialize WebRTC P2P Sync on Local Network
      initWebRTC(user.tenantId || 'tenant-1', isAdmin);

      // Listen for background data changes from other peers
      const handleDbChange = (e) => {
        toast('تم تحديث البيانات محلياً', { icon: '🔄', style: { background: '#3B82F6', color: '#fff' } });
        // Ideally we would trigger a React state refresh here if using a state manager
      };
      window.addEventListener('db_changed', handleDbChange);
      
      return () => window.removeEventListener('db_changed', handleDbChange);
    }
  }, [user, isAdmin]);

  return (
    <Routes>
      <Route path="/login" element={!user ? <Login /> : <Navigate to="/" replace />} />
      
      <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
        {/* Admin only pages */}
        <Route index element={<AdminRoute><Dashboard /></AdminRoute>} />
        <Route path="products" element={<AdminRoute><Products /></AdminRoute>} />
        <Route path="categories" element={<AdminRoute><Categories /></AdminRoute>} />
        <Route path="suppliers" element={<AdminRoute><Suppliers /></AdminRoute>} />
        <Route path="employees" element={<AdminRoute><Employees /></AdminRoute>} />
        <Route path="purchases" element={<AdminRoute><Purchases /></AdminRoute>} />
        <Route path="expenses" element={<AdminRoute><Expenses /></AdminRoute>} />
        <Route path="reports" element={<AdminRoute><Reports /></AdminRoute>} />
        <Route path="settings" element={<AdminRoute><Settings /></AdminRoute>} />
        
        {/* All users */}
        <Route path="pos" element={<PrivateRoute><POS /></PrivateRoute>} />
        <Route path="sales" element={<PrivateRoute><Sales /></PrivateRoute>} />
        <Route path="customers" element={<PrivateRoute><Customers /></PrivateRoute>} />
        <Route path="attendance" element={<PrivateRoute><Attendance /></PrivateRoute>} />
      </Route>
      
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
        <ReloadPrompt />
        <Toaster
          position="bottom-left"
          toastOptions={{
            duration: 3000,
            style: {
              fontFamily: 'Cairo, sans-serif',
              fontSize: '14px',
              direction: 'rtl',
            },
            success: { iconTheme: { primary: '#10B981', secondary: '#fff' } },
            error: { iconTheme: { primary: '#EF4444', secondary: '#fff' } },
          }}
        />
      </BrowserRouter>
    </AuthProvider>
  );
}
