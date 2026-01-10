// Cookie parsing utility
export const parseCookies = (cookieHeader: string): Record<string, string> => {
  const cookies: Record<string, string> = {};
  cookieHeader.split(";").forEach(cookie => {
    const [name, value] = cookie.trim().split("=");
    if (name && value) {
      cookies[name] = value;
    }
  });
  return cookies;
};

// Export middleware functions
export {
  rateLimitMiddleware,
  validateContentType,
  parseCookiesMiddleware,
  extractSessionToken,
  addRequestId,
  logRequest,
  logResponse,
  securityHeadersMiddleware
} from './middleware';

// Response helper for consistent API responses
export const createApiResponse = (
  data: any,
  status: number = 200,
  headers: Record<string, string> = {}
): Response => {
  const defaultHeaders = {
    "Content-Type": "application/json",
    ...headers,
  };
  
  return new Response(JSON.stringify(data), {
    status,
    headers: defaultHeaders,
  });
};

// Error response helper
export const createErrorResponse = (
  error: string,
  status: number = 400,
  data?: any
): Response => {
  return createApiResponse(
    { error, ...(data && { data }) },
    status
  );
};

// Success response helper
export const createSuccessResponse = (
  message: string,
  data?: any,
  status: number = 200
): Response => {
  return createApiResponse(
    { message, ...(data && { data }) },
    status
  );
};

// Session cookie helper
export const createSessionCookie = (sessionToken: string): string => {
  const maxAge = 7 * 24 * 60 * 60; // 7 days in seconds
  return `session-token=${sessionToken}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}`;
};

// Clear session cookie helper
export const createClearSessionCookie = (): string => {
  return "session-token=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0";
};

// Input validation helpers
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validateRequired = (value: any, fieldName: string): string | null => {
  if (!value || (typeof value === 'string' && value.trim() === '')) {
    return `${fieldName} is required`;
  }
  return null;
};

// Performance monitoring helper
export const logPerformance = (operation: string, startTime: number): void => {
  const duration = Date.now() - startTime;
  console.log(`Performance: ${operation} took ${duration}ms`);
  
  // Log slow operations
  if (duration > 1000) {
    console.warn(`Slow operation detected: ${operation} took ${duration}ms`);
  }
};

// Database query helper with performance monitoring
export const withPerformanceLogging = async <T>(
  operation: string,
  query: () => Promise<T>
): Promise<T> => {
  const startTime = Date.now();
  try {
    const result = await query();
    logPerformance(operation, startTime);
    return result;
  } catch (error) {
    logPerformance(`${operation} (failed)`, startTime);
    throw error;
  }
};

// Rate limiting helper (in-memory, for production use Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

export const checkRateLimit = (
  identifier: string,
  maxRequests: number = 100,
  windowMs: number = 60 * 1000 // 1 minute
): { allowed: boolean; remaining: number; resetTime: number } => {
  const now = Date.now();
  const key = identifier;
  const record = rateLimitStore.get(key);
  
  if (!record || now > record.resetTime) {
    // Create new record or reset expired one
    const newRecord = {
      count: 1,
      resetTime: now + windowMs,
    };
    rateLimitStore.set(key, newRecord);
    return {
      allowed: true,
      remaining: maxRequests - 1,
      resetTime: newRecord.resetTime,
    };
  }
  
  if (record.count >= maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: record.resetTime,
    };
  }
  
  record.count++;
  return {
    allowed: true,
    remaining: maxRequests - record.count,
    resetTime: record.resetTime,
  };
};

// Security headers helper
export const getSecurityHeaders = (): Record<string, string> => {
  return {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "X-XSS-Protection": "1; mode=block",
    "Referrer-Policy": "strict-origin-when-cross-origin",
  };
};

// Sanitization helpers
export const sanitizeString = (str: string): string => {
  return str.trim().replace(/[<>]/g, "");
};

export const sanitizeEmail = (email: string): string => {
  return email.toLowerCase().trim();
};