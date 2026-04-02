import { PrismaClient, AptitudeCategory, Position, DifficultyLevel, TestStatus } from '@prisma/client';
import { 
  AptitudeQuestionForFrontend,
  AptitudeQuestionForPractice, 
  AptitudeTest, 
  CategoryScores,
  TestHistoryItem 
} from '../types/aptitudeTypes';

export class AptitudeService {
  constructor(private prisma: PrismaClient) {}

  async getRandomQuestions(position: Position, limit: number = 30): Promise<AptitudeQuestionForFrontend[]> {
    try {
      // Map position enum to tags
      const positionTagMap = {
        [Position.BACKEND_DEVELOPER]: ['backend', 'full-stack'],
        [Position.FRONTEND_DEVELOPER]: ['frontend', 'full-stack'],
        [Position.FULL_STACK_DEVELOPER]: ['backend', 'frontend', 'full-stack'],
        [Position.DATA_ANALYST]: ['data', 'backend'],
        [Position.AI_ML]: ['aiml', 'data'],
        [Position.CLOUD]: ['cloud', 'backend']
      };

      const relevantTags = positionTagMap[position] || [];
      
      // Get questions that match the position tags or general questions
      const allQuestions = await this.prisma.aptitudeQuestion.findMany({
        where: {
          OR: [
            // Questions with relevant tags for the position
            {
              tags: {
                hasSome: relevantTags
              }
            },
            // Include general questions that have all position tags (applicable to all)
            {
              tags: {
                hasEvery: ['frontend', 'backend', 'full-stack', 'data', 'aiml', 'cloud']
              }
            }
          ]
        },
        select: {
          id: true,
          questionText: true,
          options: true,
          category: true,
          difficulty: true
        }
      });

      // If we don't have enough position-specific questions, get some general ones
      if (allQuestions.length < limit) {
        const additionalQuestions = await this.prisma.aptitudeQuestion.findMany({
          where: {
            id: {
              notIn: allQuestions.map(q => q.id)
            }
          },
          select: {
            id: true,
            questionText: true,
            options: true,
            category: true,
            difficulty: true
          },
          take: limit - allQuestions.length
        });
        allQuestions.push(...additionalQuestions);
      }

      // Shuffle the questions randomly
      const shuffledQuestions = this.shuffleArray(allQuestions);
      
      // Take the first 'limit' questions
      return shuffledQuestions.slice(0, Math.min(limit, shuffledQuestions.length));
    } catch (error) {
      console.error('Error fetching random questions:', error);
      throw new Error('Failed to fetch aptitude questions');
    }
  }

  async getPracticeQuestions(position: Position, limit: number = 10): Promise<AptitudeQuestionForPractice[]> {
    try {
      // Map position enum to tags
      const positionTagMap = {
        [Position.BACKEND_DEVELOPER]: ['backend', 'full-stack'],
        [Position.FRONTEND_DEVELOPER]: ['frontend', 'full-stack'],
        [Position.FULL_STACK_DEVELOPER]: ['backend', 'frontend', 'full-stack'],
        [Position.DATA_ANALYST]: ['data', 'backend'],
        [Position.AI_ML]: ['aiml', 'data'],
        [Position.CLOUD]: ['cloud', 'backend']
      };

      const relevantTags = positionTagMap[position] || [];
      
      // Get questions that match the position tags or general questions
      const allQuestions = await this.prisma.aptitudeQuestion.findMany({
        where: {
          OR: [
            // Questions with relevant tags for the position
            {
              tags: {
                hasSome: relevantTags
              }
            },
            // Include general questions that have all position tags (applicable to all)
            {
              tags: {
                hasEvery: ['frontend', 'backend', 'full-stack', 'data', 'aiml', 'cloud']
              }
            }
          ]
        },
        select: {
          id: true,
          questionText: true,
          options: true,
          correctOption: true,
          category: true,
          difficulty: true,
          explanation: true
        }
      });

      // If we don't have enough position-specific questions, get some general ones
      if (allQuestions.length < limit) {
        const additionalQuestions = await this.prisma.aptitudeQuestion.findMany({
          where: {
            id: {
              notIn: allQuestions.map(q => q.id)
            }
          },
          select: {
            id: true,
            questionText: true,
            options: true,
            correctOption: true,
            category: true,
            difficulty: true,
            explanation: true
          },
          take: limit - allQuestions.length
        });
        allQuestions.push(...additionalQuestions);
      }

      // Shuffle the questions randomly
      const shuffledQuestions = this.shuffleArray(allQuestions);
      
      // Take the first 'limit' questions and add explanations
      return shuffledQuestions.slice(0, Math.min(limit, shuffledQuestions.length)).map(q => ({
        ...q,
        explanation: q.explanation || `The correct answer is "${q.options[q.correctOption]}" because it represents the most accurate solution for this ${q.category.toLowerCase().replace('_', ' ')} question.`
      }));
    } catch (error) {
      console.error('Error fetching practice questions:', error);
      throw new Error('Failed to fetch practice questions');
    }
  }

