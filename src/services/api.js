import axios from 'axios';

// Determine API base URL based on environment
const getBaseUrl = () => {
  // In Electron production, backend runs on localhost:5000
  if (window.electronAPI && !import.meta.env.DEV) {
    return 'http://localhost:5000/api';
  }
  return import.meta.env.VITE_API_URL || 'http://localhost:3003/api';
};

const api = axios.create({
  baseURL: getBaseUrl(),
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000 // 30 seconds
});

// Request interceptor: Add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const isAuthEndpoint = error.config?.url?.includes('/auth/login') || 
                          error.config?.url?.includes('/auth/register');
    
    // Only redirect on 401 for non-auth endpoints
    if (error.response?.status === 401 && !isAuthEndpoint) {
      localStorage.removeItem('token');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;