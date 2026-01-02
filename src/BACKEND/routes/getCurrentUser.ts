import { db } from "../../index";
import { usersTable, sessionsTable } from "../../DB/schema";
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

export const getCurrentUserRoute = {
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
      
      const user = await db
        .select({
          id: usersTable.id,
          name: usersTable.name,
          email: usersTable.email,
          emailVerified: usersTable.emailVerified,
        })
        .from(usersTable)
        .innerJoin(sessionsTable, eq(usersTable.id, sessionsTable.userId))
        .where(eq(sessionsTable.sessionToken, sessionToken))
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
};