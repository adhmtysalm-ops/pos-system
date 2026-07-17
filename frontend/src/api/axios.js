import axios from 'axios';

const api = axios.create({
  baseURL: '/api/protected',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to attach the token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('pos_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // We handle the public login route differently
    if (config.url === '/auth/login' || config.url === '/login') {
      config.baseURL = '/api';
      config.url = '/login';
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle global errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Token expired or unauthorized
      if (window.location.pathname !== '/login') {
        localStorage.removeItem('pos_token');
        localStorage.removeItem('pos_user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
