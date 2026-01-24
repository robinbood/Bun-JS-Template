import {  validatePasswordStrength } from "../auth/password";
import { invalidateAllUserSessions } from "../auth/session";
import { db } from "../../index";
import { usersTable } from "../../DB/schema";
import { eq } from "drizzle-orm";

export const resetPasswordRoute = {
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
      
      // Check if email is verified before allowing password reset
      if (!user[0]!.emailVerified) {
        return new Response(
          JSON.stringify({ error: "Please verify your email address before resetting your password" }),
          { status: 403, headers: { "Content-Type": "application/json" } }
        );
      }
      
      // Hash new password and update user
      const passwordHash = await Bun.password.hash(newPassword,{
        algorithm:"argon2id"
      });
      
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
};