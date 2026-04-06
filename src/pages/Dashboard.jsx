import { useAuth } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { Sidebar } from '../components/layout'; // Import sidebar

const Dashboard = () => {
  const { user, logout, isAdmin, isStaff } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
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
            
            {/* Stats Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {[
                { label: "Today's Sales", value: 'LKR 45,280', icon: '💰', color: 'amber' },
                { label: 'Orders', value: '24', icon: '🧾', color: 'blue' },
                { label: 'Low Stock Items', value: '8', icon: '⚠️', color: 'red' },
                { label: 'Credit Pending', value: 'LKR 12,450', icon: '👤', color: 'green' },
              ].map((stat, idx) => (
                <div key={idx} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">{stat.label}</p>
                      <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
                    </div>
                    <div className={`w-12 h-12 rounded-xl bg-${stat.color}-100 flex items-center justify-center text-2xl`}>
                      {stat.icon}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <span>⚡</span> Quick Actions
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <button className="p-4 rounded-lg bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 font-medium transition-colors text-sm">
                    + New Cash Bill
                  </button>
                  <button className="p-4 rounded-lg bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-800 font-medium transition-colors text-sm">
                    + New Credit Bill
                  </button>
                  {isAdmin() && (
                    <>
                      <button className="p-4 rounded-lg bg-green-50 hover:bg-green-100 border border-green-200 text-green-800 font-medium transition-colors text-sm">
                        + Add Product
                      </button>
                      <button className="p-4 rounded-lg bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-800 font-medium transition-colors text-sm">
                        View Reports
                      </button>
                    </>
                  )}
                </div>
              </div>
              
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <span>🔔</span> Recent Activity
                </h3>
                <div className="space-y-3">
                  {[
                    { time: '2 min ago', text: 'New cash bill #INV-2847 created', user: 'Staff: Kamal' },
                    { time: '15 min ago', text: 'Stock updated: Cement Bags +50', user: 'Admin: You' },
                    { time: '1 hr ago', text: 'Credit payment received: LKR 5,000', user: 'Customer: Perera' },
                  ].map((activity, idx) => (
                    <div key={idx} className="flex items-start gap-3 text-sm">
                      <div className="w-2 h-2 rounded-full bg-amber-400 mt-2"></div>
                      <div>
                        <p className="text-gray-800">{activity.text}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{activity.time} • {activity.user}</p>
                      </div>
                    </div>
                  ))}
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