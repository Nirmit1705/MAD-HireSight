import { prisma } from '../config/database';
import { PasswordUtils, TokenUtils, ValidationUtils } from '../utils/authUtils';
import { SignUpData, SignInData, AuthTokens, ApiResponse } from '../types/authTypes';

export class AuthService {
  /**
   * Register a new user
   */
  static async signUp(data: SignUpData): Promise<ApiResponse<{ user: any; tokens: AuthTokens }>> {
    try {
      const { email, password, name, confirmPassword } = data;

      // Validate input
      if (!ValidationUtils.isValidEmail(email)) {
        return {
          success: false,
          message: 'Invalid email format',
        };
      }

      if (!ValidationUtils.isValidName(name)) {
        return {
          success: false,
          message: 'Name must be between 2-50 characters and contain only letters and spaces',
        };
      }

      if (!ValidationUtils.doPasswordsMatch(password, confirmPassword)) {
        return {
          success: false,
          message: 'Passwords do not match',
        };
      }

      const passwordValidation = PasswordUtils.validatePassword(password);
      if (!passwordValidation.isValid) {
        return {
          success: false,
          message: 'Password validation failed',
          error: passwordValidation.errors.join(', '),
        };
      }

      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
      });

      if (existingUser) {
        return {
          success: false,
          message: 'User with this email already exists',
        };
      }

      // Hash password
      const hashedPassword = await PasswordUtils.hashPassword(password);

      // Create user
      const user = await prisma.user.create({
        data: {
          email: email.toLowerCase(),
          name: ValidationUtils.sanitizeString(name),
          passwordHash: hashedPassword,
        },
        select: {
          id: true,
          email: true,
          name: true,
          createdAt: true,
        },
      });

      // Generate tokens
      const tokens = TokenUtils.generateTokenPair(user.id, user.email, user.name);

      // Store refresh token
      await prisma.refreshToken.create({
        data: {
          token: tokens.refreshToken,
          userId: user.id,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        },
      });

