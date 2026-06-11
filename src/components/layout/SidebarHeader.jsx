const SidebarHeader = ({ collapsed, onToggle, isDesktop, onCloseMobile }) => {
  return (
    <div className={`flex items-center ${collapsed ? 'justify-center' : 'justify-between'} px-4 py-4 border-b border-sidebar-border`}>
      <div className="flex items-center gap-3">
        {/* Logo */}
        <div className="flex-shrink-0">
          <img 
            src="Logo.jpg" 
            alt="SAMAGI" 
            className="w-10 h-10 object-contain rounded-lg"
            loading="lazy"
          />
        </div>
        
        {!collapsed && (
          <div className="min-w-0">
            <h1 className="text-lg font-bold text-white tracking-tight truncate">
              Samagi Motors
            </h1>
            <p className="text-xs text-primary-400/90">POS System</p>
          </div>
        )}
      </div>
      
      {/* Desktop: Collapse Toggle | Mobile: Close Button */}
      {isDesktop ? (
        <button
          onClick={onToggle}
          className="p-2 rounded-lg text-sidebar-text hover:text-white hover:bg-primary-600/20 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-400"
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
      ) : !collapsed && (
        /* Mobile Close Button - Only show when expanded */
        <button
          onClick={onCloseMobile}
          className="p-2 rounded-lg text-sidebar-text hover:text-white hover:bg-red-500/20 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-400 lg:hidden"
          aria-label="Close navigation menu"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
};

export default SidebarHeader;