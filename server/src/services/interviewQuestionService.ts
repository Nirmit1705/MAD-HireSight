import { Redis } from 'ioredis';

// Type definitions for interview question data
export interface InterviewQuestionData {
  questionId: string;
  questionText: string;
  userResponse: string;
  audioUrl?: string;
  timestamp: Date;
  duration: number; // in seconds
  // Scores for this specific question (0-100)
  fluencyScore?: number;
  grammarScore?: number;
  confidenceScore?: number;
  technicalKnowledgeScore?: number;
  vocabularyScore?: number;
  analyticalThinkingScore?: number;
}

export interface InterviewSession {
  interviewId: string;
  userId: string;
  position: string;
  startedAt: Date;
  questions: InterviewQuestionData[];
  currentQuestionIndex: number;
  status: 'IN_PROGRESS' | 'COMPLETED' | 'ABANDONED';
}

export class InterviewQuestionService {
  private redis: Redis;
  private readonly TTL = 7200; // 2 hours TTL for interview sessions

  constructor(redis: Redis) {
    this.redis = redis;
  }

  /**
   * Create a new interview session in memory
   */
  async createInterviewSession(interviewId: string, userId: string, position: string): Promise<void> {
    const session: InterviewSession = {
      interviewId,
      userId,
      position,
      startedAt: new Date(),
      questions: [],
      currentQuestionIndex: 0,
      status: 'IN_PROGRESS'
    };

    const key = this.getSessionKey(interviewId);
    await this.redis.setex(key, this.TTL, JSON.stringify(session));
  }

  /**
   * Add a question response to the session
   */
  async addQuestionResponse(
    interviewId: string, 
    questionData: InterviewQuestionData
  ): Promise<void> {
    const session = await this.getInterviewSession(interviewId);
    if (!session) {
      throw new Error('Interview session not found');
    }

    session.questions.push(questionData);
    session.currentQuestionIndex = session.questions.length;

    const key = this.getSessionKey(interviewId);
    await this.redis.setex(key, this.TTL, JSON.stringify(session));
  }

  /**
   * Update scores for a specific question
   */
  async updateQuestionScores(
    interviewId: string, 
    questionIndex: number, 
    scores: Partial<Pick<InterviewQuestionData, 'fluencyScore' | 'grammarScore' | 'confidenceScore' | 'technicalKnowledgeScore' | 'vocabularyScore' | 'analyticalThinkingScore'>>
  ): Promise<void> {
    const session = await this.getInterviewSession(interviewId);
    if (!session || !session.questions[questionIndex]) {
      throw new Error('Interview session or question not found');
    }

    // Update the specific question's scores
    Object.assign(session.questions[questionIndex], scores);

    const key = this.getSessionKey(interviewId);
    await this.redis.setex(key, this.TTL, JSON.stringify(session));
  }

  /**
   * Get current interview session
   */
  async getInterviewSession(interviewId: string): Promise<InterviewSession | null> {
    const key = this.getSessionKey(interviewId);
    const sessionData = await this.redis.get(key);
    
    if (!sessionData) {
      return null;
    }

    const session = JSON.parse(sessionData) as InterviewSession;
    // Convert string dates back to Date objects
    session.startedAt = new Date(session.startedAt);
    session.questions.forEach(q => q.timestamp = new Date(q.timestamp));
    
    return session;
  }

  /**
   * Calculate final aggregated scores from all questions
   */
  async calculateFinalScores(interviewId: string): Promise<{
    fluencyScore: number;
    grammarScore: number;
    confidenceScore: number;
    technicalKnowledgeScore: number;
    vocabularyScore: number;
    analyticalThinkingScore: number;
    overallScore: number;
  } | null> {
    const session = await this.getInterviewSession(interviewId);
    if (!session || session.questions.length === 0) {
      return null;
    }

    const questionsWithScores = session.questions.filter(q => 
      q.fluencyScore !== undefined && 
      q.grammarScore !== undefined && 
      q.confidenceScore !== undefined &&
      q.technicalKnowledgeScore !== undefined &&
      q.vocabularyScore !== undefined &&
      q.analyticalThinkingScore !== undefined
    );

    if (questionsWithScores.length === 0) {
      return null;
    }

    // Calculate averages
    const totals = questionsWithScores.reduce((acc, question) => ({
      fluency: acc.fluency + (question.fluencyScore || 0),
      grammar: acc.grammar + (question.grammarScore || 0),
      confidence: acc.confidence + (question.confidenceScore || 0),
      technical: acc.technical + (question.technicalKnowledgeScore || 0),
      vocabulary: acc.vocabulary + (question.vocabularyScore || 0),
      analytical: acc.analytical + (question.analyticalThinkingScore || 0),
    }), {
      fluency: 0,
      grammar: 0,
      confidence: 0,
      technical: 0,
      vocabulary: 0,
      analytical: 0,
    });

    const count = questionsWithScores.length;
    const fluencyScore = Math.round(totals.fluency / count);
    const grammarScore = Math.round(totals.grammar / count);
    const confidenceScore = Math.round(totals.confidence / count);
    const technicalKnowledgeScore = Math.round(totals.technical / count);
    const vocabularyScore = Math.round(totals.vocabulary / count);
    const analyticalThinkingScore = Math.round(totals.analytical / count);

    // Calculate overall score as weighted average
    const overallScore = Math.round(
      (fluencyScore + grammarScore + confidenceScore + technicalKnowledgeScore + vocabularyScore + analyticalThinkingScore) / 6
    );

    return {
      fluencyScore,
      grammarScore,
      confidenceScore,
      technicalKnowledgeScore,
      vocabularyScore,
      analyticalThinkingScore,
      overallScore,
    };
  }

  /**
   * Complete interview and clear session data
   */
  async completeInterviewSession(interviewId: string): Promise<InterviewSession | null> {
    const session = await this.getInterviewSession(interviewId);
    if (!session) {
      return null;
    }

    session.status = 'COMPLETED';
    
    // Store final state briefly for potential recovery
    const key = this.getSessionKey(interviewId);
    await this.redis.setex(key, 300, JSON.stringify(session)); // Keep for 5 minutes only
    
    return session;
  }

  /**
   * Clean up interview session
   */
  async deleteInterviewSession(interviewId: string): Promise<void> {
    const key = this.getSessionKey(interviewId);
    await this.redis.del(key);
  }

  /**
   * Get all questions for debugging/analysis (optional)
   */
  async getInterviewQuestions(interviewId: string): Promise<InterviewQuestionData[]> {
    const session = await this.getInterviewSession(interviewId);
    return session?.questions || [];
  }

  private getSessionKey(interviewId: string): string {
    return `interview_session:${interviewId}`;
  }
}
