# Hiresight Backend API

Backend API for the Hiresight interview preparation platform built with Node.js, Express, TypeScript, and PostgreSQL.

## Features

- 🔐 **User Authentication**: Sign up, sign in, sign out, token refresh
- 🛡️ **Security**: JWT tokens, password hashing, rate limiting, CORS protection
- 📊 **Database**: PostgreSQL with Prisma ORM
- 🔒 **Type Safety**: Full TypeScript implementation
- 🚀 **Production Ready**: Error handling, logging, graceful shutdown

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Cache/Session Store**: Redis (for interview questions)
- **Authentication**: JWT + Refresh Tokens
- **Security**: Helmet, CORS, Rate Limiting
- **Validation**: Express Validator

## Project Structure

```
server/
├── prisma/
│   └── schema.prisma          # Database schema
├── src/
│   ├── config/
│   │   ├── config.ts          # Environment configuration
│   │   └── database.ts        # Database connection
│   ├── controllers/
│   │   └── authController.ts  # Authentication controllers
│   ├── middleware/
│   │   ├── auth.ts           # Authentication middleware
│   │   ├── validation.ts     # Validation middleware
│   │   └── error.ts          # Error handling middleware
│   ├── routes/
│   │   ├── auth.ts           # Authentication routes
│   │   └── index.ts          # Main router
│   ├── services/
│   │   └── authService.ts    # Authentication business logic
│   ├── types/
│   │   └── auth.ts           # TypeScript type definitions
│   ├── utils/
│   │   └── auth.ts           # Authentication utilities
│   └── server.ts             # Main server file
├── .env                      # Environment variables
├── .env.example              # Environment variables template
├── package.json              # Dependencies and scripts
└── tsconfig.json            # TypeScript configuration
```

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- PostgreSQL (v12 or higher)
- Redis (v6 or higher) - for interview question storage
- npm or yarn

### Installation

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Set up environment variables**:
   ```bash
   cp .env.example .env
   ```
   
   Update the `.env` file with your configuration:
   ```env
   NODE_ENV=development
   PORT=5000
   DATABASE_URL="postgresql://username:password@localhost:5432/hiresight_db?schema=public"
   JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
   JWT_EXPIRES_IN="7d"
   CORS_ORIGIN="http://localhost:5173"
   ```

3. **Set up PostgreSQL database**:
   - Create a PostgreSQL database named `hiresight_db`
   - Update the `DATABASE_URL` in your `.env` file

4. **Generate Prisma client and run migrations**:
   ```bash
   npm run db:generate
   npm run db:migrate
   ```

5. **Start the development server**:
   ```bash
   npm run dev
   ```

## API Endpoints

### Authentication Routes

| Method | Endpoint | Description | Access |
|--------|----------|-------------|---------|
| POST | `/api/auth/signup` | Register new user | Public |
| POST | `/api/auth/signin` | Sign in user | Public |
| POST | `/api/auth/refresh` | Refresh access token | Public |
| POST | `/api/auth/signout` | Sign out user | Public |
| GET | `/api/auth/profile` | Get user profile | Private |
| GET | `/api/auth/verify` | Verify token | Private |

### Sign Up

**POST** `/api/auth/signup`

```json
{
  "email": "user@example.com",
  "name": "John Doe",
  "password": "SecurePass123!",
  "confirmPassword": "SecurePass123!"
}
```

**Response:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "name": "John Doe",
      "createdAt": "2025-01-16T10:00:00Z"
    },
    "accessToken": "jwt_token_here"
  }
}
```

### Sign In

**POST** `/api/auth/signin`

```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Sign in successful",
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "name": "John Doe"
    },
    "accessToken": "jwt_token_here"
  }
}
```

## Database Schema

### Users Table
- `id`: UUID (Primary Key)
- `email`: String (Unique)
- `name`: String
- `password`: String (Hashed)
- `isVerified`: Boolean
- `createdAt`: DateTime
- `updatedAt`: DateTime

### User Profiles Table
- `id`: UUID (Primary Key)
- `userId`: UUID (Foreign Key)
- `currentPosition`: String (Optional)
- `experience`: String (Optional)
- `skills`: String Array (Optional)
- `industry`: String (Optional)
- `location`: String (Optional)
- `targetPositions`: String Array (Optional)
- `preferredDomains`: String Array (Optional)
- `avatarUrl`: String (Optional)

### Refresh Tokens Table
- `id`: UUID (Primary Key)
- `token`: String (Unique)
- `userId`: UUID (Foreign Key)
- `expiresAt`: DateTime
- `createdAt`: DateTime

## Security Features

- **Password Hashing**: bcryptjs with salt rounds
- **JWT Tokens**: Secure access tokens with expiration
- **Refresh Tokens**: Secure token rotation
- **Rate Limiting**: Prevents brute force attacks
- **CORS Protection**: Configurable cross-origin requests
- **Input Validation**: Comprehensive request validation
- **SQL Injection Protection**: Prisma ORM prevents SQL injection
- **HTTP Security Headers**: Helmet.js for security headers

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | development |
| `PORT` | Server port | 5000 |
| `DATABASE_URL` | PostgreSQL connection string | - |
| `JWT_SECRET` | JWT signing secret | - |
| `JWT_EXPIRES_IN` | JWT expiration time | 7d |
| `CORS_ORIGIN` | Allowed CORS origins | http://localhost:5173 |
| `RATE_LIMIT_WINDOW_MS` | Rate limit window | 900000 |
| `RATE_LIMIT_MAX_REQUESTS` | Max requests per window | 100 |

## Scripts

- `npm run dev`: Start development server with hot reload
- `npm run build`: Build TypeScript to JavaScript
- `npm start`: Start production server
- `npm run db:migrate`: Run database migrations
- `npm run db:generate`: Generate Prisma client
- `npm run db:studio`: Open Prisma Studio
- `npm run db:reset`: Reset database (development only)

## Development

1. Make sure PostgreSQL is running
2. Run `npm run dev` to start the development server
3. The server will restart automatically when you make changes
4. Use Prisma Studio (`npm run db:studio`) to inspect your database

## Production Deployment

1. Set environment variables for production
2. Build the application: `npm run build`
3. Run database migrations: `npm run db:migrate`
4. Start the server: `npm start`

## Error Handling

The API uses consistent error response format:

```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error (development only)"
}
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.
