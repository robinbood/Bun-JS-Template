import { randomBytes } from "crypto";
import { db } from "../../index";
import { sessionsTable, usersTable } from "../../DB/schema";
import { eq, and, gt } from "drizzle-orm";

export const createSession = async (userId: number): Promise<string> => {
  const sessionToken = randomBytes(32).toString("hex");
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now
  
  await db.insert(sessionsTable).values({
    userId,
    sessionToken,
    expiresAt,
  });
  
  return sessionToken;
};

export const validateSession = async (sessionToken: string): Promise<{ userId: number; email: string } | null> => {
  const session = await db
    .select({
      userId: sessionsTable.userId,
      email: usersTable.email,
    })
    .from(sessionsTable)
    .innerJoin(usersTable, eq(sessionsTable.userId, usersTable.id))
    .where(
      and(
        eq(sessionsTable.sessionToken, sessionToken),
        gt(sessionsTable.expiresAt, new Date())
      )
    )
    .limit(1);
    
  if (session.length === 0) {
    return null;
  }
  
  // Update last accessed time
  await db
    .update(sessionsTable)
    .set({ lastAccessed: new Date() })
    .where(eq(sessionsTable.sessionToken, sessionToken));
    
  return session[0] || null;
};

export const invalidateSession = async (sessionToken: string): Promise<void> => {
  await db
    .delete(sessionsTable)
    .where(eq(sessionsTable.sessionToken, sessionToken));
};

export const invalidateAllUserSessions = async (userId: number): Promise<void> => {
  await db
    .delete(sessionsTable)
    .where(eq(sessionsTable.userId, userId));
};