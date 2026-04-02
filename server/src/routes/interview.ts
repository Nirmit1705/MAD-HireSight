import { Router } from 'express';
import { InterviewController } from '../controllers/interviewController';
import { InterviewQuestionService } from '../services/interviewQuestionService';
import { AIFeedbackService } from '../services/aiFeedbackService';
import { redis } from '../config/redis';
import { authenticateToken } from '../middleware/authMiddleware';

const router = Router();

// Initialize interview services
const interviewQuestionService = new InterviewQuestionService(redis);
const interviewController = new InterviewController(interviewQuestionService);

// All routes require authentication except the end interview endpoint (temporarily for testing)
router.use((req, res, next) => {
  // Skip auth for the end interview endpoint temporarily
  if (req.path.includes('/end') && req.method === 'POST') {
    return next();
  }
  return authenticateToken(req, res, next);
});

// Start a new interview
router.post('/start', (req, res) => interviewController.startInterview(req, res));

// Submit a question response during interview
router.post('/:interviewId/questions', (req, res) => 
  interviewController.submitQuestionResponse(req, res)
);

// Update scores for a specific question (called by AI/ML service)
router.put('/:interviewId/questions/:questionIndex/scores', (req, res) => 
  interviewController.updateQuestionScores(req, res)
);

// Get current interview session status
router.get('/:interviewId/session', (req, res) => 
  interviewController.getInterviewSession(req, res)
);

// Complete interview and save final results
router.post('/:interviewId/complete', (req, res) => 
  interviewController.completeInterview(req, res)
);

// End interview with AI-generated feedback (for demo purposes)
router.post('/:interviewId/end', (req, res) => 
  interviewController.endInterviewWithFeedback(req, res)
);

// Abandon interview
router.post('/:interviewId/abandon', (req, res) => 
  interviewController.abandonInterview(req, res)
);

export default router;
