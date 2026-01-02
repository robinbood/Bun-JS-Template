# Full-Stack React Template with Authentication & RBAC

This is a comprehensive full-stack template built with Bun, React, and TypeScript that includes a complete authentication system with Role-Based Access Control (RBAC). It's designed to help developers kickstart new projects without spending time implementing basic authentication and authorization features.

## Features

- **Authentication System**: Complete user authentication with email/password login
- **Role-Based Access Control (RBAC)**: Built-in support for user roles and permissions
- **Session Management**: Secure session handling with refresh tokens
- **Email Verification**: Email verification for new user registrations
- **Password Reset**: Forgot password and reset password functionality
- **Protected Routes**: Frontend route protection based on authentication status
- **Modern UI**: Beautiful UI components built with ShadCN and Tailwind CSS
- **TypeScript**: Full type safety across the entire stack
- **Database Integration**: PostgreSQL database with Drizzle ORM
- **API Layer**: RESTful API with proper error handling

## Tech Stack

- **Runtime**: Bun
- **Frontend**: React 19, TypeScript, Tailwind CSS, ShadCN
- **Backend**: Bun server with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: JWT tokens with refresh token strategy
- **Styling**: Tailwind CSS with custom design system

## Getting Started

### Prerequisites

- Node.js (or Bun) installed
- PostgreSQL database

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

4. Configure your database connection in `.env`

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
│   └── routes/        # API routes
├── FRONTEND/          # Frontend React code
│   ├── components/    # React components
│   ├── context/       # React context providers
│   ├── pages/         # Page components
│   ├── services/      # API service functions
│   └── utils/         # Utility functions
├── components/ui/     # Shared UI components (ShadCN)
├── DB/               # Database schema and configuration
└── utils/            # Shared utilities
```

## Authentication Flow

1. **Registration**: Users register with email and password
2. **Email Verification**: Users verify their email address
3. **Login**: Users log in with their credentials
4. **Session Management**: Access and refresh tokens are issued
5. **Protected Access**: Certain routes and resources require authentication

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

## Contributing

This template is designed to be a starting point for new projects. Feel free to customize it to fit your specific needs.

## License

This project is open source and available under the [MIT License](LICENSE).

---

**Note**: This template was created using `bun init` in bun v1.3.0. [Bun](https://bun.com) is a fast all-in-one JavaScript runtime.
