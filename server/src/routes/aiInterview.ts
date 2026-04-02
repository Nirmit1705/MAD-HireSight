import express from 'express';
import multer from 'multer';
import { authenticateToken } from '../middleware/authMiddleware';
import { ResumeProcessingService } from '../services/resumeProcessingService';
import { AIQuestionService } from '../services/aiQuestionService';
import { ContextualInterviewController } from '../controllers/contextualInterviewController';
import { AuthenticatedRequest } from '../types/authTypes';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

const router = express.Router();
const resumeService = new ResumeProcessingService();
const aiService = new AIQuestionService();
const contextualController = new ContextualInterviewController();

// Test endpoint for Ollama debugging
router.post('/test-ollama', authenticateToken, async (req, res) => {
  try {
    console.log('=== TESTING OLLAMA DIRECTLY ===');
    const startTime = Date.now();
    
    // Test with minimal prompt
    const testPrompt = 'Generate 1 question: {"text": "What is React?", "category": "technical"}';
    
    const response = await aiService.testOllamaConnection(testPrompt);
    const endTime = Date.now();
    
    console.log(`Test completed in ${endTime - startTime}ms`);
    
    res.json({
      success: true,
      responseTime: endTime - startTime,
      response: response.substring(0, 200) + '...'
    });
  } catch (error: any) {
    console.error('Ollama test failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Configure multer for resume uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg',
      'image/png',
      'image/jpg'
    ];
    
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, Word documents, and images are allowed.'));
    }
  }
});

/**
 * Upload and analyze resume for AI interview
 */
router.post('/upload-resume', authenticateToken, upload.single('resume'), async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        message: 'No resume file uploaded' 
      });
    }

    // Save uploaded file temporarily
    const tempDir = path.join(__dirname, '../../temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const tempFilePath = path.join(tempDir, `resume-${Date.now()}-${req.file.originalname}`);
    await promisify(fs.writeFile)(tempFilePath, req.file.buffer);

    try {
      // Extract text from resume using hybrid approach
      const extractedText = await resumeService.extractTextFromResume(tempFilePath, req.file.mimetype);
      
      if (!extractedText || extractedText.trim().length < 50) {
        return res.status(400).json({
          success: false,
          message: 'Could not extract meaningful text from resume. Please ensure the file is readable.'
        });
      }

      // Analyze resume content
      const analysis = await resumeService.analyzeResumeText(extractedText);
      
      res.json({
        success: true,
        data: {
          extractedText: extractedText.substring(0, 500) + '...', // Preview only
          analysis,
          message: 'Resume analyzed successfully'
        }
      });

    } finally {
      // Clean up temp file
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }
    }

  } catch (error) {
    console.error('Resume upload error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      message: 'Failed to process resume',
      error: process.env.NODE_ENV === 'development' ? errorMessage : undefined
    });
  }
});

/**
 * Start AI interview session with resume
 */
router.post('/start-ai-interview', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const { resumeAnalysis } = req.body;

    if (!resumeAnalysis) {
      return res.status(400).json({
        success: false,
        message: 'Resume analysis required to start AI interview'
      });
    }

    // Check if Ollama is available
    const ollamaHealthy = await aiService.healthCheck();
    if (!ollamaHealthy) {
      console.log('Ollama is not available, but will proceed with fallback questions');
    }

    // Generate session ID
    const sessionId = `ai-interview-${req.user?.id}-${Date.now()}`;

    // Create interview session (this will use fallback questions if Ollama is not available)
    const session = await aiService.createInterviewSession(sessionId, resumeAnalysis);

    res.json({
      success: true,
      data: {
        sessionId: session.sessionId,
        firstQuestion: session.questions[0],
        totalQuestions: session.questions.length,
        candidateProfile: {
          skills: resumeAnalysis.skills.slice(0, 5), // Top 5 skills
          experience: resumeAnalysis.experience,
          domain: resumeAnalysis.domain
        }
      }
    });

  } catch (error) {
    console.error('AI interview start error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      message: 'Failed to start AI interview',
      error: process.env.NODE_ENV === 'development' ? errorMessage : undefined
    });
  }
});

/**
 * Submit answer and get next question
 */
router.post('/submit-answer', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const { sessionId, answer } = req.body;

    if (!sessionId || !answer) {
      return res.status(400).json({
        success: false,
        message: 'Session ID and answer are required'
      });
    }

    if (answer.trim().length < 10) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a more detailed answer (minimum 10 characters)'
      });
    }

    // Process response and get next question
    const result = await aiService.processResponse(sessionId, answer.trim());

    const session = aiService.getSession(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Interview session not found'
      });
    }

    res.json({
      success: true,
      data: {
        nextQuestion: result.nextQuestion,
        shouldContinue: result.shouldContinue,
        isFollowUp: result.isFollowUp,
        progress: {
          currentQuestion: session.currentQuestionIndex + 1,
          totalQuestions: session.questions.length,
          conversationLength: session.conversationHistory.length
        },
        message: result.isFollowUp ? 'Follow-up question generated' : 'Moving to next question'
      }
    });

  } catch (error) {
    console.error('Answer submission error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      message: 'Failed to process answer',
      error: process.env.NODE_ENV === 'development' ? errorMessage : undefined
    });
  }
});

