import { validateSession } from "./session";
import { parseCookies, createErrorResponse, getSecurityHeaders } from "../utils";

export const requireAuth = async (request: Request): Promise<{ userId: number; email: string; name: string; emailVerified: boolean } | Response> => {
  const cookieHeader = request.headers.get("cookie");
  if (!cookieHeader) {
    return createErrorResponse("Unauthorized: No session cookie", 401, getSecurityHeaders());
  }
  
  const cookies = parseCookies(cookieHeader);
  const sessionToken = cookies["session-token"];
  
  if (!sessionToken) {
    return createErrorResponse("Unauthorized: No session token", 401, getSecurityHeaders());
  }
  
  const session = await validateSession(sessionToken);
  if (!session) {
    return createErrorResponse("Unauthorized: Invalid session", 401, getSecurityHeaders());
  }
  
  return session;
};