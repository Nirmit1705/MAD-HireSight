import { Router } from 'express';
import { AuthController } from '../controllers/authController';
import { authenticateToken } from '../middleware/authMiddleware';
import { validate } from '../middleware/validation';
import passport from '../config/passport';

const router = Router();

/**
 * @route   POST /api/auth/signup
 * @desc    Register a new user
 * @access  Public
 */
router.post(
  '/signup',
  validate(AuthController.signUpValidation),
  AuthController.signUp
);

/**
 * @route   POST /api/auth/signin
 * @desc    Sign in user
 * @access  Public
 */
router.post(
  '/signin',
  validate(AuthController.signInValidation),
  AuthController.signIn
);

/**
 * @route   POST /api/auth/refresh
 * @desc    Refresh access token
 * @access  Public
 */
router.post('/refresh', AuthController.refreshToken);

/**
 * @route   POST /api/auth/signout
 * @desc    Sign out user
 * @access  Public
 */
router.post('/signout', AuthController.signOut);

/**
 * @route   GET /api/auth/profile
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/profile', authenticateToken, AuthController.getProfile);

/**
 * @route   GET /api/auth/verify
 * @desc    Verify token validity
 * @access  Private
 */
router.get('/verify', authenticateToken, AuthController.verifyToken);

/**
 * @route   POST /api/auth/google/mobile
 * @desc    Authenticate with Google ID token (for mobile apps)
 * @access  Public
 * @body    { idToken: string }
 */
router.post('/google/mobile', AuthController.googleMobileAuth);

// Web-based Google OAuth routes disabled for mobile-first architecture
// If you need to support web OAuth in the future, uncomment and implement:
// router.get('/google', passport.authenticate('google', { ... }));
// router.get('/google/callback', passport.authenticate('google', { ... }), AuthController.googleCallback);
// router.get('/google/failure', AuthController.googleFailure);

export default router;
