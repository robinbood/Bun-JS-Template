import React, { useEffect, useRef } from "react";
import { Navigate, useLocation } from "react-router";
import { useAuth } from "../../context/AuthContext";

interface LoadingSpinnerProps {
  size?: "small" | "medium" | "large";
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ size = "medium" }) => {
  const sizeClasses = {
    small: "h-4 w-4",
    medium: "h-8 w-8",
    large: "h-12 w-12",
  };

  return (
    <div className="flex justify-center items-center">
      <div
        className={`animate-spin rounded-full border-b-2 border-blue-600 ${sizeClasses[size]}`}
      ></div>
    </div>
  );
};

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireEmailVerified?: boolean;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requireEmailVerified = false
}) => {
  const { isAuthenticated, isLoading, user, refreshUser } = useAuth();
  const location = useLocation();
  const hasRefreshed = useRef(false);
  
  useEffect(() => {
    // Only refresh user data on first mount, not on every render
    if (!hasRefreshed.current) {
      refreshUser();
      hasRefreshed.current = true;
    }
  }, [refreshUser]);
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <LoadingSpinner size="large" />
      </div>
    );
  }
  
  if (!isAuthenticated) {
    // Redirect to login page with return URL
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  
  if (requireEmailVerified && !user?.emailVerified) {
    // Redirect to email verification page
    return <Navigate to="/verify-email" replace />;
  }
  
  return <>{children}</>;
};