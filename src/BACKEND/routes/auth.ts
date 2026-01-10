import { AuthService } from '../services/authService';
import { handleError } from '../utils/errors';
import { 
  parseCookies, 
  createApiResponse, 
  createSessionCookie, 
  createClearSessionCookie,
  withPerformanceLogging,
  rateLimitMiddleware,
  extractSessionToken,
  addRequestId,
  logRequest,
  logResponse,
  validateContentType,
  getSecurityHeaders
} from '../utils';
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyEmailSchema,
  type RegisterInput,
  type LoginInput,
  type ForgotPasswordInput,
  type ResetPasswordInput,
  type VerifyEmailInput
} from '../validation/schemas';

/**
 * Auth routes with improved error handling and structure
 */

export const authRoutes = {
  // Register a new user
  "/api/auth/register": {
    async POST(req: Request) {
      const startTime = Date.now();
      const requestId = addRequestId()(req);
      
      try {
        // Log request
        logRequest(req, requestId);
        
        // Apply middleware
        const rateLimitResult = rateLimitMiddleware('register', 5, 15 * 60 * 1000)(req);
        if (rateLimitResult instanceof Response) return rateLimitResult;
        
        const contentTypeResult = validateContentType()(req);
        if (contentTypeResult instanceof Response) return contentTypeResult;
        
        // Parse and validate request body
        const body = await req.json();
        const validationResult = registerSchema.safeParse(body);
        
        if (!validationResult.success) {
          const { statusCode, body: errorBody } = handleError(
            new Error(validationResult.error.errors[0]?.message || "Validation failed")
          );
          return new Response(JSON.stringify(errorBody), {
            status: statusCode,
            headers: { 'Content-Type': 'application/json', ...getSecurityHeaders() }
          });
        }
        
        // Register user using service layer
        const result = await withPerformanceLogging(
          "user_registration",
          () => AuthService.register(validationResult.data as RegisterInput)
        );
        
        // Create response
        const response = createApiResponse(result, 201, getSecurityHeaders());
        
        // Log response
        logResponse(req, response, requestId, startTime);
        
        return response;
      } catch (error) {
        const { statusCode, body } = handleError(error);
        const response = new Response(JSON.stringify(body), {
          status: statusCode,
          headers: { 'Content-Type': 'application/json', ...getSecurityHeaders() }
        });
        
        logResponse(req, response, requestId, startTime);
        return response;
      }
    },
  },
  
  // Login user
  "/api/auth/login": {
    async POST(req: Request) {
      const startTime = Date.now();
      const requestId = addRequestId()(req);
      
      try {
        // Log request
        logRequest(req, requestId);
        
        // Apply middleware
        const rateLimitResult = rateLimitMiddleware('login', 10, 15 * 60 * 1000)(req);
        if (rateLimitResult instanceof Response) return rateLimitResult;
        
        const contentTypeResult = validateContentType()(req);
        if (contentTypeResult instanceof Response) return contentTypeResult;
        
        // Parse and validate request body
        const body = await req.json();
        const validationResult = loginSchema.safeParse(body);
        
        if (!validationResult.success) {
          const { statusCode, body: errorBody } = handleError(
            new Error(validationResult.error.errors[0]?.message || "Validation failed")
          );
          return new Response(JSON.stringify(errorBody), {
            status: statusCode,
            headers: { 'Content-Type': 'application/json', ...getSecurityHeaders() }
          });
        }
        
        // Login user using service layer
        const result = await withPerformanceLogging(
          "user_login",
          () => AuthService.login(
            (validationResult.data as LoginInput).email,
            (validationResult.data as LoginInput).password
          )
        );
        
        // Create response with session cookie
        const headers = {
          "Content-Type": "application/json",
          "Set-Cookie": createSessionCookie(result.sessionToken),
          ...getSecurityHeaders(),
        };
        
        const response = createApiResponse({
          message: "Login successful",
          user: result.user
        }, 200, headers);
        
        // Log response
        logResponse(req, response, requestId, startTime);
        
        return response;
      } catch (error) {
        const { statusCode, body } = handleError(error);
        const response = new Response(JSON.stringify(body), {
          status: statusCode,
          headers: { 'Content-Type': 'application/json', ...getSecurityHeaders() }
        });
        
        logResponse(req, response, requestId, startTime);
        return response;
      }
    },
  },
  
  // Logout user
  "/api/auth/logout": {
    async POST(req: Request) {
      const startTime = Date.now();
      const requestId = addRequestId()(req);
      
      try {
        // Log request
        logRequest(req, requestId);
        
        // Extract session token
        let sessionToken: string | undefined;
        try {
          sessionToken = extractSessionToken(req);
        } catch (error) {
          // If no session token, just clear the cookie
          const headers = {
            "Content-Type": "application/json",
            "Set-Cookie": createClearSessionCookie(),
            ...getSecurityHeaders(),
          };
          
          const response = createApiResponse(
            { message: "Logout successful" },
            200,
            headers
          );
          
          logResponse(req, response, requestId, startTime);
          return response;
        }
        
        // Logout user using service layer
        await withPerformanceLogging(
          "user_logout",
          () => AuthService.logout(sessionToken!)
        );
        
        // Create response with cleared session cookie
        const headers = {
          "Content-Type": "application/json",
          "Set-Cookie": createClearSessionCookie(),
          ...getSecurityHeaders(),
        };
        
        const response = createApiResponse(
          { message: "Logout successful" },
          200,
          headers
        );
        
        // Log response
        logResponse(req, response, requestId, startTime);
        
        return response;
      } catch (error) {
        const { statusCode, body } = handleError(error);
        const response = new Response(JSON.stringify(body), {
          status: statusCode,
          headers: { 'Content-Type': 'application/json', ...getSecurityHeaders() }
        });
        
        logResponse(req, response, requestId, startTime);
        return response;
      }
    },
  },
  
  // Get current user
  "/api/auth/me": {
    async GET(req: Request) {
      const startTime = Date.now();
      const requestId = addRequestId()(req);
      
      try {
        // Log request
        logRequest(req, requestId);
        
        // Extract session token
        const sessionToken = extractSessionToken(req);
        
        // Get current user using service layer
        const user = await withPerformanceLogging(
          "get_current_user",
          () => AuthService.getCurrentUser(sessionToken)
        );
        
        // Create response
        const response = createApiResponse(
          { user },
          200,
          getSecurityHeaders()
        );
        
        // Log response
        logResponse(req, response, requestId, startTime);
        
        return response;
      } catch (error) {
        const { statusCode, body } = handleError(error);
        const response = new Response(JSON.stringify(body), {
          status: statusCode,
          headers: { 'Content-Type': 'application/json', ...getSecurityHeaders() }
        });
        
        logResponse(req, response, requestId, startTime);
        return response;
      }
    },
  },
  
  // Verify email
  "/api/auth/verify/:token": {
    async GET(req: Request) {
      const startTime = Date.now();
      const requestId = addRequestId()(req);
      
      try {
        // Log request
        logRequest(req, requestId);
        
        // Extract token from URL
        const url = new URL(req.url);
        const token = url.pathname.split("/").pop();
        
        // Validate token
        const validationResult = verifyEmailSchema.safeParse({ token });
        
        if (!validationResult.success) {
          const { statusCode, body } = handleError(
            new Error(validationResult.error.errors[0]?.message || "Validation failed")
          );
          return new Response(JSON.stringify(body), {
            status: statusCode,
            headers: { 'Content-Type': 'application/json', ...getSecurityHeaders() }
          });
        }
        
        // Verify email using service layer
        const result = await withPerformanceLogging(
          "email_verification",
          () => AuthService.verifyEmail(token!)
        );
        
        // Create response
        const response = createApiResponse(result, 200, getSecurityHeaders());
        
        // Log response
        logResponse(req, response, requestId, startTime);
        
        return response;
      } catch (error) {
        const { statusCode, body } = handleError(error);
        const response = new Response(JSON.stringify(body), {
          status: statusCode,
          headers: { 'Content-Type': 'application/json', ...getSecurityHeaders() }
        });
        
        logResponse(req, response, requestId, startTime);
        return response;
      }
    },
  },
  
  // Forgot password
  "/api/auth/forgot-password": {
    async POST(req: Request) {
      const startTime = Date.now();
      const requestId = addRequestId()(req);
      
      try {
        // Log request
        logRequest(req, requestId);
        
        // Apply middleware
        const rateLimitResult = rateLimitMiddleware('forgot_password', 3, 60 * 60 * 1000)(req);
        if (rateLimitResult instanceof Response) return rateLimitResult;
        
        const contentTypeResult = validateContentType()(req);
        if (contentTypeResult instanceof Response) return contentTypeResult;
        
        // Parse and validate request body
        const body = await req.json();
        const validationResult = forgotPasswordSchema.safeParse(body);
        
        if (!validationResult.success) {
          const { statusCode, body: errorBody } = handleError(
            new Error(validationResult.error.errors[0]?.message || "Validation failed")
          );
          return new Response(JSON.stringify(errorBody), {
            status: statusCode,
            headers: { 'Content-Type': 'application/json', ...getSecurityHeaders() }
          });
        }
        
        // Send password reset email using service layer
        const result = await withPerformanceLogging(
          "forgot_password",
          () => AuthService.forgotPassword((validationResult.data as ForgotPasswordInput).email)
        );
        
        // Create response
        const response = createApiResponse(result, 200, getSecurityHeaders());
        
        // Log response
        logResponse(req, response, requestId, startTime);
        
        return response;
      } catch (error) {
        const { statusCode, body } = handleError(error);
        const response = new Response(JSON.stringify(body), {
          status: statusCode,
          headers: { 'Content-Type': 'application/json', ...getSecurityHeaders() }
        });
        
        logResponse(req, response, requestId, startTime);
        return response;
      }
    },
  },
  
  // Reset password
  "/api/auth/reset-password": {
    async POST(req: Request) {
      const startTime = Date.now();
      const requestId = addRequestId()(req);
      
      try {
        // Log request
        logRequest(req, requestId);
        
        // Apply middleware
        const rateLimitResult = rateLimitMiddleware('reset_password', 3, 60 * 60 * 1000)(req);
        if (rateLimitResult instanceof Response) return rateLimitResult;
        
        const contentTypeResult = validateContentType()(req);
        if (contentTypeResult instanceof Response) return contentTypeResult;
        
        // Parse and validate request body
        const body = await req.json();
        const validationResult = resetPasswordSchema.safeParse(body);
        
        if (!validationResult.success) {
          const { statusCode, body: errorBody } = handleError(
            new Error(validationResult.error.errors[0]?.message || "Validation failed")
          );
          return new Response(JSON.stringify(errorBody), {
            status: statusCode,
            headers: { 'Content-Type': 'application/json', ...getSecurityHeaders() }
          });
        }
        
        const { token, newPassword } = validationResult.data as ResetPasswordInput;
        
        // Reset password using service layer
        const result = await withPerformanceLogging(
          "reset_password",
          () => AuthService.resetPassword(token, newPassword)
        );
        
        // Create response
        const response = createApiResponse(result, 200, getSecurityHeaders());
        
        // Log response
        logResponse(req, response, requestId, startTime);
        
        return response;
      } catch (error) {
        const { statusCode, body } = handleError(error);
        const response = new Response(JSON.stringify(body), {
          status: statusCode,
          headers: { 'Content-Type': 'application/json', ...getSecurityHeaders() }
        });
        
        logResponse(req, response, requestId, startTime);
        return response;
      }
    },
  },
};