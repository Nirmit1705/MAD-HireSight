import { AptitudeCategory, DifficultyLevel, Position, TestStatus } from '@prisma/client';

// Core aptitude question types
export interface AptitudeQuestion {
  id: string;
  questionText: string;
  options: string[];
  correctOption: number;
  category: AptitudeCategory;
  difficulty: DifficultyLevel;
  explanation?: string;
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
}

// Frontend-safe question (without correct answer)
export interface AptitudeQuestionForFrontend {
  id: string;
  questionText: string;
  options: string[];
  category: AptitudeCategory;
  difficulty: DifficultyLevel;
}

// Practice mode question (includes correct answer and explanation)
export interface AptitudeQuestionForPractice {
  id: string;
  questionText: string;
  options: string[];
  category: AptitudeCategory;
  difficulty: DifficultyLevel;
  correctOption: number;
  explanation: string;
}

// Test-related types
export interface AptitudeTest {
  id: string;
  userId: string;
  position: Position;
  isPractice: boolean;
  totalQuestions: number;
  timeLimit: number;
  startedAt: Date;
  completedAt: Date | null;
  timeTaken: number | null;
  status: TestStatus;
  overallScore: number | null;
  domainKnowledgeScore: number | null;
  quantitativeScore: number | null;
  logicalReasoningScore: number | null;
  verbalAbilityScore: number | null;
  createdAt: Date;
  updatedAt: Date;
}

// Answer types
export interface AptitudeTestAnswer {
  id: string;
  testId: string;
  questionId: string;
  selectedOption: number;
  isCorrect: boolean;
  correctOption: number;
  timeTaken?: number;
  createdAt: Date;
}

// Request/Response types for API
export interface StartTestRequest {
  position: Position;
  isPractice?: boolean;
}

export interface StartTestResponse {
  testId: string;
  position: Position;
  isPractice: boolean;
  totalQuestions: number;
  timeLimit: number;
  startedAt: Date;
}

export interface SubmitAnswerRequest {
  questionId: string;
  selectedOption: number;
  timeTaken?: number;
}

export interface SubmitAnswerResponse {
  answerId: string;
  isCorrect: boolean;
}

export interface CompleteTestRequest {
  timeTaken: number;
}

export interface CompleteTestResponse {
  testId: string;
  overallScore: number;
  scores: {
    domainKnowledge: number;
    quantitative: number;
    logicalReasoning: number;
    verbalAbility: number;
  };
  completedAt: Date;
  timeTaken: number;
}

// Test results with detailed answers
export interface TestResultsResponse {
  test: {
    id: string;
    position: Position;
    isPractice: boolean;
    status: TestStatus;
    overallScore: number;
    scores: {
      domainKnowledge: number;
      quantitative: number;
      logicalReasoning: number;
      verbalAbility: number;
    };
    startedAt: Date;
    completedAt: Date;
    timeTaken: number;
  };
  answers: {
    questionText: string;
    options: string[];
    selectedOption: number;
    correctOption: number;
    isCorrect: boolean;
    category: AptitudeCategory;
  }[];
}

// Test history
export interface TestHistoryItem {
  id: string;
  position: Position;
  overallScore: number | null;
  completedAt: Date | null;
  timeTaken: number | null;
  domainKnowledgeScore: number | null;
  quantitativeScore: number | null;
  logicalReasoningScore: number | null;
  verbalAbilityScore: number | null;
}

export interface TestHistoryResponse {
  tests: TestHistoryItem[];
}

// Query parameters
export interface GetQuestionsQuery {
  position: Position;
  limit?: number;
}

// Category scores for calculations
export interface CategoryScores {
  DOMAIN_KNOWLEDGE: number;
  QUANTITATIVE_APTITUDE: number;
  LOGICAL_REASONING: number;
  VERBAL_ABILITY: number;
}

// Statistics and analytics
export interface CategoryStats {
  correct: number;
  total: number;
  percentage: number;
}

export interface TestStats {
  totalTests: number;
  averageScore: number;
  bestScore: number;
  categoryStats: {
    [key in AptitudeCategory]: CategoryStats;
  };
}

// Error types
export interface AptitudeError {
  code: string;
  message: string;
  details?: any;
}

// API Response wrapper
export interface AptitudeApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: AptitudeError;
}

// Service method return types
export interface QuestionWithStats extends AptitudeQuestion {
  userAnswered?: boolean;
  userCorrect?: boolean;
}

// Frontend state types
export interface AptitudeTestState {
  testId?: string;
  questions: AptitudeQuestionForFrontend[];
  currentQuestionIndex: number;
  answers: Record<string, number>; // questionId -> selectedOption
  timeRemaining: number;
  isCompleted: boolean;
  isSubmitting: boolean;
  position: Position;
  isPractice: boolean;
}

// Performance analytics
export interface PerformanceMetrics {
  averageTimePerQuestion: number;
  accuracyByCategory: CategoryScores;
  improvementTrend: {
    date: Date;
    score: number;
  }[];
  strengths: AptitudeCategory[];
  weaknesses: AptitudeCategory[];
}

// Enum-like constants for better type safety
export const APTITUDE_CATEGORIES = {
  DOMAIN_KNOWLEDGE: 'DOMAIN_KNOWLEDGE',
  QUANTITATIVE_APTITUDE: 'QUANTITATIVE_APTITUDE',
  LOGICAL_REASONING: 'LOGICAL_REASONING',
  VERBAL_ABILITY: 'VERBAL_ABILITY'
} as const;

export const DIFFICULTY_LEVELS = {
  EASY: 'EASY',
  MEDIUM: 'MEDIUM',
  HARD: 'HARD'
} as const;

export const TEST_STATUSES = {
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  ABANDONED: 'ABANDONED'
} as const;