      return {
        success: true,
        message: 'User registered successfully',
        data: {
          user,
          tokens,
        },
      };
    } catch (error) {
      console.error('SignUp error:', error);
      return {
        success: false,
        message: 'Failed to register user',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Sign in an existing user
   */
  static async signIn(data: SignInData): Promise<ApiResponse<{ user: any; tokens: AuthTokens }>> {
    try {
      const { email, password } = data;

      // Validate input
      if (!ValidationUtils.isValidEmail(email)) {
        return {
          success: false,
          message: 'Invalid email format',
        };
      }

      if (!password) {
        return {
          success: false,
          message: 'Password is required',
        };
      }

      // Find user
      const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
      });

      if (!user) {
        return {
          success: false,
          message: 'Invalid email or password',
        };
      }

      // Check if user has a password (not a Google OAuth user)
      if (!user.passwordHash) {
        return {
          success: false,
          message: 'Please sign in with Google for this account',
        };
      }

      // Verify password
      const isPasswordValid = await PasswordUtils.comparePassword(password, user.passwordHash);
      if (!isPasswordValid) {
        return {
          success: false,
          message: 'Invalid email or password',
        };
      }

      // Generate tokens
      const tokens = TokenUtils.generateTokenPair(user.id, user.email, user.name);

      // Store refresh token
      await prisma.refreshToken.create({
        data: {
          token: tokens.refreshToken,
          userId: user.id,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        },
      });

      // Return user without password
      const { passwordHash: _, ...userWithoutPassword } = user;

      return {
        success: true,
        message: 'Sign in successful',
        data: {
          user: userWithoutPassword,
          tokens,
        },
      };
    } catch (error) {
      console.error('SignIn error:', error);
      return {
        success: false,
        message: 'Failed to sign in',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Refresh access token using refresh token
   */
  static async refreshToken(refreshToken: string): Promise<ApiResponse<{ tokens: AuthTokens }>> {
    try {
      if (!refreshToken) {
        return {
          success: false,
          message: 'Refresh token is required',
        };
      }

      // Find refresh token in database
      const storedToken = await prisma.refreshToken.findUnique({
        where: { token: refreshToken },
        include: { user: true },
      });

      if (!storedToken) {
        return {
          success: false,
          message: 'Invalid refresh token',
        };
      }

      // Check if token is expired
      if (storedToken.expiresAt < new Date()) {
        // Delete expired token
        await prisma.refreshToken.delete({
          where: { token: refreshToken },
        });

        return {
          success: false,
          message: 'Refresh token expired',
        };
      }

      // Generate new tokens
      const newTokens = TokenUtils.generateTokenPair(storedToken.user.id, storedToken.user.email, storedToken.user.name);

      // Update refresh token in database
      await prisma.refreshToken.update({
        where: { token: refreshToken },
        data: {
          token: newTokens.refreshToken,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        },
      });

      return {
        success: true,
        message: 'Token refreshed successfully',
        data: {
          tokens: newTokens,
        },
      };
    } catch (error) {
      console.error('RefreshToken error:', error);
      return {
        success: false,
        message: 'Failed to refresh token',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Sign out user (invalidate refresh token)
   */
  static async signOut(refreshToken: string): Promise<ApiResponse> {
    try {
      if (refreshToken) {
        await prisma.refreshToken.delete({
          where: { token: refreshToken },
        }).catch(() => {
          // Token might not exist, ignore error
        });
      }

      return {
        success: true,
        message: 'Signed out successfully',
      };
    } catch (error) {
      console.error('SignOut error:', error);
      return {
        success: false,
        message: 'Failed to sign out',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get user profile
   */
  static async getUserProfile(userId: string): Promise<ApiResponse<any>> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          name: true,
          isVerified: true,
          createdAt: true,
          profile: true,
        },
      });

      if (!user) {
        return {
          success: false,
          message: 'User not found',
        };
      }

      return {
        success: true,
        message: 'User profile retrieved successfully',
        data: user,
      };
    } catch (error) {
      console.error('GetUserProfile error:', error);
      return {
        success: false,
        message: 'Failed to get user profile',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Google OAuth authentication for mobile
   */
  static async googleMobileAuth(idToken: string): Promise<ApiResponse<{ user: any; tokens: AuthTokens }>> {
    try {
      const { OAuth2Client } = require('google-auth-library');
      const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

      // Verify Google ID token
      const ticket = await client.verifyIdToken({
        idToken,
        audience: process.env.GOOGLE_CLIENT_ID,
      });

      const payload = ticket.getPayload();
      
      if (!payload || !payload.email) {
        return {
          success: false,
          message: 'Invalid Google token payload',
        };
      }

      const { email, name, picture } = payload;

      // Check if user exists
      let user = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
      });

      if (user) {
        // Existing user - sign in
        const tokens = TokenUtils.generateTokenPair(user.id, user.email, user.name);

        // Store refresh token
        await prisma.refreshToken.create({
          data: {
            token: tokens.refreshToken,
            userId: user.id,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
          },
        });

        const { passwordHash: _, ...userWithoutPassword } = user;

        return {
          success: true,
          message: 'Google sign in successful',
          data: {
            user: userWithoutPassword,
            tokens,
          },
        };
      } else {
        // New user - sign up
        const newUser = await prisma.user.create({
          data: {
            email: email.toLowerCase(),
            name: name || 'Google User',
            isVerified: true, // Google accounts are pre-verified
            // No password for Google OAuth users
          },
        });

        // Generate tokens
        const tokens = TokenUtils.generateTokenPair(newUser.id, newUser.email, newUser.name);

        // Store refresh token
        await prisma.refreshToken.create({
          data: {
            token: tokens.refreshToken,
            userId: newUser.id,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
          },
        });

        // Return user without sensitive fields
        const { passwordHash: _, ...userWithoutPassword } = newUser;

        return {
          success: true,
          message: 'Google sign up successful',
          data: {
            user: userWithoutPassword,
            tokens,
          },
        };
      }
    } catch (error) {
      console.error('GoogleMobileAuth error:', error);
      return {
        success: false,
        message: 'Failed to authenticate with Google',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}
