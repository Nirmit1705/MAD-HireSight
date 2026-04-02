import { Router } from 'express';
import { AptitudeController } from '../controllers/aptitudeController';
import { AptitudeService } from '../services/aptitudeService';
import { prisma } from '../config/database';
import { authenticateToken } from '../middleware/authMiddleware';

const router = Router();

// Initialize service and controller
const aptitudeService = new AptitudeService(prisma);
const aptitudeController = new AptitudeController(aptitudeService);

// All routes require authentication
router.use(authenticateToken);

// GET /api/aptitude/questions?position=FRONTEND_DEVELOPER
router.get('/questions', (req, res) => aptitudeController.getQuestions(req, res));

// GET /api/aptitude/practice-questions?position=FRONTEND_DEVELOPER
router.get('/practice-questions', (req, res) => aptitudeController.getPracticeQuestions(req, res));

// POST /api/aptitude/start
router.post('/start', (req, res) => aptitudeController.startTest(req, res));

// POST /api/aptitude/:testId/answers
router.post('/:testId/answers', (req, res) => aptitudeController.submitAnswer(req, res));

// POST /api/aptitude/:testId/complete
router.post('/:testId/complete', (req, res) => aptitudeController.completeTest(req, res));

// GET /api/aptitude/:testId/results
router.get('/:testId/results', (req, res) => aptitudeController.getTestResults(req, res));

// GET /api/aptitude/history
router.get('/history', (req, res) => aptitudeController.getTestHistory(req, res));

// GET /api/aptitude/previous-score - Check if user has previous official assessment score
router.get('/previous-score', (req, res) => aptitudeController.getPreviousScore(req, res));

export default router;
