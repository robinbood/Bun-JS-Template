import { lazy } from "react";
import type { ComponentType } from "react";

// Lazy load components with loading fallbacks
export const LazyDashboard = lazy(() => import("../pages/Dashboard").then(module => ({ 
  default: module.Dashboard 
})));

export const LazyProfile = lazy(() => import("../pages/Profile").then(module => ({ 
  default: module.Profile 
})));

export const LazyLoginForm = lazy(() => import("../components/auth/LoginForm").then(module => ({ 
  default: module.LoginForm 
})));

export const LazyRegisterForm = lazy(() => import("../components/auth/RegisterForm").then(module => ({ 
  default: module.RegisterForm 
})));

export const LazyForgotPasswordForm = lazy(() => import("../components/auth/ForgotPasswordForm").then(module => ({ 
  default: module.ForgotPasswordForm 
})));

export const LazyResetPasswordForm = lazy(() => import("../components/auth/ResetPasswordForm").then(module => ({ 
  default: module.ResetPasswordForm 
})));

export const LazyVerifyEmailPage = lazy(() => import("../components/auth/VerifyEmailPage").then(module => ({ 
  default: module.VerifyEmailPage 
})));

// Preload components on hover or before navigation
export const preloadComponent = (importFunc: () => Promise<any>): void => {
  importFunc();
};