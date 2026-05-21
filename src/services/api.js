import axios from 'axios';

// Determine API base URL based on environment
const getBaseUrl = () => {
  // Check if running in Electron
  const isElectron = window.electronAPI || navigator.userAgent.toLowerCase().includes('electron');
  
  if (isElectron) {
    console.log('Running in Electron mode, using http://localhost:5000/api');
    return 'http://localhost:5000/api';
  }
  
  // In development, check if we're using Vite proxy
  if (import.meta.env.DEV) {
    console.log('Development mode, using proxy /api');
    return '/api';
  }
  
  // Fallback
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
  console.log('API URL:', apiUrl);
  return apiUrl;
};

const api = axios.create({
  baseURL: getBaseUrl(),
  headers: { 
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  },
  timeout: 30000
});

// Request interceptor: Add auth token and log requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    console.log(`[API Request] ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`);
    return config;
  },
  (error) => {
    console.error('[API Request Error]', error);
    return Promise.reject(error);
  }
);

// Response interceptor: Handle errors
api.interceptors.response.use(
  (response) => {
    console.log(`[API Response] ${response.config.url} - ${response.status}`);
    return response;
  },
  (error) => {
    console.error('[API Response Error]', error.config?.url, error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.error('❌ Backend server is not running or not reachable');
    }
    
    if (error.response?.status === 401) {
      const isAuthEndpoint = error.config?.url?.includes('/auth/login') || 
                            error.config?.url?.includes('/auth/register');
      if (!isAuthEndpoint) {
        console.log('Unauthorized, redirecting to login');
        localStorage.removeItem('token');
        window.location.hash = '#/login';
      }
    }
    
    return Promise.reject(error);
  }
);

// Test connection function
export const testConnection = async () => {
  try {
    const response = await api.get('/health');
    console.log('✅ API Connection Test:', response.data);
    return { success: true, data: response.data };
  } catch (error) {
    console.error('❌ API Connection Test Failed:', error.message);
    return { success: false, error: error.message };
  }
};

export default api;