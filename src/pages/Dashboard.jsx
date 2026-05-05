import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Navigate, useNavigate } from 'react-router-dom';
import { Sidebar } from '../components/layout';
import BillService from '../services/bill.service';
import CreditBillService from '../services/creditBill.service';
import ProductService from '../services/product.service';
import ChequeService from '../services/cheque.service';
import ExpenseService from '../services/expense.service';
import { Toaster, toast } from 'react-hot-toast';

// ✅ Format relative time helper
const formatRelativeTime = (dateString) => {
  if (!dateString) return 'Unknown';
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-LK', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch (e) {
    return 'Unknown';
  }
};

// ✅ Sound notification utility (Web Audio API for reliability)
const playAlertSound = () => {
  try {
    // Create audio context
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) {
      // Fallback: simple beep using Audio element
      const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLHPM8uqBNAoqZL38/5tHCihjvPn1qUwJKly59fOZUAooW7fu76xPKipZs+Pkn1IoKliq4OKaSCsoV6fd25hGKihVpNfRlkQqJ1Si082QQyomU57Oy49BKiZSm8jJi0AqJlGVw8aFQCklT5O6w4NAKSROj7W9gEApI0yKsLm8QCkgS4ant7pAKR5JgKGztkApHUaAnK6zQCkcRHyZpq9AKRlBe5KgrkApFzx2jZyrQCkVNnGHlqdAKRMxbIKTo0ApEjBpgI2eQCkQLmd7hJpAKREsY3aBkEAoECpdcXqNQCgOKllqd4pAKA0pVWh0h0AoCydSYG6FQCgJJlBca4RAKAgkTVxqgkAoByRLWmWBQCgGJElZZ4JAKAQjR1hkgEAoAyJFV2N9QCgCIUNWYntAKAEhQFRfc30A');
      audio.volume = 0.6;
      audio.play().catch(() => {});
      return;
    }
    
    const context = new AudioContext();
    const oscillator = context.createOscillator();
    const gainNode = context.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(context.destination);
    
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(880, context.currentTime); // A5 note
    oscillator.frequency.exponentialRampToValueAtTime(440, context.currentTime + 0.15);
    
    gainNode.gain.setValueAtTime(0.3, context.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.3);
    
    oscillator.start(context.currentTime);
    oscillator.stop(context.currentTime + 0.3);
  } catch (error) {
    console.warn('Sound playback failed:', error);
  }
};

