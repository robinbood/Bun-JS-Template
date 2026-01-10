import { authRoutes } from "./auth";

// Re-export the auth routes from the consolidated file
export { authRoutes };

// Also export individual route handlers for backward compatibility if needed
export { authRoutes as routes };