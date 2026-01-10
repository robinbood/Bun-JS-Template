import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";
import type { ReactNode } from "react";
import { authApi, ApiError } from "../services/api";

interface User {
  id: number;
  name: string;
  email: string;
  emailVerified: boolean;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  error: string | null;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<number>(0);
  
  // Memoize computed values to prevent unnecessary re-renders
  const isAuthenticated = useMemo(() => !!user, [user]);
  
  const clearError = useCallback(() => setError(null), []);
  
  // Cache user data and only refresh if necessary
  const refreshUser = useCallback(async (force = false) => {
    const now = Date.now();
    // Only refresh if forced or if last refresh was more than 5 minutes ago
    if (!force && lastRefresh && (now - lastRefresh) < 5 * 60 * 1000) {
      return;
    }
    
    try {
      setIsLoading(true);
      const response = await authApi.getCurrentUser();
      setUser(response.user);
      setLastRefresh(now);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        // User is not authenticated, which is fine
        setUser(null);
      } else {
        console.error("Failed to refresh user:", err);
        setError("Failed to get user information");
      }
    } finally {
      setIsLoading(false);
    }
  }, [lastRefresh]);
  
  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    clearError();
    
    try {
      const response = await authApi.login(email, password);
      setUser(response.user);
      setLastRefresh(Date.now());
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Login failed");
      }
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [clearError]);
  
  const register = useCallback(async (name: string, email: string, password: string) => {
    setIsLoading(true);
    clearError();
    
    try {
      await authApi.register(name, email, password);
      // Registration successful, but user needs to verify email
      // Don't set user state yet
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Registration failed");
      }
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [clearError]);
  
  const logout = useCallback(async () => {
    setIsLoading(true);
    clearError();
    
    try {
      await authApi.logout();
      setUser(null);
      setLastRefresh(0); // Reset last refresh time
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Logout failed");
      }
    } finally {
      setIsLoading(false);
    }
  }, [clearError]);
  
  useEffect(() => {
    // Check if user is already authenticated on app load
    refreshUser();
  }, [refreshUser]);
  
  // Memoize context value to prevent unnecessary re-renders
  const value: AuthContextType = useMemo(() => ({
    user,
    isLoading,
    isAuthenticated,
    login,
    register,
    logout,
    refreshUser,
    error,
    clearError,
  }), [user, isLoading, isAuthenticated, login, register, logout, refreshUser, error, clearError]);
  
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};