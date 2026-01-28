import express from 'express';
import { authenticateToken } from '../middleware/authMiddleware';
import { UserProfileController } from '../controllers/userProfileController';
import { AuthenticatedRequest } from '../types/authTypes';

const router = express.Router();
const userProfileController = new UserProfileController();

/**
 * @route   GET /api/user/profile
 * @desc    Get comprehensive user profile data for profile page
 * @access  Private (requires authentication)
 */
router.get('/profile', authenticateToken, (req: AuthenticatedRequest, res) => 
  userProfileController.getUserProfile(req, res)
);

/**
 * @route   PUT /api/user/profile
 * @desc    Update user profile data
 * @access  Private
 */
router.put('/profile', authenticateToken, (req: AuthenticatedRequest, res) => 
  userProfileController.updateProfile(req, res)
);

/**
 * @route   DELETE /api/user/profile
 * @desc    Delete user account
 * @access  Private
 */
router.delete('/profile', authenticateToken, (req: AuthenticatedRequest, res) => 
  userProfileController.deleteAccount(req, res)
);

export default router;
