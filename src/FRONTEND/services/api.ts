// Configuration
const API_CONFIG = {
  BASE_URL: process.env.NODE_ENV === "production"
    ? "https://your-production-domain.com"
    : "http://localhost:3000",
  DEFAULT_TIMEOUT: 10000, // 10 seconds
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000, // 1 second
};

// Custom error class for API errors
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public data?: any,
    public requestId?: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// Request timeout utility
const createTimeoutController = (timeout: number = API_CONFIG.DEFAULT_TIMEOUT) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  return { controller, timeoutId };
};

// Retry utility with exponential backoff
const retryRequest = async <T>(
  requestFn: () => Promise<T>,
  attempts: number = API_CONFIG.RETRY_ATTEMPTS,
  delay: number = API_CONFIG.RETRY_DELAY
): Promise<T> => {
  try {
    return await requestFn();
  } catch (error) {
    if (attempts <= 1 || !(error instanceof ApiError) || error.status >= 500) {
      throw error;
    }
    
    // Wait before retrying with exponential backoff
    await new Promise(resolve => setTimeout(resolve, delay * (API_CONFIG.RETRY_ATTEMPTS - attempts + 1)));
    
    return retryRequest(requestFn, attempts - 1, delay);
  }
};

// Core API request function with improved error handling and retry logic
export const apiRequest = async <T = any>(
  endpoint: string,
  options: RequestInit = {},
  timeout: number = API_CONFIG.DEFAULT_TIMEOUT
): Promise<T> => {
  const url = `${API_CONFIG.BASE_URL}${endpoint}`;
  
  const requestFn = async (): Promise<T> => {
    const { controller, timeoutId } = createTimeoutController(timeout);
    
    try {
      const response = await fetch(url, {
        headers: {
          "Content-Type": "application/json",
          ...options.headers,
        },
        credentials: "include", // Include cookies for session management
        signal: controller.signal,
        ...options,
      });
      
      clearTimeout(timeoutId);
      
      // Handle non-JSON responses
      const contentType = response.headers.get("content-type");
      let data: any;
      
      if (contentType && contentType.includes("application/json")) {
        data = await response.json();
      } else {
        data = await response.text();
      }
      
      if (!response.ok) {
        throw new ApiError(
          data?.error || data || "An error occurred",
          response.status,
          data,
          data?.requestId
        );
      }
      
      return data;
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error && error.name === "AbortError") {
        throw new ApiError("Request timeout", 408);
      }
      
      throw error;
    }
  };
  
  return retryRequest(requestFn);
};

// API client with organized endpoints
export const apiClient = {
  // Request method helpers
  get: <T = any>(endpoint: string, options?: RequestInit) =>
    apiRequest<T>(endpoint, { method: "GET", ...options }),
    
  post: <T = any>(endpoint: string, data?: any, options?: RequestInit) =>
    apiRequest<T>(endpoint, {
      method: "POST",
      body: data ? JSON.stringify(data) : undefined,
      ...options,
    }),
    
  put: <T = any>(endpoint: string, data?: any, options?: RequestInit) =>
    apiRequest<T>(endpoint, {
      method: "PUT",
      body: data ? JSON.stringify(data) : undefined,
      ...options,
    }),
    
  delete: <T = any>(endpoint: string, options?: RequestInit) =>
    apiRequest<T>(endpoint, { method: "DELETE", ...options }),
};

// Authentication API methods
export const authApi = {
  login: (email: string, password: string) =>
    apiClient.post("/api/auth/login", { email, password }),
    
  register: (name: string, email: string, password: string) =>
    apiClient.post("/api/auth/register", { name, email, password }),
    
  logout: () =>
    apiClient.post("/api/auth/logout"),
    
  getCurrentUser: () =>
    apiClient.get("/api/auth/me"),
    
  verifyEmail: (token: string) =>
    apiClient.get(`/api/auth/verify/${token}`),
    
  forgotPassword: (email: string) =>
    apiClient.post("/api/auth/forgot-password", { email }),
    
  resetPassword: (token: string, newPassword: string) =>
    apiClient.post("/api/auth/reset-password", { token, newPassword }),
};

// Utility functions for common operations
export const apiUtils = {
  // Check if online
  isOnline: () => navigator.onLine,
  
  // Handle offline state
  handleOffline: (callback: () => void) => {
    window.addEventListener('offline', callback);
  },
  
  // Handle online state
  handleOnline: (callback: () => void) => {
    window.addEventListener('online', callback);
  },
  
  // Create a request queue for offline mode
  createRequestQueue: () => {
    const queue: Array<() => Promise<any>> = [];
    let isProcessing = false;
    
    return {
      add: (request: () => Promise<any>) => {
        queue.push(request);
        if (!isProcessing && apiUtils.isOnline()) {
          processQueue();
        }
      },
      process: processQueue
    };
    
    async function processQueue() {
      if (isProcessing || queue.length === 0 || !apiUtils.isOnline()) return;
      
      isProcessing = true;
      
      while (queue.length > 0 && apiUtils.isOnline()) {
        const request = queue.shift();
        if (request) {
          try {
            await request();
          } catch (error) {
            console.error('Queued request failed:', error);
          }
        }
      }
      
      isProcessing = false;
    }
  }
};