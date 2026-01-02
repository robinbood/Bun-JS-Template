# Authentication Implementation Plan

## Dependencies to Add

### Backend Dependencies
Add these to package.json:

```json
{
  "dependencies": {
    "bcrypt": "^5.1.1",
    "nanoid": "^5.0.4",
    "@types/bcrypt": "^5.0.2"
  }
}
```

### Frontend Dependencies
Add these to package.json:

```json
{
  "dependencies": {
    "react-router-dom": "^6.8.0",
    "zod": "^3.22.4",
    "@hookform/resolvers": "^3.3.2"
  }
}
```

## Database Schema Implementation

### Updated Schema (src/DB/schema.ts)

```typescript
import { integer, pgTable, varchar, boolean, timestamp, uuid } from "drizzle-orm/pg-core";

// Enhanced users table
export const usersTable = pgTable("users", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: varchar({ length: 255 }).notNull(),
  age: integer().notNull(),
  email: varchar({ length: 255 }).notNull().unique(),
  passwordHash: varchar({ length: 255 }).notNull(),
  emailVerified: boolean().default(false).notNull(),
  emailVerificationToken: varchar({ length: 255 }),
  emailVerificationExpires: timestamp(),
  passwordResetToken: varchar({ length: 255 }),
  passwordResetExpires: timestamp(),
  createdAt: timestamp().defaultNow().notNull(),
  updatedAt: timestamp().defaultNow().notNull(),
});

// Sessions table
export const sessionsTable = pgTable("sessions", {
  id: uuid().defaultRandom().primaryKey(),
  userId: integer().references(() => usersTable.id, { onDelete: "cascade" }).notNull(),
  sessionToken: varchar({ length: 255 }).notNull().unique(),
  expiresAt: timestamp().notNull(),
  createdAt: timestamp().defaultNow().notNull(),
  lastAccessed: timestamp().defaultNow().notNull(),
});
```

## Backend Implementation Details

### 1. Password Utilities (src/BACKEND/auth/password.ts)

```typescript
import bcrypt from "bcrypt";

export const hashPassword = async (password: string): Promise<string> => {
  const saltRounds = 12;
  return bcrypt.hash(password, saltRounds);
};

export const verifyPassword = async (password: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};

export const validatePasswordStrength = (password: string): boolean => {
  // Minimum 8 characters, at least one uppercase, one lowercase, one number
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
  return passwordRegex.test(password);
};
```

### 2. Session Management (src/BACKEND/auth/session.ts)

```typescript
import { nanoid } from "nanoid";
import { db } from "../index";
import { sessionsTable, usersTable } from "../../DB/schema";
import { eq, and, gt } from "drizzle-orm";

export const createSession = async (userId: number): Promise<string> => {
  const sessionToken = nanoid(32);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now
  
  await db.insert(sessionsTable).values({
    userId,
    sessionToken,
    expiresAt,
  });
  
  return sessionToken;
};

export const validateSession = async (sessionToken: string): Promise<{ userId: number; email: string } | null> => {
  const session = await db
    .select({
      userId: sessionsTable.userId,
      email: usersTable.email,
    })
    .from(sessionsTable)
    .innerJoin(usersTable, eq(sessionsTable.userId, usersTable.id))
    .where(
      and(
        eq(sessionsTable.sessionToken, sessionToken),
        gt(sessionsTable.expiresAt, new Date())
      )
    )
    .limit(1);
    
  if (session.length === 0) {
    return null;
  }
  
  // Update last accessed time
  await db
    .update(sessionsTable)
    .set({ lastAccessed: new Date() })
    .where(eq(sessionsTable.sessionToken, sessionToken));
    
  return session[0];
};

export const invalidateSession = async (sessionToken: string): Promise<void> => {
  await db
    .delete(sessionsTable)
    .where(eq(sessionsTable.sessionToken, sessionToken));
};

export const invalidateAllUserSessions = async (userId: number): Promise<void> => {
  await db
    .delete(sessionsTable)
    .where(eq(sessionsTable.userId, userId));
};
```

### 3. Email Utilities (src/BACKEND/auth/email.ts)

