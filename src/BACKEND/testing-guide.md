# Authentication System Testing Guide

This guide provides instructions for testing the complete authentication flow that has been implemented.

## Prerequisites

1. Make sure your PostgreSQL database is running and accessible
2. Ensure your `.env` file contains the correct `DATABASE_URL`
3. Install dependencies (if not already installed):
   ```bash
   bun install
   ```

## Starting the Application

1. Start the development server:
   ```bash
   bun run dev
   ```

2. Open your browser and navigate to `http://localhost:3000`

## Testing the Authentication Flow

### 1. User Registration

1. Navigate to `/register`
2. Fill out the registration form with:
   - Name (at least 2 characters)
   - Email (valid email format)
   - Password (at least 8 characters, with uppercase, lowercase, and number)
   - Confirm Password (must match password)
3. Submit the form
4. You should see a success message indicating that a verification email has been sent
5. Check the server console for the verification URL (since we're not using a real email service)

### 2. Email Verification

1. Copy the verification URL from the server console
2. Paste it in your browser's address bar
3. You should see a success message indicating your email has been verified
4. Navigate to the login page

### 3. User Login

1. Navigate to `/login`
2. Enter the email and password you used for registration
3. Submit the form
4. You should be redirected to the dashboard

### 4. Protected Routes

1. Try accessing `/dashboard` or `/profile` directly without logging in
2. You should be redirected to the login page
3. After logging in, you should be able to access these pages

### 5. Password Reset

1. Navigate to `/forgot-password`
2. Enter your email address
3. Submit the form
4. You should see a success message
5. Check the server console for the password reset URL
6. Click the reset link or paste it in your browser
7. Enter a new password that meets the requirements
8. Submit the form
9. You should see a success message and be able to log in with the new password

### 6. Logout

1. From the dashboard or profile page, click the Logout button
2. You should be redirected to the login page
3. Try accessing a protected route - you should be redirected to login again

## Edge Cases to Test

1. **Invalid Registration Data**:
   - Try registering with an invalid email format
   - Try using a weak password
   - Try with mismatched password and confirm password
   - Verify appropriate error messages appear

2. **Duplicate Registration**:
   - Try registering with an email that's already in use
   - Verify you get an error about the email already existing

3. **Invalid Login Credentials**:
   - Try logging in with an incorrect password
   - Try logging in with an email that doesn't exist
   - Verify appropriate error messages appear

4. **Expired Tokens**:
   - Try using an expired verification or reset token
   - Verify you get an appropriate error message

5. **Invalid Tokens**:
   - Try using a malformed or non-existent token
   - Verify you get an appropriate error message

## Database Checks

After testing, you can verify the data in your database:

1. Check the `users` table:
   - Verify password hashes are stored (not plain text)
   - Check email verification flags are set correctly
   - Verify reset tokens are cleared after use

2. Check the `sessions` table:
   - Verify sessions are created on login
   - Verify sessions are deleted on logout
   - Check expiration times are set correctly

## Common Issues and Solutions

1. **Database Connection Errors**:
   - Verify your PostgreSQL container is running
   - Check the DATABASE_URL in your .env file
   - Ensure the database exists and is accessible

2. **Import Errors**:
   - Make sure all dependencies are installed
   - Check that import paths are correct

3. **Form Validation Errors**:
   - Verify Zod validation schemas are correctly defined
   - Check that React Hook Form is properly integrated

4. **Session Issues**:
   - Check that cookies are being set correctly
   - Verify session validation middleware is working
   - Ensure session expiration is handled properly

## Production Considerations

For production deployment:

1. Replace the console-based email sending with a real email service
2. Set appropriate cookie security flags (Secure, HttpOnly, SameSite)
3. Configure CORS properly for your frontend domain
4. Set up proper environment variables
5. Implement rate limiting on authentication endpoints
6. Add CSRF protection if needed
7. Set up logging and monitoring

## Security Best Practices Implemented

1. Password hashing with Bun's built-in password utility
2. Secure session cookies with HttpOnly flag
3. Token-based email verification and password reset
4. Input validation with Zod schemas
5. SQL injection protection through Drizzle ORM
6. XSS protection through proper data handling
7. Session expiration and invalidation