import { randomBytes } from "crypto";
import { db } from "../../index";
import { usersTable } from "../../DB/schema";
import { eq } from "drizzle-orm";
import { redis, RedisUtils, testRedisConnection } from "../redis";

// Session limit configuration
const MAX_SESSIONS_PER_USER = 5; // Maximum concurrent sessions per user

// Session data interface for type safety
interface SessionData {
  userId: number;
  email: string;
  name: string;
  emailVerified: boolean;
  createdAt: string;
  lastAccessed: string;
}

// Helper function to check and enforce session limit
const enforceSessionLimit = async (userId: number): Promise<void> => {
  try {
    // Get current sessions for the user from Redis
    const userSessionsKey = RedisUtils.userSessionsKey(userId);
    const userSessions = await RedisUtils.smembers(userSessionsKey);
    
    // If at limit, remove the oldest session
    if (userSessions.length >= MAX_SESSIONS_PER_USER) {
      // Find the oldest session by checking each session's creation time
      let oldestSessionToken: string | null = null;
      let oldestSessionTime: Date | null = null;
      
      for (const sessionToken of userSessions) {
        const sessionKey = RedisUtils.sessionKey(sessionToken);
        const sessionDataStr = await RedisUtils.get(sessionKey);
        
        if (sessionDataStr) {
          try {
            const sessionData = JSON.parse(sessionDataStr) as SessionData;
            const sessionCreatedAt = new Date(sessionData.createdAt);
            if (!oldestSessionTime || sessionCreatedAt < oldestSessionTime) {
              oldestSessionTime = sessionCreatedAt;
              oldestSessionToken = sessionToken;
            }
          } catch (parseError) {
            console.error("Error parsing session data during limit enforcement:", parseError);
            // Remove malformed session
            await RedisUtils.del(sessionKey);
            await RedisUtils.srem(userSessionsKey, sessionToken);
          }
        } else {
          // Remove expired or invalid session from the set
          await RedisUtils.srem(userSessionsKey, sessionToken);
        }
      }
      
      // Invalidate the oldest session if found
      if (oldestSessionToken) {
        await invalidateSession(oldestSessionToken);
      }
    }
  } catch (error) {
    console.error("Error enforcing session limit:", error);
    throw new Error("Failed to enforce session limit");
  }
};

export const createSession = async (userId: number): Promise<string> => {
  // Check Redis connection first
  const redisAvailable = await testRedisConnection();
  if (!redisAvailable) {
    throw new Error("Redis is not available. Session management requires Redis.");
  }

  // Enforce session limit before creating a new session
  await enforceSessionLimit(userId);
  
  // Get user data to store with session
  const user = await db
    .select({
      email: usersTable.email,
      name: usersTable.name,
      emailVerified:usersTable.emailVerified
    })
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);
    
  if (user.length === 0) {
    throw new Error("User not found");
  }
  
  const userData = user[0]!;
  const sessionData: SessionData = {
    userId,
    email: userData.email,
    name: userData.name,
    emailVerified: userData.emailVerified,
    createdAt: new Date().toISOString(),
    lastAccessed: new Date().toISOString(),
  };
  
  const sessionToken = randomBytes(32).toString("hex");
  const sessionKey = RedisUtils.sessionKey(sessionToken);
  const userSessionsKey = RedisUtils.userSessionsKey(userId);
  const ttl = 7 * 24 * 60 * 60; // 7 days in seconds
  
  // Set session data with TTL
  await RedisUtils.setWithTTL(sessionKey, JSON.stringify(sessionData), ttl);
  
  // Add session to user's session set
  await RedisUtils.sadd(userSessionsKey, sessionToken);
  await RedisUtils.expire(userSessionsKey, ttl);
  
  return sessionToken;
};

export const validateSession = async (sessionToken: string): Promise<{ userId: number; email: string; name: string; emailVerified: boolean; createdAt: string } | null> => {
  const redisAvailable = await testRedisConnection();
  if (!redisAvailable) {
    return null;
  }

  try {
    // Get session from Redis
    const sessionKey = RedisUtils.sessionKey(sessionToken);
    const sessionDataStr = await RedisUtils.get(sessionKey);
    
    if (!sessionDataStr) {
      return null;
    }
    
    let sessionData: SessionData | null = null;
    try {
      sessionData = JSON.parse(sessionDataStr) as SessionData;
      
      // Validate session data structure
      if (!sessionData ||
          typeof sessionData.userId !== 'number' ||
          typeof sessionData.email !== 'string' ||
          typeof sessionData.name !== 'string' ||
          typeof sessionData.emailVerified !== 'boolean' ||
          typeof sessionData.createdAt !== 'string' ||
          typeof sessionData.lastAccessed !== 'string') {
        throw new Error('Invalid session data structure');
      }
    } catch (parseError) {
      console.error("Error parsing session data:", parseError);
      // Delete malformed session
      await RedisUtils.del(sessionKey);
      return null;
    }
    
    // Update last accessed time in Redis
    sessionData.lastAccessed = new Date().toISOString();
    const ttl = 7 * 24 * 60 * 60; // 7 days in seconds
    await RedisUtils.setWithTTL(sessionKey, JSON.stringify(sessionData), ttl);
    
    return {
      userId: sessionData.userId,
      email: sessionData.email,
      name: sessionData.name,
      emailVerified: sessionData.emailVerified,
      createdAt: sessionData.createdAt,
    };
  } catch (error) {
    console.error("Error validating session:", error);
    return null;
  }
};

export const invalidateSession = async (sessionToken: string): Promise<void> => {
  const redisAvailable = await testRedisConnection();
  if (!redisAvailable) {
    console.warn("Redis not available, cannot invalidate session");
    return;
  }

  try {
    const sessionKey = RedisUtils.sessionKey(sessionToken);
    
    // Get session data to extract userId
    const sessionDataStr = await RedisUtils.get(sessionKey);
    if (sessionDataStr) {
      let sessionData: SessionData | null = null;
      try {
        sessionData = JSON.parse(sessionDataStr) as SessionData;
      } catch (parseError) {
        console.error("Error parsing session data during invalidation:", parseError);
      }
      
      if (sessionData?.userId) {
        // Remove from user's session set
        const userSessionsKey = RedisUtils.userSessionsKey(sessionData.userId);
        await RedisUtils.srem(userSessionsKey, sessionToken);
      }
    }
    
    // Delete the session
    await RedisUtils.del(sessionKey);
  } catch (error) {
    console.error("Error invalidating session:", error);
  }
};

export const invalidateAllUserSessions = async (userId: number): Promise<void> => {
  const redisAvailable = await testRedisConnection();
  if (!redisAvailable) {
    console.warn("Redis not available, cannot invalidate all user sessions");
    return;
  }

  try {
    // Get all sessions for the user
    const userSessionsKey = RedisUtils.userSessionsKey(userId);
    const userSessions = await RedisUtils.smembers(userSessionsKey);
    
    // Delete each session
    for (const sessionToken of userSessions) {
      const sessionKey = RedisUtils.sessionKey(sessionToken);
      await RedisUtils.del(sessionKey);
    }
    
    // Clear the user's session set
    await RedisUtils.del(userSessionsKey);
  } catch (error) {
    console.error("Error invalidating all user sessions:", error);
  }
};