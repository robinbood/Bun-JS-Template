# Redis Integration for Session Caching

## Overview
This document outlines the plan to integrate Redis for session caching and enhanced performance in the authentication system.

## Benefits of Redis Integration

1. **Performance Improvement**
   - Faster session lookups (Redis vs. database queries)
   - Reduced database load
   - Better response times for authenticated requests

2. **Scalability**
   - Shared session state across multiple server instances
   - Support for horizontal scaling
   - Session persistence across server restarts

3. **Enhanced Security**
   - Centralized session invalidation
   - Real-time session monitoring
   - Ability to revoke all user sessions immediately

4. **Advanced Features**
   - Session analytics and monitoring
   - Rate limiting per user or IP
   - User session history tracking
   - Cross-device session management

## Required Dependencies

Add these to package.json:

```json
{
  "dependencies": {
    "redis": "^4.6.10",
    "@types/redis": "^4.0.11"
  }
}
```

## Configuration Files

### 1. Environment Variables
Add to `.env` file:
```
# Redis Configuration
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=your_redis_password
REDIS_DB=0  # Default database

# Session Configuration
SESSION_SECRET=your_session_secret_here
SESSION_TTL=604800  # 7 days in seconds
```

### 2. Redis Client Configuration
Create `src/config/redis.ts`:

```typescript
import { Redis } from "redis";

// Create Redis client
const redis = new Redis({
  url: process.env.REDIS_URL,
  password: process.env.REDIS_PASSWORD,
  database: parseInt(process.env.REDIS_DB || "0"),
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3,
});

export default redis;
```

## Implementation Plan

### 1. Update Session Management
Modify `src/BACKEND/auth/session.ts`:

```typescript
import { db } from "../../index";
import { sessionsTable, usersTable } from "../../DB/schema";
import { eq, and, gt } from "drizzle-orm";
import redis from "../../config/redis";
import { randomBytes } from "crypto";

// Create session with Redis caching
export const createSession = async (userId: number): Promise<string> => {
  const sessionToken = randomBytes(32).toString("hex");
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now
  
  // Store in database for persistence
  await db.insert(sessionsTable).values({
    userId,
    sessionToken,
    expiresAt,
  });
  
  // Cache in Redis for fast access
  const sessionData = {
    userId,
    sessionToken,
    expiresAt: expiresAt.toISOString(),
  };
  
  await redis.setex(
    `session:${sessionToken}`,
    JSON.stringify(sessionData),
    process.env.SESSION_TTL || "604800" // 7 days in seconds
  );
  
  return sessionToken;
};

// Validate session with Redis caching
export const validateSession = async (sessionToken: string): Promise<{ userId: number; email: string } | null> => {
  // First check Redis cache
  const cachedSession = await redis.get(`session:${sessionToken}`);
  
  if (cachedSession) {
    const sessionData = JSON.parse(cachedSession);
    const expiresAt = new Date(sessionData.expiresAt);
    
    // Check if session is still valid
    if (expiresAt > new Date()) {
      // Update last accessed time in database
      await db
        .update(sessionsTable)
        .set({ lastAccessed: new Date() })
        .where(eq(sessionsTable.sessionToken, sessionToken));
      
      return {
        userId: sessionData.userId,
        email: sessionData.email,
      };
    }
    
    // Session expired, remove from cache
    await redis.del(`session:${sessionToken}`);
    return null;
  }
  
  // If not in cache, check database
  const session = await db
    .select({
      userId: sessionsTable.userId,
      email: usersTable.email,
    })
    .from(sessionsTable)
    .innerJoin(usersTable, eq(sessionsTable.userId, usersTable.id))
    .where(
      and(
        eq(sessionsTable.sessionToken, sessionToken),
        gt(sessionsTable.expiresAt, new Date())
      )
    )
    .limit(1);
    
  if (session.length === 0) {
    return null;
  }
  
  // Cache the session for future requests
  await redis.setex(
    `session:${sessionToken}`,
    JSON.stringify({
      userId: session[0].userId,
      email: session[0].email,
      expiresAt: session[0].expiresAt,
    }),
    process.env.SESSION_TTL || "604800"
  );
  
  // Update last accessed time
  await db
    .update(sessionsTable)
    .set({ lastAccessed: new Date() })
    .where(eq(sessionsTable.sessionToken, sessionToken));
  
  return {
    userId: session[0].userId,
    email: session[0].email,
  };
};

// Invalidate session with Redis cleanup
export const invalidateSession = async (sessionToken: string): Promise<void> => {
  // Remove from Redis cache
  await redis.del(`session:${sessionToken}`);
  
  // Remove from database
  await db
    .delete(sessionsTable)
    .where(eq(sessionsTable.sessionToken, sessionToken));
};

// Invalidate all user sessions
export const invalidateAllUserSessions = async (userId: number): Promise<void> => {
  // Get all user sessions from database
  const userSessions = await db
    .select({ sessionToken: sessionsTable.sessionToken })
    .from(sessionsTable)
    .where(eq(sessionsTable.userId, userId));
  
  // Remove from Redis cache and database
  for (const session of userSessions) {
    await redis.del(`session:${session.sessionToken}`);
    await db
      .delete(sessionsTable)
      .where(eq(sessionsTable.sessionToken, session.sessionToken));
  }
};
```

