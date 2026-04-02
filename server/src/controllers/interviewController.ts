import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { InterviewQuestionService, InterviewQuestionData } from '../services/interviewQuestionService';
import { AIFeedbackService, InterviewData } from '../services/aiFeedbackService';

const prisma = new PrismaClient();

// Note: You'll need to initialize Redis and InterviewQuestionService
// const redis = new Redis(process.env.REDIS_URL);
// const interviewQuestionService = new InterviewQuestionService(redis);

export class InterviewController {
  private aiFeedbackService: AIFeedbackService;

  constructor(private interviewQuestionService: InterviewQuestionService) {
    this.aiFeedbackService = new AIFeedbackService();
  }

  /**
   * Map human-readable position to database enum
   */
  private mapPositionToEnum(position?: string): 'BACKEND_DEVELOPER' | 'FRONTEND_DEVELOPER' | 'FULL_STACK_DEVELOPER' | 'DATA_ANALYST' | 'AI_ML' | 'CLOUD' {
    if (!position) return 'FULL_STACK_DEVELOPER';
    
    const positionMap: { [key: string]: 'BACKEND_DEVELOPER' | 'FRONTEND_DEVELOPER' | 'FULL_STACK_DEVELOPER' | 'DATA_ANALYST' | 'AI_ML' | 'CLOUD' } = {
      'software engineering': 'FULL_STACK_DEVELOPER',
      'software engineer': 'FULL_STACK_DEVELOPER',
      'software-engineering': 'FULL_STACK_DEVELOPER',
      'frontend developer': 'FRONTEND_DEVELOPER',
      'frontend development': 'FRONTEND_DEVELOPER',
      'backend developer': 'BACKEND_DEVELOPER',
      'backend development': 'BACKEND_DEVELOPER',
      'full stack developer': 'FULL_STACK_DEVELOPER',
      'full stack development': 'FULL_STACK_DEVELOPER',
      'fullstack developer': 'FULL_STACK_DEVELOPER',
      'data scientist': 'DATA_ANALYST',
      'data science': 'DATA_ANALYST',
      'data analyst': 'DATA_ANALYST',
      'ai/ml': 'AI_ML',
      'artificial intelligence': 'AI_ML',
      'machine learning': 'AI_ML',
      'cloud engineer': 'CLOUD',
      'cloud': 'CLOUD',
      'devops': 'CLOUD'
    };

    const key = position.toLowerCase().trim();
    return positionMap[key] || 'FULL_STACK_DEVELOPER';
  }

