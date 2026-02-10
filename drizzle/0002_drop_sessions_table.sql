-- Drop the sessions table as we now use Redis-only session storage
DROP TABLE IF EXISTS "sessions";
