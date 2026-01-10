import { hashPassword, verifyPassword, validatePasswordStrength } from '../auth/password';
import { createSession, invalidateSession, invalidateAllUserSessions, validateSession } from '../auth/session';
import { createEmailVerificationToken, createPasswordResetToken, sendVerificationEmail, sendPasswordResetEmail } from '../auth/email';
import { db } from '../../index';
import { usersTable } from '../../DB/schema';
import { eq } from 'drizzle-orm';
import { ErrorFactory } from '../utils/errors';

/**
 * Service layer for authentication operations
 * Separates business logic from route handlers
 */

export class AuthService {
  /**
   * Register a new user
   * @param userData - User registration data
   * @returns Promise resolving to created user data
   */
  static async register(userData: { name: string; email: string; password: string }) {
    const { name, email, password } = userData;
    
    // Validate password strength
    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.isValid) {
      throw ErrorFactory.validation(
        `Password is too weak. Score: ${passwordValidation.score}/4. Suggestions: ${passwordValidation.feedback.join(', ')}`
      );
    }
    
    // Check if user already exists
    const existingUser = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, email))
      .limit(1);
      
    if (existingUser.length > 0) {
      throw ErrorFactory.conflict('User with this email already exists');
    }
    
    // Hash password and create user
    const passwordHash = await hashPassword(password);
    const newUser = await db
      .insert(usersTable)
      .values({
        name,
        email,
        passwordHash,
        age: 0, // Default age since it's required in the schema
      })
      .returning({ id: usersTable.id, email: usersTable.email });
      
    // Create and send verification email
    const verificationToken = await createEmailVerificationToken(newUser[0]!.id);
    await sendVerificationEmail(newUser[0]!.email, verificationToken);
    
    return {
      message: "User registered successfully. Please check your email to verify your account.",
      user: { id: newUser[0]!.id, email: newUser[0]!.email }
    };
  }
  
  /**
   * Authenticate user and create session
   * @param email - User email
   * @param password - User password
   * @returns Promise resolving to session token and user data
   */
  static async login(email: string, password: string) {
    // Find user
    const user = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, email))
      .limit(1);
      
    if (user.length === 0) {
      throw ErrorFactory.authentication('Invalid email or password');
    }
    
    // Verify password
    const isPasswordValid = await verifyPassword(password, user[0]!.passwordHash);
    if (!isPasswordValid) {
      throw ErrorFactory.authentication('Invalid email or password');
    }
    
    // Create session
    const sessionToken = await createSession(user[0]!.id);
    
    return {
      sessionToken,
      user: {
        id: user[0]!.id,
        name: user[0]!.name,
        email: user[0]!.email,
        emailVerified: user[0]!.emailVerified,
      }
    };
  }
  
  /**
   * Logout user by invalidating session
   * @param sessionToken - Session token to invalidate
   */
  static async logout(sessionToken: string) {
    await invalidateSession(sessionToken);
    return { message: "Logout successful" };
  }
  
  /**
   * Get current user from session
   * @param sessionToken - Session token
   * @returns Promise resolving to user data
   */
  static async getCurrentUser(sessionToken: string) {
    // Validate session
    const session = await validateSession(sessionToken);
    if (!session) {
      throw ErrorFactory.authentication('Invalid or expired session');
    }
    
    // Get user data from database
    const user = await db
      .select({
        id: usersTable.id,
        name: usersTable.name,
        email: usersTable.email,
        emailVerified: usersTable.emailVerified,
      })
      .from(usersTable)
      .where(eq(usersTable.id, session.userId))
      .limit(1);
      
    if (user.length === 0) {
      throw ErrorFactory.notFound('User');
    }
    
    return user[0];
  }
  
  /**
   * Verify email using token
   * @param token - Email verification token
   * @returns Promise resolving to verification result
   */
  static async verifyEmail(token: string) {
    const user = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.emailVerificationToken, token))
      .limit(1);
      
    if (user.length === 0) {
      throw ErrorFactory.validation('Invalid or expired verification token');
    }
    
    // Check if token has expired
    if (user[0]!.emailVerificationExpires && new Date() > user[0]!.emailVerificationExpires) {
      throw ErrorFactory.validation('Verification token has expired');
    }
    
    // Verify email
    await db
      .update(usersTable)
      .set({
        emailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpires: null,
      })
      .where(eq(usersTable.id, user[0]!.id));
      
    return { message: "Email verified successfully" };
  }
  
  /**
   * Send password reset email
   * @param email - User email
   * @returns Promise resolving to result
   */
  static async forgotPassword(email: string) {
    const resetToken = await createPasswordResetToken(email);
    
    if (resetToken) {
      await sendPasswordResetEmail(email, resetToken);
    }
    
    // Always return success to prevent email enumeration attacks
    return { 
      message: "If an account with this email exists, a password reset link has been sent" 
    };
  }
  
  /**
   * Reset password using token
   * @param token - Password reset token
   * @param newPassword - New password
   * @returns Promise resolving to reset result
   */
  static async resetPassword(token: string, newPassword: string) {
    // Validate password strength
    const passwordValidation = validatePasswordStrength(newPassword);
    if (!passwordValidation.isValid) {
      throw ErrorFactory.validation(
        `Password is too weak. Score: ${passwordValidation.score}/4. Suggestions: ${passwordValidation.feedback.join(', ')}`
      );
    }
    
    const user = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.passwordResetToken, token))
      .limit(1);
      
    if (user.length === 0) {
      throw ErrorFactory.validation('Invalid or expired reset token');
    }
    
    // Check if token has expired
    if (user[0]!.passwordResetExpires && new Date() > user[0]!.passwordResetExpires) {
      throw ErrorFactory.validation('Reset token has expired');
    }
    
    // Hash new password and update user
    const passwordHash = await hashPassword(newPassword);
    
    await db
      .update(usersTable)
      .set({
        passwordHash,
        passwordResetToken: null,
        passwordResetExpires: null,
      })
      .where(eq(usersTable.id, user[0]!.id));
      
    // Invalidate all existing sessions for this user
    await invalidateAllUserSessions(user[0]!.id);
      
    return { message: "Password reset successfully" };
  }
}