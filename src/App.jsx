import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Unauthorized from "./pages/Unauthorized";
import StockManagement from "./pages/StockManagement";
import CashBilling from "./pages/CashBilling";
import CreditBilling from "./pages/CreditBilling";

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/unauthorized" element={<Unauthorized />} />

          {/* Protected Routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
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
            path="/stock"
            element={
              <ProtectedRoute roles={["admin", "staff"]}>
                <StockManagement />
              </ProtectedRoute>
            }
          />

          {/* Admin Only Routes */}
          <Route
            path="/admin/*"
            element={
              <ProtectedRoute roles={["admin"]}>
                <Dashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="billing/credit"
            element={
              <ProtectedRoute roles={["admin", "staff"]}>
                <CreditBilling />
              </ProtectedRoute>
            }
          />

          {/* Default Redirect */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<div>404 - Page Not Found</div>} /> 
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
