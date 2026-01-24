import { createSession } from "../auth/session";
import { db } from "../../index";
import { usersTable } from "../../DB/schema";
import { eq } from "drizzle-orm";

export const loginRoute = {
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
      const isPasswordValid = await Bun.password.verify(password, user[0]!.passwordHash);
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
};