import { useAuth } from '../../contexts/AuthContext';

const SidebarFooter = ({ collapsed }) => {
  const { user, logout } = useAuth();

  return (
    <div className={`px-4 py-4 border-t border-sidebar-border ${collapsed ? 'text-center' : ''}`}>
      {!collapsed ? (
        <>
          {/* User Info */}
          <div className="flex items-center gap-3 mb-4 pb-4 border-b border-sidebar-border">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white font-bold shadow-lg shadow-primary-500/25">
              {user?.full_name?.charAt(0) || user?.username?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{user?.full_name || user?.username}</p>
              <p className="text-xs text-primary-400/90 capitalize">{user?.role}</p>
            </div>
          </div>
          
          {/* Logout Button */}
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all duration-200"
          >
            <span className="text-lg">🚪</span>
            <span className="font-medium text-sm">Logout</span>
          </button>
        </>
      ) : (
        <button
          onClick={logout}
          className="w-full p-3 rounded-lg text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all duration-200"
          title="Logout"
        >
          <span className="text-xl">🚪</span>
        </button>
      )}
    </div>
  );
};

export default SidebarFooter;