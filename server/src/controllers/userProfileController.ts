import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthenticatedRequest } from '../types/authTypes';

const prisma = new PrismaClient();

export class UserProfileController {
  /**
   * Get comprehensive user profile data for the profile page
   */
  async getUserProfile(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated'
        });
      }

      // Get user basic info
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          profile: true
        }
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Get all completed interviews
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
          analyticalThinkingScore: true,
          duration: true,
          status: true
        }
      });

      // Get all completed aptitude tests
      const aptitudeTests = await prisma.aptitudeTest.findMany({
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
          timeTaken: true
        }
      });

      // Calculate statistics
      const totalInterviews = interviews.length;
      const allScores = interviews.map(i => i.overallScore || 0);
      const averageScore = allScores.length > 0
        ? Math.round(allScores.reduce((sum, score) => sum + score, 0) / allScores.length)
        : 0;
      const bestScore = allScores.length > 0 ? Math.max(...allScores) : 0;

      // Calculate improvement rate (comparing recent vs older interviews)
      let improvementRate = 0;
      if (interviews.length >= 2) {
        const recentInterviews = interviews.slice(0, Math.min(3, interviews.length));
        const olderInterviews = interviews.slice(-Math.min(3, interviews.length));
        
        const recentAvg = recentInterviews.reduce((sum, i) => sum + (i.overallScore || 0), 0) / recentInterviews.length;
        const olderAvg = olderInterviews.reduce((sum, i) => sum + (i.overallScore || 0), 0) / olderInterviews.length;
        
        improvementRate = olderAvg > 0 ? Math.round(((recentAvg - olderAvg) / olderAvg) * 100) : 0;
      }

      // Calculate time spent (sum of all interview and aptitude test durations in minutes)
      const interviewTimeInSeconds = interviews.reduce((sum, i) => sum + (i.duration || 0), 0);
      const aptitudeTimeInSeconds = aptitudeTests.reduce((sum, t) => sum + (t.timeTaken || 0), 0);
      const timeSpent = Math.round((interviewTimeInSeconds + aptitudeTimeInSeconds) / 60);

      // Calculate streak (consecutive days with activity)
      const streak = this.calculateStreak(interviews, aptitudeTests);

      // Format recent interviews
      const recentInterviews = interviews.slice(0, 4).map(interview => ({
        id: interview.id,
        date: interview.completedAt?.toISOString() || new Date().toISOString(),
        position: this.formatPosition(interview.position),
        score: Math.round(interview.overallScore || 0),
        domain: this.formatPosition(interview.position),
        status: interview.status
      }));

      // Calculate skill progress
      const skillProgress = this.calculateSkillProgress(interviews);

      // Calculate radar chart data (average of all skill scores)
      const radarData = this.calculateRadarData(interviews);

      // Calculate achievements
      const achievements = this.calculateAchievements(
        totalInterviews,
        bestScore,
        averageScore,
        timeSpent
      );

      // Prepare response
      const profileData = {
        userInfo: {
          id: user.id,
          name: user.name || 'User',
          email: user.email,
          currentPosition: user.profile?.currentPosition,
          experience: user.profile?.experience
        },
        statistics: {
          totalInterviews,
          averageScore,
          improvementRate,
          timeSpent,
          bestScore,
          streak
        },
        recentInterviews,
        skillProgress,
        radarData,
        achievements
      };

      res.json({
        success: true,
        data: profileData
      });

    } catch (error) {
      console.error('Error fetching user profile:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch user profile'
      });
    }
  }

  /**
   * Update user profile
   */
  async updateProfile(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      const { name } = req.body;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated'
        });
      }

      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: { name },
        include: { profile: true }
      });

      res.json({
        success: true,
        data: {
            id: updatedUser.id,
            name: updatedUser.name,
            email: updatedUser.email,
            currentPosition: updatedUser.profile?.currentPosition,
            experience: updatedUser.profile?.experience
        },
        message: 'Profile updated successfully'
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update profile'
      });
    }
  }

  /**
   * Delete user account
   */
  async deleteAccount(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated'
        });
      }

      await prisma.user.delete({
        where: { id: userId }
      });

      res.json({
        success: true,
        message: 'Account deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting account:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete account'
      });
    }
  }

  /**
   * Format position enum to readable string
   */
  private formatPosition(position: string): string {
    return position
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  /**
   * Calculate consecutive day streak
   */
  private calculateStreak(interviews: any[], aptitudeTests: any[]): number {
    const allDates = [
      ...interviews.map(i => i.completedAt),
      ...aptitudeTests.map(t => t.completedAt)
    ]
      .filter(date => date != null)
      .map(date => new Date(date!).toDateString())
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

    if (allDates.length === 0) return 0;

    const uniqueDates = [...new Set(allDates)];
    let streak = 0;
    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 86400000).toDateString();

    // Check if there's activity today or yesterday
    if (uniqueDates[0] === today || uniqueDates[0] === yesterday) {
      streak = 1;
      let currentDate = new Date(uniqueDates[0]);

      for (let i = 1; i < uniqueDates.length; i++) {
        const prevDate = new Date(currentDate);
        prevDate.setDate(prevDate.getDate() - 1);
        
        if (uniqueDates[i] === prevDate.toDateString()) {
          streak++;
          currentDate = new Date(uniqueDates[i]);
        } else {
          break;
        }
      }
    }

    return streak;
  }

  /**
   * Calculate skill progress based on interview scores
   */
  private calculateSkillProgress(interviews: any[]): any[] {
    if (interviews.length === 0) {
      return [
        { skill: 'Fluency', current: 0, target: 90, change: 0 },
        { skill: 'Grammar', current: 0, target: 85, change: 0 },
        { skill: 'Confidence', current: 0, target: 85, change: 0 },
        { skill: 'Technical Knowledge', current: 0, target: 92, change: 0 },
        { skill: 'Vocabulary', current: 0, target: 88, change: 0 }
      ];
    }

    // Calculate averages
    const avgFluency = this.calculateAverage(interviews.map(i => i.fluencyScore || 0));
    const avgGrammar = this.calculateAverage(interviews.map(i => i.grammarScore || 0));
    const avgConfidence = this.calculateAverage(interviews.map(i => i.confidenceScore || 0));
    const avgTechnical = this.calculateAverage(interviews.map(i => i.technicalKnowledgeScore || 0));
    const avgVocabulary = this.calculateAverage(interviews.map(i => i.vocabularyScore || 0));

    // Calculate improvement (recent vs overall)
    const recentCount = Math.min(3, interviews.length);
    const recent = interviews.slice(0, recentCount);

    const recentFluency = this.calculateAverage(recent.map(i => i.fluencyScore || 0));
    const recentGrammar = this.calculateAverage(recent.map(i => i.grammarScore || 0));
    const recentConfidence = this.calculateAverage(recent.map(i => i.confidenceScore || 0));
    const recentTechnical = this.calculateAverage(recent.map(i => i.technicalKnowledgeScore || 0));
    const recentVocabulary = this.calculateAverage(recent.map(i => i.vocabularyScore || 0));

    return [
      {
        skill: 'Fluency',
        current: Math.round(avgFluency),
        target: 90,
        change: Math.max(0, Math.round(recentFluency - avgFluency))
      },
      {
        skill: 'Grammar',
        current: Math.round(avgGrammar),
        target: 85,
        change: Math.max(0, Math.round(recentGrammar - avgGrammar))
      },
      {
        skill: 'Confidence',
        current: Math.round(avgConfidence),
        target: 85,
        change: Math.max(0, Math.round(recentConfidence - avgConfidence))
      },
      {
        skill: 'Technical Knowledge',
        current: Math.round(avgTechnical),
        target: 92,
        change: Math.max(0, Math.round(recentTechnical - avgTechnical))
      },
      {
        skill: 'Vocabulary',
        current: Math.round(avgVocabulary),
        target: 88,
        change: Math.max(0, Math.round(recentVocabulary - avgVocabulary))
      }
    ];
  }

  /**
   * Calculate radar chart data
   */
  private calculateRadarData(interviews: any[]): any[] {
    if (interviews.length === 0) {
      return [
        { label: 'Fluency', value: 0 },
        { label: 'Grammar', value: 0 },
        { label: 'Confidence', value: 0 },
        { label: 'Technical Knowledge', value: 0 },
        { label: 'Vocabulary', value: 0 }
      ];
    }

    return [
      {
        label: 'Fluency',
        value: Math.round(this.calculateAverage(interviews.map(i => i.fluencyScore || 0)))
      },
      {
        label: 'Grammar',
        value: Math.round(this.calculateAverage(interviews.map(i => i.grammarScore || 0)))
      },
      {
        label: 'Confidence',
        value: Math.round(this.calculateAverage(interviews.map(i => i.confidenceScore || 0)))
      },
      {
        label: 'Technical Knowledge',
        value: Math.round(this.calculateAverage(interviews.map(i => i.technicalKnowledgeScore || 0)))
      },
      {
        label: 'Vocabulary',
        value: Math.round(this.calculateAverage(interviews.map(i => i.vocabularyScore || 0)))
      }
    ];
  }

  /**
   * Calculate achievements
   */
  private calculateAchievements(
    totalInterviews: number,
    bestScore: number,
    averageScore: number,
    timeSpent: number
  ): any[] {
    return [
      {
        title: 'First Interview',
        iconType: 'award',
        description: 'Completed your first interview',
        earned: totalInterviews >= 1
      },
      {
        title: 'High Scorer',
        iconType: 'trophy',
        description: 'Scored above 90% in an interview',
        earned: bestScore >= 90
      },
      {
        title: 'Consistent Performer',
        iconType: 'trending',
        description: 'Maintained 80%+ average for 5 interviews',
        earned: totalInterviews >= 5 && averageScore >= 80
      },
      {
        title: 'Marathon Runner',
        iconType: 'clock',
        description: 'Spent 10+ hours practicing',
        earned: timeSpent >= 600 // 10 hours in minutes
      }
    ];
  }

  /**
   * Helper to calculate average
   */
  private calculateAverage(scores: number[]): number {
    if (scores.length === 0) return 0;
    return scores.reduce((sum, score) => sum + score, 0) / scores.length;
  }
}
