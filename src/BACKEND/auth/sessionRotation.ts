import { randomBytes } from "crypto";
import { validateSession, createSession, invalidateSession } from "./session";
import { parseCookies } from "../utils";

// Session rotation configuration
const SESSION_ROTATION_INTERVAL = 30 * 60 * 1000; // 30 minutes in milliseconds

// Check if session should be rotated based on age
export const shouldRotateSession = (sessionCreatedAt: string | undefined): boolean => {
  if (!sessionCreatedAt) return true;
  
  const createdTime = new Date(sessionCreatedAt).getTime();
  const now = Date.now();
  return (now - createdTime) > SESSION_ROTATION_INTERVAL;
};

// Rotate session token for enhanced security
export const rotateSession = async (
  currentSessionToken: string,
  userId: number
): Promise<string> => {
  // Validate current session first
  const currentSession = await validateSession(currentSessionToken);
  if (!currentSession) {
    throw new Error("Invalid session for rotation");
  }
  
  // Verify that the userId matches the session's userId
  if (currentSession.userId !== userId) {
    throw new Error("User ID mismatch for session rotation");
  }
  
  // Check if rotation is needed
  if (!shouldRotateSession(currentSession.createdAt)) {
    return currentSessionToken; // No rotation needed
  }
  
  let newSessionToken: string;
  try {
    // Create new session
    newSessionToken = await createSession(userId);
  } catch (error) {
    console.error("Failed to create new session during rotation:", error);
    throw new Error("Session rotation failed: Could not create new session");
  }
  
  try {
    // Invalidate old session only after successfully creating the new one
    await invalidateSession(currentSessionToken);
    
    console.log(`Session rotated for user ${userId}`);
    return newSessionToken;
  } catch (error) {
    console.error("Failed to invalidate old session during rotation:", error);
    // Note: We don't throw here since the new session was created successfully
    // In a production environment, you might want to log this for cleanup later
    return newSessionToken;
  }
};

// Middleware to check and rotate sessions
export const sessionRotationMiddleware = async (
  req: Request
): Promise<{ sessionToken: string; rotated: boolean }> => {
  const cookieHeader = req.headers.get("cookie");
  if (!cookieHeader) {
    throw new Error("No session cookie found");
  }
  
  const cookies = parseCookies(cookieHeader);
  const sessionToken = cookies["session-token"];
  
  if (!sessionToken) {
    throw new Error("No session token found");
  }
  
  const session = await validateSession(sessionToken);
  if (!session) {
    throw new Error("Invalid session");
  }
  
  // Check if session needs rotation
  const needsRotation = shouldRotateSession(session.createdAt);
  
  if (needsRotation) {
    const newSessionToken = await rotateSession(sessionToken, session.userId);
    return { sessionToken: newSessionToken, rotated: true };
  }
  
  return { sessionToken, rotated: false };
};