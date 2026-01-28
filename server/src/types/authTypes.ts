import { Request } from 'express';

// Augment Express Request type
declare global {
  namespace Express {
    interface User {
      id: string;
      email: string;
      name: string | null;
    }
  }
}

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    name: string | null;
  };
}

export interface SignUpData {
  email: string;
  password: string;
  name: string;
  confirmPassword: string;
}

export interface SignInData {
  email: string;
  password: string;
}

export interface JWTPayload {
  userId: string;
  email: string;
  name?: string | null;
  iat?: number;
  exp?: number;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

export interface UserProfileData {
  currentPosition?: string;
  experience?: string;
  skills?: string[];
  industry?: string;
  location?: string;
  targetPositions?: string[];
  preferredDomains?: string[];
  avatarUrl?: string;
}
