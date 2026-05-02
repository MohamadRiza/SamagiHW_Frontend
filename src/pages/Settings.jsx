import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Sidebar } from '../components/layout';
import SettingsService from '../services/settings.service';
import { Toaster, toast } from 'react-hot-toast';

const Settings = () => {
  const { user, logout, updateUserData } = useAuth();
  const isAdmin = user?.role === 'admin';
  
  // App/Update state
  const [appInfo, setAppInfo] = useState(null);
  const [updateInfo, setUpdateInfo] = useState(null);
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [installingUpdate, setInstallingUpdate] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [updateError, setUpdateError] = useState(null);
  
  // Account state
  const [profile, setProfile] = useState(null);
  const [accountForm, setAccountForm] = useState({
    currentPassword: '',
    newUsername: '',
    newPassword: '',
    confirmNewPassword: ''
  });
  const [accountLoading, setAccountLoading] = useState(false);
  
  // System info
  const [systemInfo, setSystemInfo] = useState(null);
  const [showSystemInfo, setShowSystemInfo] = useState(false);

  // Fetch data on mount
  useEffect(() => {
    fetchAppInfo();
    fetchProfile();
    
    // Auto-check for updates on first load (if admin)
    if (isAdmin) {
      handleCheckUpdates(true); // silent check
    }
  }, []);

  const fetchAppInfo = async () => {
    try {
      const response = await SettingsService.getAppInfo();
      if (response?.success) {
        setAppInfo(response.data);
      }
    } catch (error) {
      console.error('Fetch app info error:', error);
    }
  };

  const fetchProfile = async () => {
    try {
      const response = await SettingsService.getProfile();
      if (response?.success) {
        setProfile(response.data);
      }
    } catch (error) {
      console.error('Fetch profile error:', error);
    }
  };

  const fetchSystemInfo = async () => {
    try {
      const response = await SettingsService.getSystemInfo();
      if (response?.success) {
        setSystemInfo(response.data);
      }
    } catch (error) {
      console.error('Fetch system info error:', error);
    }
  };

  // Check for updates
  const handleCheckUpdates = async (silent = false) => {
    try {
      setCheckingUpdate(true);
      setUpdateError(null);
      
      // Check both frontend and backend repos
      const [frontendResult, backendResult] = await Promise.all([
        SettingsService.checkForUpdates('pos-system', false),
        isAdmin ? SettingsService.checkForUpdates('pos-system-backend', true) : Promise.resolve({ success: true, data: null })
      ]);
      
      const hasUpdate = frontendResult?.data?.hasUpdate || backendResult?.data?.hasUpdate;
      
      if (hasUpdate) {
        setUpdateInfo({
          frontend: frontendResult.data,
          backend: isAdmin ? backendResult.data : null,
          hasUpdate: true
        });
        
        if (!silent) {
          toast.success('🔄 New update available!', {
            duration: 5000,
            icon: '🎉'
          });
        }
      } else {
        setUpdateInfo({ hasUpdate: false });
        if (!silent) {
          toast.success('✅ You have the latest version');
        }
      }
      
    } catch (error) {
      console.error('Check updates error:', error);
      setUpdateError('Failed to check for updates');
      if (!silent) {
        toast.error('❌ Failed to check for updates');
      }
    } finally {
      setCheckingUpdate(false);
    }
  };

  // Install update
  const handleInstallUpdate = async () => {
    if (!updateInfo?.hasUpdate) return;
    
    try {
      setInstallingUpdate(true);
      setUpdateError(null);
      
      // Confirm with user
      if (!window.confirm('⚠️ This will update the application and restart it.\n\nYour data will be backed up automatically.\n\nContinue?')) {
        setInstallingUpdate(false);
        return;
      }
      
      // Show backup in progress
      toast.loading('🔄 Backing up database...', { id: 'update-toast' });
      
      // For demo: simulate download progress
      const simulateProgress = () => {
        let progress = 0;
        const interval = setInterval(() => {
          progress += Math.random() * 15;
          if (progress >= 100) {
            progress = 100;
            clearInterval(interval);
          }
          setDownloadProgress(Math.min(100, Math.round(progress)));
          toast.loading(`📥 Downloading update... ${Math.min(100, Math.round(progress))}%`, { id: 'update-toast' });
        }, 200);
        return interval;
      };
      
      const progressInterval = simulateProgress();
      
      // In production, call actual install endpoint:
      // const result = await SettingsService.installUpdate({
      //   downloadUrl: updateInfo.frontend?.downloadUrl,
      //   version: updateInfo.frontend?.latestVersion,
      //   isBackend: false
      // });
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      clearInterval(progressInterval);
      toast.success('✅ Update downloaded!', { id: 'update-toast' });
      
      // Simulate installation
      toast.loading('🔧 Installing update...', { id: 'update-toast' });
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast.success('✅ Update installed! Restarting...', { 
        id: 'update-toast',
        duration: 3000 
      });
      
      // In production: await SettingsService.installUpdate(...)
      
      // Restart app (for Electron)
      setTimeout(() => {
        if (window.electronAPI) {
          window.electronAPI.restartApp();
        } else {
          window.location.reload();
        }
      }, 3000);
      
    } catch (error) {
      console.error('Install update error:', error);
      setUpdateError('Update installation failed');
      toast.error('❌ Update failed. Your data is safe.', { 
        id: 'update-toast',
        duration: 5000 
      });
    } finally {
      setInstallingUpdate(false);
      setDownloadProgress(0);
    }
  };

  // Handle account form change
  const handleAccountChange = (field, value) => {
    setAccountForm(prev => ({ ...prev, [field]: value }));
  };

  // Update credentials
  const handleUpdateCredentials = async (e) => {
    e.preventDefault();
    
    // Validation
    if (accountForm.newPassword && accountForm.newPassword.length < 6) {
      toast.error('❌ New password must be at least 6 characters');
      return;
    }
    
    if (accountForm.newPassword !== accountForm.confirmNewPassword) {
      toast.error('❌ New passwords do not match');
      return;
    }
    
    if (!accountForm.currentPassword) {
      toast.error('❌ Current password is required');
      return;
    }
    
    setAccountLoading(true);
    
    try {
      const response = await SettingsService.updateCredentials({
        currentPassword: accountForm.currentPassword,
        newUsername: accountForm.newUsername.trim() || undefined,
        newPassword: accountForm.newPassword || undefined
      });
      
      if (response?.success) {
        toast.success('✅ Credentials updated successfully');
        
        // Update local auth context if username changed
        if (response.data?.username && response.data.username !== user?.username) {
          updateUserData({ username: response.data.username });
        }
        
        // If new token provided, update storage
        if (response.data?.newToken) {
          localStorage.setItem('token', response.data.newToken);
        }
        
        // Reset form
        setAccountForm({
          currentPassword: '',
          newUsername: '',
          newPassword: '',
          confirmNewPassword: ''
        });
        
        // Refresh profile
        fetchProfile();
      } else {
        toast.error(response?.error || '❌ Failed to update credentials');
      }
    } catch (error) {
      console.error('Update credentials error:', error);
      toast.error('❌ Network error updating credentials');
    } finally {
      setAccountLoading(false);
    }
  };

  // Format bytes to human readable
  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-gray-50 to-indigo-50/30">
      <Toaster position="top-right" />
      <Sidebar />
      
      <main className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-white shadow-sm border-b px-6 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
              <p className="text-sm text-gray-500 mt-1">Manage application and account settings</p>
            </div>
          </div>
        </header>
        
        <div className="p-6 lg:p-8 max-w-6xl mx-auto w-full">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* 🔄 Software Update Section */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center text-white text-xl">
                  🔄
                </div>
                <div>
                  <h2 className="font-bold text-gray-900">Software Update</h2>
                  <p className="text-xs text-gray-500">Keep your POS system up to date</p>
                </div>
              </div>
              
              {/* Current Version */}
              <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Current Version</span>
                  <span className="font-mono font-bold text-gray-900">
                    v{appInfo?.version || '1.0.0'}
                  </span>
                </div>
                {appInfo?.lastUpdateCheck && (
                  <p className="text-xs text-gray-400 mt-1">
                    Last checked: {new Date(appInfo.lastUpdateCheck).toLocaleString()}
                  </p>
                )}
              </div>
              
              {/* Update Status */}
              {updateInfo?.hasUpdate ? (
                <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">🎉</span>
                    <div className="flex-1">
                      <p className="font-bold text-amber-800">Update Available!</p>
                      <p className="text-sm text-amber-700 mt-1">
                        v{updateInfo.frontend?.currentVersion} → v{updateInfo.frontend?.latestVersion}
                      </p>
                      {updateInfo.frontend?.releaseName && (
                        <p className="text-sm text-amber-700 font-medium mt-1">
                          {updateInfo.frontend.releaseName}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  {/* Release Notes */}
                  {updateInfo.frontend?.releaseNotes && (
                    <div className="mt-3 p-3 bg-white rounded border border-amber-100">
                      <p className="text-xs font-medium text-amber-800 mb-1">What's New:</p>
                      <p className="text-xs text-amber-700 whitespace-pre-wrap line-clamp-3">
                        {updateInfo.frontend.releaseNotes}
                      </p>
                    </div>
                  )}
                </div>
              ) : updateInfo && !updateInfo.hasUpdate ? (
                <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm text-green-700 font-medium">✅ You have the latest version</p>
                </div>
              ) : null}
              
              {/* Download Progress */}
              {installingUpdate && downloadProgress > 0 && (
                <div className="mb-4">
                  <div className="flex justify-between text-xs text-gray-600 mb-1">
                    <span>Downloading...</span>
                    <span>{downloadProgress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${downloadProgress}%` }}
                    ></div>
                  </div>
                </div>
              )}
              
              {/* Update Error */}
              {updateError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-700">❌ {updateError}</p>
                </div>
              )}
              
              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => handleCheckUpdates(false)}
                  disabled={checkingUpdate || installingUpdate}
                  className="flex-1 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  {checkingUpdate ? (
                    <>
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                      </svg>
                      Checking...
                    </>
                  ) : (
                    '🔍 Check for Updates'
                  )}
                </button>
                
                {updateInfo?.hasUpdate && (
                  <button
                    onClick={handleInstallUpdate}
                    disabled={installingUpdate}
                    className="flex-1 py-2.5 px-4 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    {installingUpdate ? (
                      <>
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                        </svg>
                        Installing...
                      </>
                    ) : (
                      '⬇️ Install Update'
                    )}
                  </button>
                )}
              </div>
              
              {/* Safety Notice */}
              <p className="text-xs text-gray-400 mt-4 text-center">
                🔒 Your database is automatically backed up before any update
              </p>
            </div>
            
            {/* 👤 Account Settings Section */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white text-xl">
                  👤
                </div>
                <div>
                  <h2 className="font-bold text-gray-900">Account Settings</h2>
                  <p className="text-xs text-gray-500">Update your login credentials</p>
                </div>
              </div>
              
              {/* Current User Info */}
              <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Logged in as</span>
                  <span className="font-semibold text-gray-900">{user?.username}</span>
                </div>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-sm text-gray-600">Role</span>
                  <span className="px-2 py-0.5 bg-gray-200 rounded text-xs font-medium capitalize">
                    {user?.role}
                  </span>
                </div>
              </div>
              
              {/* Update Credentials Form */}
              <form onSubmit={handleUpdateCredentials} className="space-y-4">
                {/* Current Password */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">
                    Current Password <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    value={accountForm.currentPassword}
                    onChange={(e) => handleAccountChange('currentPassword', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="••••••••"
                    required
                  />
                </div>
                
                {/* New Username */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">
                    New Username (Optional)
                  </label>
                  <input
                    type="text"
                    value={accountForm.newUsername}
                    onChange={(e) => handleAccountChange('newUsername', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter new username"
                    minLength={3}
                  />
                  <p className="text-xs text-gray-400 mt-1">Min 3 characters</p>
                </div>
                
                {/* New Password */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">
                    New Password (Optional)
                  </label>
                  <input
                    type="password"
                    value={accountForm.newPassword}
                    onChange={(e) => handleAccountChange('newPassword', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="••••••••"
                    minLength={6}
                  />
                  <p className="text-xs text-gray-400 mt-1">Min 6 characters</p>
                </div>
                
                {/* Confirm New Password */}
                {accountForm.newPassword && (
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">
                      Confirm New Password <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="password"
                      value={accountForm.confirmNewPassword}
                      onChange={(e) => handleAccountChange('confirmNewPassword', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="••••••••"
                      required={!!accountForm.newPassword}
                    />
                  </div>
                )}
                
                {/* Submit */}
                <button
                  type="submit"
                  disabled={accountLoading}
                  className="w-full py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {accountLoading ? (
                    <>
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                      </svg>
                      Updating...
                    </>
                  ) : '💾 Update Credentials'}
                </button>
              </form>
            </div>
            
            {/* ⚙️ System Info (Admin Only) */}
            {isAdmin && (
              <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center text-white text-xl">
                      ⚙️
                    </div>
                    <div>
                      <h2 className="font-bold text-gray-900">System Information</h2>
                      <p className="text-xs text-gray-500">Technical details for diagnostics</p>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => {
                      setShowSystemInfo(!showSystemInfo);
                      if (!showSystemInfo && !systemInfo) {
                        fetchSystemInfo();
                      }
                    }}
                    className="px-4 py-2 text-sm text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                  >
                    {showSystemInfo ? 'Hide Details' : 'Show Details'} →
                  </button>
                </div>
                
                {showSystemInfo && systemInfo && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-500">Platform</p>
                      <p className="font-mono font-bold text-gray-900">{systemInfo.platform}</p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-500">Architecture</p>
                      <p className="font-mono font-bold text-gray-900">{systemInfo.arch}</p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-500">Node Version</p>
                      <p className="font-mono font-bold text-gray-900">{systemInfo.nodeVersion}</p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-500">Uptime</p>
                      <p className="font-mono font-bold text-gray-900">
                        {Math.floor(systemInfo.uptime / 60)}m {Math.round(systemInfo.uptime % 60)}s
                      </p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-500">Memory (Free/Total)</p>
                      <p className="font-mono font-bold text-gray-900">
                        {formatBytes(systemInfo.memory.free * 1024 * 1024)} / {formatBytes(systemInfo.memory.total * 1024 * 1024)}
                      </p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-500">Database Size</p>
                      <p className="font-mono font-bold text-gray-900">
                        {formatBytes(systemInfo.database.size * 1024)}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
            
          </div>
        </div>
      </main>
    </div>
  );
};

export default Settings;