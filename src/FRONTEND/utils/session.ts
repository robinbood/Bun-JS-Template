// Session management utilities for frontend

// Session configuration
const SESSION_CONFIG = {
  TOKEN_KEY: 'session-token',
  AUTH_PREFIX: 'auth-',
  SESSION_PREFIX: 'session-'
};

// Cookie utilities
const CookieUtils = {
  // Get a specific cookie value
  get: (name: string): string | null => {
    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
      const [cookieName, value] = cookie.trim().split('=');
      if (cookieName === name) {
        return value || null;
      }
    }
    return null;
  },
  
  // Set a cookie with options
  set: (name: string, value: string, options: {
    expires?: Date;
    path?: string;
    domain?: string;
    secure?: boolean;
    sameSite?: 'strict' | 'lax' | 'none';
  } = {}): void => {
    let cookieString = `${name}=${value}`;
    
    if (options.expires) {
      cookieString += `; expires=${options.expires.toUTCString()}`;
    }
    
    if (options.path) {
      cookieString += `; path=${options.path}`;
    }
    
    if (options.domain) {
      cookieString += `; domain=${options.domain}`;
    }
    
    if (options.secure) {
      cookieString += '; secure';
    }
    
    if (options.sameSite) {
      cookieString += `; samesite=${options.sameSite}`;
    }
    
    document.cookie = cookieString;
  },
  
  // Delete a cookie
  delete: (name: string, options: { path?: string; domain?: string } = {}): void => {
    CookieUtils.set(name, '', {
      expires: new Date(0),
      path: options.path,
      domain: options.domain
    });
  },
  
  // Check if cookie exists
  exists: (name: string): boolean => {
    return CookieUtils.get(name) !== null;
  }
};

// Storage utilities
const StorageUtils = {
  // Session storage wrapper
  session: {
    get: (key: string): string | null => {
      try {
        return sessionStorage.getItem(key);
      } catch (error) {
        console.error('Session storage access error:', error);
        return null;
      }
    },
    
    set: (key: string, value: string): void => {
      try {
        sessionStorage.setItem(key, value);
      } catch (error) {
        console.error('Session storage write error:', error);
      }
    },
    
    remove: (key: string): void => {
      try {
        sessionStorage.removeItem(key);
      } catch (error) {
        console.error('Session storage remove error:', error);
      }
    },
    
    clear: (): void => {
      try {
        sessionStorage.clear();
      } catch (error) {
        console.error('Session storage clear error:', error);
      }
    }
  },
  
  // Local storage wrapper
  local: {
    get: (key: string): string | null => {
      try {
        return localStorage.getItem(key);
      } catch (error) {
        console.error('Local storage access error:', error);
        return null;
      }
    },
    
    set: (key: string, value: string): void => {
      try {
        localStorage.setItem(key, value);
      } catch (error) {
        console.error('Local storage write error:', error);
      }
    },
    
    remove: (key: string): void => {
      try {
        localStorage.removeItem(key);
      } catch (error) {
        console.error('Local storage remove error:', error);
      }
    },
    
    clear: (prefix?: string): void => {
      try {
        if (prefix) {
          Object.keys(localStorage).forEach(key => {
            if (key.startsWith(prefix)) {
              localStorage.removeItem(key);
            }
          });
        } else {
          localStorage.clear();
        }
      } catch (error) {
        console.error('Local storage clear error:', error);
      }
    }
  }
};

// Session manager with improved functionality
export const SessionManager = {
  // Check if user is authenticated (client-side check)
  isAuthenticated: (): boolean => {
    // This is a basic check - real authentication state is managed by AuthContext
    // This can be used for quick checks before AuthContext has loaded
    return CookieUtils.exists(SESSION_CONFIG.TOKEN_KEY);
  },
  
  // Get session token
  getToken: (): string | null => {
    return CookieUtils.get(SESSION_CONFIG.TOKEN_KEY);
  },
  
  // Get session expiration time
  getSessionExpiration: (): Date | null => {
    // In a real implementation, you might store expiration in a separate cookie
    // or decode it from the token if it contains expiration info
    const expiration = StorageUtils.session.get('session-expiration');
    return expiration ? new Date(expiration) : null;
  },
  
  // Set session expiration
  setSessionExpiration: (expiration: Date): void => {
    StorageUtils.session.set('session-expiration', expiration.toISOString());
  },
  
  // Check if session is expired
  isSessionExpired: (): boolean => {
    const expiration = SessionManager.getSessionExpiration();
    return expiration ? new Date() > expiration : false;
  },
  
  // Clear all session-related data
  clearSession: (): void => {
    // Clear cookies
    document.cookie.split(';').forEach(cookie => {
      const eqPos = cookie.indexOf('=');
      const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
      if (name.startsWith(SESSION_CONFIG.SESSION_PREFIX) || name === SESSION_CONFIG.TOKEN_KEY) {
        CookieUtils.delete(name, {
          path: '/',
          domain: window.location.hostname
        });
      }
    });
    
    // Clear session storage
    StorageUtils.session.clear();
    
    // Clear local storage auth data
    StorageUtils.local.clear(SESSION_CONFIG.AUTH_PREFIX);
    
    // Clear session expiration
    StorageUtils.session.remove('session-expiration');
  },
  
  // Store temporary auth data in session storage
  setTempAuthData: (key: string, value: string): void => {
    StorageUtils.session.set(`${SESSION_CONFIG.AUTH_PREFIX}${key}`, value);
  },
  
  // Get temporary auth data from session storage
  getTempAuthData: (key: string): string | null => {
    return StorageUtils.session.get(`${SESSION_CONFIG.AUTH_PREFIX}${key}`);
  },
  
  // Clear temporary auth data
  clearTempAuthData: (key: string): void => {
    StorageUtils.session.remove(`${SESSION_CONFIG.AUTH_PREFIX}${key}`);
  },
  
  // Store persistent auth data in local storage
  setPersistedAuthData: (key: string, value: string): void => {
    StorageUtils.local.set(`${SESSION_CONFIG.AUTH_PREFIX}${key}`, value);
  },
  
  // Get persistent auth data from local storage
  getPersistedAuthData: (key: string): string | null => {
    return StorageUtils.local.get(`${SESSION_CONFIG.AUTH_PREFIX}${key}`);
  },
  
  // Clear persistent auth data
  clearPersistedAuthData: (key: string): void => {
    StorageUtils.local.remove(`${SESSION_CONFIG.AUTH_PREFIX}${key}`);
  },
  
  // Get session activity timestamp
  getLastActivity: (): Date | null => {
    const activity = StorageUtils.session.get('last-activity');
    return activity ? new Date(activity) : null;
  },
  
  // Update session activity timestamp
  updateLastActivity: (): void => {
    StorageUtils.session.set('last-activity', new Date().toISOString());
  },
  
  // Check if session is inactive
  isInactive: (maxInactiveMinutes: number = 30): boolean => {
    const lastActivity = SessionManager.getLastActivity();
    if (!lastActivity) return false;
    
    const inactiveMinutes = (new Date().getTime() - lastActivity.getTime()) / (1000 * 60);
    return inactiveMinutes > maxInactiveMinutes;
  }
};

// Auto-logout on session expiration
export const setupSessionExpirationCheck = (callback: () => void, checkInterval: number = 60000): (() => void) => {
  const intervalId = setInterval(() => {
    if (SessionManager.isSessionExpired() || SessionManager.isInactive()) {
      callback();
      clearInterval(intervalId);
    }
  }, checkInterval);
  
  return () => clearInterval(intervalId);
};