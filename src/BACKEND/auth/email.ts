import { randomBytes } from "crypto";
import { db } from "../../index";
import { usersTable } from "../../DB/schema";
import { eq } from "drizzle-orm";
import Mailjet from 'node-mailjet';
import type { Email } from 'node-mailjet';

// Type definitions for better type safety
interface EmailConfig {
  apiKey: string;
  secretKey: string;
  senderEmail: string;
  senderName: string;
  frontendUrl: string;
}

interface EmailTemplate {
  subject: string;
  htmlContent: string;
  textContent: string;
}

interface EmailPayload {
  toEmail: string;
  toName?: string;
  template: EmailTemplate;
}

// Email configuration with validation
const getEmailConfig = (): EmailConfig => {
  const apiKey = process.env['MAILJET_API_KEY'];
  const secretKey = process.env['MAILJET_SECRET_KEY'];
  const senderEmail = process.env['SENDER_EMAIL'] || "noreply@yourdomain.com";
  const senderName = process.env['SENDER_NAME'] || "Your App Name";
  const frontendUrl = process.env['FRONTEND_URL'] || "http://localhost:3000";

  if (!apiKey || !secretKey) {
    throw new Error("Mailjet API credentials are not configured");
  }

  return {
    apiKey,
    secretKey,
    senderEmail,
    senderName,
    frontendUrl,
  };
};

// Initialize Mailjet client with lazy loading
let mailjetClient: Email.Client | null = null;

const getMailjetClient = (): Email.Client => {
  if (!mailjetClient) {
    const { apiKey, secretKey } = getEmailConfig();
    mailjetClient = Mailjet.connect(apiKey, secretKey);
  }
  return mailjetClient;
};

// Token generation functions
export const generateEmailVerificationToken = (): string => {
  return randomBytes(32).toString("hex");
};

export const generatePasswordResetToken = (): string => {
  return randomBytes(32).toString("hex");
};

// Token creation functions
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

// Email template generators
const createVerificationEmailTemplate = (verificationUrl: string): EmailTemplate => ({
  subject: "Verify Your Email Address",
  htmlContent: `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Email Verification</title>
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #4A90E2; color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
        .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
        .button { display: inline-block; background-color: #4A90E2; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 20px 0; }
        .footer { margin-top: 30px; font-size: 12px; color: #666; }
        .security-notice { background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 10px; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Email Verification</h1>
        </div>
        <div class="content">
          <p>Thank you for registering! Please click the button below to verify your email address:</p>
          <div style="text-align: center;">
            <a href="${verificationUrl}" class="button">Verify Email</a>
          </div>
          <p>Or copy and paste this link in your browser:</p>
          <p style="word-break: break-all; background-color: #eee; padding: 10px; border-radius: 4px;">${verificationUrl}</p>
          <div class="security-notice">
            <strong>Security Notice:</strong> This link will expire in 24 hours for security reasons. If you didn't create an account, you can safely ignore this email.
          </div>
        </div>
        <div class="footer">
          <p>This is an automated message. Please do not reply to this email.</p>
        </div>
      </div>
    </body>
    </html>
  `,
  textContent: `
    Email Verification
    
    Thank you for registering! Please visit the link below to verify your email address:
    ${verificationUrl}
    
    Security Notice: This link will expire in 24 hours for security reasons. If you didn't create an account, you can safely ignore this email.
  `
});

const createPasswordResetEmailTemplate = (resetUrl: string): EmailTemplate => ({
  subject: "Reset Your Password",
  htmlContent: `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Password Reset</title>
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #E74C3C; color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
        .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
        .button { display: inline-block; background-color: #E74C3C; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 20px 0; }
        .footer { margin-top: 30px; font-size: 12px; color: #666; }
        .security-notice { background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 10px; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Password Reset</h1>
        </div>
        <div class="content">
          <p>You requested to reset your password. Click the button below to reset it:</p>
          <div style="text-align: center;">
            <a href="${resetUrl}" class="button">Reset Password</a>
          </div>
          <p>Or copy and paste this link in your browser:</p>
          <p style="word-break: break-all; background-color: #eee; padding: 10px; border-radius: 4px;">${resetUrl}</p>
          <div class="security-notice">
            <strong>Security Notice:</strong> This link will expire in 1 hour for security reasons. If you didn't request this password reset, you can safely ignore this email.
          </div>
        </div>
        <div class="footer">
          <p>This is an automated message. Please do not reply to this email.</p>
        </div>
      </div>
    </body>
    </html>
  `,
  textContent: `
    Password Reset
    
    You requested to reset your password. Please visit the link below to reset it:
    ${resetUrl}
    
    Security Notice: This link will expire in 1 hour for security reasons. If you didn't request this password reset, you can safely ignore this email.
  `
});

// Core email sending function with proper error handling
const sendEmail = async (payload: EmailPayload): Promise<void> => {
  const { senderEmail, senderName } = getEmailConfig();
  const client = getMailjetClient();

  try {
    const result = await client
      .post("send", { version: 'v3.1' })
      .request({
        Messages: [
          {
            From: {
              Email: senderEmail,
              Name: senderName,
            },
            To: [
              {
                Email: payload.toEmail,
                Name: payload.toName || "User",
              },
            ],
            Subject: payload.template.subject,
            HTMLPart: payload.template.htmlContent,
            TextPart: payload.template.textContent,
          },
        ],
      });

    console.log(`Email sent successfully to ${payload.toEmail}:`, result.body);
  } catch (error) {
    console.error(`Failed to send email to ${payload.toEmail}:`, error);
    throw new Error(`Email sending failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

// Public API functions
export const sendVerificationEmail = async (email: string, token: string): Promise<void> => {
  const { frontendUrl } = getEmailConfig();
  const verificationUrl = `${frontendUrl}/verify-email?token=${token}`;
  const template = createVerificationEmailTemplate(verificationUrl);

  await sendEmail({
    toEmail: email,
    template,
  });
};

export const sendPasswordResetEmail = async (email: string, token: string): Promise<void> => {
  const { frontendUrl } = getEmailConfig();
  const resetUrl = `${frontendUrl}/reset-password?token=${token}`;
  const template = createPasswordResetEmailTemplate(resetUrl);

  await sendEmail({
    toEmail: email,
    template,
  });
};