```typescript
import { nanoid } from "nanoid";
import { db } from "../index";
import { usersTable } from "../../DB/schema";
import { eq } from "drizzle-orm";

export const generateEmailVerificationToken = (): string => {
  return nanoid(32);
};

export const generatePasswordResetToken = (): string => {
  return nanoid(32);
};

export const createEmailVerificationToken = async (userId: number): Promise<string> => {
  const token = generateEmailVerificationToken();
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 24); // 24 hours from now
  
  await db
    .update(usersTable)
    .set({
      emailVerificationToken: token,
      emailVerificationExpires: expiresAt,
    })
    .where(eq(usersTable.id, userId));
    
  return token;
};

export const createPasswordResetToken = async (email: string): Promise<string | null> => {
  const user = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, email))
    .limit(1);
    
  if (user.length === 0) {
    return null;
  }
  
  const token = generatePasswordResetToken();
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 1); // 1 hour from now
  
  await db
    .update(usersTable)
    .set({
      passwordResetToken: token,
      passwordResetExpires: expiresAt,
    })
    .where(eq(usersTable.id, user[0].id));
    
  return token;
};

export const sendVerificationEmail = (email: string, token: string): void => {
  // In a real implementation, you would use an email service
  // For now, we'll just log the URL
  const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;
  console.log(`Verification URL for ${email}: ${verificationUrl}`);
  
  // In production, you would use a service like:
  // - Bun's built-in email capabilities
  // - Nodemailer with SMTP
  // - A third-party service like SendGrid, Mailgun, etc.
};

export const sendPasswordResetEmail = (email: string, token: string): void => {
  // In a real implementation, you would use an email service
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
  console.log(`Password reset URL for ${email}: ${resetUrl}`);
};
```

### 4. Authentication Middleware (src/BACKEND/auth/middleware.ts)

```typescript
import { validateSession } from "./session";

export const requireAuth = async (request: Request): Promise<{ userId: number; email: string } | Response> => {
  const cookieHeader = request.headers.get("cookie");
  if (!cookieHeader) {
    return new Response("Unauthorized: No session cookie", { status: 401 });
  }
  
  const cookies = parseCookies(cookieHeader);
  const sessionToken = cookies["session-token"];
  
  if (!sessionToken) {
    return new Response("Unauthorized: No session token", { status: 401 });
  }
  
  const session = await validateSession(sessionToken);
  if (!session) {
    return new Response("Unauthorized: Invalid session", { status: 401 });
  }
  
  return session;
};

// Helper function to parse cookies
const parseCookies = (cookieHeader: string): Record<string, string> => {
  const cookies: Record<string, string> = {};
  cookieHeader.split(";").forEach(cookie => {
    const [name, value] = cookie.trim().split("=");
    if (name && value) {
      cookies[name] = value;
    }
  });
  return cookies;
};
```

### 5. Authentication Routes (src/BACKEND/routes/auth.ts)