  /**
   * Start a new interview
   */
  async startInterview(req: Request, res: Response) {
    try {
      const { userId, position } = req.body;

      // Create interview record in PostgreSQL with minimal data
      const interview = await prisma.interview.create({
        data: {
          userId,
          position,
          status: 'IN_PROGRESS',
        },
      });

      // Create in-memory session for questions
      await this.interviewQuestionService.createInterviewSession(
        interview.id,
        userId,
        position
      );

      res.status(201).json({
        success: true,
        interview: {
          id: interview.id,
          position: interview.position,
          startedAt: interview.startedAt,
          status: interview.status,
        },
      });
    } catch (error) {
      console.error('Error starting interview:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to start interview',
      });
    }
  }

  /**
   * Submit a question response during interview
   */
  async submitQuestionResponse(req: Request, res: Response) {
    try {
      const { interviewId } = req.params;
      const { questionText, userResponse, audioUrl, duration } = req.body;

      const questionData: InterviewQuestionData = {
        questionId: `q_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        questionText,
        userResponse,
        audioUrl,
        timestamp: new Date(),
        duration,
      };

      // Store question response in memory/Redis
      await this.interviewQuestionService.addQuestionResponse(interviewId, questionData);

      res.status(200).json({
        success: true,
        message: 'Question response recorded',
        questionId: questionData.questionId,
      });
    } catch (error) {
      console.error('Error submitting question response:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to record question response',
      });
    }
  }

  /**
   * Update scores for a specific question (called by AI/ML service)
   */
  async updateQuestionScores(req: Request, res: Response) {
    try {
      const { interviewId, questionIndex } = req.params;
      const scores = req.body;

      await this.interviewQuestionService.updateQuestionScores(
        interviewId,
        parseInt(questionIndex),
        scores
      );

      res.status(200).json({
        success: true,
        message: 'Question scores updated',
      });
    } catch (error) {
      console.error('Error updating question scores:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update question scores',
      });
    }
  }

  /**
   * End interview with AI-generated feedback (for demo purposes)
   */
  async endInterviewWithFeedback(req: Request, res: Response) {
    try {
      const { interviewId } = req.params;
      const { responses = [], duration = 1800, position } = req.body; // Get position from request

      console.log('Ending interview:', interviewId);
      console.log('Responses received:', responses.length);
      console.log('Position received:', position);
      console.log('Actual responses data:', JSON.stringify(responses, null, 2));

      // For demo purposes, create a mock interview record if it doesn't exist
      let interview = await prisma.interview.findUnique({
        where: { id: interviewId },
        include: { user: true }
      });

      if (!interview) {
        // Create a demo interview record
        const demoUser = await prisma.user.findFirst();
        if (!demoUser) {
          return res.status(400).json({
            success: false,
            message: 'No user found for demo. Please register first.',
          });
        }

        interview = await prisma.interview.create({
          data: {
            id: interviewId,
            userId: demoUser.id,
            position: this.mapPositionToEnum(position) || 'FULL_STACK_DEVELOPER', // Use provided position or default
            status: 'IN_PROGRESS',
          },
          include: { user: true }
        });
      }

      // Ensure interview is not null at this point
      if (!interview) {
        return res.status(500).json({
          success: false,
          message: 'Failed to create or find interview record',
        });
      }

      // Prepare interview data for AI analysis
      const interviewData: InterviewData = {
        position: interview.position,
        duration: duration,
        responses: responses.length > 0 ? responses : [
          {
            question: "Tell me about yourself and your background.",
            answer: "I have over 5 years of experience in full-stack software development, working primarily with JavaScript, React, and Node.js. I've built scalable web applications using modern frameworks, implemented RESTful APIs, and worked extensively with databases like PostgreSQL and MongoDB. My expertise includes TypeScript, Docker containerization, and cloud deployment on AWS. I'm passionate about writing clean, maintainable code and following best practices in software architecture.",
            confidence: 85,
            duration: 120
          },
          {
            question: "What are your key technical strengths?",
            answer: "My core strengths include full-stack JavaScript development with React and Node.js, database design and optimization, API development, and system architecture. I'm proficient in modern development practices like test-driven development, CI/CD pipelines, and microservices architecture. I have strong problem-solving skills and experience with performance optimization, debugging complex systems, and implementing scalable solutions. I also have experience with cloud technologies, Docker, and DevOps practices.",
            confidence: 90,
            duration: 90
          },
          {
            question: "Describe a challenging technical project you worked on.",
            answer: "I led the development of a high-traffic e-commerce platform using React, Node.js, and PostgreSQL. The biggest challenge was handling concurrent user sessions and optimizing database queries for product searches. I implemented Redis caching, optimized SQL queries, and used load balancing to improve performance. We also integrated payment APIs, implemented real-time inventory tracking, and built a robust testing framework with Jest and Cypress. The project required careful architecture design to ensure scalability and maintainability.",
            confidence: 80,
            duration: 150
          }
        ]
      };

      console.log('Generating AI feedback...');

      // Generate AI feedback
      const generatedFeedback = await this.aiFeedbackService.generateComprehensiveFeedback(
        interview.userId,
        interviewData,
        undefined // No aptitude data for pure interview feedback
      );

      console.log('Feedback generated:', generatedFeedback);

      // Save feedback to database
      await this.aiFeedbackService.saveFeedbackToDatabase(
        interview.userId,
        generatedFeedback,
        interviewId,
        undefined
      );

      // Clean up in-memory session if it exists
      try {
        await this.interviewQuestionService.completeInterviewSession(interviewId);
      } catch (error) {
        // Session might not exist, that's okay
        console.log('No interview session to clean up');
      }

      // Get the complete feedback record with improvements
      const completeFeedback = await prisma.feedback.findUnique({
        where: { interviewId: interviewId },
        include: {
          improvements: true
        }
      });

      res.status(200).json({
        success: true,
        message: 'Interview completed and feedback generated',
        feedback: completeFeedback,
        interview: {
          id: interview.id,
          status: 'COMPLETED',
          completedAt: new Date(),
        }
      });
    } catch (error) {
      console.error('Error ending interview with feedback:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to complete interview and generate feedback',
        error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
      });
    }
  }

  /**
   * Complete interview and save final results to PostgreSQL
   */
  async completeInterview(req: Request, res: Response) {
    try {
      const { interviewId } = req.params;

      // Calculate final aggregated scores
      const finalScores = await this.interviewQuestionService.calculateFinalScores(interviewId);
      
      if (!finalScores) {
        return res.status(400).json({
          success: false,
          message: 'No scored questions found for this interview',
        });
      }

      // Update interview record in PostgreSQL with final scores
      const completedInterview = await prisma.interview.update({
        where: { id: interviewId },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          duration: Math.floor((new Date().getTime() - new Date().getTime()) / 1000), // You'll need to calculate this properly
          fluencyScore: finalScores.fluencyScore,
          grammarScore: finalScores.grammarScore,
          confidenceScore: finalScores.confidenceScore,
          technicalKnowledgeScore: finalScores.technicalKnowledgeScore,
          vocabularyScore: finalScores.vocabularyScore,
          analyticalThinkingScore: finalScores.analyticalThinkingScore,
          overallScore: finalScores.overallScore,
        },
      });

      // Create feedback record
      await prisma.feedback.create({
        data: {
          userId: completedInterview.userId,
          interviewId: completedInterview.id,
          fluencyScore: finalScores.fluencyScore,
          grammarScore: finalScores.grammarScore,
          confidenceScore: finalScores.confidenceScore,
          technicalKnowledgeScore: finalScores.technicalKnowledgeScore,
          vocabularyScore: finalScores.vocabularyScore,
          analyticalThinkingScore: finalScores.analyticalThinkingScore,
          interviewOverallScore: finalScores.overallScore,
          strengths: [], // You can generate these based on high scores
          // Add feedback improvements as needed
        },
      });

      // Clean up in-memory session
      await this.interviewQuestionService.completeInterviewSession(interviewId);

      res.status(200).json({
        success: true,
        interview: completedInterview,
        scores: finalScores,
      });
    } catch (error) {
      console.error('Error completing interview:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to complete interview',
      });
    }
  }

  /**
   * Get current interview session status
   */
  async getInterviewSession(req: Request, res: Response) {
    try {
      const { interviewId } = req.params;

      const session = await this.interviewQuestionService.getInterviewSession(interviewId);
      
      if (!session) {
        return res.status(404).json({
          success: false,
          message: 'Interview session not found',
        });
      }

      // Return session info without sensitive question data
      res.status(200).json({
        success: true,
        session: {
          interviewId: session.interviewId,
          position: session.position,
          startedAt: session.startedAt,
          currentQuestionIndex: session.currentQuestionIndex,
          totalQuestions: session.questions.length,
          status: session.status,
        },
      });
    } catch (error) {
      console.error('Error getting interview session:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get interview session',
      });
    }
  }

  /**
   * Abandon interview
   */
  async abandonInterview(req: Request, res: Response) {
    try {
      const { interviewId } = req.params;

      // Update interview status in PostgreSQL
      await prisma.interview.update({
        where: { id: interviewId },
        data: {
          status: 'ABANDONED',
          completedAt: new Date(),
        },
      });

      // Clean up in-memory session
      await this.interviewQuestionService.deleteInterviewSession(interviewId);

      res.status(200).json({
        success: true,
        message: 'Interview abandoned',
      });
    } catch (error) {
      console.error('Error abandoning interview:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to abandon interview',
      });
    }
  }
}
