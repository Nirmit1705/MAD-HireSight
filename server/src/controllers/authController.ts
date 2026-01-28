import { Request, Response } from 'express';
import { body } from 'express-validator';
import { AuthService } from '../services/authService';
import { AuthenticatedRequest, SignUpData, SignInData } from '../types/authTypes';
import passport from '../config/passport';

export class AuthController {
  /**
   * Validation rules for sign up
   */
  static signUpValidation = [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Please provide a valid email'),
    body('name')
      .isLength({ min: 2, max: 50 })
      .trim()
      .matches(/^[a-zA-Z\s]+$/)
      .withMessage('Name must be between 2-50 characters and contain only letters and spaces'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters long'),
    body('confirmPassword')
      .custom((value, { req }) => {
        if (value !== req.body.password) {
          throw new Error('Passwords do not match');
        }
        return true;
      }),
  ];

  /**
   * Validation rules for sign in
   */
  static signInValidation = [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Please provide a valid email'),
    body('password')
      .notEmpty()
      .withMessage('Password is required'),
  ];

  /**
   * Sign up a new user
   */
  static async signUp(req: Request, res: Response): Promise<void> {
    try {
      const signUpData: SignUpData = req.body;
      const result = await AuthService.signUp(signUpData);

      if (result.success && result.data) {
        res.status(201).json({
          success: true,
          message: result.message,
          data: {
            user: result.data.user,
            accessToken: result.data.tokens.accessToken,
            refreshToken: result.data.tokens.refreshToken,
          },
        });
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Sign in an existing user
   */
  static async signIn(req: Request, res: Response): Promise<void> {
    try {
      const signInData: SignInData = req.body;
      const result = await AuthService.signIn(signInData);

      if (result.success && result.data) {
        res.status(200).json({
          success: true,
          message: result.message,
          data: {
            user: result.data.user,
            accessToken: result.data.tokens.accessToken,
            refreshToken: result.data.tokens.refreshToken,
          },
        });
      } else {
        res.status(401).json(result);
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Refresh access token
   */
  static async refreshToken(req: Request, res: Response): Promise<void> {
    try {
      const refreshToken = req.body.refreshToken;
      const result = await AuthService.refreshToken(refreshToken);

      if (result.success && result.data) {
        res.status(200).json({
          success: true,
          message: result.message,
          data: {
            accessToken: result.data.tokens.accessToken,
            refreshToken: result.data.tokens.refreshToken,
          },
        });
      } else {
        res.status(401).json(result);
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Sign out user
   */
  static async signOut(req: Request, res: Response): Promise<void> {
    try {
      const refreshToken = req.body.refreshToken;
      const result = await AuthService.signOut(refreshToken);

      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get current user profile
   */
  static async getProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
        return;
      }

      const result = await AuthService.getUserProfile(req.user.id);

      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(404).json(result);
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Verify token endpoint
   */
  static async verifyToken(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Token is invalid',
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Token is valid',
        data: {
          user: req.user,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Google OAuth callback
   */
  static googleCallback = async (req: Request, res: Response) => {
    try {
      const userWithTokens = req.user as any;
      
      if (!userWithTokens) {
        const frontendUrl = process.env.CORS_ORIGIN || 'http://localhost:5173';
        return res.redirect(`${frontendUrl}/auth/error`);
      }
      
      // Extract user data and tokens
      const { tokens, ...userData } = userWithTokens;
      
      if (!tokens) {
        const frontendUrl = process.env.CORS_ORIGIN || 'http://localhost:5173';
        return res.redirect(`${frontendUrl}/auth/error`);
      }

      // Set HTTP-only cookies
      res.cookie('accessToken', tokens.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 15 * 60 * 1000, // 15 minutes
      });

      res.cookie('refreshToken', tokens.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      // Redirect to frontend with success
      const frontendUrl = process.env.CORS_ORIGIN || 'http://localhost:5173';
      res.redirect(`${frontendUrl}/auth/success?token=${tokens.accessToken}`);
    } catch (error) {
      console.error('Google callback error:', error);
      const frontendUrl = process.env.CORS_ORIGIN || 'http://localhost:5173';
      res.redirect(`${frontendUrl}/auth/error`);
    }
  };

  /**
   * Google OAuth failure
   */
  static googleFailure = (req: Request, res: Response) => {
    const frontendUrl = process.env.CORS_ORIGIN || 'http://localhost:5173';
    res.redirect(`${frontendUrl}/auth/error`);
  };

  /**
   * Google Mobile Authentication
   * Verify Google ID token and authenticate user
   */
  static async googleMobileAuth(req: Request, res: Response): Promise<void> {
    try {
      const { idToken } = req.body;

      if (!idToken) {
        res.status(400).json({
          success: false,
          message: 'Google ID token is required',
        });
        return;
      }

      const result = await AuthService.googleMobileAuth(idToken);

      if (result.success && result.data) {
        res.status(200).json({
          success: true,
          message: result.message,
          data: {
            user: result.data.user,
            accessToken: result.data.tokens.accessToken,
            refreshToken: result.data.tokens.refreshToken,
          },
        });
      } else {
        res.status(401).json(result);
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}