```typescript
import { hashPassword, verifyPassword, validatePasswordStrength } from "../auth/password";
import { createSession, invalidateSession } from "../auth/session";
import { createEmailVerificationToken, createPasswordResetToken, sendVerificationEmail, sendPasswordResetEmail } from "../auth/email";
import { db } from "../index";
import { usersTable } from "../../DB/schema";
import { eq } from "drizzle-orm";

export const authRoutes = {
  // Register a new user
  "POST /api/auth/register": async (req: Request) => {
    try {
      const { email, password, name } = await req.json() as {
        email: string;
        password: string;
        name: string;
      };
      
      // Validate input
      if (!email || !password || !name) {
        return new Response(
          JSON.stringify({ error: "Email, password, and name are required" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }
      
      if (!validatePasswordStrength(password)) {
        return new Response(
          JSON.stringify({ 
            error: "Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, and one number" 
          }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }
      
      // Check if user already exists
      const existingUser = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.email, email))
        .limit(1);
        
      if (existingUser.length > 0) {
        return new Response(
          JSON.stringify({ error: "User with this email already exists" }),
          { status: 409, headers: { "Content-Type": "application/json" } }
        );
      }
      
      // Hash password and create user
      const passwordHash = await hashPassword(password);
      const newUser = await db
        .insert(usersTable)
        .values({
          name,
          email,
          passwordHash,
        })
        .returning({ id: usersTable.id, email: usersTable.email });
        
      // Create and send verification email
      const verificationToken = await createEmailVerificationToken(newUser[0].id);
      sendVerificationEmail(newUser[0].email, verificationToken);
      
      return new Response(
        JSON.stringify({ 
          message: "User registered successfully. Please check your email to verify your account." 
        }),
        { status: 201, headers: { "Content-Type": "application/json" } }
      );
    } catch (error) {
      console.error("Registration error:", error);
      return new Response(
        JSON.stringify({ error: "Internal server error" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  },
  
  // Login user
  "POST /api/auth/login": async (req: Request) => {
    try {
      const { email, password } = await req.json() as {
        email: string;
        password: string;
      };
      
      // Validate input
      if (!email || !password) {
        return new Response(
          JSON.stringify({ error: "Email and password are required" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }
      
      // Find user
      const user = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.email, email))
        .limit(1);
        
      if (user.length === 0) {
        return new Response(
          JSON.stringify({ error: "Invalid email or password" }),
          { status: 401, headers: { "Content-Type": "application/json" } }
        );
      }
      
      // Verify password
      const isPasswordValid = await verifyPassword(password, user[0].passwordHash);
      if (!isPasswordValid) {
        return new Response(
          JSON.stringify({ error: "Invalid email or password" }),
          { status: 401, headers: { "Content-Type": "application/json" } }
        );
      }
      
      // Create session
      const sessionToken = await createSession(user[0].id);
      
      // Set session cookie
      const headers = new Headers();
      headers.set("Content-Type", "application/json");
      headers.set(
        "Set-Cookie",
        `session-token=${sessionToken}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${7 * 24 * 60 * 60}` // 7 days
      );
      
      return new Response(
        JSON.stringify({ 
          message: "Login successful",
          user: {
            id: user[0].id,
            name: user[0].name,
            email: user[0].email,
            emailVerified: user[0].emailVerified,
          }
        }),
        { status: 200, headers }
      );
    } catch (error) {
      console.error("Login error:", error);
      return new Response(
        JSON.stringify({ error: "Internal server error" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  },
  
  // Logout user
  "POST /api/auth/logout": async (req: Request) => {
    try {
      const cookieHeader = req.headers.get("cookie");
      if (!cookieHeader) {
        return new Response(
          JSON.stringify({ error: "No session cookie found" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }
      
      const cookies = parseCookies(cookieHeader);
      const sessionToken = cookies["session-token"];
      
      if (sessionToken) {
        await invalidateSession(sessionToken);
      }
      
      const headers = new Headers();
      headers.set("Content-Type", "application/json");
      headers.set("Set-Cookie", "session-token=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0");
      
      return new Response(
        JSON.stringify({ message: "Logout successful" }),
        { status: 200, headers }
      );
    } catch (error) {
      console.error("Logout error:", error);
      return new Response(
        JSON.stringify({ error: "Internal server error" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  },
  
  // Get current user
  "GET /api/auth/me": async (req: Request) => {
    try {
      const authResult = await requireAuth(req);
      
      if (authResult instanceof Response) {
        return authResult;
      }
      
      const { userId } = authResult;
      
      const user = await db
        .select({
          id: usersTable.id,
          name: usersTable.name,
          email: usersTable.email,
          emailVerified: usersTable.emailVerified,
        })
        .from(usersTable)
        .where(eq(usersTable.id, userId))
        .limit(1);
        
      if (user.length === 0) {
        return new Response(
          JSON.stringify({ error: "User not found" }),
          { status: 404, headers: { "Content-Type": "application/json" } }
        );
      }
      
      return new Response(
        JSON.stringify({ user: user[0] }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    } catch (error) {
      console.error("Get current user error:", error);
      return new Response(
        JSON.stringify({ error: "Internal server error" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  },
  
  // Verify email
  "GET /api/auth/verify/:token": async (req: Request) => {
    try {
      const url = new URL(req.url);
      const token = url.pathname.split("/").pop();
      
      if (!token) {
        return new Response(
          JSON.stringify({ error: "Verification token is required" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }
      
      const user = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.emailVerificationToken, token))
        .limit(1);
        
      if (user.length === 0) {
        return new Response(
          JSON.stringify({ error: "Invalid or expired verification token" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }
      
      // Check if token has expired
      if (user[0].emailVerificationExpires && new Date() > user[0].emailVerificationExpires) {
        return new Response(
          JSON.stringify({ error: "Verification token has expired" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }
      
      // Verify email
      await db
        .update(usersTable)
        .set({
          emailVerified: true,
          emailVerificationToken: null,
          emailVerificationExpires: null,
        })
        .where(eq(usersTable.id, user[0].id));
        
      return new Response(
        JSON.stringify({ message: "Email verified successfully" }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    } catch (error) {
      console.error("Email verification error:", error);
      return new Response(
        JSON.stringify({ error: "Internal server error" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  },
  
  // Forgot password
  "POST /api/auth/forgot-password": async (req: Request) => {
    try {
      const { email } = await req.json() as { email: string };
      
      if (!email) {
        return new Response(
          JSON.stringify({ error: "Email is required" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }
      
      const resetToken = await createPasswordResetToken(email);
      
      if (resetToken) {
        sendPasswordResetEmail(email, resetToken);
      }
      
      // Always return success to prevent email enumeration attacks
      return new Response(
        JSON.stringify({ message: "If an account with this email exists, a password reset link has been sent" }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    } catch (error) {
      console.error("Forgot password error:", error);
      return new Response(
        JSON.stringify({ error: "Internal server error" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  },
  
  // Reset password
  "POST /api/auth/reset-password": async (req: Request) => {
    try {
      const { token, newPassword } = await req.json() as {
        token: string;
        newPassword: string;
      };
      
      if (!token || !newPassword) {
        return new Response(
          JSON.stringify({ error: "Token and new password are required" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }
      
      if (!validatePasswordStrength(newPassword)) {
        return new Response(
          JSON.stringify({ 
            error: "Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, and one number" 
          }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }
      
      const user = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.passwordResetToken, token))
        .limit(1);
        
      if (user.length === 0) {
        return new Response(
          JSON.stringify({ error: "Invalid or expired reset token" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }
      
      // Check if token has expired
      if (user[0].passwordResetExpires && new Date() > user[0].passwordResetExpires) {
        return new Response(
          JSON.stringify({ error: "Reset token has expired" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }
      
      // Hash new password and update user
      const passwordHash = await hashPassword(newPassword);
      
      await db
        .update(usersTable)
        .set({
          passwordHash,
          passwordResetToken: null,
          passwordResetExpires: null,
        })
        .where(eq(usersTable.id, user[0].id));
        
      // Invalidate all existing sessions for this user
      await invalidateAllUserSessions(user[0].id);
        
      return new Response(
        JSON.stringify({ message: "Password reset successfully" }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    } catch (error) {
      console.error("Reset password error:", error);
      return new Response(
        JSON.stringify({ error: "Internal server error" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  },
};

// Helper function to parse cookies
const parseCookies = (cookieHeader: string): Record<string, string> => {
  const cookies: Record<string, string> = {};
  cookieHeader.split(";").forEach(cookie => {
    const [name, value] = cookie.trim().split("=");
    if (name && value) {
      cookies[name] = value;
    }
  });
  return cookies;
};
```

