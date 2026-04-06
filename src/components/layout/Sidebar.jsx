import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import SidebarHeader from './SidebarHeader';
import SidebarItem from './SidebarItem';
import SidebarFooter from './SidebarFooter';

const getMenuItems = (role) => [
  {
    label: 'Dashboard',
    icon: '🏠',
    path: '/dashboard',
    roles: ['admin', 'staff']
  },
  {
    label: 'Billing',
    icon: '💰',
    roles: ['admin', 'staff'],
    children: [
      { label: 'Cash Bill', path: '/billing/cash', roles: ['admin', 'staff'] },
      { label: 'Credit Bill', path: '/billing/credit', roles: ['admin', 'staff'] },
    ]
  },
  {
    label: 'Stock Management',
    icon: '📦',
    path: '/stock',
    roles: ['admin']
  },
  {
    label: 'Credit Customers',
    icon: '👤',
    roles: ['admin', 'staff'],
    children: [
      { label: 'Pending Bills', path: '/customers/pending', roles: ['admin', 'staff'] },
      { label: 'Paid Bills', path: '/customers/paid', roles: ['admin', 'staff'] },
      { label: 'Customer List', path: '/customers/list', roles: ['admin'] },
    ]
  },
  {
    label: 'Expenses',
    icon: '💸',
    path: '/expenses',
    roles: ['admin']
  },
  {
    label: 'Cheques',
    icon: '🧾',
    path: '/cheques',
    roles: ['admin', 'staff']
  },
  {
    label: 'Reports',
    icon: '📊',
    path: '/reports',
    roles: ['admin', 'staff'],
    children: [
      { label: 'Today Summary', path: '/reports/today', roles: ['admin', 'staff'] },
      { label: 'Sales Report', path: '/reports/sales', roles: ['admin'] },
      { label: 'Stock Report', path: '/reports/stock', roles: ['admin'] },
    ]
  },
  {
    label: 'Settings',
    icon: '⚙',
    path: '/settings',
    roles: ['admin']
  },
];

const Sidebar = () => {
  const { user } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setCollapsed(true);
        setMobileOpen(false);
      } else {
        setMobileOpen(false);
      }
    };
    
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const menuItems = getMenuItems(user?.role);

  return (
    <>
      {/* Mobile Overlay */}
      {mobileOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}
      
      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 flex flex-col
          bg-sidebar DEFAULT border-r border-sidebar-border
          transition-all duration-300 ease-in-out shadow-sidebar-lg
          ${collapsed ? 'w-20' : 'w-64'}
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Header */}
        <SidebarHeader 
          collapsed={collapsed} 
          onToggle={() => setCollapsed(!collapsed)} 
        />
        
        {/* Menu Items */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto">
          {menuItems.map((item, index) => (
            <SidebarItem 
              key={index} 
              item={item} 
              collapsed={collapsed} 
              role={user?.role}
            />
          ))}
        </nav>
        
        {/* Footer */}
        <SidebarFooter collapsed={collapsed} />
      </aside>
      
      {/* Mobile Toggle Button */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed bottom-6 right-6 lg:hidden z-30 w-14 h-14 rounded-full 
          bg-primary-600 text-white shadow-lg shadow-primary-500/30 
          flex items-center justify-center hover:bg-primary-700 
          hover:scale-105 transition-all duration-200"
        aria-label="Open menu"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
    </>
  );
};

export default Sidebar;