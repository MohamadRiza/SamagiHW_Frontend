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
  const [downloadingUpdate, setDownloadingUpdate] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [updateError, setUpdateError] = useState(null);
  const [updateStatus, setUpdateStatus] = useState(null);
  
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

  // Backup state
  const [backupLoading, setBackupLoading] = useState(false);
  const [backupPath, setBackupPath] = useState(null);

  // Fetch data on mount
  useEffect(() => {
    fetchAppInfo();
    fetchProfile();
    
    // Auto-check for updates on first load (if admin)
    if (isAdmin) {
      setTimeout(() => handleCheckUpdates(true), 2000);
    }
    
    // Setup Electron IPC listeners for real-time update status
    if (window.electronAPI) {
      // Listen for update status changes
      const cleanupStatus = window.electronAPI.onUpdateStatus((data) => {
        console.log('Update status:', data);
        setUpdateStatus(data);
        
        if (data.status === 'available') {
          setUpdateInfo(prev => ({
            ...prev,
            hasUpdate: true,
            latestVersion: data.version,
            releaseNotes: data.releaseNotes,
            releaseDate: data.releaseDate
          }));
          toast.success(`🎉 Update v${data.version} available!`, { duration: 8000 });
        } else if (data.status === 'downloaded') {
          toast.success('✅ Update downloaded and ready to install!', { duration: 5000 });
          setDownloadingUpdate(false);
          setDownloadProgress(100);
        } else if (data.status === 'checking') {
          toast.loading('Checking for updates...', { id: 'update-check' });
        } else if (data.status === 'not-available') {
          toast.success('✅ You have the latest version', { id: 'update-check', duration: 3000 });
        }
      });
      
      // Listen for download progress
      const cleanupProgress = window.electronAPI.onUpdateProgress((data) => {
        console.log('Download progress:', data);
        setDownloadProgress(data.percent || 0);
        if (data.percent && data.percent < 100) {
          toast.loading(`Downloading update: ${data.percent}%`, { id: 'update-download' });
        } else if (data.percent === 100) {
          toast.success('Download complete! Installing...', { id: 'update-download', duration: 2000 });
        }
      });
      
      // Listen for errors
      const cleanupError = window.electronAPI.onUpdateError((data) => {
        console.error('Update error:', data);
        setUpdateError(data.error);
        setDownloadingUpdate(false);
        toast.error(`❌ Update error: ${data.error}`, { duration: 5000 });
      });
      
      // Cleanup listeners on unmount
      return () => {
        cleanupStatus();
        cleanupProgress();
        cleanupError();
      };
    }
  }, [isAdmin]);

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
      
      if (!silent) {
        toast.loading('Checking for updates...', { id: 'update-check' });
      }
      
      const result = await SettingsService.checkForUpdates();
      
      if (result?.success && result.data?.hasUpdate) {
        setUpdateInfo({
          hasUpdate: true,
          currentVersion: result.data.currentVersion,
          latestVersion: result.data.latestVersion,
          releaseNotes: result.data.releaseNotes,
          releaseDate: result.data.releaseDate
        });
        if (!silent) {
          toast.success(`🎉 Update v${result.data.latestVersion} available!`, { id: 'update-check', duration: 8000 });
        }
      } else if (result?.success && !result.data?.hasUpdate) {
        if (!silent) {
          toast.success('✅ You have the latest version', { id: 'update-check', duration: 3000 });
        }
      } else if (!silent) {
        toast.error(result?.error || 'Failed to check for updates', { id: 'update-check' });
      }
      
    } catch (error) {
      console.error('Check updates error:', error);
      setUpdateError('Failed to check for updates');
      if (!silent) {
        toast.error('❌ Failed to check for updates', { id: 'update-check' });
      }
    } finally {
      setCheckingUpdate(false);
    }
  };

  // Download and install update
  const handleDownloadUpdate = async () => {
    if (!updateInfo?.hasUpdate) {
      toast.error('No update available to download');
      return;
    }
    
    try {
      setDownloadingUpdate(true);
      setUpdateError(null);
      setDownloadProgress(0);
      
      // Confirm with user
      const confirmed = window.confirm(
        `⚠️ Download and install update to v${updateInfo.latestVersion}?\n\n` +
        `Current version: v${updateInfo.currentVersion}\n` +
        `New version: v${updateInfo.latestVersion}\n\n` +
        `What's new:\n${updateInfo.releaseNotes || 'Bug fixes and improvements'}\n\n` +
        `The app will restart automatically after installation.\n\n` +
        `Continue?`
      );
      
      if (!confirmed) {
        setDownloadingUpdate(false);
        return;
      }
      
      toast.loading('Starting download...', { id: 'update-download' });
      
      // Call download update
      const result = await SettingsService.downloadUpdate();
      
      if (result?.success) {
        toast.loading('Downloading update...', { id: 'update-download' });
        // The download progress will be handled by IPC listeners
      } else {
        throw new Error(result?.error || 'Failed to start download');
      }
      
    } catch (error) {
      console.error('Download update error:', error);
      setUpdateError(error.message);
      setDownloadingUpdate(false);
      toast.error(`❌ Update failed: ${error.message}`, { id: 'update-download', duration: 5000 });
    }
  };

  // Install downloaded update (manual trigger if needed)
  const handleInstallUpdate = async () => {
    try {
      toast.loading('Installing update...', { id: 'update-install' });
      const result = await SettingsService.installUpdate();
      if (result?.success) {
        toast.success('Update installed! Restarting...', { id: 'update-install', duration: 2000 });
        setTimeout(() => {
          if (window.electronAPI?.restartApp) {
            window.electronAPI.restartApp();
          } else {
            window.location.reload();
          }
        }, 2000);
      } else {
        throw new Error(result?.error || 'Installation failed');
      }
    } catch (error) {
      console.error('Install update error:', error);
      toast.error(`❌ Installation failed: ${error.message}`, { id: 'update-install' });
    }
  };

  // Handle account form change
  const handleAccountChange = (field, value) => {
    setAccountForm(prev => ({ ...prev, [field]: value }));
  };

  // Update credentials
  const handleUpdateCredentials = async (e) => {
    e.preventDefault();
    
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
        if (response.data?.username && response.data.username !== user?.username) {
          updateUserData({ username: response.data.username });
        }
        if (response.data?.newToken) {
          localStorage.setItem('token', response.data.newToken);
        }
        setAccountForm({
          currentPassword: '',
          newUsername: '',
          newPassword: '',
          confirmNewPassword: ''
        });
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

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return dateString;
    }
  };

  const handleCreateBackup = async () => {
    try {
      setBackupLoading(true);
      setBackupPath(null);
      toast.loading('Creating Desktop backup...', { id: 'desktop-backup' });
      
      const result = await SettingsService.createDesktopBackup();
      
      if (result?.success) {
        setBackupPath(result.path);
        toast.success('🎉 Backup saved to Desktop successfully!', { id: 'desktop-backup', duration: 6000 });
      } else {
        toast.error(result?.error || 'Failed to create backup', { id: 'desktop-backup' });
      }
    } catch (error) {
      console.error('Desktop backup error:', error);
      toast.error('❌ Failed to create Desktop backup', { id: 'desktop-backup' });
    } finally {
      setBackupLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-gray-50 to-indigo-50/30">
      <Toaster position="top-right" />
      <Sidebar />
      
      <main className="flex-1 flex flex-col">
        <header className="bg-white shadow-sm border-b px-6 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
              <p className="text-sm text-gray-500 mt-1">Manage application and account settings</p>
            </div>
            {updateStatus?.status === 'downloaded' && (
              <button
                onClick={handleInstallUpdate}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                <span>📦</span>
                <span>Install Update Now</span>
              </button>
            )}
            {updateStatus?.status === 'available' && !downloadingUpdate && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-100 text-amber-800 rounded-full text-sm font-medium">
                <span>🔄</span>
                <span>Update v{updateStatus.version} ready</span>
              </div>
            )}
          </div>
        </header>
        
        <div className="p-6 lg:p-8 max-w-6xl mx-auto w-full">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* 🔄 Software Update Section */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center text-white text-xl">🔄</div>
                <div>
                  <h2 className="font-bold text-gray-900">Software Update</h2>
                  <p className="text-xs text-gray-500">Keep your POS system up to date</p>
                </div>
              </div>
              
              {/* Current Version */}
              <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Current Version</span>
                  <span className="font-mono font-bold text-gray-900">v{appInfo?.version || '1.0.0'}</span>
                </div>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-sm text-gray-600">Environment</span>
                  <span className="text-xs font-mono text-gray-500">{appInfo?.environment || 'production'}</span>
                </div>
                {appInfo?.userDataPath && (
                  <p className="text-xs text-gray-400 mt-1 truncate" title={appInfo.userDataPath}>
                    Data: {appInfo.userDataPath.split(/[/\\]/).pop()}
                  </p>
                )}
              </div>
              
              {/* Update Status */}
              {updateInfo?.hasUpdate && (
                <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">🎉</span>
                    <div className="flex-1">
                      <p className="font-bold text-amber-800">Update Available!</p>
                      <p className="text-sm text-amber-700 mt-1">
                        v{updateInfo.currentVersion} → v{updateInfo.latestVersion}
                      </p>
                      {updateInfo.releaseDate && (
                        <p className="text-xs text-amber-600 mt-1">
                          Released: {formatDate(updateInfo.releaseDate)}
                        </p>
                      )}
                    </div>
                  </div>
                  {updateInfo.releaseNotes && (
                    <div className="mt-3 p-3 bg-white rounded border border-amber-100">
                      <p className="text-xs font-medium text-amber-800 mb-1">What's New:</p>
                      <p className="text-xs text-amber-700 whitespace-pre-wrap max-h-32 overflow-y-auto">
                        {updateInfo.releaseNotes}
                      </p>
                    </div>
                  )}
                </div>
              )}
              
              {updateInfo && !updateInfo.hasUpdate && !checkingUpdate && (
                <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">✅</span>
                    <p className="text-sm text-green-700 font-medium">You have the latest version</p>
                  </div>
                </div>
              )}
              
              {/* Download Progress */}
              {downloadingUpdate && (
                <div className="mb-4">
                  <div className="flex justify-between text-xs text-gray-600 mb-1">
                    <span>Downloading update...</span>
                    <span>{downloadProgress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                    <div 
                      className="bg-indigo-600 h-2 rounded-full transition-all duration-300 ease-out" 
                      style={{ width: `${downloadProgress}%` }}
                    ></div>
                  </div>
                  {downloadProgress === 100 && (
                    <p className="text-xs text-green-600 mt-1 text-center">Download complete! Installing...</p>
                  )}
                </div>
              )}
              
              {/* Update Error */}
              {updateError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-700">❌ {updateError}</p>
                  <button
                    onClick={() => setUpdateError(null)}
                    className="text-xs text-red-600 hover:text-red-800 mt-1"
                  >
                    Dismiss
                  </button>
                </div>
              )}
              
              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => handleCheckUpdates(false)}
                  disabled={checkingUpdate || downloadingUpdate}
                  className="flex-1 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  {checkingUpdate ? (
                    <>
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                      </svg>
                      Checking...
                    </>
                  ) : (
                    '🔍 Check for Updates'
                  )}
                </button>
                
                {updateInfo?.hasUpdate && !downloadingUpdate && updateStatus?.status !== 'downloaded' && (
                  <button
                    onClick={handleDownloadUpdate}
                    disabled={checkingUpdate || downloadingUpdate}
                    className="flex-1 py-2.5 px-4 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    {downloadingUpdate ? (
                      <>
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                        </svg>
                        Downloading...
                      </>
                    ) : (
                      `⬇️ Download v${updateInfo.latestVersion}`
                    )}
                  </button>
                )}
                
                {updateStatus?.status === 'downloaded' && (
                  <button
                    onClick={handleInstallUpdate}
                    className="flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <span>📦</span>
                    Install Now
                  </button>
                )}
              </div>
              
              <p className="text-xs text-gray-400 mt-4 text-center">
                🔒 Your database is automatically backed up before any update
              </p>
              <p className="text-xs text-gray-400 mt-1 text-center">
                Updates are downloaded from GitHub and installed automatically
              </p>
            </div>
            
            {/* 👤 Account Settings Section */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white text-xl">👤</div>
                <div>
                  <h2 className="font-bold text-gray-900">Account Settings</h2>
                  <p className="text-xs text-gray-500">Update your login credentials</p>
                </div>
              </div>
              
              <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Logged in as</span>
                  <span className="font-semibold text-gray-900">{user?.username}</span>
                </div>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-sm text-gray-600">Role</span>
                  <span className="px-2 py-0.5 bg-gray-200 rounded text-xs font-medium capitalize">{user?.role}</span>
                </div>
                {profile?.email && (
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-sm text-gray-600">Email</span>
                    <span className="text-sm text-gray-700">{profile.email}</span>
                  </div>
                )}
              </div>
              
              <form onSubmit={handleUpdateCredentials} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">
                    Current Password <span className="text-red-500">*</span>
                  </label>
                  <input 
                    type="password" 
                    value={accountForm.currentPassword} 
                    onChange={(e) => handleAccountChange('currentPassword', e.target.value)} 
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" 
                    placeholder="••••••••" 
                    required 
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">
                    New Username (Optional)
                  </label>
                  <input 
                    type="text" 
                    value={accountForm.newUsername} 
                    onChange={(e) => handleAccountChange('newUsername', e.target.value)} 
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" 
                    placeholder="Enter new username" 
                    minLength={3} 
                  />
                  <p className="text-xs text-gray-400 mt-1">Min 3 characters, leave empty to keep current</p>
                </div>
                
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">
                    New Password (Optional)
                  </label>
                  <input 
                    type="password" 
                    value={accountForm.newPassword} 
                    onChange={(e) => handleAccountChange('newPassword', e.target.value)} 
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" 
                    placeholder="••••••••" 
                    minLength={6} 
                  />
                  <p className="text-xs text-gray-400 mt-1">Min 6 characters, leave empty to keep current</p>
                </div>
                
                {accountForm.newPassword && (
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">
                      Confirm New Password <span className="text-red-500">*</span>
                    </label>
                    <input 
                      type="password" 
                      value={accountForm.confirmNewPassword} 
                      onChange={(e) => handleAccountChange('confirmNewPassword', e.target.value)} 
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" 
                      placeholder="••••••••" 
                      required={!!accountForm.newPassword} 
                    />
                  </div>
                )}
                
                <button 
                  type="submit" 
                  disabled={accountLoading} 
                  className="w-full py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {accountLoading ? (
                    <>
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                      </svg>
                      Updating...
                    </>
                  ) : (
                    '💾 Update Credentials'
                  )}
                </button>
              </form>
            </div>

            {/* 💾 Database Backup Section */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center text-white text-xl">💾</div>
                <div>
                  <h2 className="font-bold text-gray-900">Database Backup</h2>
                  <p className="text-xs text-gray-500">Back up database and important files to your Desktop</p>
                </div>
              </div>
              
              <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600 leading-relaxed">
                  Click the button below to create a full backup of your POS system data. A folder named <code className="font-mono font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">database_posSystem</code> will be created automatically on your Desktop containing:
                </p>
                <ul className="text-xs text-gray-500 mt-2 list-disc list-inside space-y-1">
                  <li>Active SQLite database file (<code className="font-mono">pos_database.sqlite</code>)</li>
                  <li>Uploaded invoice and purchase images (<code className="font-mono">uploads/</code>)</li>
                  <li>Automated database backup history (<code className="font-mono">backups/</code>)</li>
                </ul>
              </div>

              {backupPath && (
                <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                  <p className="text-xs font-bold text-emerald-800">✅ Backup Created Successfully!</p>
                  <p className="text-xs text-emerald-700 mt-1 truncate" title={backupPath}>
                    Location: {backupPath}
                  </p>
                </div>
              )}

              <button
                onClick={handleCreateBackup}
                disabled={backupLoading}
                className="w-full py-3 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-bold rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {backupLoading ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                    </svg>
                    Creating Backup...
                  </>
                ) : (
                  '💾 Create Desktop Backup'
                )}
              </button>
            </div>
            
          </div>
          
          {/* System Info Section (Admin only) */}
          {isAdmin && (
            <div className="mt-6">
              <button
                onClick={() => {
                  if (!systemInfo) fetchSystemInfo();
                  setShowSystemInfo(!showSystemInfo);
                }}
                className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
              >
                <span>🖥️</span>
                <span>{showSystemInfo ? 'Hide' : 'Show'} System Information</span>
              </button>
              
              {showSystemInfo && systemInfo && (
                <div className="mt-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <h3 className="font-medium text-gray-900 mb-2">System Diagnostics</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <span className="text-gray-600">Platform:</span>
                    <span className="text-gray-900">{systemInfo.platform}</span>
                    <span className="text-gray-600">Architecture:</span>
                    <span className="text-gray-900">{systemInfo.arch}</span>
                    <span className="text-gray-600">Node Version:</span>
                    <span className="text-gray-900">{systemInfo.nodeVersion}</span>
                    <span className="text-gray-600">Memory Total:</span>
                    <span className="text-gray-900">{formatBytes(systemInfo.memory?.total)}</span>
                    <span className="text-gray-600">Memory Free:</span>
                    <span className="text-gray-900">{formatBytes(systemInfo.memory?.free)}</span>
                    <span className="text-gray-600">Database Size:</span>
                    <span className="text-gray-900">{formatBytes(systemInfo.database?.size * 1024)}</span>
                    <span className="text-gray-600">Uptime:</span>
                    <span className="text-gray-900">{Math.floor(systemInfo.uptime / 60)} minutes</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Settings;