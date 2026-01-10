import { db } from "../../index";
import { usersTable } from "../../DB/schema";
import { eq } from "drizzle-orm";
import { validateSession } from "../auth/session";
import {
  parseCookies,
  createApiResponse,
  createErrorResponse,
  withPerformanceLogging,
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
      
      // Validate session using Redis
      const session = await validateSession(sessionToken);
      if (!session) {
        return createErrorResponse(
          "Invalid or expired session",
          401,
          getSecurityHeaders()
        );
      }
      
      // Get user data from database
      const user = await withPerformanceLogging(
        "get_user_data",
        () => db
          .select({
            id: usersTable.id,
            name: usersTable.name,
            email: usersTable.email,
            emailVerified: usersTable.emailVerified,
          })
          .from(usersTable)
          .where(eq(usersTable.id, session.userId))
          .limit(1)
      );
        
      if (user.length === 0) {
        return createErrorResponse(
          "User not found",
          404,
          getSecurityHeaders()
        );
      }
      
      return createApiResponse(
        { user: user[0] },
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