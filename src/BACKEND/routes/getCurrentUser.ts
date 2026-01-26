import { validateSession } from "../auth/session";
import {
  parseCookies,
  createApiResponse,
  createErrorResponse,
  getSecurityHeaders
} from "../utils";

export const getCurrentUserRoute = {
  async GET(req: Request) {
    try {
      const cookieHeader = req.headers.get("cookie");
      if (!cookieHeader) {
        return createErrorResponse(
          "No session cookie found",
          401,
          getSecurityHeaders()
        );
      }
      
      const cookies = parseCookies(cookieHeader);
      const sessionToken = cookies["session-token"];
      
      if (!sessionToken) {
        return createErrorResponse(
          "No session token found",
          401,
          getSecurityHeaders()
        );
      }
      
      // Validate session using Redis (returns user data directly)
      const session = await validateSession(sessionToken);
      if (!session) {
        return createErrorResponse(
          "Invalid or expired session",
          401,
          getSecurityHeaders()
        );
      }
      
      // Return user data directly from session (already stored in Redis)
      return createApiResponse(
        { user: { id: session.userId, email: session.email, name: session.name, emailVerified: session.emailVerified } },
        200,
        getSecurityHeaders()
      );
    } catch (error) {
      console.error("Get current user error:", error);
      return createErrorResponse(
        "Internal server error",
        500,
        getSecurityHeaders()
      );
    }
  },
};