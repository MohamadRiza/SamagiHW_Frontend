const SidebarHeader = ({ collapsed, onToggle }) => {
  return (
    <div className={`flex items-center ${collapsed ? 'justify-center' : 'justify-between'} px-4 py-4 border-b border-sidebar-border`}>
      <div className="flex items-center gap-3">
        {/* Logo - Blue Gradient */}
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-lg shadow-primary-500/25">
          <span className="text-white font-bold text-lg">S</span>
        </div>
        
        {!collapsed && (
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight">Samagi Hardware</h1>
            <p className="text-xs text-primary-400/90">POS System</p>
          </div>
        )}
      </div>
      
      {/* Collapse Toggle */}
      <button
        onClick={onToggle}
        className="p-2 rounded-lg text-sidebar-text hover:text-white hover:bg-primary-600/20 transition-all duration-200 hidden lg:flex"
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
          </svg>
        ) : (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
          </svg>
        )}
      </button>
    </div>
  );
};

export default SidebarHeader;