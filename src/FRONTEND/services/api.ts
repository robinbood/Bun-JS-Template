const API_BASE_URL = process.env.NODE_ENV === "production" 
  ? "https://your-production-domain.com" 
  : "http://localhost:3000";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public data?: any
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export const apiRequest = async (
  endpoint: string,
  options: RequestInit = {}
): Promise<any> => {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    credentials: "include", // Include cookies for session management
    ...options,
  });
  
  const data = await response.json();
  
  if (!response.ok) {
    throw new ApiError(
      data.error || "An error occurred",
      response.status,
      data
    );
  }
  
  return data;
};

// Authentication API methods
export const authApi = {
  login: (email: string, password: string) =>
    apiRequest("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
    
  register: (name: string, email: string, password: string) =>
    apiRequest("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ name, email, password }),
    }),
    
  logout: () =>
    apiRequest("/api/auth/logout", {
      method: "POST",
    }),
    
  getCurrentUser: () =>
    apiRequest("/api/auth/me", {
      method: "GET",
    }),
    
  verifyEmail: (token: string) =>
    apiRequest(`/api/auth/verify/${token}`, {
      method: "GET",
    }),
    
  forgotPassword: (email: string) =>
    apiRequest("/api/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    }),
    
  resetPassword: (token: string, newPassword: string) =>
    apiRequest("/api/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ token, newPassword }),
    }),
};