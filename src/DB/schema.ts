import { integer, pgTable, varchar, boolean, timestamp, index } from "drizzle-orm/pg-core";

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
