import { useAuth } from '../../contexts/AuthContext';
import { FaSignOutAlt } from 'react-icons/fa';

const SidebarFooter = ({ collapsed, isDesktop }) => {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    // Optional: Close mobile sidebar after logout
    if (!isDesktop) {
      // sidebar close logic handled in parent if needed
    }
  };

  return (
    <div 
      className={`px-4 py-4 border-t border-sidebar-border ${collapsed ? 'text-center' : ''}`}
      role="contentinfo"
    >
      {!collapsed ? (
        <>
          {/* User Profile Info */}
          <div className="flex items-center gap-3 mb-4 pb-4 border-b border-sidebar-border">
            <div 
              className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 
                flex items-center justify-center text-white font-bold shadow-lg shadow-primary-500/25 flex-shrink-0"
              aria-hidden="true"
            >
              {user?.full_name?.charAt(0)?.toUpperCase() || user?.username?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate" title={user?.full_name || user?.username}>
                {user?.full_name || user?.username}
              </p>
              <p className="text-xs text-primary-400/90 capitalize">{user?.role}</p>
            </div>
          </div>
          
          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-400 
              hover:bg-red-500/10 hover:text-red-300 transition-all duration-200
              focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-inset"
            aria-label="Logout from system"
          >
            <FaSignOutAlt className="text-lg shrink-0" aria-hidden="true" />
            <span className="font-medium text-sm">Logout</span>
          </button>
        </>
      ) : (
        <button
          onClick={handleLogout}
          className="w-full p-3 rounded-lg text-red-400 hover:bg-red-500/10 hover:text-red-300 
            transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-400 flex items-center justify-center"
          title="Logout"
          aria-label="Logout from system"
        >
          <FaSignOutAlt className="text-lg shrink-0" aria-hidden="true" />
        </button>
      )}
    </div>
  );
};

export default SidebarFooter;