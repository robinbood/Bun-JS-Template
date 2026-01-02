import { hashPassword, verifyPassword, validatePasswordStrength } from "../auth/password";
import { createSession, invalidateSession, invalidateAllUserSessions, validateSession } from "../auth/session";
import { createEmailVerificationToken, createPasswordResetToken, sendVerificationEmail, sendPasswordResetEmail } from "../auth/email";
import { db } from "../../index";
import { usersTable } from "../../DB/schema";
import { eq } from "drizzle-orm";

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

export const authRoutes = {
  // Register a new user
  "/api/auth/register": {
    async POST(req: Request) {
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
            age: 0, // Default age since it's required in the schema
          })
          .returning({ id: usersTable.id, email: usersTable.email });
          
        // Create and send verification email
        const verificationToken = await createEmailVerificationToken(newUser[0]!.id);
        sendVerificationEmail(newUser[0]!.email, verificationToken);
        
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
  },
  
  // Login user
  "/api/auth/login": {
    async POST(req: Request) {
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
        const isPasswordValid = await verifyPassword(password, user[0]!.passwordHash);
        if (!isPasswordValid) {
          return new Response(
            JSON.stringify({ error: "Invalid email or password" }),
            { status: 401, headers: { "Content-Type": "application/json" } }
          );
        }
        
        // Create session
        const sessionToken = await createSession(user[0]!.id);
        
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
              id: user[0]!.id,
              name: user[0]!.name,
              email: user[0]!.email,
              emailVerified: user[0]!.emailVerified,
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
  },
  
  // Logout user
  "/api/auth/logout": {
    async POST(req: Request) {
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
  },
  
  // Get current user
  "/api/auth/me": {
    async GET(req: Request) {
      try {
        const cookieHeader = req.headers.get("cookie");
        if (!cookieHeader) {
          return new Response(
            JSON.stringify({ error: "No session cookie found" }),
            { status: 401, headers: { "Content-Type": "application/json" } }
          );
        }
        
        const cookies = parseCookies(cookieHeader);
        const sessionToken = cookies["session-token"];
        
        if (!sessionToken) {
          return new Response(
            JSON.stringify({ error: "No session token found" }),
            { status: 401, headers: { "Content-Type": "application/json" } }
          );
        }
        
        // Validate session using Redis
        const session = await validateSession(sessionToken);
        if (!session) {
          return new Response(
            JSON.stringify({ error: "Invalid or expired session" }),
            { status: 401, headers: { "Content-Type": "application/json" } }
          );
        }
        
        // Get user data from database
        const user = await db
          .select({
            id: usersTable.id,
            name: usersTable.name,
            email: usersTable.email,
            emailVerified: usersTable.emailVerified,
          })
          .from(usersTable)
          .where(eq(usersTable.id, session.userId))
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
  },
  
  // Verify email
  "/api/auth/verify/:token": {
    async GET(req: Request) {
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
        if (user[0]!.emailVerificationExpires && new Date() > user[0]!.emailVerificationExpires) {
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
          .where(eq(usersTable.id, user[0]!.id));
          
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
  },
  
  // Forgot password
  "/api/auth/forgot-password": {
    async POST(req: Request) {
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
  },
  
  // Reset password
  "/api/auth/reset-password": {
    async POST(req: Request) {
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
        if (user[0]!.passwordResetExpires && new Date() > user[0]!.passwordResetExpires) {
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
          .where(eq(usersTable.id, user[0]!.id));
          
        // Invalidate all existing sessions for this user
        await invalidateAllUserSessions(user[0]!.id);
          
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
  },
};