  async createAptitudeTest(userId: string, position: Position, isPractice: boolean = false): Promise<AptitudeTest> {
    try {
      return await this.prisma.aptitudeTest.create({
        data: {
          userId,
          position,
          isPractice,
          status: TestStatus.IN_PROGRESS,
          totalQuestions: 30,
          timeLimit: 30 // 30 minutes
        }
      });
    } catch (error) {
      console.error('Error creating aptitude test:', error);
      throw new Error('Failed to create aptitude test');
    }
  }

  async submitAnswer(testId: string, questionId: string, selectedOption: number) {
    try {
      // Get the question to check correct answer
      const question = await this.prisma.aptitudeQuestion.findUnique({
        where: { id: questionId }
      });

      if (!question) {
        throw new Error('Question not found');
      }

      const isCorrect = selectedOption === question.correctOption;

      // Use upsert to either update existing answer or create new one
      // This ensures only one answer per question per test
      
      // First check if answer already exists
      const existingAnswer = await this.prisma.aptitudeTestAnswer.findFirst({
        where: {
          testId,
          questionId
        }
      });

      if (existingAnswer) {
        // Update existing answer
        return await this.prisma.aptitudeTestAnswer.update({
          where: { id: existingAnswer.id },
          data: {
            selectedOption,
            isCorrect,
            correctOption: question.correctOption,
            createdAt: new Date()
          }
        });
      } else {
        // Create new answer
        return await this.prisma.aptitudeTestAnswer.create({
          data: {
            testId,
            questionId,
            selectedOption,
            isCorrect,
            correctOption: question.correctOption
          }
        });
      }
    } catch (error) {
      console.error('Error submitting answer:', error);
      throw new Error('Failed to submit answer');
    }
  }

  async completeTest(testId: string, timeTaken: number) {
    try {
      // Get the test details to know the total number of questions
      const test = await this.prisma.aptitudeTest.findUnique({
        where: { id: testId }
      });

      if (!test) {
        throw new Error('Test not found');
      }

      // Get all answers for this test
      const answers = await this.prisma.aptitudeTestAnswer.findMany({
        where: { testId },
        include: { question: true }
      });

      // Calculate scores by category (still based on answered questions for category breakdown)
      const categoryScores = this.calculateCategoryScores(answers);

      // Calculate overall score based on total questions, not just answered questions
      const correctAnswers = answers.filter(answer => answer.isCorrect).length;
      const overallScore = Math.round((correctAnswers / test.totalQuestions) * 100);

      console.log(`[AptitudeService] Test completion debug:
        - Test ID: ${testId}
        - Total questions in test: ${test.totalQuestions}
        - Questions answered: ${answers.length}
        - Correct answers: ${correctAnswers}
        - Calculated score: ${overallScore}% (${correctAnswers}/${test.totalQuestions})
      `);

      // Update the test with completion data
      return await this.prisma.aptitudeTest.update({
        where: { id: testId },
        data: {
          status: TestStatus.COMPLETED,
          completedAt: new Date(),
          timeTaken,
          overallScore,
          domainKnowledgeScore: categoryScores.DOMAIN_KNOWLEDGE,
          quantitativeScore: categoryScores.QUANTITATIVE_APTITUDE,
          logicalReasoningScore: categoryScores.LOGICAL_REASONING,
          verbalAbilityScore: categoryScores.VERBAL_ABILITY
        }
      });
    } catch (error) {
      console.error('Error completing test:', error);
      throw new Error('Failed to complete test');
    }
  }

