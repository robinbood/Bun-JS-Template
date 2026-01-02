import { db } from "../../index";
import { usersTable } from "../../DB/schema";
import { eq } from "drizzle-orm";

export const verifyEmailRoute = {
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
};