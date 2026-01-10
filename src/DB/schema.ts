import { integer, pgTable, varchar, boolean, timestamp, uuid, index } from "drizzle-orm/pg-core";

// Enhanced users table with indexes
export const usersTable = pgTable("users", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: varchar({ length: 255 }).notNull(),
  age: integer().notNull(),
  email: varchar({ length: 255 }).notNull().unique(),
  passwordHash: varchar({ length: 255 }).notNull(),
  emailVerified: boolean().default(false).notNull(),
  emailVerificationToken: varchar({ length: 255 }),
  emailVerificationExpires: timestamp(),
  passwordResetToken: varchar({ length: 255 }),
  passwordResetExpires: timestamp(),
  createdAt: timestamp().defaultNow().notNull(),
  updatedAt: timestamp().defaultNow().notNull(),
}, (table) => ({
  // Index for email lookups
  emailIdx: index("users_email_idx").on(table.email),
  // Index for email verification token lookups
  emailVerificationTokenIdx: index("users_email_verification_token_idx").on(table.emailVerificationToken),
  // Index for password reset token lookups
  passwordResetTokenIdx: index("users_password_reset_token_idx").on(table.passwordResetToken),
  // Composite index for verification token and expiration
  emailVerificationCompositeIdx: index("users_email_verification_composite_idx").on(table.emailVerificationToken, table.emailVerificationExpires),
  // Composite index for reset token and expiration
  passwordResetCompositeIdx: index("users_password_reset_composite_idx").on(table.passwordResetToken, table.passwordResetExpires),
}));

// Sessions table with indexes
export const sessionsTable = pgTable("sessions", {
  id: uuid().defaultRandom().primaryKey(),
  userId: integer().references(() => usersTable.id, { onDelete: "cascade" }).notNull(),
  sessionToken: varchar({ length: 255 }).notNull().unique(),
  expiresAt: timestamp().notNull(),
  createdAt: timestamp().defaultNow().notNull(),
  lastAccessed: timestamp().defaultNow().notNull(),
}, (table) => ({
  // Index for session token lookups
  sessionTokenIdx: index("sessions_session_token_idx").on(table.sessionToken),
  // Index for user session lookups
  userIdIdx: index("sessions_user_id_idx").on(table.userId),
  // Composite index for user and expiration
  userExpirationCompositeIdx: index("sessions_user_expiration_composite_idx").on(table.userId, table.expiresAt),
  // Index for cleanup of expired sessions
  expiresAtIdx: index("sessions_expires_at_idx").on(table.expiresAt),
}));
