import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthenticatedRequest } from '../types/authTypes';

const prisma = new PrismaClient();

export class DashboardController {
  /**
   * Get comprehensive dashboard statistics for a user
   */
  async getDashboardStats(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated'
        });
      }

      // Fetch user's completed aptitude tests (excluding practice tests)
      const aptitudeTests = await prisma.aptitudeTest.findMany({
        where: {
          userId,
          status: 'COMPLETED',
          isPractice: false
        },
        orderBy: {
          completedAt: 'desc'
        },
        select: {
          id: true,
          overallScore: true,
          completedAt: true,
          position: true,
          domainKnowledgeScore: true,
          quantitativeScore: true,
          logicalReasoningScore: true,
          verbalAbilityScore: true
        }
      });

      // Fetch user's completed interviews
      const interviews = await prisma.interview.findMany({
        where: {
          userId,
          status: 'COMPLETED'
        },
        orderBy: {
          completedAt: 'desc'
        },
        select: {
          id: true,
          overallScore: true,
          completedAt: true,
          position: true,
          fluencyScore: true,
          grammarScore: true,
          confidenceScore: true,
          technicalKnowledgeScore: true,
          vocabularyScore: true,
          analyticalThinkingScore: true
        }
      });

      // Calculate statistics
      const latestAptitude = aptitudeTests[0];
      const latestInterview = interviews[0];

      const aptitudeScore = latestAptitude?.overallScore || 0;
      const interviewScore = latestInterview?.overallScore || 0;

      // Calculate overall performance (average of all completed sessions)
      const allScores = [
        ...aptitudeTests.map(t => t.overallScore || 0),
        ...interviews.map(i => i.overallScore || 0)
      ];
      const overallPerformance = allScores.length > 0 
        ? Math.round(allScores.reduce((sum, score) => sum + score, 0) / allScores.length)
        : 0;

      const completedSessions = aptitudeTests.length + interviews.length;

      // Get latest feedback for ML evaluation
      const latestFeedback = await prisma.feedback.findFirst({
        where: {
          userId
        },
        orderBy: {
          createdAt: 'desc'
        },
        select: {
          strengths: true,
          performanceInsights: true,
          aptitudeInsights: true,
          improvements: {
            select: {
              area: true,
              priority: true
            }
          },
          interviewOverallScore: true,
          aptitudeOverallScore: true
        }
      });

      // Helper function to extract key labels from descriptions
      const extractLabel = (text: string): string => {
        // Remove common prefixes and take first part before colon or dash
        const cleaned = text
          .replace(/^(Strong|Good|Excellent|Demonstrates|Shows)\s+/i, '')
          .split(/[:\-–—]/)[0]
          .trim();
        
        // Limit to first 3-4 words for brevity
        const words = cleaned.split(' ');
        return words.slice(0, Math.min(4, words.length)).join(' ');
      };

      // Prepare ML evaluation data
      const mlEvaluation = latestFeedback ? {
        overallScore: Math.round(latestFeedback.interviewOverallScore || latestFeedback.aptitudeOverallScore || 0),
        strengths: latestFeedback.strengths.slice(0, 3).map(extractLabel),
        improvements: latestFeedback.improvements
          .filter(imp => imp.priority === 'HIGH' || imp.priority === 'MEDIUM')
          .slice(0, 3)
          .map(imp => imp.area),
        feedback: [
          ...latestFeedback.performanceInsights,
          ...latestFeedback.aptitudeInsights
        ].filter(insight => insight && insight.trim().length > 0)[0] || 'Keep practicing to improve your skills!'
      } : {
        overallScore: 0,
        strengths: [],
        improvements: [],
        feedback: 'Complete your first assessment to get AI-powered feedback!'
      };

      // Prepare performance trend data (combining aptitude and interview scores)
      const performanceData: Array<{
        date: string;
        overallScore: number;
        sessionNumber: number;
      }> = [];
      
      // Combine and sort all sessions by date
      const allSessions = [
        ...aptitudeTests.map(t => ({
          date: t.completedAt,
          score: t.overallScore || 0,
          type: 'aptitude' as const
        })),
        ...interviews.map(i => ({
          date: i.completedAt,
          score: i.overallScore || 0,
          type: 'interview' as const
        }))
      ].sort((a, b) => new Date(a.date!).getTime() - new Date(b.date!).getTime());

      // Map to performance data format
      allSessions.forEach((session, index) => {
        if (session.date) {
          performanceData.push({
            date: new Date(session.date).toISOString().split('T')[0],
            overallScore: Math.round(session.score),
            sessionNumber: index + 1
          });
        }
      });

      // Prepare recent activities (limit to 5)
      const recentActivities = allSessions.slice(-5).reverse().map((session, index) => ({
        date: new Date(session.date!).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        activity: session.type === 'aptitude' ? 'Technical Quiz' : 'Mock Interview',
        score: Math.round(session.score),
        type: session.type
      }));

      res.json({
        success: true,
        data: {
          userStats: {
            aptitudeScore: Math.round(aptitudeScore),
            interviewScore: Math.round(interviewScore),
            overallPerformance,
            completedSessions
          },
          performanceData,
          mlEvaluation,
          recentActivities
        }
      });

    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch dashboard statistics'
      });
    }
  }
}
