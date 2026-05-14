import api from './api';

class SettingsService {
  // Get app info
  async getAppInfo() {
    // Check if electron API is available
    if (window.electronAPI) {
      return await window.electronAPI.getAppInfo();
    }
    // Fallback to HTTP
    const response = await api.get('/settings/app-info');
    return response.data;
  }
  
  // Check for updates
  async checkForUpdates() {
    if (window.electronAPI) {
      return await window.electronAPI.checkForUpdates();
    }
    const response = await api.get('/settings/check-updates');
    return response.data;
  }
  
  // Download update
  async downloadUpdate() {
    if (window.electronAPI) {
      return await window.electronAPI.downloadUpdate();
    }
    const response = await api.post('/settings/install-update');
    return response.data;
  }
  
  // Install update (restart app)
  async installUpdate() {
    if (window.electronAPI) {
      return await window.electronAPI.installUpdate();
    }
    const response = await api.post('/settings/install-update');
    return response.data;
  }
  
  // Update credentials
  async updateCredentials(data) {
    const response = await api.put('/settings/credentials', data);
    return response.data;
  }
  
  // Get user profile
  async getProfile() {
    const response = await api.get('/settings/profile');
    return response.data;
  }
  
  // Get system info
  async getSystemInfo() {
    const response = await api.get('/settings/system-info');
    return response.data;
  }
}

export default new SettingsService();