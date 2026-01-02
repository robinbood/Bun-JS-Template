# Authentication Flow Diagram

## User Registration Flow

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant Backend
    participant Database
    participant EmailService

    User->>Frontend: Fills registration form
    Frontend->>Frontend: Validates form with React Hook Form
    Frontend->>Backend: POST /api/auth/register (email, password, name)
    Backend->>Backend: Validates input
    Backend->>Backend: Hashes password with bcrypt
    Backend->>Database: Creates user with verification token
    Database-->>Backend: Returns user data
    Backend->>EmailService: Sends verification email
    Backend-->>Frontend: Returns success response
    Frontend-->>User: Shows verification message
    User->>EmailService: Clicks verification link
    EmailService->>Backend: GET /api/auth/verify/:token
    Backend->>Database: Verifies token and updates user
    Database-->>Backend: Confirms update
    Backend-->>EmailService: Redirects to success page
```

## User Login Flow

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant Backend
    participant Database

    User->>Frontend: Fills login form
    Frontend->>Frontend: Validates form with React Hook Form
    Frontend->>Backend: POST /api/auth/login (email, password)
    Backend->>Database: Finds user by email
    Database-->>Backend: Returns user data
    Backend->>Backend: Compares password hash
    Backend->>Database: Creates session record
    Database-->>Backend: Returns session data
    Backend-->>Frontend: Sets session cookie and returns user data
    Frontend->>Frontend: Updates auth context
    Frontend-->>User: Redirects to dashboard
```

## Protected Route Access Flow

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant Backend
    participant Database

    User->>Frontend: Attempts to access protected route
    Frontend->>Frontend: Checks auth context
    alt User not authenticated
        Frontend->>Frontend: Redirects to login page
    else User is authenticated
        Frontend->>Backend: GET /api/auth/me (with session cookie)
        Backend->>Database: Validates session
        Database-->>Backend: Returns session data
        Backend-->>Frontend: Returns user data
        Frontend->>Frontend: Updates auth context if needed
        Frontend-->>User: Renders protected component
    end
```

## Password Reset Flow

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant Backend
    participant Database
    participant EmailService

    User->>Frontend: Requests password reset
    Frontend->>Frontend: Enters email in form
    Frontend->>Backend: POST /api/auth/forgot-password (email)
    Backend->>Database: Finds user by email
    Database-->>Backend: Returns user data
    Backend->>Backend: Generates reset token
    Backend->>Database: Updates user with reset token
    Database-->>Backend: Confirms update
    Backend->>EmailService: Sends reset email
    Backend-->>Frontend: Returns success response
    Frontend-->>User: Shows reset email sent message
    
    User->>EmailService: Clicks reset link
    EmailService->>Frontend: Opens reset password page
    User->>Frontend: Enters new password
    Frontend->>Backend: POST /api/auth/reset-password (token, password)
    Backend->>Backend: Validates token
    Backend->>Backend: Hashes new password
    Backend->>Database: Updates user password and clears token
    Database-->>Backend: Confirms update
    Backend-->>Frontend: Returns success response
    Frontend-->>User: Shows success message and redirects to login
```

## Session Management Flow

```mermaid
stateDiagram-v2
    [*] --> Unauthenticated
    Unauthenticated --> Registering: Start registration
    Unauthenticated --> LoggingIn: Start login
    
    Registering --> EmailVerification: Registration successful
    EmailVerification --> Unauthenticated: Verification failed
    EmailVerification --> LoggingIn: Verification successful
    
    LoggingIn --> Authenticated: Login successful
    LoggingIn --> Unauthenticated: Login failed
    
    Authenticated --> SessionExpired: Session expires
    Authenticated --> LoggingOut: User logs out
    
    SessionExpired --> Unauthenticated: Session cleared
    LoggingOut --> Unauthenticated: Session cleared
```

## Database Schema Relationships

```mermaid
erDiagram
    USERS {
        int id PK
        varchar name
        varchar email UK
        varchar password_hash
        boolean email_verified
        varchar email_verification_token
        timestamp email_verification_expires
        varchar password_reset_token
        timestamp password_reset_expires
        timestamp created_at
        timestamp updated_at
    }
    
    SESSIONS {
        uuid id PK
        int user_id FK
        varchar session_token UK
        timestamp expires_at
        timestamp created_at
        timestamp last_accessed
    }
    
    USERS ||--o{ SESSIONS: has