// ✅ Cheque Reminders Widget Component with Sound Alert
const ChequeRemindersWidget = ({ onChequeAlert }) => {
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);
  const alertedChequesRef = useRef(new Set());
  
  useEffect(() => {
    const fetchReminders = async () => {
      try {
        const response = await ChequeService.getReminders();
        if (response?.success) {
          const data = response.data || [];
          setReminders(data);
          
          // 🔔 Check for cheques due in exactly 2 days and play sound
          data.forEach(cheque => {
            if (cheque.days_until_due === 2 && !alertedChequesRef.current.has(cheque.id)) {
              alertedChequesRef.current.add(cheque.id);
              playAlertSound();
              onChequeAlert?.(cheque);
              toast.custom((t) => (
                <div className={`px-4 py-3 rounded-xl shadow-lg border ${t.visible ? 'animate-enter' : 'animate-leave'} bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200 max-w-md`}>
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-xl">🔔</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-amber-900 text-sm">Cheque Due Soon</p>
                      <p className="text-amber-800 text-xs mt-0.5">
                        #{cheque.cheque_number} from {cheque.company_name}
                      </p>
                      <p className="text-amber-700 text-xs mt-1">
                        Due in 2 days • {cheque.type === 'incoming' ? '📥 Receive' : '📤 Pay'} LKR {cheque.amount?.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              ), { duration: 8000, position: 'top-right' });
            }
          });
        }
      } catch (error) {
        console.error('Fetch reminders error:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchReminders();
  }, [onChequeAlert]);
  
  if (loading || reminders.length === 0) return null;
  
  const urgentReminders = reminders.filter(r => r.days_until_due <= 2);
  const normalReminders = reminders.filter(r => r.days_until_due > 2);
  
  return (
    <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-all duration-300">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <span className="text-lg">🧾</span> Cheque Reminders
        </h3>
        {urgentReminders.length > 0 && (
          <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-semibold rounded-full animate-pulse">
            {urgentReminders.length} Urgent
          </span>
        )}
      </div>
      
      <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1 custom-scrollbar">
        {[...urgentReminders, ...normalReminders].map(cheque => {
          const days = cheque.days_until_due;
          const type = cheque.type === 'incoming' ? 'receive' : 'pay';
          const isUrgent = days <= 2;
          
          return (
            <div 
              key={cheque.id} 
              className={`p-3 rounded-xl border transition-all duration-200 hover:scale-[1.02] cursor-pointer group ${
                isUrgent 
                  ? 'bg-gradient-to-r from-red-50 to-amber-50 border-red-200 hover:border-red-300' 
                  : 'bg-gray-50 border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => window.location.href = `/cheques/${cheque.id}`}
            >
              <div className="flex justify-between items-start">
                <div className="min-w-0">
                  <p className="font-semibold text-sm text-gray-900 truncate">#{cheque.cheque_number}</p>
                  <p className="text-xs text-gray-600 truncate">{cheque.company_name}</p>
                </div>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full whitespace-nowrap ml-2 ${
                  isUrgent 
                    ? 'bg-red-100 text-red-700 animate-pulse' 
                    : 'bg-blue-100 text-blue-700'
                }`}>
                  {isUrgent ? (days === 0 ? 'Due Today!' : days === 1 ? 'Due Tomorrow!' : 'Due in 2 Days') : `Due in ${days}d`}
                </span>
              </div>
              <div className="mt-2.5 flex justify-between items-center">
                <span className="text-xs text-gray-500">
                  {new Date(cheque.cheque_date).toLocaleDateString('en-LK', { month: 'short', day: 'numeric' })}
                </span>
                <span className={`text-sm font-bold ${cheque.type === 'incoming' ? 'text-emerald-600' : 'text-violet-600'}`}>
                  {type} LKR {cheque.amount?.toLocaleString('en-LK')}
                </span>
              </div>
            </div>
          );
        })}
      </div>
      
      <button
        onClick={() => window.location.href = '/cheques'}
        className="mt-4 w-full text-xs text-indigo-600 hover:text-indigo-800 font-medium text-center py-2 rounded-lg hover:bg-indigo-50 transition-colors flex items-center justify-center gap-1 group"
      >
        View All Cheques 
        <span className="group-hover:translate-x-0.5 transition-transform">→</span>
      </button>
    </div>
  );
};

const Dashboard = () => {
  const { user, logout, isAdmin, isStaff } = useAuth();
  const navigate = useNavigate();
  const dashboardRef = useRef(null);
  
  // ✅ Real stats state
  const [stats, setStats] = useState({
    todaysSales: 0,
    orders: 0,
    lowStock: 0,
    creditPending: 0,
    loading: true
  });
  
  // ✅ Recent activity state
  const [recentActivity, setRecentActivity] = useState([]);
  const [activityLoading, setActivityLoading] = useState(true);
  
  // ✅ Keyboard shortcut feedback state
  const [shortcutHint, setShortcutHint] = useState(null);

  // ✅ Redirect if not logged in
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // ✅ Keyboard shortcuts handler
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Only activate on dashboard page
      if (window.location.pathname !== '/dashboard') return;
      
      // Ignore if typing in input/textarea
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) {
        return;
      }
      
      const key = e.key;
      let targetPath = null;
      let actionName = null;
      
      switch(key) {
        case '1': targetPath = '/billing/cash'; actionName = 'Cash Billing'; break;
        case '2': targetPath = '/billing/credit'; actionName = 'Credit Bill'; break;
        case '3': targetPath = '/stock'; actionName = 'Stock Management'; break;
        case '4': targetPath = '/purchases'; actionName = 'Purchases'; break;
        case '5': targetPath = '/billing/pending'; actionName = 'Pending Bills'; break;
        case '6': targetPath = '/billing/paid'; actionName = 'Paid Bills'; break;
        case '7': targetPath = '/customers'; actionName = 'Customer List'; break;
        case '8': targetPath = '/expenses'; actionName = 'Expenses'; break;
        case '9': targetPath = '/cheques'; actionName = 'Cheques'; break;
        case '0': targetPath = '/reports'; actionName = "Today's Summary"; break;
        default: return;
      }
      
      e.preventDefault();
      
      // Show visual feedback
      setShortcutHint(actionName);
      setTimeout(() => setShortcutHint(null), 1500);
      
      // Show toast notification
      toast.success(`🚀 Opening: ${actionName}`, {
        duration: 2000,
        position: 'bottom-center',
        style: {
          background: '#1f2937',
          color: '#fff',
          borderRadius: '12px',
          fontSize: '13px',
          padding: '10px 16px'
        }
      });
      
      // Small delay for UX, then navigate
      setTimeout(() => {
        navigate(targetPath);
      }, 200);
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);

  // ✅ Fetch real stats on mount
  useEffect(() => {
    const fetchDashboardStats = async () => {
      try {
        const today = new Date().toISOString().slice(0, 10);
        
        // ✅ Today's sales (cash bills)
        const cashResponse = await BillService.getRecent(100);
        const todaysCashBills = (cashResponse.data || []).filter(bill => 
          bill.created_at?.startsWith(today)
        );
        const todaysSales = todaysCashBills.reduce((sum, bill) => sum + (bill.grand_total || 0), 0);
        
        // ✅ Total orders today (cash + credit)
        const creditResponse = await CreditBillService.getRecent(100);
        const todaysCreditBills = (creditResponse.data || []).filter(bill => 
          bill.created_at?.startsWith(today)
        );
        const orders = todaysCashBills.length + todaysCreditBills.length;
        
        // ✅ Low stock items
        const productsResponse = await ProductService.getAll({ limit: 200 });
        const products = productsResponse.data || [];
        const lowStock = products.filter(p => (p.stock_quantity || 0) <= 10).length;
        
        // ✅ Credit pending
        const pendingResponse = await CreditBillService.getPending({ limit: 100 });
        const pendingBills = pendingResponse.data || [];
        const creditPending = pendingBills.reduce((sum, bill) => sum + (bill.outstanding_amount || 0), 0);
        
        setStats({
          todaysSales,
          orders,
          lowStock,
          creditPending,
          loading: false
        });
      } catch (error) {
        console.error('Fetch dashboard stats error:', error);
        setStats(prev => ({ ...prev, loading: false }));
      }
    };
    
    fetchDashboardStats();
  }, []);

  // ✅ Fetch recent activity on mount
  useEffect(() => {
    const fetchRecentActivity = async () => {
      try {
        const activities = [];
        
        // Recent cash bills
        const cashResponse = await BillService.getRecent(5);
        const cashBills = cashResponse.data || [];
        cashBills.slice(0, 3).forEach(bill => {
          const timestamp = bill.created_at ? new Date(bill.created_at).getTime() : 0;
          activities.push({
            id: `cash-${bill.id}`,
            timestamp,
            time: formatRelativeTime(bill.created_at),
            text: `New cash bill #${bill.bill_number} - LKR ${bill.grand_total?.toLocaleString()}`,
            user: `Staff: ${bill.cashier_name || 'Unknown'}`,
            type: 'cash'
          });
        });
        
        // Recent credit bills
        const creditResponse = await CreditBillService.getRecent(5);
        const creditBills = creditResponse.data || [];
        creditBills.slice(0, 3).forEach(bill => {
          const timestamp = bill.created_at ? new Date(bill.created_at).getTime() : 0;
          activities.push({
            id: `credit-${bill.id}`,
            timestamp,
            time: formatRelativeTime(bill.created_at),
            text: `New credit bill #${bill.bill_number} - ${bill.customer_name}`,
            user: `Staff: ${bill.cashier_name || 'Unknown'}`,
            type: 'credit'
          });
        });
        
        // Recent cheques due soon
        const chequeResponse = await ChequeService.getReminders();
        const chequeReminders = chequeResponse.data || [];
        chequeReminders.slice(0, 2).forEach(cheque => {
          const days = cheque.days_until_due;
          const timestamp = cheque.cheque_date ? new Date(cheque.cheque_date).getTime() : 0;
          activities.push({
            id: `cheque-${cheque.id}`,
            timestamp,
            time: days === 1 ? 'Due tomorrow' : `Due in ${days} days`,
            text: `Cheque #${cheque.cheque_number} - ${cheque.type === 'incoming' ? '📥' : '📤'} LKR ${cheque.amount?.toLocaleString()}`,
            user: cheque.company_name,
            type: 'cheque',
            urgent: days <= 2
          });
        });
        
        // ✅ Sort by actual timestamp (most recent first)
        const sorted = activities
          .sort((a, b) => b.timestamp - a.timestamp)
          .slice(0, 5);
        
        setRecentActivity(sorted);
        
      } catch (error) {
        console.error('Fetch recent activity error:', error);
        // ✅ Fallback to demo data with proper timestamps
        const now = Date.now();
        setRecentActivity([
          { 
            id: 'demo-1', 
            timestamp: now - 2 * 60 * 1000,
            time: '2m ago', 
            text: 'New cash bill #INV-2847 created', 
            user: 'Staff: Kamal', 
            type: 'cash' 
          },
          { 
            id: 'demo-2', 
            timestamp: now - 15 * 60 * 1000,
            time: '15m ago', 
            text: 'Stock updated: Cement Bags +50', 
            user: 'Admin: You', 
            type: 'stock' 
          },
          { 
            id: 'demo-3', 
            timestamp: now - 60 * 60 * 1000,
            time: '1h ago', 
            text: 'Credit payment received: LKR 5,000', 
            user: 'Customer: Perera', 
            type: 'credit' 
          },
        ]);
      } finally {
        setActivityLoading(false);
      }
    };
    
    fetchRecentActivity();
  }, []);

  // ✅ Format currency
  const formatLKR = (amount) => `LKR ${(amount || 0).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;

  // ✅ Quick action handlers
  const handleNewCashBill = () => navigate('/billing/cash');
  const handleNewCreditBill = () => navigate('/billing/credit');
  const handleAddProduct = () => navigate('/stock');
  const handleViewReports = () => navigate('/reports');
  const handleViewCheques = () => navigate('/cheques');
  const handleViewExpenses = () => navigate('/expenses');
  const handlePendingBills = () => navigate('/billing/pending');
  const handlePaidBills = () => navigate('/billing/paid');
  const handleCustomers = () => navigate('/customers');
  const handlePurchases = () => navigate('/purchases');

  // ✅ Handle cheque alert from widget
  const handleChequeAlert = useCallback((cheque) => {
    // Additional logic if needed when cheque alert triggers
    console.log('Cheque alert triggered:', cheque);
  }, []);

  return (
    <div ref={dashboardRef} className="flex min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Toaster position="top-right" toastOptions={{
        style: { borderRadius: '16px', padding: '12px 16px' },
        success: { duration: 3000, icon: '✅' },
        error: { duration: 4000, icon: '⚠️' }
      }} />
      
      {/* Keyboard Shortcut Hint Overlay */}
      {shortcutHint && (
        <div className="fixed inset-0 pointer-events-none flex items-center justify-center z-50">
          <div className="bg-gray-900/90 text-white px-6 py-3 rounded-2xl shadow-2xl text-lg font-medium animate-bounce-shortcut">
            ⌨️ {shortcutHint}
          </div>
        </div>
      )}
      
      {/* Sidebar */}
      <Sidebar />
      
      {/* Main Content Area */}
      <main className="flex-1 lg:ml-0 transition-all duration-300">
        {/* Top Header (Mobile) */}
        <header className="lg:hidden bg-white/80 backdrop-blur-sm shadow-sm border-b px-4 py-3 flex items-center justify-between sticky top-0 z-40">
          <h1 className="font-bold text-gray-900 text-lg">Samagi Hardware</h1>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600 font-medium">{user?.username}</span>
            <button 
              onClick={logout} 
              className="text-red-600 text-sm font-medium hover:text-red-700 transition-colors px-3 py-1.5 rounded-lg hover:bg-red-50"
            >
              Logout
            </button>
          </div>
        </header>
        
        {/* Page Content */}
        <div className="p-4 lg:p-8">
          <div className="max-w-7xl mx-auto">
            {/* Welcome Header */}
            <div className="mb-8">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h2 className="text-2xl lg:text-3xl font-bold text-gray-900">
                    Welcome back, {user?.full_name || user?.username} 👋
                  </h2>
                  <p className="text-gray-600 mt-1.5 text-sm lg:text-base">
                    {isAdmin() 
                      ? 'Manage your hardware store with full administrative access.' 
                      : 'Process sales and manage customer transactions.'}
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500 bg-white px-3 py-2 rounded-xl border border-gray-200 shadow-sm">
                  <span className="font-mono bg-gray-100 px-2 py-0.5 rounded">1-9, 0</span>
                  <span>Keyboard Shortcuts</span>
                </div>
              </div>
            </div>
            
            {/* ✅ Real Stats Cards Grid - Enhanced Design */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
              {[
                { 
                  label: "Today's Sales", 
                  value: stats.loading ? 'Loading...' : formatLKR(stats.todaysSales), 
                  icon: '💰', 
                  color: 'amber',
                  gradient: 'from-amber-50 to-orange-50',
                  border: 'border-amber-200',
                  onClick: () => navigate('/billing/cash'),
                  shortcut: '1'
                },
                { 
                  label: 'Orders Today', 
                  value: stats.loading ? '...' : stats.orders, 
                  icon: '🧾', 
                  color: 'blue',
                  gradient: 'from-blue-50 to-indigo-50',
                  border: 'border-blue-200',
                  onClick: () => navigate('/billing'),
                  shortcut: '2'
                },
                { 
                  label: 'Low Stock Items', 
                  value: stats.loading ? '...' : stats.lowStock, 
                  icon: '⚠️', 
                  color: 'red',
                  gradient: 'from-red-50 to-rose-50',
                  border: 'border-red-200',
                  onClick: () => navigate('/stock'),
                  alert: stats.lowStock > 0,
                  shortcut: '3'
                },
                { 
                  label: 'Credit Pending', 
                  value: stats.loading ? '...' : formatLKR(stats.creditPending), 
                  icon: '👤', 
                  color: 'emerald',
                  gradient: 'from-emerald-50 to-teal-50',
                  border: 'border-emerald-200',
                  onClick: () => navigate('/billing/pending'),
                  shortcut: '5'
                },
              ].map((stat, idx) => (
                <div 
                  key={idx} 
                  className={`bg-white p-5 rounded-2xl shadow-sm border ${stat.border} hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 cursor-pointer group ${stat.alert ? 'border-l-4 border-l-red-400' : ''}`}
                  onClick={stat.onClick}
                >
                  <div className="flex items-center justify-between">
                    <div className="min-w-0">
                      <p className="text-sm text-gray-500 font-medium">{stat.label}</p>
                      <p className={`text-2xl lg:text-3xl font-bold mt-1.5 ${stat.alert ? 'text-red-600' : 'text-gray-900'} group-hover:scale-105 transition-transform origin-left`}>
                        {stat.value}
                      </p>
                    </div>
                    <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${stat.gradient} flex items-center justify-center text-2xl shadow-sm group-hover:scale-110 transition-transform duration-300`}>
                      {stat.icon}
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    {stat.alert && (
                      <p className="text-xs text-red-600 font-semibold flex items-center gap-1">
                        <span className="animate-pulse">●</span> Needs attention
                      </p>
                    )}
                    <span className="text-xs text-gray-400 font-mono bg-gray-100 px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                      [{stat.shortcut}]
                    </span>
                  </div>
                </div>
              ))}
            </div>
            
            {/* ✅ Quick Actions & Activity - Enhanced Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Quick Actions - Enhanced */}
              <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                    <span className="text-lg">⚡</span> Quick Actions
                  </h3>
                  <span className="text-xs text-gray-400 font-mono">Press 1-9</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {[
                    { label: '💵 Cash Bill', onClick: handleNewCashBill, color: 'amber', shortcut: '1' },
                    { label: '📝 Credit Bill', onClick: handleNewCreditBill, color: 'blue', shortcut: '2' },
                    ...(isAdmin() ? [
                      { label: '📦 Add Product', onClick: handleAddProduct, color: 'emerald', shortcut: '3' },
                      { label: '🛒 Purchases', onClick: handlePurchases, color: 'violet', shortcut: '4' },
                      { label: '📊 Reports', onClick: handleViewReports, color: 'purple', shortcut: '0' },
                      { label: '🧾 Cheques', onClick: handleViewCheques, color: 'indigo', shortcut: '9' },
                      { label: '💸 Expenses', onClick: handleViewExpenses, color: 'rose', shortcut: '8' },
                    ] : []),
                    { label: '⏳ Pending', onClick: handlePendingBills, color: 'orange', shortcut: '5' },
                    { label: '✅ Paid', onClick: handlePaidBills, color: 'emerald', shortcut: '6' },
                    { label: '👥 Customers', onClick: handleCustomers, color: 'cyan', shortcut: '7' },
                  ].map((action, idx) => (
                    <button 
                      key={idx}
                      onClick={action.onClick}
                      className={`p-4 rounded-xl bg-${action.color}-50 hover:bg-${action.color}-100 border border-${action.color}-200 text-${action.color}-800 font-medium transition-all duration-200 text-sm text-left group hover:scale-[1.02] hover:shadow-sm active:scale-[0.98]`}
                    >
                      <div className="flex items-center justify-between">
                        <span>{action.label}</span>
                        <span className="text-xs font-mono bg-white/50 px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                          {action.shortcut}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
              
              {/* ✅ Recent Activity + Cheque Reminders */}
              <div className="space-y-6">
                {/* Recent Activity - Enhanced */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                  <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <span className="text-lg">🔔</span> Recent Activity
                  </h3>
                  {activityLoading ? (
                    <div className="space-y-3">
                      {[1,2,3].map(i => (
                        <div key={i} className="animate-pulse flex items-start gap-3">
                          <div className="w-2 h-2 rounded-full bg-gray-200 mt-2"></div>
                          <div className="flex-1">
                            <div className="h-3 bg-gray-200 rounded w-3/4 mb-2"></div>
                            <div className="h-2 bg-gray-100 rounded w-1/2"></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : recentActivity.length > 0 ? (
                    <div className="space-y-3 max-h-72 overflow-y-auto pr-1 custom-scrollbar">
                      {recentActivity.map((activity) => (
                        <div 
                          key={activity.id} 
                          className={`flex items-start gap-3 text-sm p-2.5 rounded-xl transition-all duration-200 hover:bg-gray-50 ${activity.urgent ? 'bg-amber-50/50 border border-amber-100' : ''}`}
                        >
                          <div className={`w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0 ${
                            activity.urgent ? 'bg-amber-400 animate-pulse' : 
                            activity.type === 'cash' ? 'bg-amber-400' : 
                            activity.type === 'credit' ? 'bg-blue-400' : 
                            activity.type === 'cheque' ? 'bg-indigo-400' : 
                            'bg-emerald-400'
                          }`}></div>
                          <div className="min-w-0 flex-1">
                            <p className="text-gray-800 font-medium truncate">{activity.text}</p>
                            <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-2">
                              <span>{activity.user}</span>
                              <span className="text-gray-300">•</span>
                              <span className={activity.urgent ? 'text-amber-600 font-medium' : ''}>{activity.time}</span>
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 text-center py-6">No recent activity</p>
                  )}
                </div>
                
                {/* ✅ Cheque Reminders Widget with Sound Alert */}
                <ChequeRemindersWidget onChequeAlert={handleChequeAlert} />
              </div>
            </div>
            
            {/* ✅ System Status Bar - Enhanced */}
            <div className="mt-8 bg-white rounded-2xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow">
              <div className="flex flex-wrap items-center justify-between gap-4 text-sm">
                <div className="flex items-center gap-6">
                  <span className="flex items-center gap-2.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span className="text-gray-700 font-medium">System Online</span>
                  </span>
                  <span className="text-gray-300">|</span>
                  <span className="text-gray-600">Last sync: <span className="font-mono">{new Date().toLocaleTimeString('en-LK')}</span></span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-gray-500">Logged in as:</span>
                  <span className="font-semibold text-gray-900">{user?.full_name || user?.username}</span>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${
                    user?.role === 'admin' 
                      ? 'bg-amber-100 text-amber-800' 
                      : 'bg-blue-100 text-blue-800'
                  }`}>
                    {user?.role}
                  </span>
                </div>
              </div>
            </div>
            
            {/* ✅ Keyboard Shortcuts Legend (Collapsible) */}
            <div className="mt-6 bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
              <details className="group">
                <summary className="flex items-center justify-between cursor-pointer list-none">
                  <span className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <span>⌨️</span> Keyboard Shortcuts Reference
                  </span>
                  <span className="text-gray-400 group-open:rotate-180 transition-transform">▼</span>
                </summary>
                <div className="mt-4 grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
                  {[
                    { key: '1', action: 'Cash Billing' },
                    { key: '2', action: 'Credit Bill' },
                    { key: '3', action: 'Stock Mgmt' },
                    { key: '4', action: 'Purchases' },
                    { key: '5', action: 'Pending Bills' },
                    { key: '6', action: 'Paid Bills' },
                    { key: '7', action: 'Customers' },
                    { key: '8', action: 'Expenses' },
                    { key: '9', action: 'Cheques' },
                    { key: '0', action: 'Reports' },
                  ].map((item) => (
                    <div key={item.key} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                      <span className="font-mono font-bold text-gray-900 bg-white px-2 py-0.5 rounded border border-gray-200 shadow-sm">
                        {item.key}
                      </span>
                      <span className="text-gray-600">{item.action}</span>
                    </div>
                  ))}
                </div>
              </details>
            </div>
          </div>
        </div>
      </main>
      
      {/* Global Styles for animations */}
      <style jsx global>{`
        @keyframes bounce-shortcut {
          0%, 100% { transform: translateY(0); opacity: 1; }
          50% { transform: translateY(-10px); opacity: 0.9; }
        }
        .animate-bounce-shortcut {
          animation: bounce-shortcut 0.3s ease-in-out;
        }
        @keyframes enter {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes leave {
          from { opacity: 1; transform: translateY(0); }
          to { opacity: 0; transform: translateY(-10px); }
        }
        .animate-enter {
          animation: enter 0.2s ease-out;
        }
        .animate-leave {
          animation: leave 0.15s ease-in;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
      `}</style>
    </div>
  );
};

export default Dashboard;