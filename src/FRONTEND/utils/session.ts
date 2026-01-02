// Session management utilities for the frontend

export const SessionManager = {
  // Check if user is authenticated (client-side check)
  isAuthenticated: (): boolean => {
    // This is a basic check - the real authentication state is managed by the AuthContext
    // This can be used for quick checks before the AuthContext has loaded
    return document.cookie.includes('session-token=');
  },
  
  // Get session expiration time
  getSessionExpiration: (): Date | null => {
    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === 'session-token') {
        // In a real implementation, you might store expiration in a separate cookie
        // or decode it from the token if it contains expiration info
        return null; // Placeholder
      }
    }
    return null;
  },
  
  // Clear all session-related data
  clearSession: (): void => {
    // Clear cookies
    document.cookie.split(';').forEach(cookie => {
      const eqPos = cookie.indexOf('=');
      const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
      if (name.startsWith('session-') || name === 'session-token') {
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=${window.location.hostname}`;
      }
    });
    
    // Clear session storage
    sessionStorage.clear();
    
    // Clear local storage (if any auth data is stored there)
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('auth-')) {
        localStorage.removeItem(key);
      }
    });
  },
  
  // Store temporary auth data in session storage
  setTempAuthData: (key: string, value: string): void => {
    sessionStorage.setItem(`auth-${key}`, value);
  },
  
  // Get temporary auth data from session storage
  getTempAuthData: (key: string): string | null => {
    return sessionStorage.getItem(`auth-${key}`);
  },
  
  // Clear temporary auth data
  clearTempAuthData: (key: string): void => {
    sessionStorage.removeItem(`auth-${key}`);
  },
};