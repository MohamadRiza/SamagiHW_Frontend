import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import SidebarHeader from './SidebarHeader';
import SidebarItem from './SidebarItem';
import SidebarFooter from './SidebarFooter';
import { 
  FaHome, 
  FaCashRegister, 
  FaBox, 
  FaShoppingCart, 
  FaUsers, 
  FaMoneyBillWave, 
  FaMoneyCheck, 
  FaChartBar, 
  FaCog 
} from 'react-icons/fa';

const getMenuItems = (role) => [
  { label: 'Dashboard', icon: <FaHome />, path: '/dashboard', roles: ['admin', 'staff'] },
  {
    label: 'Billing', icon: <FaCashRegister />, roles: ['admin', 'staff'],
    children: [
      { label: 'Cash Bill', path: '/billing/cash', roles: ['admin', 'staff'] },
      { label: 'Credit Bill', path: '/billing/credit', roles: ['admin', 'staff'] },
    ]
  },
  { label: 'Stock Management', icon: <FaBox />, path: '/stock', roles: ['admin'] },
  { label: 'Purchases', icon: <FaShoppingCart />, path: '/purchases', roles: ['admin', 'staff'] },
  {
    label: 'Credit Customers', icon: <FaUsers />, roles: ['admin', 'staff'],
    children: [
      { label: 'Pending Bills', path: '/customers/pending', roles: ['admin', 'staff'] },
      { label: 'Paid Bills', path: '/customers/paid', roles: ['admin', 'staff'] },
      { label: 'Customer List', path: '/customers/list', roles: ['admin'] },
    ]
  },
  { label: 'Expenses', icon: <FaMoneyBillWave />, path: '/expenses', roles: ['admin'] },
  { label: 'Cheques', icon: <FaMoneyCheck />, path: '/cheques', roles: ['admin', 'staff'] },
  {
    label: 'Reports', icon: <FaChartBar />, path: '/reports', roles: ['admin', 'staff'],
    children: [
      { label: 'Today Summary', path: '/reports/today', roles: ['admin', 'staff'] },
      { label: 'Sales Report', path: '/reports/sales', roles: ['admin'] },
      { label: 'Stock Report', path: '/reports/stock', roles: ['admin'] },
    ]
  },
  { label: 'Settings', icon: <FaCog />, path: '/settings', roles: ['admin'] },
];

const Sidebar = () => {
  const { user } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024);
  
  const mobileOpenRef = useRef(mobileOpen);
  const isDesktopRef = useRef(isDesktop);

  useEffect(() => { mobileOpenRef.current = mobileOpen; }, [mobileOpen]);
  useEffect(() => { isDesktopRef.current = isDesktop; }, [isDesktop]);

  // Responsive handler
  useEffect(() => {
    const handleResize = () => {
      const desktop = window.innerWidth >= 1024;
      setIsDesktop(desktop);
      if (!desktop) {
        setCollapsed(true);
        setMobileOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 🔑 FIXED ESC HANDLER - Works on Desktop & Mobile
  useEffect(() => {
    const handleGlobalEsc = (e) => {
      if (e.key === 'Escape') {
        // 🛑 Ignore ESC if user is typing in a form/input
        const activeEl = document.activeElement;
        const isTyping = activeEl?.tagName === 'INPUT' || 
                         activeEl?.tagName === 'TEXTAREA' || 
                         activeEl?.tagName === 'SELECT' || 
                         activeEl?.isContentEditable;
        if (isTyping) return;

        e.preventDefault();
        e.stopPropagation();

        if (!isDesktopRef.current) {
          // 📱 Mobile: Close slide-out sidebar
          if (mobileOpenRef.current) setMobileOpen(false);
        } else {
          // 🖥️ Desktop: Toggle sidebar Open/Close
          setCollapsed(prev => !prev);
        }
      }
    };

    // Attach with capture phase to run before any other listener
    window.addEventListener('keydown', handleGlobalEsc, { capture: true, passive: false });
    return () => window.removeEventListener('keydown', handleGlobalEsc, { capture: true, passive: false });
  }, []); // Runs once, never unmounts/re-attaches

  // Close mobile sidebar on desktop transition
  useEffect(() => {
    if (!isDesktop) setMobileOpen(false);
  }, [isDesktop]);

  const menuItems = getMenuItems(user?.role);

  return (
    <>
      {/* Mobile Overlay */}
      {mobileOpen && !isDesktop && (
        <div 
          className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-sm transition-opacity duration-300"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}
      
      {/* Sidebar */}
      <aside
        id="sidebar"
        className={`fixed lg:sticky top-0 left-0 h-screen shrink-0 z-50 flex flex-col
          bg-sidebar border-r border-sidebar-border
          transition-all duration-300 ease-in-out shadow-xl outline-none
          ${collapsed ? 'w-20' : 'w-64'}
          ${!isDesktop ? (mobileOpen ? 'translate-x-0' : '-translate-x-full') : 'translate-x-0'}
        `}
        role="navigation"
        aria-label="Main navigation"
      >
        <SidebarHeader 
          collapsed={collapsed} 
          onToggle={() => isDesktop && setCollapsed(!collapsed)}
          isDesktop={isDesktop}
          onCloseMobile={() => setMobileOpen(false)}
        />
        
        <nav className="flex-1 px-3 py-4 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-sidebar-border">
          {menuItems.map((item, index) => (
            <SidebarItem 
              key={`${item.label}-${index}`} 
              item={item} 
              collapsed={collapsed} 
              role={user?.role}
              isDesktop={isDesktop}
              onNavigate={() => !isDesktop && setMobileOpen(false)}
            />
          ))}
        </nav>
        
        <SidebarFooter collapsed={collapsed} isDesktop={isDesktop} />
      </aside>
      
      {/* Mobile Toggle FAB */}
      {!isDesktop && !mobileOpen && (
        <button
          onClick={() => setMobileOpen(true)}
          className="fixed bottom-6 right-6 z-30 w-14 h-14 rounded-full 
            bg-primary-600 text-white shadow-lg shadow-primary-500/40 
            flex items-center justify-center hover:bg-primary-700 
            hover:scale-105 active:scale-95 transition-all duration-200
            focus:outline-none focus:ring-2 focus:ring-primary-400 focus:ring-offset-2"
          aria-label="Open navigation menu"
          aria-expanded={mobileOpen}
          aria-controls="sidebar"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      )}
    </>
  );
};

export default Sidebar;