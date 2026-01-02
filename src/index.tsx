import { serve, SQL } from "bun";
import index from "./index.html";
import { drizzle } from "drizzle-orm/bun-sql";
import { authRoutes } from "./BACKEND/routes";

const client = new SQL(process.env.DATABASE_URL!);
export const db = drizzle({ client });

const server = serve({
  routes: {
    // Serve index.html for all unmatched routes.
    "/*": index,

    

    // Authentication routes
    ...authRoutes,
  },

  development: process.env.NODE_ENV !== "production" && {
    // Enable browser hot reloading in development
    hmr: true,

    // Echo console logs from the browser to the server
    console: true,
  },
});

console.log(`🚀 Server running at ${server.url}`);
