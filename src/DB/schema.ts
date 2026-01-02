import { integer, pgTable, varchar, boolean, timestamp, uuid } from "drizzle-orm/pg-core";

// Enhanced users table
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
});

// Sessions table
export const sessionsTable = pgTable("sessions", {
  id: uuid().defaultRandom().primaryKey(),
  userId: integer().references(() => usersTable.id, { onDelete: "cascade" }).notNull(),
  sessionToken: varchar({ length: 255 }).notNull().unique(),
  expiresAt: timestamp().notNull(),
  createdAt: timestamp().defaultNow().notNull(),
  lastAccessed: timestamp().defaultNow().notNull(),
});
