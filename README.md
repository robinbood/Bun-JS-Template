# Full-Stack React Template with Session-Based Authentication

This is a comprehensive full-stack template built with Bun, React, and TypeScript that includes a complete session-based authentication system. It's designed to help developers kickstart new projects without spending time implementing basic authentication and authorization features.

## Authentication System Features

### Core Authentication
- **Server-Side Session Management**: Secure session handling using Redis for fast, scalable session storage
- **HttpOnly Session Cookies**: Sessions are stored in HttpOnly cookies to prevent XSS attacks
- **Secure Password Hashing**: Passwords are hashed using Bun's built-in password hashing (argon2id)
- **Password Strength Validation**: Real-time password strength validation using the zxcvbn library
- **Email/Password Login**: Traditional username and password authentication flow

### Session Security
- **Session Rotation**: Automatic session rotation every 30 minutes for enhanced security
- **Session Limits**: Maximum 5 concurrent sessions per user to prevent session flooding
- **Session Expiration**: Sessions automatically expire after 7 days of inactivity
- **Session Invalidation**: Immediate session invalidation on logout
- **Last Access Tracking**: Sessions track last accessed time for activity monitoring

### Email Features
- **Email Verification**: New users must verify their email address before full access
- **Verification Tokens**: Secure, time-limited email verification tokens
- **Password Reset**: Forgot password flow with secure reset tokens
- **Email Enumeration Protection**: Forgot password endpoint doesn't reveal if email exists
- **Mailjet Integration**: Email service integration for sending verification and reset emails

### Security Features
- **CSRF Protection**: SameSite=Lax cookie attribute for CSRF protection
- **XSS Protection**: HttpOnly cookies prevent JavaScript access to session tokens
- **Input Validation**: Server-side validation for all user inputs
- **Error Handling**: Proper error handling without exposing sensitive information
- **Security Headers**: Response headers for enhanced security

### Frontend Features
- **Protected Routes**: Frontend route protection based on authentication status
- **Auth Context**: React Context for managing authentication state across the app
- **Login Form**: User-friendly login interface with error handling
- **Registration Form**: Registration with real-time password strength feedback
- **Forgot Password Form**: Password reset request form
- **Reset Password Form**: Secure password reset form with validation
- **Email Verification Page**: Page for users to verify their email address
- **Dashboard**: Protected dashboard page for authenticated users
- **Profile Page**: User profile page displaying current user information

### Backend API Routes
- `POST /api/auth/register` - User registration with email verification
- `POST /api/auth/login` - User login with session creation
- `POST /api/auth/logout` - User logout with session invalidation
- `GET /api/auth/current-user` - Get current authenticated user
- `POST /api/auth/verify-email` - Verify user email address
- `POST /api/auth/forgot-password` - Request password reset email
- `POST /api/auth/reset-password` - Reset password with token

## Tech Stack

- **Runtime**: Bun
- **Frontend**: React 19, TypeScript, Tailwind CSS, ShadCN
- **Backend**: Bun server with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Session Storage**: Redis for fast, scalable session management
- **Authentication**: Server-side session cookies with Redis
- **Email Service**: Mailjet for transactional emails
- **Password Validation**: zxcvbn for password strength checking
- **Styling**: Tailwind CSS with custom design system

## Getting Started

### Prerequisites

- Node.js (or Bun) installed
- PostgreSQL database
- Redis server running

### Installation

1. Clone this repository:
```bash
git clone <repository-url>
cd <project-directory>
```

2. Install dependencies:
```bash
bun install
```

3. Set up your environment variables by copying the example:
```bash
cp .env.example .env
```

4. Configure your environment variables in `.env`:
```
DATABASE_URL=postgresql://user:password@localhost:5432/dbname
REDIS_URL=redis://localhost:6379
MAILJET_API_KEY=your_api_key
MAILJET_API_SECRET=your_api_secret
MAILJET_FROM_EMAIL=noreply@yourdomain.com
```

5. Run database migrations:
```bash
bun run db:migrate
```

6. Process the CSS (required for Tailwind):
```bash
node process-css.js
```

### Development

To start the development server:

```bash
bun dev
```

The application will be available at `http://localhost:3000`

### Production

To run for production:

```bash
bun start
```

