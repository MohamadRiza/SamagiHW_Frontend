import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import React, { useEffect, useState } from "react";

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

// Loading component
function LoadingScreen() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading POS System...</p>
        <p className="text-xs text-gray-400 mt-2">Connecting to backend...</p>
      </div>
    </div>
  );
}

// Error boundary component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('App Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-screen bg-red-50">
          <div className="text-center p-8">
            <h1 className="text-2xl font-bold text-red-800 mb-4">Something went wrong</h1>
            <p className="text-red-600 mb-4">{this.state.error?.message}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Reload App
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// Debug info component (only in development)
function DebugInfo() {
  const [showDebug, setShowDebug] = useState(false);
  
  useEffect(() => {
    console.log('=== App Debug Info ===');
    console.log('Window location:', window.location.href);
    console.log('User Agent:', navigator.userAgent);
    console.log('Electron API:', !!window.electronAPI);
    console.log('Environment:', import.meta.env.MODE);
    console.log('=====================');
  }, []);
  
  if (import.meta.env.DEV) {
    return (
      <div className="fixed bottom-2 right-2 z-50">
        <button
          onClick={() => setShowDebug(!showDebug)}
          className="bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-50 hover:opacity-100"
        >
          Debug
        </button>
        {showDebug && (
          <div className="absolute bottom-8 right-0 bg-black text-white text-xs p-2 rounded w-64">
            <p>Hash: {window.location.hash}</p>
            <p>Electron: {!!window.electronAPI ? 'Yes' : 'No'}</p>
            <p>Mode: {import.meta.env.MODE}</p>
            <p>API: {import.meta.env.VITE_API_URL || '/api'}</p>
          </div>
        )}
      </div>
    );
  }
  return null;
}

function AppContent() {
  const { user, loading } = useAuth();
  const [initError, setInitError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  
  // Check API connection
  useEffect(() => {
    const checkAPI = async () => {
      try {
        console.log('Checking API connection...');
        const response = await fetch('http://localhost:5000/api/health');
        const data = await response.json();
        console.log('✅ API Health Check:', data);
        setInitError(null);
      } catch (error) {
        console.error('❌ API Health Check Failed:', error);
        setInitError('Cannot connect to backend server. Please make sure the backend is running.');
      }
    };
    
    // Initial check
    checkAPI();
    
    // Retry every 5 seconds if there's an error
    const interval = setInterval(() => {
      if (initError) {
        checkAPI();
        setRetryCount(prev => prev + 1);
      }
    }, 5000);
    
    return () => clearInterval(interval);
  }, [initError]);
  
  if (loading) {
    return <LoadingScreen />;
  }
  
  if (initError) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-red-50">
        <div className="text-center p-8 max-w-md">
          <h1 className="text-2xl font-bold text-red-800 mb-4">Connection Error</h1>
          <p className="text-red-600 mb-2">{initError}</p>
          <p className="text-sm text-gray-500 mb-4">Retry attempt: {retryCount}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 mr-2"
          >
            Retry Now
          </button>
          <button
            onClick={() => setInitError(null)}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            Dismiss
          </button>
        </div>
      </div>
    );
  }

  return (
    <HashRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/unauthorized" element={<Unauthorized />} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/reports" element={<ProtectedRoute roles={['admin', 'staff']}><Reports /></ProtectedRoute>} />
        <Route path="/stock" element={<ProtectedRoute roles={["admin", "staff"]}><StockManagement /></ProtectedRoute>} />
        <Route path="/billing/cash" element={<ProtectedRoute roles={["admin", "staff"]}><CashBilling /></ProtectedRoute>} />
        <Route path="/billing/credit" element={<ProtectedRoute roles={["admin", "staff"]}><CreditBilling /></ProtectedRoute>} />
        <Route path="/customers/list" element={<ProtectedRoute roles={["admin", "staff"]}><CustomerList /></ProtectedRoute>} />
        <Route path="/customers/pending" element={<ProtectedRoute roles={["admin", "staff"]}><PendingBills /></ProtectedRoute>} />
        <Route path="/customers/paid" element={<ProtectedRoute roles={["admin", "staff"]}><PaidBills /></ProtectedRoute>} />
        <Route path="/expenses" element={<ProtectedRoute roles={["admin", "staff"]}><Expenses /></ProtectedRoute>} />
        <Route path="/cheques" element={<ProtectedRoute roles={["admin", "staff"]}><Cheques /></ProtectedRoute>} />
        <Route path="/purchases" element={<ProtectedRoute roles={["admin", "staff"]}><Purchases /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute roles={["admin"]}><Settings /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
      <DebugInfo />
    </HashRouter>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;