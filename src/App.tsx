
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router";
import { Suspense } from "react";
import { AuthProvider, useAuth } from "./FRONTEND/context/AuthContext";
import { ProtectedRoute } from "./FRONTEND/components/common/ProtectedRoute";
import {
  LazyLoginForm,
  LazyRegisterForm,
  LazyVerifyEmailPage,
  LazyForgotPasswordForm,
  LazyResetPasswordForm,
  LazyDashboard,
  LazyProfile,
  preloadComponent
} from "./FRONTEND/utils/lazyLoad";

const AppRoutes: React.FC = () => {
  const { isAuthenticated } = useAuth();
  
  return (
    <Routes>
      <Route path="/" element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />} />
      
      <Route
        path="/login"
        element={
          <Suspense fallback={<div>Loading...</div>}>
            <LazyLoginForm />
          </Suspense>
        }
      />
      
      <Route
        path="/register"
        element={
          <Suspense fallback={<div>Loading...</div>}>
            <LazyRegisterForm />
          </Suspense>
        }
      />
      
      <Route
        path="/verify-email"
        element={
          <Suspense fallback={<div>Loading...</div>}>
            <LazyVerifyEmailPage />
          </Suspense>
        }
      />
      
      <Route
        path="/forgot-password"
        element={
          <Suspense fallback={<div>Loading...</div>}>
            <LazyForgotPasswordForm />
          </Suspense>
        }
      />
      
      <Route
        path="/reset-password"
        element={
          <Suspense fallback={<div>Loading...</div>}>
            <LazyResetPasswordForm />
          </Suspense>
        }
      />
      
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Suspense fallback={<div>Loading...</div>}>
              <LazyDashboard />
            </Suspense>
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <Suspense fallback={<div>Loading...</div>}>
              <LazyProfile />
            </Suspense>
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
