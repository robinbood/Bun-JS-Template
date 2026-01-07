import { randomBytes } from "crypto";
import { db } from "../../index";
import { usersTable } from "../../DB/schema";
import { eq } from "drizzle-orm";
// Import Redis client from Bun
import { redis } from "bun";

export const createSession = async (userId: number): Promise<string> => {
  const sessionToken = randomBytes(32).toString("hex");
  
  // Get user data to store with session
  const user = await db
    .select({ email: usersTable.email })
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);
    
  if (user.length === 0) {
    throw new Error("User not found");
  }
  
  // Store session in Redis
  const sessionData = {
    userId,
    email: user[0]!.email,
    createdAt: new Date().toISOString(),
    lastAccessed: new Date().toISOString(),
  };
  
  const sessionKey = `session:${sessionToken}`;
  const userSessionsKey = `user_sessions:${userId}`;
  const ttl = 7 * 24 * 60 * 60; // 7 days in seconds
  
  try {
    // Set session data with TTL
    await redis.setex(sessionKey, ttl, JSON.stringify(sessionData));
    
    // Add session to user's session set
    await redis.sadd(userSessionsKey, sessionToken);
    await redis.expire(userSessionsKey, ttl);
  } catch (error) {
    console.error("Error creating session in Redis:", error);
    throw new Error("Failed to create session");
  }
  
  return sessionToken;
};

export const validateSession = async (sessionToken: string): Promise<{ userId: number; email: string } | null> => {
  try {
    // Get session from Redis
    const sessionKey = `session:${sessionToken}`;
    const sessionDataStr = await redis.get(sessionKey);
    
    if (!sessionDataStr) {
      return null;
    }
    
    let sessionData;
    try {
      sessionData = JSON.parse(sessionDataStr);
    } catch (parseError) {
      console.error("Error parsing session data:", parseError);
      // Delete malformed session
      await redis.del(sessionKey);
      return null;
    }
    
    // Update last accessed time in Redis
    sessionData.lastAccessed = new Date().toISOString();
    const ttl = 7 * 24 * 60 * 60; // 7 days in seconds
    await redis.setex(sessionKey, ttl, JSON.stringify(sessionData));
    
    return {
      userId: sessionData.userId,
      email: sessionData.email,
    };
  } catch (error) {
    console.error("Error validating session:", error);
    return null;
  }
};

export const invalidateSession = async (sessionToken: string): Promise<void> => {
  const sessionKey = `session:${sessionToken}`;
  
  try {
    // Get session data to extract userId
    const sessionDataStr = await redis.get(sessionKey);
    if (sessionDataStr) {
      let sessionData;
      try {
        sessionData = JSON.parse(sessionDataStr);
      } catch (parseError) {
        console.error("Error parsing session data during invalidation:", parseError);
      }
      
      if (sessionData?.userId) {
        // Remove from user's session set
        const userSessionsKey = `user_sessions:${sessionData.userId}`;
        await redis.srem(userSessionsKey, sessionToken);
      }
    }
    
    // Delete the session
    await redis.del(sessionKey);
  } catch (error) {
    console.error("Error invalidating session:", error);
  }
};

export const invalidateAllUserSessions = async (userId: number): Promise<void> => {
  if (!redis) {
    console.error("Redis client not initialized");
    return;
  }

  try {
    // Get all sessions for the user
    const userSessionsKey = `user_sessions:${userId}`;
    const userSessions = await redis.smembers(userSessionsKey);
    
    // Delete each session
    for (const sessionToken of userSessions) {
      const sessionKey = `session:${sessionToken}`;
      await redis.del(sessionKey);
    }
    
    // Clear the user's session set
    await redis.del(userSessionsKey);
  } catch (error) {
    console.error("Error invalidating all user sessions:", error);
  }
};