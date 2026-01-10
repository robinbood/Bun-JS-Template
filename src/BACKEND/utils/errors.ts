/**
 * Centralized error handling utilities for consistent error responses
 */

// Error types for better error classification
export enum ErrorType {
  VALIDATION = 'VALIDATION',
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  RATE_LIMIT = 'RATE_LIMIT',
  INTERNAL = 'INTERNAL',
  EXTERNAL_SERVICE = 'EXTERNAL_SERVICE'
}

// Custom error class with type and additional context
export class AppError extends Error {
  public readonly type: ErrorType;
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly context?: Record<string, any>;

  constructor(
    type: ErrorType,
    message: string,
    statusCode: number = 500,
    isOperational: boolean = true,
    context?: Record<string, any>
  ) {
    super(message);
    this.type = type;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.context = context;
    
    // Maintains proper stack trace for where our error was thrown
    Error.captureStackTrace(this, this.constructor);
  }
}

// Error factory functions for creating consistent errors
export const ErrorFactory = {
  validation: (message: string, context?: Record<string, any>) => 
    new AppError(ErrorType.VALIDATION, message, 400, true, context),
    
  authentication: (message: string = 'Authentication failed') => 
    new AppError(ErrorType.AUTHENTICATION, message, 401),
    
  authorization: (message: string = 'Access denied') => 
    new AppError(ErrorType.AUTHORIZATION, message, 403),
    
  notFound: (resource: string = 'Resource') => 
    new AppError(ErrorType.NOT_FOUND, `${resource} not found`, 404),
    
  conflict: (message: string) => 
    new AppError(ErrorType.CONFLICT, message, 409),
    
  rateLimit: (message: string = 'Too many requests') => 
    new AppError(ErrorType.RATE_LIMIT, message, 429),
    
  internal: (message: string = 'Internal server error', context?: Record<string, any>) => 
    new AppError(ErrorType.INTERNAL, message, 500, false, context),
    
  externalService: (service: string, message: string = 'External service error') => 
    new AppError(ErrorType.EXTERNAL_SERVICE, `${service}: ${message}`, 502, true, { service })
};

// Error handler for processing errors and returning appropriate responses
export const handleError = (error: unknown): { 
  statusCode: number; 
  body: { 
    error: string; 
    type?: string; 
    context?: any;
    requestId?: string;
  } 
} => {
  // Generate a unique request ID for tracking
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // Log the error with context
  console.error(`[${requestId}] Error:`, {
    message: error instanceof Error ? error.message : 'Unknown error',
    stack: error instanceof Error ? error.stack : undefined,
    type: error instanceof AppError ? error.type : 'UNKNOWN',
    context: error instanceof AppError ? error.context : undefined
  });

  // If it's our custom error, use its properties
  if (error instanceof AppError) {
    return {
      statusCode: error.statusCode,
      body: {
        error: error.message,
        type: error.type,
        ...(error.context && { context: error.context }),
        requestId
      }
    };
  }

  // Handle known error types
  if (error instanceof Error) {
    // Check for common database errors
    if (error.message.includes('unique constraint')) {
      return {
        statusCode: 409,
        body: {
          error: 'Resource already exists',
          type: ErrorType.CONFLICT,
          requestId
        }
      };
    }
    
    // Check for validation errors
    if (error.message.includes('validation')) {
      return {
        statusCode: 400,
        body: {
          error: error.message,
          type: ErrorType.VALIDATION,
          requestId
        }
      };
    }
  }

  // Default to internal server error
  return {
    statusCode: 500,
    body: {
      error: 'Internal server error',
      type: ErrorType.INTERNAL,
      requestId
    }
  };
};

// Async error wrapper for consistent error handling in async functions
export const asyncHandler = (fn: Function) => {
  return (req: Request, ...args: any[]) => {
    Promise.resolve(fn(req, ...args)).catch((error) => {
      const { statusCode, body } = handleError(error);
      return new Response(JSON.stringify(body), {
        status: statusCode,
        headers: { 'Content-Type': 'application/json' }
      });
    });
  };
};