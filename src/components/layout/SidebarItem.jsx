import { useState, memo } from 'react';
import { NavLink, useLocation } from 'react-router-dom';

const SidebarItem = memo(({ item, collapsed, role, isDesktop, onNavigate }) => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  
  const isActive = item.path 
    ? location.pathname === item.path
    : item.children?.some(child => location.pathname.startsWith(child.path));
  
  if (item.roles && !item.roles.includes(role)) return null;

  // Collapsible Item
  if (item.children) {
    return (
      <div className="mb-1">
        <button
          onClick={() => isDesktop && !collapsed && setIsOpen(!isOpen)}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200
            ${isActive && !collapsed 
              ? 'bg-primary-700/40 text-white border-l-2 border-primary-400' 
              : 'text-sidebar-text hover:bg-sidebar-hover hover:text-sidebar-textHover'
            }
            ${collapsed ? 'justify-center' : 'justify-between'}
            focus:outline-none focus:ring-2 focus:ring-primary-400 focus:ring-inset
          `}
          title={collapsed ? item.label : undefined}
          aria-expanded={isOpen}
          disabled={collapsed || !isDesktop}
        >
          <div className="flex items-center gap-3">
            <span className={`text-lg flex-shrink-0 ${isActive ? 'text-primary-300' : ''}`}>{item.icon}</span>
            {!collapsed && <span className="font-medium text-sm truncate">{item.label}</span>}
          </div>
          
          {!collapsed && isDesktop && (
            <svg className={`w-4 h-4 text-sidebar-text transition-transform duration-200 flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          )}
        </button>
        
        {!collapsed && isOpen && isDesktop && (
          <div className="ml-4 mt-1 space-y-1 border-l-2 border-sidebar-border pl-3 animate-fadeIn">
            {item.children.map((child, idx) => {
              if (child.roles && !child.roles.includes(role)) return null;
              return (
                <NavLink
                  key={`${child.label}-${idx}`}
                  to={child.path}
                  className={({ isActive }) =>
                    `block px-4 py-2 rounded-lg text-sm transition-all duration-200
                    ${isActive 
                      ? 'bg-primary-600/30 text-primary-200 font-medium' 
                      : 'text-sidebar-text hover:text-sidebar-textHover hover:bg-sidebar-hover/50'
                    }`
                  }
                  onClick={() => {
                    onNavigate?.();
                    if (!isDesktop) setIsOpen(false);
                  }}
                >
                  {child.label}
                </NavLink>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // Simple Item
  return (
    <NavLink
      to={item.path}
      className={({ isActive }) =>
        `flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 mb-1 relative group
        ${isActive 
          ? 'bg-primary-700/40 text-white border-l-2 border-primary-400' 
          : 'text-sidebar-text hover:bg-sidebar-hover hover:text-sidebar-textHover'
        }
        ${collapsed ? 'justify-center' : ''}
        focus:outline-none focus:ring-2 focus:ring-primary-400 focus:ring-inset
        `
      }
      title={collapsed ? (item.badge ? `${item.label} (${item.badge} items in cart)` : item.label) : undefined}
      onClick={onNavigate}
    >
      <div className="relative flex items-center justify-center flex-shrink-0">
        <span className={`text-lg ${isActive ? 'text-primary-300' : ''}`}>{item.icon}</span>
        {collapsed && item.badge && (
          <span className="absolute -top-2 -right-2.5 bg-emerald-500 text-white text-[10px] font-extrabold px-1 min-w-[16px] h-4 rounded-full flex items-center justify-center shadow-md animate-pulse">
            {item.badge}
          </span>
        )}
      </div>
      {!collapsed && (
        <div className="flex items-center justify-between flex-1 min-w-0">
          <span className="font-medium text-sm truncate">{item.label}</span>
          {item.badge && (
            <span className="ml-2 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold px-2 py-0.5 rounded-full shadow-sm flex items-center justify-center transition-all animate-in fade-in">
              {item.badge}
            </span>
          )}
        </div>
      )}
    </NavLink>
  );
});

SidebarItem.displayName = 'SidebarItem';
export default SidebarItem;