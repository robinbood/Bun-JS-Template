import { invalidateSession } from "../auth/session";

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

export const logoutRoute = {
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
};