/**
 * Complete AI interview session
 */
router.post('/complete-interview', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        message: 'Session ID is required'
      });
    }

    const session = aiService.getSession(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Interview session not found'
      });
    }

    // Generate interview summary
    const summary = {
      sessionId,
      totalQuestions: session.conversationHistory.length,
      duration: session.conversationHistory.length > 0 ? 
        new Date().getTime() - session.conversationHistory[0].timestamp.getTime() : 0,
      skills: session.resumeAnalysis?.skills || [],
      domain: session.resumeAnalysis?.domain,
      completedAt: new Date()
    };

    // Clean up session
    aiService.completeSession(sessionId);

    res.json({
      success: true,
      data: {
        summary,
        message: 'Interview completed successfully'
      }
    });

  } catch (error) {
    console.error('Interview completion error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      message: 'Failed to complete interview',
      error: process.env.NODE_ENV === 'development' ? errorMessage : undefined
    });
  }
});

/**
 * Get current interview session status
 */
router.get('/session/:sessionId', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const { sessionId } = req.params;
    
    const session = aiService.getSession(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Interview session not found'
      });
    }

    res.json({
      success: true,
      data: {
        sessionId: session.sessionId,
        currentQuestion: session.questions[session.currentQuestionIndex],
        progress: {
          currentQuestion: session.currentQuestionIndex + 1,
          totalQuestions: session.questions.length,
          conversationLength: session.conversationHistory.length
        },
        candidateProfile: {
          skills: session.resumeAnalysis?.skills.slice(0, 5) || [],
          experience: session.resumeAnalysis?.experience,
          domain: session.resumeAnalysis?.domain
        }
      }
    });

  } catch (error) {
    console.error('Session status error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      message: 'Failed to get session status',
      error: process.env.NODE_ENV === 'development' ? errorMessage : undefined
    });
  }
});

/**
 * Health check for AI services
 */
router.get('/health', async (req, res) => {
  try {
    const ollamaHealthy = await aiService.healthCheck();
    
    res.json({
      success: true,
      data: {
        ollama: ollamaHealthy,
        resumeProcessing: true, // Always available
        timestamp: new Date()
      }
    });

  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({
      success: false,
      message: 'Health check failed'
    });
  }
});

// === NEW CONTEXTUAL INTERVIEW ROUTES ===

/**
 * Start contextual AI interview session with conversation awareness
 */
router.post('/start-contextual-interview', authenticateToken, async (req: AuthenticatedRequest, res) => {
  await contextualController.startContextualInterview(req, res);
});

/**
 * Submit answer and get contextual response with human-like interactions
 */
router.post('/submit-contextual-answer', authenticateToken, async (req: AuthenticatedRequest, res) => {
  await contextualController.submitContextualAnswer(req, res);
});

/**
 * Complete contextual AI interview session
 */
router.post('/complete-contextual-interview', authenticateToken, async (req: AuthenticatedRequest, res) => {
  await contextualController.completeContextualInterview(req, res);
});

/**
 * Get interview history for the authenticated user
 */
router.get('/history', authenticateToken, async (req: AuthenticatedRequest, res) => {
  await contextualController.getInterviewHistory(req, res);
});

/**
 * Get a single interview by ID
 */
router.get('/interview/:id', authenticateToken, async (req: AuthenticatedRequest, res) => {
  await contextualController.getInterviewById(req, res);
});

/**
 * Get current contextual interview session status with conversation context
 */
router.get('/contextual-session/:sessionId', authenticateToken, async (req: AuthenticatedRequest, res) => {
  await contextualController.getContextualSessionStatus(req, res);
});

/**
 * Get conversation history for a session (for debugging/review)
 */
router.get('/conversation-history/:sessionId', authenticateToken, async (req: AuthenticatedRequest, res) => {
  await contextualController.getConversationHistory(req, res);
});

/**
 * Health check for contextual AI services
 */
router.get('/contextual-health', async (req, res) => {
  await contextualController.healthCheck(req, res);
});

/**
 * Debug endpoint to list active sessions (development only)
 */
router.get('/debug/active-sessions', authenticateToken, async (req: AuthenticatedRequest, res) => {
  await contextualController.listActiveSessions(req, res);
});

export default router;