  async getTestResults(testId: string, userId: string) {
    try {
      const test = await this.prisma.aptitudeTest.findFirst({
        where: { 
          id: testId,
          userId: userId 
        },
        include: {
          answers: {
            include: {
              question: true
            }
          }
        }
      });

      if (!test) {
        throw new Error('Test not found or unauthorized');
      }

      return test;
    } catch (error) {
      console.error('Error fetching test results:', error);
      throw new Error('Failed to fetch test results');
    }
  }

  async getUserTestHistory(userId: string, limit: number = 10): Promise<TestHistoryItem[]> {
    try {
      console.log('getUserTestHistory called with userId:', userId, 'limit:', limit);
      
      const results = await this.prisma.aptitudeTest.findMany({
        where: { 
          userId,
          status: TestStatus.COMPLETED,
          isPractice: false // Only include actual tests, not practice
        },
        orderBy: { completedAt: 'desc' },
        take: limit,
        select: {
          id: true,
          position: true,
          overallScore: true,
          completedAt: true,
          timeTaken: true,
          domainKnowledgeScore: true,
          quantitativeScore: true,
          logicalReasoningScore: true,
          verbalAbilityScore: true,
          status: true,
          isPractice: true
        }
      });

      console.log('Database query results:', results);
      return results;
    } catch (error) {
      console.error('Error fetching user test history:', error);
      throw new Error('Failed to fetch test history');
    }
  }

  async getLatestOfficialTest(userId: string) {
    try {
      const latestTest = await this.prisma.aptitudeTest.findFirst({
        where: {
          userId,
          status: TestStatus.COMPLETED,
          isPractice: false // Only official assessments
        },
        orderBy: { completedAt: 'desc' },
        select: {
          id: true,
          overallScore: true,
          completedAt: true,
          position: true
        }
      });

      return latestTest ? {
        ...latestTest,
        score: latestTest.overallScore
      } : null;
    } catch (error) {
      console.error('Error fetching latest official test:', error);
      throw new Error('Failed to fetch latest test');
    }
  }

  private calculateCategoryScores(answers: any[]) {
    const categoryStats = {
      DOMAIN_KNOWLEDGE: { correct: 0, total: 0 },
      QUANTITATIVE_APTITUDE: { correct: 0, total: 0 },
      LOGICAL_REASONING: { correct: 0, total: 0 },
      VERBAL_ABILITY: { correct: 0, total: 0 }
    };

    answers.forEach(answer => {
      const category = answer.question.category as AptitudeCategory;
      categoryStats[category].total++;
      if (answer.isCorrect) {
        categoryStats[category].correct++;
      }
    });

    // Calculate percentages and round to 0 decimal places
    const scores = {
      DOMAIN_KNOWLEDGE: categoryStats.DOMAIN_KNOWLEDGE.total > 0 
        ? Math.round((categoryStats.DOMAIN_KNOWLEDGE.correct / categoryStats.DOMAIN_KNOWLEDGE.total) * 100)
        : 0,
      QUANTITATIVE_APTITUDE: categoryStats.QUANTITATIVE_APTITUDE.total > 0 
        ? Math.round((categoryStats.QUANTITATIVE_APTITUDE.correct / categoryStats.QUANTITATIVE_APTITUDE.total) * 100)
        : 0,
      LOGICAL_REASONING: categoryStats.LOGICAL_REASONING.total > 0 
        ? Math.round((categoryStats.LOGICAL_REASONING.correct / categoryStats.LOGICAL_REASONING.total) * 100)
        : 0,
      VERBAL_ABILITY: categoryStats.VERBAL_ABILITY.total > 0 
        ? Math.round((categoryStats.VERBAL_ABILITY.correct / categoryStats.VERBAL_ABILITY.total) * 100)
        : 0
    };

    return scores;
  }

  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }
}
