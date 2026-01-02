
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router";
import { AuthProvider, useAuth } from "./FRONTEND/context/AuthContext";
import { ProtectedRoute } from "./FRONTEND/components/common/ProtectedRoute";
import { LoginForm } from "./FRONTEND/components/auth/LoginForm";
import { RegisterForm } from "./FRONTEND/components/auth/RegisterForm";
import { VerifyEmailPage } from "./FRONTEND/components/auth/VerifyEmailPage";
import { ForgotPasswordForm } from "./FRONTEND/components/auth/ForgotPasswordForm";
import { ResetPasswordForm } from "./FRONTEND/components/auth/ResetPasswordForm";
import { Dashboard } from "./FRONTEND/pages/Dashboard";
import { Profile } from "./FRONTEND/pages/Profile";

const AppRoutes: React.FC = () => {
  const { isAuthenticated } = useAuth();
  
  return (
    <Routes>
      <Route path="/" element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />} />
      <Route path="/login" element={<LoginForm />} />
      <Route path="/register" element={<RegisterForm />} />
      <Route path="/verify-email" element={<VerifyEmailPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordForm />} />
      <Route path="/reset-password" element={<ResetPasswordForm />} />
      
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
};

export function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-gray-100">
          <AppRoutes />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
