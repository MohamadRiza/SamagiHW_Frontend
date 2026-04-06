import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';

const SidebarItem = ({ item, collapsed, role }) => {
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
          onClick={() => !collapsed && setIsOpen(!isOpen)}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200
            ${isActive && !collapsed 
              ? 'bg-primary-700/40 text-white border-l-2 border-primary-400' 
              : 'text-sidebar-text hover:bg-sidebar-hover hover:text-sidebar-textHover'
            }
            ${collapsed ? 'justify-center' : 'justify-between'}
          `}
          title={collapsed ? item.label : undefined}
        >
          <div className="flex items-center gap-3">
            <span className={`text-lg ${isActive ? 'text-primary-300' : ''}`}>{item.icon}</span>
            {!collapsed && <span className="font-medium text-sm">{item.label}</span>}
          </div>
          
          {!collapsed && (
            <svg 
              className={`w-4 h-4 text-sidebar-text transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          )}
        </button>
        
        {/* Submenu */}
        {!collapsed && isOpen && (
          <div className="ml-4 mt-1 space-y-1 border-l-2 border-sidebar-border pl-3">
            {item.children.map((child, idx) => {
              if (child.roles && !child.roles.includes(role)) return null;
              
              return (
                <NavLink
                  key={idx}
                  to={child.path}
                  className={({ isActive }) =>
                    `block px-4 py-2 rounded-lg text-sm transition-all duration-200
                    ${isActive 
                      ? 'bg-primary-600/30 text-primary-200 font-medium' 
                      : 'text-sidebar-text hover:text-sidebar-textHover hover:bg-sidebar-hover/50'
                    }`
                  }
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
        `flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 mb-1
        ${isActive 
          ? 'bg-primary-700/40 text-white border-l-2 border-primary-400' 
          : 'text-sidebar-text hover:bg-sidebar-hover hover:text-sidebar-textHover'
        }
        ${collapsed ? 'justify-center' : ''}
        `
      }
      title={collapsed ? item.label : undefined}
    >
      <span className={`text-lg ${isActive ? 'text-primary-300' : ''}`}>{item.icon}</span>
      {!collapsed && <span className="font-medium text-sm">{item.label}</span>}
    </NavLink>
  );
};

export default SidebarItem;