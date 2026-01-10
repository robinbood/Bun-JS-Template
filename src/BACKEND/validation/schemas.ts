import { z } from "zod";

// User registration schema
export const registerSchema = z.object({
  name: z.string()
    .min(2, "Name must be at least 2 characters long")
    .max(100, "Name must be less than 100 characters")
    .regex(/^[a-zA-Z\s]+$/, "Name can only contain letters and spaces"),
  email: z.string()
    .email("Invalid email format")
    .max(255, "Email must be less than 255 characters"),
  password: z.string()
    .min(8, "Password must be at least 8 characters long")
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/, 
      "Password must contain at least one uppercase letter, one lowercase letter, and one number"),
});

// User login schema
export const loginSchema = z.object({
  email: z.string()
    .email("Invalid email format")
    .max(255, "Email must be less than 255 characters"),
  password: z.string()
    .min(1, "Password is required"),
});

// Password reset request schema
export const forgotPasswordSchema = z.object({
  email: z.string()
    .email("Invalid email format")
    .max(255, "Email must be less than 255 characters"),
});

// Password reset schema
export const resetPasswordSchema = z.object({
  token: z.string()
    .min(1, "Reset token is required"),
  newPassword: z.string()
    .min(8, "Password must be at least 8 characters long")
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/, 
      "Password must contain at least one uppercase letter, one lowercase letter, and one number"),
});

// Email verification schema
export const verifyEmailSchema = z.object({
  token: z.string()
    .min(1, "Verification token is required"),
});

// Profile update schema
export const updateProfileSchema = z.object({
  name: z.string()
    .min(2, "Name must be at least 2 characters long")
    .max(100, "Name must be less than 100 characters")
    .regex(/^[a-zA-Z\s]+$/, "Name can only contain letters and spaces")
    .optional(),
  email: z.string()
    .email("Invalid email format")
    .max(255, "Email must be less than 255 characters")
    .optional(),
});

// Type exports
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;