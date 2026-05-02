import SettingsService from '../services/settings';

// Auto-check for updates when app loads
export const checkForUpdatesOnStartup = async (isAdmin) => {
  if (!isAdmin) return;
  
  try {
    // Silent check - no toast notifications
    const response = await SettingsService.checkForUpdates();
    
    if (response?.success && response.data?.hasUpdate) {
      // Store update info for Settings page
      sessionStorage.setItem('pendingUpdate', JSON.stringify(response.data));
      
      // Optional: Show subtle notification in UI
      // This could trigger a banner in your layout component
      console.log('🔄 Update available:', response.data.latestVersion);
    }
  } catch (error) {
    console.error('Auto-update check failed:', error);
  }
};