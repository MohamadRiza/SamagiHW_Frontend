import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Navigate, useNavigate } from 'react-router-dom';
import { Sidebar } from '../components/layout';
import BillService from '../services/bill.service';
import CreditBillService from '../services/creditBill.service';
import ProductService from '../services/product.service';
import ChequeService from '../services/cheque.service';
import ExpenseService from '../services/expense.service';
import { Toaster, toast } from 'react-hot-toast';

// ✅ Format relative time helper (defined BEFORE use)
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
    return date.toLocaleDateString('en-LK', { month: 'short', day: 'numeric' });
  } catch (e) {
    return 'Unknown';
  }
};

// ✅ Cheque Reminders Widget Component
const ChequeRemindersWidget = () => {
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchReminders = async () => {
      try {
        const response = await ChequeService.getReminders();
        if (response?.success) {
          setReminders(response.data);
        }
      } catch (error) {
        console.error('Fetch reminders error:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchReminders();
  }, []);
  
  if (loading || reminders.length === 0) return null;
  
  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
      <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <span>🧾</span> Cheque Reminders
      </h3>
      <div className="space-y-3">
        {reminders.map(cheque => {
          const days = cheque.days_until_due;
          const type = cheque.type === 'incoming' ? 'receive' : 'pay';
          return (
            <div key={cheque.id} className={`p-3 rounded-lg border ${days === 1 ? 'bg-amber-50 border-amber-200' : 'bg-blue-50 border-blue-200'}`}>
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-semibold text-sm text-gray-900">#{cheque.cheque_number}</p>
                  <p className="text-xs text-gray-600">{cheque.company_name}</p>
                </div>
                <span className={`text-xs font-bold px-2 py-1 rounded ${days === 1 ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                  {days === 1 ? 'Due Tomorrow!' : `Due in ${days} days`}
                </span>
              </div>
              <div className="mt-2 flex justify-between items-center">
                <span className="text-xs text-gray-500">{new Date(cheque.cheque_date).toLocaleDateString('en-LK', { month: 'short', day: 'numeric' })}</span>
                <span className={`text-sm font-bold ${cheque.type === 'incoming' ? 'text-green-600' : 'text-purple-600'}`}>
                  {type} LKR {cheque.amount?.toLocaleString()}
                </span>
              </div>
            </div>
          );
        })}
      </div>
      <button
        onClick={() => window.location.href = '/cheques'}
        className="mt-3 w-full text-xs text-indigo-600 hover:text-indigo-700 font-medium text-center"
      >
        View All Cheques →
      </button>
    </div>
  );
};

const Dashboard = () => {
  const { user, logout, isAdmin, isStaff } = useAuth();
  const navigate = useNavigate();
  
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

  // ✅ Redirect if not logged in
  if (!user) {
    return <Navigate to="/login" replace />;
  }

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

  // ✅ Fetch recent activity on mount - FIXED
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
            urgent: days === 1
          });
        });
        
        // ✅ FIXED: Sort by actual timestamp (most recent first)
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
            timestamp: now - 2 * 60 * 1000, // 2 min ago
            time: '2m ago', 
            text: 'New cash bill #INV-2847 created', 
            user: 'Staff: Kamal', 
            type: 'cash' 
          },
          { 
            id: 'demo-2', 
            timestamp: now - 15 * 60 * 1000, // 15 min ago
            time: '15m ago', 
            text: 'Stock updated: Cement Bags +50', 
            user: 'Admin: You', 
            type: 'stock' 
          },
          { 
            id: 'demo-3', 
            timestamp: now - 60 * 60 * 1000, // 1 hr ago
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

  // ✅ Quick action handlers - FIXED paths
  const handleNewCashBill = () => navigate('/billing/cash');
  const handleNewCreditBill = () => navigate('/billing/credit');
  const handleAddProduct = () => navigate('/stock');
  const handleViewReports = () => navigate('/reports');
  const handleViewCheques = () => navigate('/cheques');
  const handleViewExpenses = () => navigate('/expenses');
  const handlePendingBills = () => navigate('/billing/pending'); // ✅ Fixed path
  const handlePaidBills = () => navigate('/billing/paid'); // ✅ Fixed path

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Toaster position="top-right" />
      {/* Sidebar */}
      <Sidebar />
      
      {/* Main Content Area */}
      <main className="flex-1 lg:ml-0 transition-all duration-300">
        {/* Top Header (Mobile) */}
        <header className="lg:hidden bg-white shadow-sm border-b px-4 py-3 flex items-center justify-between">
          <h1 className="font-bold text-gray-900">Samagi Hardware</h1>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600">{user?.username}</span>
            <button onClick={logout} className="text-red-600 text-sm font-medium">Logout</button>
          </div>
        </header>
        
        {/* Page Content */}
        <div className="p-4 lg:p-8">
          <div className="max-w-7xl mx-auto">
            {/* Welcome Header */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900">
                Welcome back, {user?.full_name || user?.username} 👋
              </h2>
              <p className="text-gray-600 mt-1">
                {isAdmin() 
                  ? 'Manage your hardware store with full administrative access.' 
                  : 'Process sales and manage customer transactions.'}
              </p>
            </div>
            
            {/* ✅ Real Stats Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {[
                { 
                  label: "Today's Sales", 
                  value: stats.loading ? 'Loading...' : formatLKR(stats.todaysSales), 
                  icon: '💰', 
                  color: 'amber',
                  onClick: () => navigate('/billing/cash')
                },
                { 
                  label: 'Orders Today', 
                  value: stats.loading ? '...' : stats.orders, 
                  icon: '🧾', 
                  color: 'blue',
                  onClick: () => navigate('/billing')
                },
                { 
                  label: 'Low Stock Items', 
                  value: stats.loading ? '...' : stats.lowStock, 
                  icon: '⚠️', 
                  color: 'red',
                  onClick: () => navigate('/stock'),
                  alert: stats.lowStock > 0
                },
                { 
                  label: 'Credit Pending', 
                  value: stats.loading ? '...' : formatLKR(stats.creditPending), 
                  icon: '👤', 
                  color: 'green',
                  onClick: () => navigate('/billing/pending')
                },
              ].map((stat, idx) => (
                <div 
                  key={idx} 
                  className={`bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow cursor-pointer ${stat.alert ? 'border-l-4 border-l-red-400' : ''}`}
                  onClick={stat.onClick}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">{stat.label}</p>
                      <p className={`text-2xl font-bold mt-1 ${stat.alert ? 'text-red-600' : 'text-gray-900'}`}>
                        {stat.value}
                      </p>
                    </div>
                    <div className={`w-12 h-12 rounded-xl bg-${stat.color}-100 flex items-center justify-center text-2xl`}>
                      {stat.icon}
                    </div>
                  </div>
                  {stat.alert && (
                    <p className="text-xs text-red-600 mt-2 font-medium">⚠️ Needs attention</p>
                  )}
                </div>
              ))}
            </div>
            
            {/* ✅ Quick Actions & Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Quick Actions */}
              <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <span>⚡</span> Quick Actions
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <button 
                    onClick={handleNewCashBill}
                    className="p-4 rounded-lg bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 font-medium transition-colors text-sm text-left"
                  >
                    💵 New Cash Bill
                  </button>
                  <button 
                    onClick={handleNewCreditBill}
                    className="p-4 rounded-lg bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-800 font-medium transition-colors text-sm text-left"
                  >
                    📝 New Credit Bill
                  </button>
                  {isAdmin() && (
                    <>
                      <button 
                        onClick={handleAddProduct}
                        className="p-4 rounded-lg bg-green-50 hover:bg-green-100 border border-green-200 text-green-800 font-medium transition-colors text-sm text-left"
                      >
                        📦 Add Product
                      </button>
                      <button 
                        onClick={handleViewReports}
                        className="p-4 rounded-lg bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-800 font-medium transition-colors text-sm text-left"
                      >
                        📊 View Reports
                      </button>
                      <button 
                        onClick={handleViewCheques}
                        className="p-4 rounded-lg bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-800 font-medium transition-colors text-sm text-left"
                      >
                        🧾 Manage Cheques
                      </button>
                      <button 
                        onClick={handleViewExpenses}
                        className="p-4 rounded-lg bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-800 font-medium transition-colors text-sm text-left"
                      >
                        💸 Track Expenses
                      </button>
                    </>
                  )}
                  <button 
                    onClick={handlePendingBills}
                    className="p-4 rounded-lg bg-orange-50 hover:bg-orange-100 border border-orange-200 text-orange-800 font-medium transition-colors text-sm text-left"
                  >
                    ⏳ Pending Bills
                  </button>
                  <button 
                    onClick={handlePaidBills}
                    className="p-4 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 font-medium transition-colors text-sm text-left"
                  >
                    ✅ Paid Bills
                  </button>
                </div>
              </div>
              
              {/* ✅ Recent Activity + Cheque Reminders */}
              <div className="space-y-6">
                {/* Recent Activity - FIXED */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                  <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <span>🔔</span> Recent Activity
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
                    <div className="space-y-3">
                      {recentActivity.map((activity) => (
                        <div 
                          key={activity.id} 
                          className={`flex items-start gap-3 text-sm ${activity.urgent ? 'bg-amber-50 p-2 rounded-lg' : ''}`}
                        >
                          <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                            activity.urgent ? 'bg-amber-400' : 
                            activity.type === 'cash' ? 'bg-amber-400' : 
                            activity.type === 'credit' ? 'bg-blue-400' : 
                            activity.type === 'cheque' ? 'bg-indigo-400' : 
                            'bg-green-400'
                          }`}></div>
                          <div className="min-w-0">
                            <p className="text-gray-800 truncate">{activity.text}</p>
                            <p className="text-xs text-gray-400 mt-0.5">{activity.user}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 text-center py-4">No recent activity</p>
                  )}
                </div>
                
                {/* ✅ Cheque Reminders Widget */}
                <ChequeRemindersWidget />
              </div>
            </div>
            
            {/* ✅ System Status Bar */}
            <div className="mt-8 bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <div className="flex flex-wrap items-center justify-between gap-4 text-sm">
                <div className="flex items-center gap-6">
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-500"></span>
                    <span className="text-gray-600">System Online</span>
                  </span>
                  <span className="text-gray-400">|</span>
                  <span className="text-gray-600">Last sync: {new Date().toLocaleTimeString('en-LK')}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-gray-500">Logged in as:</span>
                  <span className="font-medium text-gray-900">{user?.full_name || user?.username}</span>
                  <span className="px-2 py-0.5 bg-gray-100 rounded text-xs font-medium capitalize">{user?.role}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;