## Project Structure

```
src/
├── BACKEND/           # Backend API code
│   ├── auth/          # Authentication logic
│   │   ├── session.ts          # Session management with Redis
│   │   ├── sessionRotation.ts  # Session rotation logic
│   │   ├── password.ts         # Password validation
│   │   ├── email.ts            # Email verification & reset
│   │   └── middleware.ts       # Auth middleware
│   ├── routes/        # API routes
│   │   ├── login.ts            # Login endpoint
│   │   ├── logout.ts           # Logout endpoint
│   │   ├── register.ts         # Registration endpoint
│   │   ├── verifyEmail.ts      # Email verification endpoint
│   │   ├── forgotPassword.ts   # Forgot password endpoint
│   │   ├── resetPassword.ts    # Reset password endpoint
│   │   └── getCurrentUser.ts   # Get current user endpoint
│   ├── services/      # Business logic services
│   ├── utils/         # Utility functions
│   └── validation/    # Validation schemas
├── FRONTEND/          # Frontend React code
│   ├── components/    # React components
│   │   └── auth/      # Authentication components
│   ├── context/       # React context providers
│   │   └── AuthContext.tsx    # Authentication state management
│   ├── pages/         # Page components
│   ├── services/      # API service functions
│   └── utils/         # Utility functions
├── components/ui/     # Shared UI components (ShadCN)
├── DB/               # Database schema and configuration
│   └── schema.ts     # Drizzle ORM schema
└── utils/            # Shared utilities
```

## Authentication Flow

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant Backend
    participant Redis
    participant DB
    participant Email

    User->>Frontend: Register (email, password)
    Frontend->>Backend: POST /api/auth/register
    Backend->>DB: Create user with hashed password
    Backend->>Email: Send verification email
    Backend-->>Frontend: Registration successful
    Frontend-->>User: Check your email

    User->>Frontend: Click verification link
    Frontend->>Backend: POST /api/auth/verify-email
    Backend->>DB: Update emailVerified = true
    Backend-->>Frontend: Email verified
    Frontend-->>User: Account verified

    User->>Frontend: Login (email, password)
    Frontend->>Backend: POST /api/auth/login
    Backend->>DB: Verify credentials
    Backend->>Redis: Create session
    Backend-->>Frontend: Set HttpOnly session cookie
    Frontend-->>User: Logged in

    User->>Frontend: Access protected route
    Frontend->>Backend: GET /api/auth/current-user
    Backend->>Redis: Validate session
    Backend-->>Frontend: User data
    Frontend-->>User: Show protected content

    User->>Frontend: Logout
    Frontend->>Backend: POST /api/auth/logout
    Backend->>Redis: Invalidate session
    Backend-->>Frontend: Clear session cookie
    Frontend-->>User: Logged out
```

## Adding New Features

This template provides a solid foundation for building new features:

1. **New API Endpoints**: Add new routes in `src/BACKEND/routes/`
2. **New Pages**: Add new page components in `src/FRONTEND/pages/`
3. **Database Models**: Extend the schema in `src/DB/schema.ts`
4. **UI Components**: Use or extend components in `src/components/ui/`

## Customization

- Modify the theme in `src/index.css`
- Update the database schema in `src/DB/schema.ts`
- Customize authentication behavior in `src/BACKEND/auth/`
- Extend the UI component library in `src/components/ui/`
- Configure session settings in `src/BACKEND/auth/session.ts`

## Security Considerations

- **Session Storage**: Sessions are stored in Redis, not in the database
- **Cookie Security**: Session cookies use HttpOnly, SameSite=Lax, and have a 7-day expiration
- **Password Security**: Passwords are hashed using Bun's argon2 implementation
- **Session Rotation**: Sessions are automatically rotated every 30 minutes
- **Rate Limiting**: Consider implementing rate limiting for authentication endpoints
- **HTTPS**: Always use HTTPS in production to protect session cookies

## Contributing

This template is designed to be a starting point for new projects. Feel free to customize it to fit your specific needs.

## License

This project is open source and available under the [MIT License](LICENSE).

---

**Note**: This template was created using `bun init` in bun v1.3.0. [Bun](https://bun.com) is a fast all-in-one JavaScript runtime.