## Frontend Implementation Details

### 1. Validation Schemas (src/FRONTEND/utils/validation.ts)

```typescript
import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

export const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/,
      "Password must contain at least one uppercase letter, one lowercase letter, and one number"
    ),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export const forgotPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, "Reset token is required"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/,
      "Password must contain at least one uppercase letter, one lowercase letter, and one number"
    ),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export type LoginFormData = z.infer<typeof loginSchema>;
export type RegisterFormData = z.infer<typeof registerSchema>;
export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;
```

### 2. API Service (src/FRONTEND/services/api.ts)

```typescript
const API_BASE_URL = process.env.NODE_ENV === "production" 
  ? "https://your-production-domain.com" 
  : "http://localhost:3000";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public data?: any
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export const apiRequest = async (
  endpoint: string,
  options: RequestInit = {}
): Promise<any> => {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    credentials: "include", // Include cookies for session management
    ...options,
  });
  
  const data = await response.json();
  
  if (!response.ok) {
    throw new ApiError(
      data.error || "An error occurred",
      response.status,
      data
    );
  }
  
  return data;
};

// Authentication API methods
export const authApi = {
  login: (email: string, password: string) =>
    apiRequest("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
    
  register: (name: string, email: string, password: string) =>
    apiRequest("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ name, email, password }),
    }),
    
  logout: () =>
    apiRequest("/api/auth/logout", {
      method: "POST",
    }),
    
  getCurrentUser: () =>
    apiRequest("/api/auth/me", {
      method: "GET",
    }),
    
  verifyEmail: (token: string) =>
    apiRequest(`/api/auth/verify/${token}`, {
      method: "GET",
    }),
    
  forgotPassword: (email: string) =>
    apiRequest("/api/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    }),
    
  resetPassword: (token: string, newPassword: string) =>
    apiRequest("/api/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ token, newPassword }),
    }),
};
```

### 3. Authentication Context (src/FRONTEND/context/AuthContext.tsx)

```typescript
import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
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
  
  const isAuthenticated = !!user;
  
  const clearError = () => setError(null);
  
  const refreshUser = async () => {
    try {
      const response = await authApi.getCurrentUser();
      setUser(response.user);
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
  };
  
  const login = async (email: string, password: string) => {
    setIsLoading(true);
    clearError();
    
    try {
      const response = await authApi.login(email, password);
      setUser(response.user);
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
  };
  
  const register = async (name: string, email: string, password: string) => {
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
  };
  
  const logout = async () => {
    setIsLoading(true);
    clearError();
    
    try {
      await authApi.logout();
      setUser(null);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Logout failed");
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  useEffect(() => {
    // Check if user is already authenticated on app load
    refreshUser();
  }, []);
  
  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated,
    login,
    register,
    logout,
    refreshUser,
    error,
    clearError,
  };
  
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
```

### 4. Protected Route Component (src/FRONTEND/components/common/ProtectedRoute.tsx)

```typescript
import React, { useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { LoadingSpinner } from "./LoadingSpinner";

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
  
  useEffect(() => {
    // Refresh user data when component mounts
    refreshUser();
  }, [refreshUser]);
  
  if (isLoading) {
    return <LoadingSpinner />;
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
```

## Next Steps

1. Update the database schema and create migrations
2. Implement the backend authentication utilities and routes
3. Create the frontend authentication components
4. Set up routing with React Router
5. Integrate everything and test the authentication flow

This implementation provides a secure, robust authentication system that follows best practices for session management, password security, and user experience.