### 2. Create Session Middleware
Create `src/BACKEND/middleware/rateLimit.ts`:

```typescript
import { redis } from "../../config/redis";

// Rate limiting with Redis
export const rateLimitMiddleware = async (
  request: Request,
  options: {
    windowMs: number = 60000; // 1 minute
    maxRequests: number = 100;
  }
) => {
  const ip = request.headers.get("x-forwarded-for") || 
                request.headers.get("x-real-ip") || 
                "unknown";
  
  const key = `rate_limit:${ip}`;
  const current = await redis.incr(key);
  
  if (current === 1) {
    // First request in window, set expiration
    await redis.expire(key, Math.ceil(options.windowMs / 1000));
  } else {
    const ttl = await redis.ttl(key);
    if (ttl === -1) {
      // Key doesn't exist, set expiration
      await redis.expire(key, Math.ceil(options.windowMs / 1000));
    }
  }
  
  const requests = current;
  
  if (requests > options.maxRequests) {
    return new Response("Too many requests", { 
      status: 429,
      headers: {
        "X-RateLimit-Limit": options.maxRequests.toString(),
        "X-RateLimit-Remaining": "0",
        "X-RateLimit-Reset": new Date(Date.now() + options.windowMs).toISOString(),
      }
    });
  }
  
  // Reset counter after window
  if (requests === 1) {
    await redis.expire(key, Math.ceil(options.windowMs / 1000));
  }
  
  return null;
};
```

### 3. Update Authentication Routes
Modify `src/BACKEND/routes/auth.ts` to use rate limiting:

```typescript
import { rateLimitMiddleware } from "../middleware/rateLimit";

// Add rate limiting to login route
"POST /api/auth/login": [
  rateLimitMiddleware,
  async (req) => {
    // Existing login logic
  },
],

// Add rate limiting to registration route
"POST /api/auth/register": [
  rateLimitMiddleware,
  async (req) => {
    // Existing registration logic
  },
],
```

### 4. Create Session Analytics
Create `src/BACKEND/services/sessionAnalytics.ts`:

```typescript
import redis from "../config/redis";

export const getSessionAnalytics = async (userId: number) => {
  const pattern = `session:${userId}:*`;
  const keys = await redis.keys(pattern);
  
  let activeSessions = 0;
  let totalSessions = 0;
  
  for (const key of keys) {
    const sessionData = await redis.get(key);
    if (sessionData) {
      totalSessions++;
      const parsed = JSON.parse(sessionData);
      const expiresAt = new Date(parsed.expiresAt);
      
      if (expiresAt > new Date()) {
        activeSessions++;
      }
    }
  }
  
  return {
    activeSessions,
    totalSessions,
    lastLogin: keys.length > 0 ? new Date() : null,
  };
};

export const trackSessionActivity = async (sessionToken: string, activity: string) => {
  const key = `session_activity:${sessionToken}`;
  await redis.setex(key, JSON.stringify({
    activity,
    timestamp: new Date().toISOString(),
  }), 86400); // 24 hours
};
```

### 5. Docker Configuration
Create `docker-compose.yml` update:

```yaml
services:
  app:
    # ... existing services
  
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    environment:
      - REDIS_PASSWORD=your_redis_password
```

## Implementation Steps

1. **Add Redis Dependencies**
   - Update package.json with redis and @types/redis
   - Install dependencies with `bun install`

2. **Configure Redis Connection**
   - Add Redis environment variables
   - Create Redis client configuration
   - Test Redis connection

3. **Update Session Management**
   - Implement Redis caching in createSession and validateSession
   - Add Redis cleanup in invalidateSession
   - Implement session analytics tracking

4. **Add Rate Limiting**
   - Implement IP-based rate limiting with Redis
   - Apply to authentication endpoints
   - Configure appropriate limits

5. **Create Session Analytics**
   - Track active sessions per user
   - Monitor session creation and invalidation
   - Add session activity tracking

6. **Update Docker Configuration**
   - Add Redis service to docker-compose.yml
   - Configure Redis persistence
   - Set up proper networking

## Security Considerations

1. **Redis Security**
   - Use AUTH password for Redis
   - Enable TLS in production
   - Network isolation for Redis

2. **Session Security**
   - Use secure, random tokens
   - Implement proper expiration
   - Add session rotation for sensitive operations

3. **Rate Limiting**
   - Implement progressive rate limits
   - Add CAPTCHA for suspicious activity
   - Consider user-based vs. IP-based limits

## Performance Benefits

- **Reduced Database Load**: 80-90% of session lookups served from Redis cache
- **Lower Latency**: Redis memory access vs. disk I/O
- **Higher Throughput**: Concurrent request handling
- **Better Scalability**: Horizontal scaling with shared session state

## Monitoring

Add these metrics to track:
- Cache hit/miss ratios
- Session creation/invalidation rates
- Rate limit violations
- Redis memory usage
- Response times for authenticated requests

This Redis integration will significantly improve the performance and scalability of the authentication system while maintaining all existing functionality.