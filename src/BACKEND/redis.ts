import { redis as bunRedis } from "bun";

// Redis client configuration
export const redis = bunRedis;
// Helper functions for Redis operations
export const RedisUtils = {
  // Set a key with TTL
  async setWithTTL(key: string, value: string, ttl: number): Promise<void> {
    await redis.setex(key, ttl, value);
  },

  // Get a key value
  async get(key: string): Promise<string | null> {
    return await redis.get(key);
  },

  // Delete a key
  async del(key: string): Promise<number> {
    return await redis.del(key);
  },

  // Add to a set
  async sadd(key: string, member: string): Promise<number> {
    return await redis.sadd(key, member);
  },

  // Remove from a set
  async srem(key: string, member: string): Promise<number> {
    return await redis.srem(key, member);
  },

  // Get all members of a set
  async smembers(key: string): Promise<string[]> {
    return await redis.smembers(key);
  },

  // Set expiration for a key
  async expire(key: string, ttl: number): Promise<number> {
    return await redis.expire(key, ttl);
  },

  // Check if key exists
  async exists(key: string): Promise<boolean> {
    return await redis.exists(key);
  },

  // Session-specific helpers
  sessionKey: (token: string) => `session:${token}`,
  userSessionsKey: (userId: number) => `user_sessions:${userId}`,
  emailVerificationKey: (token: string) => `email_verification:${token}`,
  passwordResetKey: (token: string) => `password_reset:${token}`,
};

// Test Redis connection
export const testRedisConnection = async (): Promise<boolean> => {
  try {
    const testKey = "test:connection";
    await redis.set(testKey, "test");
    const result = await redis.get(testKey);
    await redis.del(testKey);
    return result === "test";
  } catch (error) {
    console.error("Redis connection test failed:", error);
    return false;
  }
};

// Initialize Redis with error handling
export const initializeRedis = async (): Promise<void> => {
  const isConnected = await testRedisConnection();
  if (!isConnected) {
    console.warn("Warning: Redis connection failed. Session management will fall back to database.");
  } else {
    console.log("Redis connected successfully for session management");
  }
};

export default redis;