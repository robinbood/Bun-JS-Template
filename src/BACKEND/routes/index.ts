import { registerRoute } from "./register";
import { loginRoute } from "./login";
import { logoutRoute } from "./logout";
import { getCurrentUserRoute } from "./getCurrentUser";
import { verifyEmailRoute } from "./verifyEmail";
import { forgotPasswordRoute } from "./forgotPassword";
import { resetPasswordRoute } from "./resetPassword";

export const authRoutes = {
  "/api/auth/register": registerRoute,
  "/api/auth/login": loginRoute,
  "/api/auth/logout": logoutRoute,
  "/api/auth/me": getCurrentUserRoute,
  "/api/auth/verify/:token": verifyEmailRoute,
  "/api/auth/forgot-password": forgotPasswordRoute,
  "/api/auth/reset-password": resetPasswordRoute,
};