import { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/axios';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('pos_user');
      return stored && stored !== 'undefined' ? JSON.parse(stored) : null;
    } catch (e) {
      localStorage.removeItem('pos_user');
      return null;
    }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('pos_token');
    if (token) {
      api.get('/auth/me')
        .then(res => {
          setUser(res.data);
          localStorage.setItem('pos_user', JSON.stringify(res.data));
        })
        .catch(() => {
          localStorage.removeItem('pos_token');
          localStorage.removeItem('pos_user');
          setUser(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (username, password) => {
    // offlineApi handles '/auth/login' by calling the real API at /api/login
    const res = await api.post('/auth/login', { username, password });
    const { token, user } = res.data;
    if (!token || !user) throw new Error('استجابة غير صحيحة من الخادم');
    localStorage.setItem('pos_token', token);
    localStorage.setItem('pos_user', JSON.stringify(user));
    setUser(user);
    return user;
  };

  const logout = () => {
    localStorage.removeItem('pos_token');
    localStorage.removeItem('pos_user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, isAdmin: user?.role === 'admin', isSuperAdmin: user?.role === 'superadmin' }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
};
