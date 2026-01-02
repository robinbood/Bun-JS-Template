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