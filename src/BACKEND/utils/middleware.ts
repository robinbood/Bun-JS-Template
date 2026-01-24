import { ErrorFactory, handleError } from './errors';
import { checkRateLimit } from './index';
import { getSecurityHeaders } from './index';

/**
 * Common middleware functions for request processing
 */

// Middleware to validate request body against a schema
export const validateRequestBody = (schema: any) => {
  return (req: Request) => {
    // Note: In a real implementation, you'd need to parse the body first
    // This is a placeholder for the validation concept
    return {
      success: true,
      data: null,
      error: null
    };
  };
};

// Middleware to check rate limiting
export const rateLimitMiddleware = (keyPrefix: string, maxRequests: number, windowMs: number) => {
  return (req: Request) => {
    const clientIP = req.headers.get("x-forwarded-for") || 
                    req.headers.get("x-real-ip") || 
                    "unknown";
    
    const rateLimitResult = checkRateLimit(`${keyPrefix}:${clientIP}`, maxRequests, windowMs);
    
    if (!rateLimitResult.allowed) {
      const { statusCode, body } = handleError(
        ErrorFactory.rateLimit("Too many requests. Please try again later.")
      );
      
      return new Response(JSON.stringify(body), {
        status: statusCode,
        headers: {
          'Content-Type': 'application/json',
          'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
          'X-RateLimit-Reset': rateLimitResult.resetTime.toString(),
          ...getSecurityHeaders()
        }
      });
    }
    
    return null; // Continue to next middleware
  };
};

// Middleware to add security headers
export const securityHeadersMiddleware = () => {
  return (req: Request) => {
    // This would be applied to the response
    // In a real implementation, you'd modify the response headers
    return getSecurityHeaders();
  };
};

// Middleware to parse cookies
export const parseCookiesMiddleware = (req: Request) => {
  const cookieHeader = req.headers.get("cookie");
  if (!cookieHeader) {
    return {};
  }
  
  const cookies: Record<string, string> = {};
  cookieHeader.split(";").forEach(cookie => {
    const [name, value] = cookie.trim().split("=");
    if (name && value) {
      cookies[name] = value;
    }
  });
  
  return cookies;
};

// Middleware to extract session token
export const extractSessionToken = (req: Request) => {
  const cookies = parseCookiesMiddleware(req);
  const sessionToken = cookies["session-token"];
  
  if (!sessionToken) {
    const { statusCode, body } = handleError(
      ErrorFactory.authentication("No session token found")
    );
    
    throw new Error(JSON.stringify({
      status: statusCode,
      body
    }));
  }
  
  return sessionToken;
};

// Middleware to validate content type
export const validateContentType = (expectedType: string = 'application/json') => {
  return (req: Request) => {
    const contentType = req.headers.get("content-type");
    
    if (!contentType || !contentType.includes(expectedType)) {
      const { statusCode, body } = handleError(
        ErrorFactory.validation(`Expected content-type: ${expectedType}`)
      );
      
      return new Response(JSON.stringify(body), {
        status: statusCode,
        headers: {
          'Content-Type': 'application/json',
          ...getSecurityHeaders()
        }
      });
    }
    
    return null; // Continue to next middleware
  };
};

// Middleware to add request ID for tracking
export const addRequestId = () => {
  return (req: Request) => {
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    return requestId;
  };
};

// Middleware to log requests
export const logRequest = (req: Request, requestId?: string) => {
  const timestamp = new Date().toISOString();
  const method = req.method;
  const url = req.url;
  const userAgent = req.headers.get("user-agent") || "unknown";
  const ip = req.headers.get("x-forwarded-for") || 
            req.headers.get("x-real-ip") || 
            "unknown";
  
  console.log(`[${requestId || 'NO_ID'}] ${timestamp} - ${method} ${url} - ${ip} - ${userAgent}`);
};

// Middleware to log responses
export const logResponse = (_req: Request, response: Response, requestId?: string, startTime?: number) => {
  const timestamp = new Date().toISOString();
  const statusCode = response.status;
  const duration = startTime ? `${Date.now() - startTime}ms` : "unknown";
  
  console.log(`[${requestId || 'NO_ID'}] ${timestamp} - Response: ${statusCode} - Duration: ${duration}`);
};

// Compose multiple middleware functions
export const composeMiddleware = (...middlewares: Function[]) => {
  return (req: Request) => {
    let result = req;
    
    for (const middleware of middlewares) {
      result = middleware(result);
      
      // If middleware returns a Response, stop processing and return it
      if (result instanceof Response) {
        return result;
      }
      
      // If middleware throws an error, handle it
      if (result instanceof Error) {
        const errorData = JSON.parse(result.message);
        return new Response(JSON.stringify(errorData.body), {
          status: errorData.status,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }
    
    return result;
  };
};