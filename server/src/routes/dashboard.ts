import { Router } from 'express';
import { DashboardController } from '../controllers/dashboardController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = Router();

// Initialize controller
const dashboardController = new DashboardController();

// All routes require authentication
router.use(authenticateToken);

// GET /api/dashboard/stats
router.get('/stats', (req, res) => dashboardController.getDashboardStats(req, res));

export default router;
