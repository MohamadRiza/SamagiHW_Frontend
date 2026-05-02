import api from './api';

const SettingsService = {
  // Get app info
  getAppInfo: async () => {
    try {
      const response = await api.get('/settings/app-info');
      return {
        success: response.data?.success || false,
        data: response.data?.data || null,
        error: response.data?.error || null
      };
    } catch (error) {
      console.error('Get app info error:', error);
      return {
        success: false,
        data: null,
        error: error.response?.data?.error || error.message || 'Network error'
      };
    }
  },
  
  // Check for updates
  checkForUpdates: async (repo = null, isBackend = false) => {
    try {
      const params = new URLSearchParams();
      if (repo) params.append('repo', repo);
      if (isBackend) params.append('isBackend', 'true');
      
      const response = await api.get(`/settings/check-updates?${params.toString()}`);
      return {
        success: response.data?.success || false,
        data: response.data?.data || null,
        error: response.data?.error || null
      };
    } catch (error) {
      console.error('Check updates error:', error);
      return {
        success: false,
        data: null,
        error: error.response?.data?.error || error.message || 'Network error'
      };
    }
  },
  
  // Install update
  installUpdate: async (updateData) => {
    try {
      const response = await api.post('/settings/install-update', updateData);
      return {
        success: response.data?.success || false,
        data: response.data?.data || null,
        error: response.data?.error || null
      };
    } catch (error) {
      console.error('Install update error:', error);
      return {
        success: false,
        data: null,
        error: error.response?.data?.error || error.message || 'Network error'
      };
    }
  },
  
  // Get user profile
  getProfile: async () => {
    try {
      const response = await api.get('/settings/profile');
      return {
        success: response.data?.success || false,
        data: response.data?.data?.user || null,
        error: response.data?.error || null
      };
    } catch (error) {
      console.error('Get profile error:', error);
      return {
        success: false,
        data: null,
        error: error.response?.data?.error || error.message || 'Network error'
      };
    }
  },
  
  // Update credentials
  updateCredentials: async (credentials) => {
    try {
      const response = await api.put('/settings/credentials', credentials);
      return {
        success: response.data?.success || false,
        data: response.data?.data || null,
        error: response.data?.error || null
      };
    } catch (error) {
      console.error('Update credentials error:', error);
      return {
        success: false,
        data: null,
        error: error.response?.data?.error || error.message || 'Network error'
      };
    }
  },
  
  // Get system info
  getSystemInfo: async () => {
    try {
      const response = await api.get('/settings/system-info');
      return {
        success: response.data?.success || false,
        data: response.data?.data || null,
        error: response.data?.error || null
      };
    } catch (error) {
      console.error('Get system info error:', error);
      return {
        success: false,
        data: null,
        error: error.response?.data?.error || error.message || 'Network error'
      };
    }
  }
};

export default SettingsService;