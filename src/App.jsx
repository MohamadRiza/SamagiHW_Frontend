import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import React from "react";

// Pages
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Unauthorized from "./pages/Unauthorized";
import StockManagement from "./pages/StockManagement";
import CashBilling from "./pages/CashBilling";
import CreditBilling from "./pages/CreditBilling";
import PendingBills from "./pages/PendingBills";
import PaidBills from "./pages/PaidBills";
import CustomerList from "./pages/CustomerList";
import Expenses from "./pages/Expenses";
import Cheques from "./pages/Cheques";
import Purchases from "./pages/Purchases";
import Settings from "./pages/Settings";
import Reports from "./pages/Reports";

// Auto-update helper (lazy import to avoid circular deps)
const checkForUpdatesOnLoad = async (isAdmin) => {
  if (!isAdmin) return;
  
  try {
    const SettingsService = await import("./services/settings.service");
    const response = await SettingsService.default.checkForUpdates();
    if (response?.success && response.data?.hasUpdate) {
      sessionStorage.setItem('pendingUpdate', JSON.stringify(response.data));
      console.log('🔄 Update available:', response.data.latestVersion);
    }
  } catch (error) {
    console.log('ℹ️ Update check skipped');
  }
};

// ✅ App content component that uses useAuth (MUST be inside AuthProvider)
function AppContent() {
  const { user } = useAuth();
  
  // Check for updates when admin logs in
  React.useEffect(() => {
    if (user?.role === 'admin') {
      checkForUpdatesOnLoad(true);
    }
  }, [user?.id]); // Re-run only when user changes

  return (
    <BrowserRouter>
      <Routes>
        {/* ===== PUBLIC ROUTES ===== */}
        <Route path="/login" element={<Login />} />
        <Route path="/unauthorized" element={<Unauthorized />} />

        {/* ===== DEFAULT REDIRECT ===== */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />

        {/* ===== PROTECTED ROUTES (All Users) ===== */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        <Route
  path="/reports"
  element={
    <ProtectedRoute roles={['admin', 'staff']}>
      <Reports />
    </ProtectedRoute>
  }
/>
        
        <Route
          path="/stock"
          element={
            <ProtectedRoute roles={["admin", "staff"]}>
              <StockManagement />
            </ProtectedRoute>
          }
        />
        
        <Route
          path="/billing/cash"
          element={
            <ProtectedRoute roles={["admin", "staff"]}>
              <CashBilling />
            </ProtectedRoute>
          }
        />
        
        <Route
          path="/billing/credit"
          element={
            <ProtectedRoute roles={["admin", "staff"]}>
              <CreditBilling />
            </ProtectedRoute>
          }
        />
        
        <Route
          path="/customers/list"
          element={
            <ProtectedRoute roles={["admin", "staff"]}>
              <CustomerList />
            </ProtectedRoute>
          }
        />
        
        <Route
          path="/customers/pending"
          element={
            <ProtectedRoute roles={["admin", "staff"]}>
              <PendingBills />
            </ProtectedRoute>
          }
        />
        
        <Route
          path="/customers/paid"
          element={
            <ProtectedRoute roles={["admin", "staff"]}>
              <PaidBills />
            </ProtectedRoute>
          }
        />
        
        <Route
          path="/expenses"
          element={
            <ProtectedRoute roles={["admin", "staff"]}>
              <Expenses />
            </ProtectedRoute>
          }
        />
        
        <Route
          path="/cheques"
          element={
            <ProtectedRoute roles={["admin", "staff"]}>
              <Cheques />
            </ProtectedRoute>
          }
        />
        
        <Route
          path="/purchases"
          element={
            <ProtectedRoute roles={["admin", "staff"]}>
              <Purchases />
            </ProtectedRoute>
          }
        />

        {/* ===== ADMIN ONLY ROUTES ===== */}
        <Route
          path="/settings"
          element={
            <ProtectedRoute roles={["admin"]}>
              <Settings />
            </ProtectedRoute>
          }
        />
        
        {/* Legacy /admin/* redirect to dashboard */}
        <Route
          path="/admin/*"
          element={
            <ProtectedRoute roles={["admin"]}>
              <Navigate to="/dashboard" replace />
            </ProtectedRoute>
          }
        />

        {/* ===== 404 CATCH-ALL ===== */}
        <Route
          path="*"
          element={
            <div className="flex items-center justify-center min-h-screen bg-gray-50">
              <div className="text-center">
                <h1 className="text-4xl font-bold text-gray-900 mb-2">404</h1>
                <p className="text-gray-600 mb-4">Page not found</p>
                <button
                  onClick={() => window.location.href = '/dashboard'}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  Go to Dashboard
                </button>
              </div>
            </div>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

// ✅ Main App component - ONLY provides context, doesn't use hooks
function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;