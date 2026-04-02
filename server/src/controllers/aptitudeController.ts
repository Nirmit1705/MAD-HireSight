import { Request, Response } from 'express';
import { AptitudeService } from '../services/aptitudeService';
import { Position } from '@prisma/client';
import { 
  AptitudeApiResponse, 
  StartTestRequest, 
  StartTestResponse,
  SubmitAnswerRequest,
  SubmitAnswerResponse,
  CompleteTestRequest,
  CompleteTestResponse,
  GetQuestionsQuery,
  AptitudeQuestionForFrontend,
  AptitudeQuestionForPractice 
} from '../types/aptitudeTypes';
import { AuthenticatedRequest } from '../types/authTypes';

export class AptitudeController {
  constructor(private aptitudeService: AptitudeService) {}

  async getQuestions(req: Request, res: Response) {
    try {
      const { position, limit } = req.query;
      const userId = (req as any).user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated'
        });
      }

      if (!position || !Object.values(Position).includes(position as Position)) {
        return res.status(400).json({
          success: false,
          message: 'Valid position is required'
        });
      }

      const questionLimit = limit ? parseInt(limit as string, 10) : 30;
      const questions = await this.aptitudeService.getRandomQuestions(position as Position, questionLimit);

      res.json({
        success: true,
        data: {
          questions: questions.map(q => ({
            id: q.id,
            questionText: q.questionText,
            options: q.options,
            category: q.category,
            difficulty: q.difficulty
            // Note: correctOption is intentionally excluded from frontend response
          }))
        }
      });
    } catch (error) {
      console.error('Error in getQuestions:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch questions'
      });
    }
  }

  async getPracticeQuestions(req: Request, res: Response) {
    try {
      const { position } = req.query;
      const userId = (req as any).user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated'
        });
      }

      if (!position || !Object.values(Position).includes(position as Position)) {
        return res.status(400).json({
          success: false,
          message: 'Valid position is required'
        });
      }

      const questions = await this.aptitudeService.getPracticeQuestions(position as Position, 20);

      // For practice mode, include correct answers and explanations
      res.json({
        success: true,
        data: {
          questions: questions
        }
      });
    } catch (error) {
      console.error('Error in getPracticeQuestions:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch practice questions'
      });
    }
  }

  async startTest(req: Request, res: Response) {
    try {
      const { position, isPractice = false } = req.body;
      const userId = (req as any).user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated'
        });
      }

      if (!position || !Object.values(Position).includes(position)) {
        return res.status(400).json({
          success: false,
          message: 'Valid position is required'
        });
      }

      const test = await this.aptitudeService.createAptitudeTest(userId, position, isPractice);

      res.status(201).json({
        success: true,
        data: {
          testId: test.id,
          position: test.position,
          isPractice: test.isPractice,
          totalQuestions: test.totalQuestions,
          timeLimit: test.timeLimit,
          startedAt: test.startedAt
        }
      });
    } catch (error) {
      console.error('Error in startTest:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to start test'
      });
    }
  }

  async submitAnswer(req: Request, res: Response) {
    try {
      const { testId } = req.params;
      const { questionId, selectedOption } = req.body;
      const userId = (req as any).user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated'
        });
      }

      if (!questionId || selectedOption === undefined || selectedOption < 0 || selectedOption > 3) {
        return res.status(400).json({
          success: false,
          message: 'Valid questionId and selectedOption (0-3) are required'
        });
      }

      const answer = await this.aptitudeService.submitAnswer(testId, questionId, selectedOption);

      res.json({
        success: true,
        data: {
          answerId: answer.id,
          isCorrect: answer.isCorrect
        }
      });
    } catch (error) {
      console.error('Error in submitAnswer:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to submit answer'
      });
    }
  }

  async completeTest(req: Request, res: Response) {
    try {
      const { testId } = req.params;
      const { timeTaken } = req.body;
      const userId = (req as any).user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated'
        });
      }

      if (timeTaken === undefined || timeTaken === null || timeTaken < 0) {
        return res.status(400).json({
          success: false,
          message: 'Valid timeTaken (in seconds) is required'
        });
      }

      const completedTest = await this.aptitudeService.completeTest(testId, timeTaken);

      res.json({
        success: true,
        data: {
          testId: completedTest.id,
          overallScore: completedTest.overallScore,
          scores: {
            domainKnowledge: completedTest.domainKnowledgeScore,
            quantitative: completedTest.quantitativeScore,
            logicalReasoning: completedTest.logicalReasoningScore,
            verbalAbility: completedTest.verbalAbilityScore
          },
          completedAt: completedTest.completedAt,
          timeTaken: completedTest.timeTaken
        }
      });
    } catch (error) {
      console.error('Error in completeTest:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to complete test'
      });
    }
  }

  async getTestResults(req: Request, res: Response) {
    try {
      const { testId } = req.params;
      const userId = (req as any).user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated'
        });
      }

      const test = await this.aptitudeService.getTestResults(testId, userId);

      res.json({
        success: true,
        data: {
          test: {
            id: test.id,
            position: test.position,
            isPractice: test.isPractice,
            status: test.status,
            overallScore: test.overallScore,
            scores: {
              domainKnowledge: test.domainKnowledgeScore,
              quantitative: test.quantitativeScore,
              logicalReasoning: test.logicalReasoningScore,
              verbalAbility: test.verbalAbilityScore
            },
            startedAt: test.startedAt,
            completedAt: test.completedAt,
            timeTaken: test.timeTaken
          },
          answers: test.answers.map(answer => ({
            questionText: answer.question.questionText,
            options: answer.question.options,
            selectedOption: answer.selectedOption,
            correctOption: answer.correctOption,
            isCorrect: answer.isCorrect,
            category: answer.question.category
          }))
        }
      });
    } catch (error) {
      console.error('Error in getTestResults:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch test results'
      });
    }
  }

  async getTestHistory(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      const { limit = 10 } = req.query;

      console.log('getTestHistory called for userId:', userId);

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated'
        });
      }

      const history = await this.aptitudeService.getUserTestHistory(userId, parseInt(limit as string));
      console.log('Test history from service:', history);

      res.json({
        success: true,
        data: {
          tests: history
        }
      });
    } catch (error) {
      console.error('Error in getTestHistory:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch test history'
      });
    }
  }

  async getPreviousScore(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated'
        });
      }

      // Get the most recent completed official assessment test (not practice)
      const latestTest = await this.aptitudeService.getLatestOfficialTest(userId);

      if (latestTest && latestTest.completedAt) {
        res.json({
          success: true,
          hasScore: true,
          score: latestTest.score,
          testDate: latestTest.completedAt,
          position: latestTest.position
        });
      } else {
        res.json({
          success: true,
          hasScore: false,
          score: null
        });
      }
    } catch (error) {
      console.error('Error in getPreviousScore:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to check previous score'
      });
    }
  }
}
