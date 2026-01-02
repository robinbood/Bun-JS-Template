# Authentication Architecture Plan

## Overview
This document outlines the architecture for a session-based authentication system using cookies, passwords, and email verification for the Bun + React application.

## Backend Architecture

### Database Schema Extensions
We'll extend the existing users table and add new tables for authentication:

1. **Enhanced Users Table**
   - Add password_hash field
   - Add email_verified field
   - Add email_verification_token field
   - Add email_verification_expires field
   - Add password_reset_token field
   - Add password_reset_expires field

2. **Sessions Table**
   - id (UUID primary key)
   - user_id (foreign key to users)
   - session_token (unique)
   - expires_at
   - created_at
   - last_accessed

### Backend Directory Structure
```
src/BACKEND/
├── auth/
│   ├── middleware.ts      # Session validation middleware
│   ├── password.ts         # Password hashing utilities
│   ├── session.ts          # Session management
│   └── email.ts            # Email sending utilities
├── routes/
│   ├── auth.ts             # Authentication routes
│   └── protected.ts        # Protected route examples
└── types/
    └── auth.ts             # Authentication type definitions
```

### API Routes
1. **POST /api/auth/register**
   - Input: email, password, name
   - Validation: Email format, password strength
   - Actions: Hash password, create user, send verification email

2. **POST /api/auth/login**
   - Input: email, password
   - Validation: User exists, password matches
   - Actions: Create session, set cookie

3. **POST /api/auth/logout**
   - Actions: Clear session cookie, invalidate session

4. **GET /api/auth/verify/:token**
   - Actions: Verify email token, mark email as verified

5. **POST /api/auth/forgot-password**
   - Input: email
   - Actions: Generate reset token, send reset email

6. **POST /api/auth/reset-password**
   - Input: token, new_password
   - Actions: Verify token, update password

7. **GET /api/auth/me**
   - Actions: Return current user info if session is valid

### Security Measures
- Password hashing with bcrypt
- Secure, HTTP-only session cookies
- CSRF protection
- Rate limiting on auth endpoints
- Input validation and sanitization

## Frontend Architecture

### Frontend Directory Structure
```
src/FRONTEND/
├── components/
│   ├── auth/
│   │   ├── LoginForm.tsx
│   │   ├── RegisterForm.tsx
│   │   ├── ForgotPasswordForm.tsx
│   │   └── ResetPasswordForm.tsx
│   ├── layout/
│   │   ├── Header.tsx
│   │   └── Footer.tsx
│   └── common/
│       ├── ProtectedRoute.tsx
│       └── LoadingSpinner.tsx
├── context/
│   └── AuthContext.tsx     # Authentication state management
├── hooks/
│   └── useAuth.ts          # Custom auth hook
├── pages/
│   ├── Login.tsx
│   ├── Register.tsx
│   ├── VerifyEmail.tsx
│   ├── ForgotPassword.tsx
│   ├── ResetPassword.tsx
│   ├── Dashboard.tsx
│   └── Profile.tsx
├── services/
│   └── api.ts              # API communication utilities
└── utils/
    ├── validation.ts       # Form validation rules
    └── constants.ts        # App constants
```

### React Hook Form Integration
- Comprehensive form validation
- Error handling and display
- Form state management
- Submission handling with loading states

### Authentication Flow
1. **Registration**
   - User fills registration form
   - Form validation with React Hook Form
   - Submit to backend
   - Redirect to email verification page
   - Show success message

2. **Login**
   - User fills login form
   - Form validation
   - Submit to backend
   - Store session in cookie
   - Redirect to dashboard

3. **Protected Routes**
   - Check authentication status
   - Redirect to login if not authenticated
   - Show loading state during check

4. **Email Verification**
   - User clicks verification link
   - Verify token with backend
   - Show success/error message
   - Redirect to login

5. **Password Reset**
   - User requests password reset
   - Enter email address
   - Receive reset email
   - Click link, enter new password
   - Submit new password

### State Management
- React Context for authentication state
- Custom hooks for auth actions
- Persistent session through cookies
- Automatic token refresh

## Implementation Phases

1. **Backend Setup**
   - Update database schema
   - Create authentication utilities
   - Implement API routes

2. **Frontend Setup**
   - Create authentication context
   - Build form components
   - Implement routing

3. **Integration & Testing**
   - Connect frontend to backend
   - Test all authentication flows
   - Handle edge cases and errors

## Security Considerations

1. **Password Security**
   - Minimum password requirements
   - bcrypt hashing with appropriate salt rounds
   - Password strength indicator

2. **Session Security**
   - Secure, HTTP-only cookies
   - Appropriate session expiration
   - Session invalidation on logout

3. **Email Security**
   - Verification token expiration
   - Rate limiting on email sending
   - Secure token generation

4. **API Security**
   - Input validation
   - Rate limiting
   - CORS configuration
   - Error handling without information leakage

## Dependencies to Add

### Backend
- bcrypt for password hashing
- nanoid for token generation
- nodemailer or Bun's email capabilities

### Frontend
- react-hook-form (already installed)
- @hookform/resolvers for validation
- zod for schema validation

This architecture provides a robust, secure authentication system that leverages Bun's capabilities while following modern React patterns.