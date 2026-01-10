import { randomBytes } from "crypto";
import { db } from "../../index";
import { usersTable, sessionsTable } from "../../DB/schema";
import { eq, desc } from "drizzle-orm";
import { redis, RedisUtils, testRedisConnection } from "../redis";

// Session limit configuration
const MAX_SESSIONS_PER_USER = 5; // Maximum concurrent sessions per user

// Helper function to check and enforce session limit
const enforceSessionLimit = async (userId: number): Promise<void> => {
  const redisAvailable = await testRedisConnection();
  
  if (redisAvailable) {
    try {
      // Get current sessions for the user from Redis
      const userSessionsKey = RedisUtils.userSessionsKey(userId);
      const userSessions = await RedisUtils.smembers(userSessionsKey);
      
      // If at limit, remove the oldest session
      if (userSessions.length >= MAX_SESSIONS_PER_USER) {
        // Find the oldest session by checking each session's creation time
        let oldestSessionToken: string | null = null;
        let oldestSessionTime: string | null = null;
        
        for (const sessionToken of userSessions) {
          const sessionKey = RedisUtils.sessionKey(sessionToken);
          const sessionDataStr = await RedisUtils.get(sessionKey);
          
          if (sessionDataStr) {
            try {
              const sessionData = JSON.parse(sessionDataStr);
              if (!oldestSessionTime || sessionData.createdAt < oldestSessionTime) {
                oldestSessionTime = sessionData.createdAt;
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
      console.error("Error enforcing session limit in Redis:", error);
      // Fall back to database enforcement
      await enforceDatabaseSessionLimit(userId);
    }
  } else {
    // Use database enforcement
    await enforceDatabaseSessionLimit(userId);
  }
};

// Helper function to enforce session limit in database
const enforceDatabaseSessionLimit = async (userId: number): Promise<void> => {
  try {
    // Get current sessions for the user from database
    const userSessions = await db
      .select({
        sessionToken: sessionsTable.sessionToken,
        createdAt: sessionsTable.createdAt,
      })
      .from(sessionsTable)
      .where(eq(sessionsTable.userId, userId))
      .orderBy(desc(sessionsTable.createdAt)) // Order by newest first
      .limit(MAX_SESSIONS_PER_USER + 1); // Get one extra to check if we're over the limit
    
    // If over limit, invalidate the oldest sessions
    if (userSessions.length > MAX_SESSIONS_PER_USER) {
      // The last session in the array is the oldest (since we ordered by desc)
      const oldestSession = userSessions[userSessions.length - 1];
      if (oldestSession) {
        await invalidateDatabaseSession(oldestSession.sessionToken);
      }
    }
  } catch (error) {
    console.error("Error enforcing session limit in database:", error);
  }
};

export const createSession = async (userId: number): Promise<string> => {
  const sessionToken = randomBytes(32).toString("hex");
  
  // Enforce session limit before creating a new session
  await enforceSessionLimit(userId);
  
  // Check Redis connection first
  const redisAvailable = await testRedisConnection();
  
  // Get user data to store with session
  const user = await db
    .select({
      email: usersTable.email,
      name: usersTable.name,
      emailVerified: usersTable.emailVerified
    })
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);
    
  if (user.length === 0) {
    throw new Error("User not found");
  }
  
  const userData = user[0]!;
  const sessionData = {
    userId,
    email: userData.email,
    name: userData.name,
    emailVerified: userData.emailVerified,
    createdAt: new Date().toISOString(),
    lastAccessed: new Date().toISOString(),
  };
  
  const sessionKey = RedisUtils.sessionKey(sessionToken);
  const userSessionsKey = RedisUtils.userSessionsKey(userId);
  const ttl = 7 * 24 * 60 * 60; // 7 days in seconds
  
  if (redisAvailable) {
    try {
      // Set session data with TTL
      await RedisUtils.setWithTTL(sessionKey, JSON.stringify(sessionData), ttl);
      
      // Add session to user's session set
      await RedisUtils.sadd(userSessionsKey, sessionToken);
      await RedisUtils.expire(userSessionsKey, ttl);
    } catch (error) {
      console.error("Error creating session in Redis:", error);
      // Fall back to database storage
      return await createDatabaseSession(userId, sessionToken, sessionData);
    }
  } else {
    // Fall back to database storage
    return await createDatabaseSession(userId, sessionToken, sessionData);
  }
  
  return sessionToken;
};

// Fallback database session storage
const createDatabaseSession = async (userId: number, sessionToken: string, sessionData: any): Promise<string> => {
  try {
    await db.insert(sessionsTable).values({
      id: randomBytes(16).toString("hex"),
      userId,
      sessionToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      createdAt: new Date(),
      lastAccessed: new Date(),
    });
    return sessionToken;
  } catch (error) {
    console.error("Error creating session in database:", error);
    throw new Error("Failed to create session");
  }
};

export const validateSession = async (sessionToken: string): Promise<{ userId: number; email: string; name: string; emailVerified: boolean; createdAt: string } | null> => {
  const redisAvailable = await testRedisConnection();
  
  if (redisAvailable) {
    try {
      // Get session from Redis
      const sessionKey = RedisUtils.sessionKey(sessionToken);
      const sessionDataStr = await RedisUtils.get(sessionKey);
      
      if (!sessionDataStr) {
        // Try database as fallback
        return await validateDatabaseSession(sessionToken);
      }
      
      let sessionData;
      try {
        sessionData = JSON.parse(sessionDataStr);
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
      console.error("Error validating session in Redis:", error);
      // Try database as fallback
      return await validateDatabaseSession(sessionToken);
    }
  } else {
    // Use database validation
    return await validateDatabaseSession(sessionToken);
  }
};

// Fallback database session validation
const validateDatabaseSession = async (sessionToken: string): Promise<{ userId: number; email: string; name: string; emailVerified: boolean; createdAt: string } | null> => {
  try {
    const session = await db
      .select({
        userId: sessionsTable.userId,
        expiresAt: sessionsTable.expiresAt,
        createdAt: sessionsTable.createdAt,
      })
      .from(sessionsTable)
      .where(eq(sessionsTable.sessionToken, sessionToken))
      .limit(1);
      
    if (session.length === 0 || new Date() > session[0]!.expiresAt) {
      return null;
    }
    
    // Get user data
    const user = await db
      .select({
        email: usersTable.email,
        name: usersTable.name,
        emailVerified: usersTable.emailVerified,
      })
      .from(usersTable)
      .where(eq(usersTable.id, session[0]!.userId))
      .limit(1);
      
    if (user.length === 0) {
      return null;
    }
    
    // Update last accessed time
    await db
      .update(sessionsTable)
      .set({ lastAccessed: new Date() })
      .where(eq(sessionsTable.sessionToken, sessionToken));
      
    return {
      userId: session[0]!.userId,
      email: user[0]!.email,
      name: user[0]!.name,
      emailVerified: user[0]!.emailVerified,
      createdAt: session[0]!.createdAt.toISOString(),
    };
  } catch (error) {
    console.error("Error validating session in database:", error);
    return null;
  }
};

export const invalidateSession = async (sessionToken: string): Promise<void> => {
  const sessionKey = RedisUtils.sessionKey(sessionToken);
  const redisAvailable = await testRedisConnection();
  
  if (redisAvailable) {
    try {
      // Get session data to extract userId
      const sessionDataStr = await RedisUtils.get(sessionKey);
      if (sessionDataStr) {
        let sessionData;
        try {
          sessionData = JSON.parse(sessionDataStr);
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
      console.error("Error invalidating session in Redis:", error);
      // Try database as fallback
      await invalidateDatabaseSession(sessionToken);
    }
  } else {
    // Use database invalidation
    await invalidateDatabaseSession(sessionToken);
  }
};

// Fallback database session invalidation
const invalidateDatabaseSession = async (sessionToken: string): Promise<void> => {
  try {
    await db.delete(sessionsTable).where(eq(sessionsTable.sessionToken, sessionToken));
  } catch (error) {
    console.error("Error invalidating session in database:", error);
  }
};

export const invalidateAllUserSessions = async (userId: number): Promise<void> => {
  const redisAvailable = await testRedisConnection();
  
  if (redisAvailable) {
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
      console.error("Error invalidating all user sessions in Redis:", error);
      // Try database as fallback
      await invalidateAllDatabaseSessions(userId);
    }
  } else {
    // Use database invalidation
    await invalidateAllDatabaseSessions(userId);
  }
};

// Fallback database session invalidation for all user sessions
const invalidateAllDatabaseSessions = async (userId: number): Promise<void> => {
  try {
    await db.delete(sessionsTable).where(eq(sessionsTable.userId, userId));
  } catch (error) {
    console.error("Error invalidating all user sessions in database:", error);
  }
};