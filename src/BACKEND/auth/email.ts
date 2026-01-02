import { randomBytes } from "crypto";
import { db } from "../../index";
import { usersTable } from "../../DB/schema";
import { eq } from "drizzle-orm";

export const generateEmailVerificationToken = (): string => {
  return randomBytes(32).toString("hex");
};

export const generatePasswordResetToken = (): string => {
  return randomBytes(32).toString("hex");
};

export const createEmailVerificationToken = async (userId: number): Promise<string> => {
  const token = generateEmailVerificationToken();
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 24); // 24 hours from now
  
  await db
    .update(usersTable)
    .set({
      emailVerificationToken: token,
      emailVerificationExpires: expiresAt,
    })
    .where(eq(usersTable.id, userId));
    
  return token;
};

export const createPasswordResetToken = async (email: string): Promise<string | null> => {
  const user = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, email))
    .limit(1);
    
  if (user.length === 0) {
    return null;
  }
  
  const token = generatePasswordResetToken();
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 1); // 1 hour from now
  
  await db
    .update(usersTable)
    .set({
      passwordResetToken: token,
      passwordResetExpires: expiresAt,
    })
    .where(eq(usersTable.id, user[0]!.id));
    
  return token;
};

export const sendVerificationEmail = (email: string, token: string): void => {
  // In a real implementation, you would use an email service
  // For now, we'll just log the URL
  const verificationUrl = `${process.env.FRONTEND_URL || "http://localhost:3000"}/verify-email?token=${token}`;
  console.log(`Verification URL for ${email}: ${verificationUrl}`);
  
  // In production, you would use a service like:
  // - Bun's built-in email capabilities
  // - Nodemailer with SMTP
  // - A third-party service like SendGrid, Mailgun, etc.
};

export const sendPasswordResetEmail = (email: string, token: string): void => {
  // In a real implementation, you would use an email service
  const resetUrl = `${process.env.FRONTEND_URL || "http://localhost:3000"}/reset-password?token=${token}`;
  console.log(`Password reset URL for ${email}: ${resetUrl}`);
};