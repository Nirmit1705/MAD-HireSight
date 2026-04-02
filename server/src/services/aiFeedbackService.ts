import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface InterviewData {
  position: string;
  duration: number;
  responses: {
    question: string;
    answer: string;
    confidence: number;
    duration: number;
  }[];
  technicalAreas?: string[];
}

export interface AptitudeData {
  domain: string;
  totalQuestions: number;
  correctAnswers: number;
  responses: {
    question: string;
    userAnswer: string;
    correctAnswer: string;
    isCorrect: boolean;
    category: string;
  }[];
}

export interface FeedbackScores {
  // Interview scores
  fluencyScore?: number;
  grammarScore?: number;
  confidenceScore?: number;
  technicalKnowledgeScore?: number;
  vocabularyScore?: number;
  analyticalThinkingScore?: number;
  interviewOverallScore?: number;

  // Aptitude scores
  domainKnowledgeScore?: number;
  quantitativeScore?: number;
  logicalReasoningScore?: number;
  verbalAbilityScore?: number;
  aptitudeOverallScore?: number;
}

export interface GeneratedFeedback {
  scores: FeedbackScores;
  strengths: string[];
  improvementAreas: Array<{
    area: string;
    priority: 'HIGH' | 'MEDIUM' | 'LOW';
    description: string;
  }>;
  performanceInsights: string[];
  aptitudeInsights: string[];
}

export class AIFeedbackService {
  private async generateInterviewFeedback(data: InterviewData): Promise<Partial<GeneratedFeedback>> {
    // Analyze actual responses for more realistic feedback
    const responses = data.responses || [];
    const totalWords = responses.reduce((acc, r) => acc + r.answer.split(' ').length, 0);
    const avgWordsPerResponse = totalWords / Math.max(responses.length, 1);
    const avgConfidence = responses.reduce((acc, r) => acc + r.confidence, 0) / Math.max(responses.length, 1);
    const avgResponseDuration = responses.reduce((acc, r) => acc + r.duration, 0) / Math.max(responses.length, 1);
    
    // Analyze content quality
    // Comprehensive technical keywords for different positions
    const technicalKeywords = [
      // Programming Languages
      'javascript', 'typescript', 'python', 'java', 'c++', 'c#', 'go', 'rust', 'php', 'swift', 'kotlin',
      // Frontend Technologies
      'react', 'angular', 'vue', 'html', 'css', 'sass', 'webpack', 'vite', 'babel',
      // Backend Technologies  
      'node', 'express', 'django', 'flask', 'spring', 'laravel', 'rails',
      // Databases
      'mysql', 'postgresql', 'mongodb', 'redis', 'sqlite', 'database', 'sql', 'nosql',
      // Cloud & DevOps
      'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'jenkins', 'ci/cd', 'devops',
      // General Tech Concepts
      'api', 'rest', 'graphql', 'microservices', 'algorithm', 'data structure', 'oop', 'mvc',
      'testing', 'unit test', 'integration', 'debugging', 'optimization', 'performance',
      'software', 'development', 'programming', 'code', 'coding', 'system', 'architecture', 
      'framework', 'library', 'technology', 'scalable', 'maintainable', 'design pattern',
      // AI/ML specific
      'machine learning', 'deep learning', 'neural network', 'ai', 'model', 'training',
      'tensorflow', 'pytorch', 'pandas', 'numpy', 'scikit-learn',
      // Data specific
      'analytics', 'visualization', 'etl', 'pipeline', 'warehouse', 'big data'
    ];
    const confidenceKeywords = ['confident', 'sure', 'definitely', 'absolutely', 'certainly'];
    const uncertaintyKeywords = ['maybe', 'perhaps', 'might', 'not sure', 'don\'t know', 'um', 'uh', 'kind of', 'sort of'];
    
    let technicalScore = 60; // Base score
    let confidenceScore = avgConfidence;
    let fluencyScore = 70;
    let grammarScore = 75;
    let vocabularyScore = 70;
    let analyticalScore = 70;
    
    console.log('Analyzing responses for technical knowledge...');
    console.log('Total number of responses:', responses.length);
    
    // Analyze each response
    responses.forEach((response, index) => {
      const answer = response.answer.toLowerCase();
      const words = answer.split(' ');
      
      console.log(`\n=== RESPONSE ${index + 1} ANALYSIS ===`);
      console.log(`Original answer: "${response.answer}"`);
      console.log(`Lowercase answer: "${answer}"`);
      
      // Technical knowledge scoring
      const techMatches = technicalKeywords.filter(keyword => answer.includes(keyword));
      const techMatchCount = techMatches.length;
      
      console.log(`Technical keywords found (${techMatchCount}):`, techMatches);
      console.log(`Technical score increase: ${techMatchCount * 3} points`);
      
      const oldTechnicalScore = technicalScore;
      technicalScore += techMatchCount * 3; // Add 3 points per technical keyword
      
      // Bonus points for complex technical concepts
      let bonusPoints = 0;
      if (answer.includes('algorithm') || answer.includes('data structure')) {
        technicalScore += 5;
        bonusPoints += 5;
        console.log('Bonus: +5 for algorithm/data structure');
      }
      if (answer.includes('architecture') || answer.includes('design pattern')) {
        technicalScore += 5;
        bonusPoints += 5;
        console.log('Bonus: +5 for architecture/design pattern');
      }
      if (answer.includes('performance') || answer.includes('optimization')) {
        technicalScore += 3;
        bonusPoints += 3;
        console.log('Bonus: +3 for performance/optimization');
      }
      if (answer.includes('testing') || answer.includes('debugging')) {
        technicalScore += 3;
        bonusPoints += 3;
        console.log('Bonus: +3 for testing/debugging');
      }
      
      console.log(`Technical score: ${oldTechnicalScore} -> ${technicalScore} (increased by ${technicalScore - oldTechnicalScore})`);
      console.log(`=== END RESPONSE ${index + 1} ANALYSIS ===\n`);
      
      // Confidence scoring based on language used
      const confidenceMatches = confidenceKeywords.filter(keyword => answer.includes(keyword)).length;
      const uncertaintyMatches = uncertaintyKeywords.filter(keyword => answer.includes(keyword)).length;
      confidenceScore += confidenceMatches * 2 - uncertaintyMatches * 3;
      
      // Fluency based on response length and structure
      if (words.length > 50) fluencyScore += 5; // Detailed responses
      if (words.length < 10) fluencyScore -= 10; // Too short responses
      
      // Vocabulary scoring based on word variety and complexity
      const uniqueWords = new Set(words).size;
      const vocabularyRatio = uniqueWords / words.length;
      if (vocabularyRatio > 0.7) vocabularyScore += 5;
      
      // Grammar estimation (simple heuristic)
      const sentences = answer.split(/[.!?]+/).filter(s => s.trim().length > 0);
      if (sentences.length > 0) {
        const avgSentenceLength = words.length / sentences.length;
        if (avgSentenceLength > 8 && avgSentenceLength < 25) grammarScore += 3;
      }
      
      // Analytical thinking based on structured responses
      if (answer.includes('first') || answer.includes('second') || answer.includes('because') || answer.includes('therefore')) {
        analyticalScore += 5;
      }
    });
    
    console.log('\n=== FINAL TECHNICAL SCORE CALCULATION ===');
    console.log('Technical score before capping:', technicalScore);
    
    // Cap scores at reasonable ranges
    technicalScore = Math.min(95, Math.max(40, technicalScore));
    
    console.log('Technical score after capping:', technicalScore);
    console.log('=== END FINAL TECHNICAL SCORE ===\n');
    confidenceScore = Math.min(95, Math.max(30, confidenceScore));
    fluencyScore = Math.min(95, Math.max(45, fluencyScore));
    grammarScore = Math.min(95, Math.max(50, grammarScore));
    vocabularyScore = Math.min(95, Math.max(45, vocabularyScore));
    analyticalScore = Math.min(95, Math.max(50, analyticalScore));
    
    console.log('Final calculated scores:');
    console.log('Technical Score:', technicalScore);
    console.log('Confidence Score:', confidenceScore);
    console.log('Fluency Score:', fluencyScore);
    console.log('Grammar Score:', grammarScore);
    console.log('Vocabulary Score:', vocabularyScore);
    console.log('Analytical Score:', analyticalScore);
    
    const interviewOverallScore = Math.round(
      (confidenceScore + fluencyScore + grammarScore + technicalScore + vocabularyScore + analyticalScore) / 6
    );

    // Generate contextual strengths
    const scoreMap = {
      'Technical Knowledge': technicalScore,
      'Confidence': confidenceScore,
      'Communication Fluency': fluencyScore,
      'Grammar': grammarScore,
      'Vocabulary': vocabularyScore,
      'Analytical Thinking': analyticalScore
    };

    const strengths = Object.entries(scoreMap)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([area, score]) => {
        if (score >= 85) return `Exceptional ${area.toLowerCase()} - demonstrates mastery and clear expertise`;
        if (score >= 75) return `Strong ${area.toLowerCase()} - solid foundation with good command`;
        if (score >= 65) return `Good ${area.toLowerCase()} - adequate skills with room for growth`;
        return `Developing ${area.toLowerCase()} - shows potential with focused improvement needed`;
      });

    // Generate contextual improvement areas
    const improvementAreas = Object.entries(scoreMap)
      .sort(([, a], [, b]) => a - b)
      .slice(0, 3)
      .map(([area, score]) => ({
        area,
        priority: (score < 60 ? 'HIGH' : score < 75 ? 'MEDIUM' : 'LOW') as 'HIGH' | 'MEDIUM' | 'LOW',
        description: this.getContextualImprovementDescription(area, score, data)
      }));

    // Generate performance insights based on actual performance
    const performanceInsights = this.generateContextualPerformanceInsights(data, scoreMap, avgWordsPerResponse);

    return {
      scores: {
        fluencyScore: Math.round(fluencyScore),
        grammarScore: Math.round(grammarScore),
        confidenceScore: Math.round(confidenceScore),
        technicalKnowledgeScore: Math.round(technicalScore),
        vocabularyScore: Math.round(vocabularyScore),
        analyticalThinkingScore: Math.round(analyticalScore),
        interviewOverallScore
      },
      strengths,
      improvementAreas,
      performanceInsights
    };
  }

  private getContextualImprovementDescription(area: string, score: number, data: InterviewData): string {
    const descriptions: { [key: string]: { [key: string]: string } } = {
      'Technical Knowledge': {
        low: `Based on your responses about ${data.position}, focus on strengthening core technical concepts and practicing domain-specific problems`,
        medium: `Expand your technical depth in ${data.position} with advanced topics and real-world application examples`,
        high: 'Fine-tune technical explanations with more specific examples and industry best practices'
      },
      'Confidence': {
        low: 'Your responses showed hesitation - practice mock interviews and work on speaking with more authority',
        medium: 'Build confidence through preparation and positive self-talk techniques',
        high: 'Channel your natural confidence while being mindful not to appear overconfident'
      },
      'Communication Fluency': {
        low: 'Work on articulating thoughts more clearly and reducing long pauses between ideas',
        medium: 'Improve flow between ideas and practice smooth transitions between topics',
        high: 'Enhance storytelling elements and vary speech patterns for more engaging communication'
      },
      'Grammar': {
        low: 'Focus on basic grammar fundamentals and practice speaking in complete sentences',
        medium: 'Work on complex sentence structures and ensure subject-verb agreement consistency',
        high: 'Perfect advanced grammar usage while maintaining natural, conversational flow'
      },
      'Vocabulary': {
        low: 'Expand professional vocabulary through reading industry publications and practice',
        medium: 'Incorporate more varied and precise terminology in professional discussions',
        high: 'Use sophisticated vocabulary appropriately while maintaining clarity and accessibility'
      },
      'Analytical Thinking': {
        low: 'Practice breaking down complex problems into logical steps and explaining your reasoning',
        medium: 'Improve structured thinking and demonstrate clear problem-solving frameworks',
        high: 'Enhance strategic thinking and showcase advanced analytical methodologies'
      }
    };

    const level = score < 60 ? 'low' : score < 75 ? 'medium' : 'high';
    return descriptions[area]?.[level] || `Work on improving your ${area.toLowerCase()} skills through targeted practice and feedback`;
  }

  private generateContextualPerformanceInsights(data: InterviewData, scoreMap: { [key: string]: number }, avgWordsPerResponse: number): string[] {
    const insights = [];
    
    const topSkill = Object.entries(scoreMap).reduce((a, b) => a[1] > b[1] ? a : b);
    const bottomSkill = Object.entries(scoreMap).reduce((a, b) => a[1] < b[1] ? a : b);
    
    // Top performance insight
    if (topSkill[1] >= 85) {
      insights.push(`Exceptional ${topSkill[0].toLowerCase()} (${Math.round(topSkill[1])}%) - this is a major strength for ${data.position} roles`);
    } else {
      insights.push(`${topSkill[0]} is your strongest area at ${Math.round(topSkill[1])}% - leverage this in future interviews`);
    }
    
    // Response quality insight
    if (avgWordsPerResponse > 80) {
      insights.push("Your detailed responses show thorough thinking and good communication skills");
    } else if (avgWordsPerResponse < 30) {
      insights.push("Consider providing more detailed explanations to fully showcase your knowledge and thought process");
    } else {
      insights.push("Good balance between conciseness and detail in your responses");
    }

    // Duration and engagement insight
    if (data.duration > 1800) { // 30 minutes
      insights.push("Excellent interview endurance - you maintained quality responses throughout the extended session");
    } else if (data.duration < 600) { // 10 minutes
      insights.push("Consider taking more time to elaborate on your answers for better depth and engagement");
    }

    // Position-specific insight
    const positionLower = data.position.toLowerCase();
    if (positionLower.includes('senior') || positionLower.includes('lead')) {
      insights.push(`For ${data.position} roles, your communication and technical depth will be crucial differentiators`);
    } else {
      insights.push(`For ${data.position} positions, focus on demonstrating both technical competency and learning agility`);
    }

    // Improvement focus insight
    if (bottomSkill[1] < 60) {
      insights.push(`Priority development area: ${bottomSkill[0].toLowerCase()} needs immediate attention to meet role expectations`);
    } else if (bottomSkill[1] < 75) {
      insights.push(`${bottomSkill[0].toLowerCase()} has good potential - targeted practice will yield significant improvements`);
    }

    return insights.slice(0, 5); // Return max 5 insights
  }

  private async generateAptitudeFeedback(data: AptitudeData): Promise<Partial<GeneratedFeedback>> {
    const correctPercentage = (data.correctAnswers / data.totalQuestions) * 100;
    
    // Calculate category-wise scores
    const categories = ['logical-reasoning', 'quantitative', 'verbal', 'technical'];
    const categoryScores: { [key: string]: number } = {};
    
    categories.forEach(category => {
      const categoryQuestions = data.responses.filter(r => 
        r.category.toLowerCase().includes(category) || 
        category.includes(r.category.toLowerCase())
      );
      if (categoryQuestions.length > 0) {
        const correct = categoryQuestions.filter(q => q.isCorrect).length;
        categoryScores[category] = Math.round((correct / categoryQuestions.length) * 100);
      }
    });

    const domainKnowledgeScore = categoryScores['technical'] || Math.round(correctPercentage + Math.random() * 10 - 5);
    const quantitativeScore = categoryScores['quantitative'] || Math.round(correctPercentage + Math.random() * 15 - 7);
    const logicalReasoningScore = categoryScores['logical-reasoning'] || Math.round(correctPercentage + Math.random() * 12 - 6);
    const verbalAbilityScore = categoryScores['verbal'] || Math.round(correctPercentage + Math.random() * 8 - 4);
    
    const aptitudeOverallScore = Math.round((domainKnowledgeScore + quantitativeScore + logicalReasoningScore + verbalAbilityScore) / 4);

    // Generate aptitude insights
    const aptitudeInsights = this.generateAptitudeInsights(data, {
      domainKnowledgeScore,
      quantitativeScore,
      logicalReasoningScore,
      verbalAbilityScore
    });

    return {
      scores: {
        domainKnowledgeScore,
        quantitativeScore,
        logicalReasoningScore,
        verbalAbilityScore,
        aptitudeOverallScore
      },
      aptitudeInsights
    };
  }

  private getImprovementDescription(area: string, score: number): string {
    const descriptions: { [key: string]: { [key: string]: string } } = {
      'Technical Knowledge': {
        low: 'Focus on strengthening core technical concepts and practicing more complex problem-solving scenarios',
        medium: 'Expand technical depth with advanced topics and real-world application examples',
        high: 'Fine-tune technical explanations and add more industry-specific knowledge'
      },
      'Confidence': {
        low: 'Practice speaking with authority, maintain eye contact, and work on reducing filler words',
        medium: 'Build confidence through mock interviews and positive self-affirmation techniques',
        high: 'Channel confidence appropriately and ensure it doesn\'t come across as overconfidence'
      },
      'Communication Fluency': {
        low: 'Practice speaking clearly and maintaining steady pace, work on reducing pauses',
        medium: 'Improve flow between ideas and practice transitioning between topics smoothly',
        high: 'Focus on varying speech patterns and adding engaging storytelling elements'
      },
      'Grammar': {
        low: 'Review basic grammar rules and practice with grammar exercises and speaking drills',
        medium: 'Work on complex sentence structures and ensure subject-verb agreement consistency',
        high: 'Perfect advanced grammar usage and ensure professional language standards'
      },
      'Vocabulary': {
        low: 'Expand professional vocabulary through reading industry publications and practice',
        medium: 'Incorporate more varied and precise terminology in professional discussions',
        high: 'Use sophisticated vocabulary appropriately while maintaining clarity'
      },
      'Analytical Thinking': {
        low: 'Practice breaking down complex problems into smaller, manageable components',
        medium: 'Improve logical reasoning and practice explaining thought processes step by step',
        high: 'Enhance strategic thinking and demonstrate deeper analytical frameworks'
      }
    };

    const level = score < 60 ? 'low' : score < 75 ? 'medium' : 'high';
    return descriptions[area]?.[level] || `Work on improving your ${area.toLowerCase()} skills through targeted practice and feedback`;
  }

  private generatePerformanceInsights(data: InterviewData, scoreMap: { [key: string]: number }): string[] {
    const insights = [];
    
    const topSkill = Object.entries(scoreMap).reduce((a, b) => a[1] > b[1] ? a : b);
    const bottomSkill = Object.entries(scoreMap).reduce((a, b) => a[1] < b[1] ? a : b);
    
    insights.push(`Your strongest area is ${topSkill[0].toLowerCase()} with a score of ${Math.round(topSkill[1])}%`);
    
    if (data.duration > 1800) { // 30 minutes
      insights.push("Good interview endurance - you maintained quality responses throughout the extended session");
    } else if (data.duration < 600) { // 10 minutes
      insights.push("Consider taking more time to elaborate on your answers for better depth");
    }

    const avgConfidence = data.responses.reduce((acc, r) => acc + r.confidence, 0) / data.responses.length;
    if (avgConfidence > 80) {
      insights.push("Demonstrated strong confidence throughout the interview");
    } else if (avgConfidence < 50) {
      insights.push("Work on building confidence - practice mock interviews to improve comfort level");
    }

    if (bottomSkill[1] < 60) {
      insights.push(`Priority focus area: ${bottomSkill[0].toLowerCase()} needs significant improvement`);
    }

    // Add position-specific insight
    insights.push(`For ${data.position} roles, focus on combining technical expertise with clear communication`);

    return insights;
  }

  private generateAptitudeInsights(data: AptitudeData, scores: any): string[] {
    const insights = [];
    
    const { domainKnowledgeScore, quantitativeScore, logicalReasoningScore, verbalAbilityScore } = scores;
    
    // Find strongest and weakest areas
    const scoreMap = {
      'domain knowledge': domainKnowledgeScore,
      'quantitative aptitude': quantitativeScore,
      'logical reasoning': logicalReasoningScore,
      'verbal ability': verbalAbilityScore
    };
    
    const topArea = Object.entries(scoreMap).reduce((a, b) => a[1] > b[1] ? a : b);
    const bottomArea = Object.entries(scoreMap).reduce((a, b) => a[1] < b[1] ? a : b);
    
    insights.push(`Strongest aptitude area: ${topArea[0]} with ${topArea[1]}% accuracy`);
    
    if (bottomArea[1] < 60) {
      insights.push(`Focus area: ${bottomArea[0]} needs improvement - consider targeted practice`);
    }

    // Overall performance insight
    const overallScore = Object.values(scoreMap).reduce((a, b) => a + b, 0) / 4;
    if (overallScore > 80) {
      insights.push("Excellent overall aptitude - you're well-prepared for technical challenges");
    } else if (overallScore > 65) {
      insights.push("Good aptitude foundation with room for targeted improvements");
    } else {
      insights.push("Consider comprehensive aptitude preparation before appearing for technical roles");
    }

    // Domain-specific insight
    insights.push(`For ${data.domain} domain, your technical knowledge score of ${domainKnowledgeScore}% ${domainKnowledgeScore > 75 ? 'shows strong readiness' : 'indicates areas for improvement'}`);

    return insights;
  }

  async generateComprehensiveFeedback(
    userId: string,
    interviewData?: InterviewData,
    aptitudeData?: AptitudeData
  ): Promise<GeneratedFeedback> {
    try {
      let feedback: GeneratedFeedback = {
        scores: {},
        strengths: [],
        improvementAreas: [],
        performanceInsights: [],
        aptitudeInsights: []
      };

      // Generate interview feedback if data provided
      if (interviewData) {
        const interviewFeedback = await this.generateInterviewFeedback(interviewData);
        feedback.scores = { ...feedback.scores, ...interviewFeedback.scores };
        feedback.strengths.push(...(interviewFeedback.strengths || []));
        feedback.improvementAreas.push(...(interviewFeedback.improvementAreas || []));
        feedback.performanceInsights.push(...(interviewFeedback.performanceInsights || []));
      }

      // Try to fetch latest aptitude scores from database instead of generating new ones
      try {
        const latestAptitudeScores = await this.getLatestAptitudeScores(userId);
        if (latestAptitudeScores) {
          console.log('Using real aptitude scores from database:', latestAptitudeScores);
          feedback.scores = { ...feedback.scores, ...latestAptitudeScores };
          
          // Generate insights based on real scores
          feedback.aptitudeInsights.push(...this.generateAptitudeInsightsFromScores(latestAptitudeScores));
        } else {
          console.log('No aptitude scores found in database, generating mock scores');
          // Generate aptitude feedback if data provided (fallback)
          if (aptitudeData) {
            const aptitudeFeedback = await this.generateAptitudeFeedback(aptitudeData);
            feedback.scores = { ...feedback.scores, ...aptitudeFeedback.scores };
            feedback.aptitudeInsights.push(...(aptitudeFeedback.aptitudeInsights || []));
          }
        }
      } catch (dbError) {
        console.error('Error fetching aptitude scores from database:', dbError);
        // Fallback to generating aptitude feedback if database fetch fails
        if (aptitudeData) {
          const aptitudeFeedback = await this.generateAptitudeFeedback(aptitudeData);
          feedback.scores = { ...feedback.scores, ...aptitudeFeedback.scores };
          feedback.aptitudeInsights.push(...(aptitudeFeedback.aptitudeInsights || []));
        }
      }

      return feedback;
    } catch (error) {
      console.error('Error generating feedback:', error);
      throw new Error('Failed to generate feedback');
    }
  }

  /**
   * Fetch the latest aptitude test scores for a user from the database
   */
  private async getLatestAptitudeScores(userId: string): Promise<Partial<FeedbackScores> | null> {
    try {
      const latestTest = await prisma.aptitudeTest.findFirst({
        where: {
          userId,
          status: 'COMPLETED',
          isPractice: false, // Only get actual tests, not practice
          overallScore: { not: null } // Must have scores
        },
        orderBy: { completedAt: 'desc' },
        select: {
          domainKnowledgeScore: true,
          quantitativeScore: true,
          logicalReasoningScore: true,
          verbalAbilityScore: true,
          overallScore: true
        }
      });

      if (!latestTest) {
        return null;
      }

      return {
        domainKnowledgeScore: latestTest.domainKnowledgeScore || undefined,
        quantitativeScore: latestTest.quantitativeScore || undefined,
        logicalReasoningScore: latestTest.logicalReasoningScore || undefined,
        verbalAbilityScore: latestTest.verbalAbilityScore || undefined,
        aptitudeOverallScore: latestTest.overallScore || undefined
      };
    } catch (error) {
      console.error('Error fetching latest aptitude scores:', error);
      return null;
    }
  }

  /**
   * Generate aptitude insights based on real scores from database
   */
  private generateAptitudeInsightsFromScores(scores: Partial<FeedbackScores>): string[] {
    const insights: string[] = [];

    // Overall performance insight
    const overallScore = scores.aptitudeOverallScore || 0;
    if (overallScore >= 80) {
      insights.push("Excellent aptitude performance - you're well-prepared for technical challenges");
    } else if (overallScore >= 65) {
      insights.push("Good aptitude foundation with room for targeted improvements");
    } else {
      insights.push("Consider comprehensive aptitude preparation for better interview readiness");
    }

    // Domain knowledge insight
    if (scores.domainKnowledgeScore !== undefined) {
      if (scores.domainKnowledgeScore >= 75) {
        insights.push(`Strong domain knowledge (${scores.domainKnowledgeScore}%) shows excellent technical preparation`);
      } else {
        insights.push(`Domain knowledge (${scores.domainKnowledgeScore}%) needs improvement for technical roles`);
      }
    }

    // Quantitative reasoning insight
    if (scores.quantitativeScore !== undefined) {
      if (scores.quantitativeScore >= 70) {
        insights.push("Good quantitative reasoning skills for problem-solving scenarios");
      } else {
        insights.push("Consider practicing more mathematical and analytical problems");
      }
    }

    // Logical reasoning insight
    if (scores.logicalReasoningScore !== undefined && scores.logicalReasoningScore >= 80) {
      insights.push("Excellent logical reasoning - great for systematic problem solving");
    }

    return insights;
  }

  async saveFeedbackToDatabase(
    userId: string,
    feedback: GeneratedFeedback,
    interviewId?: string,
    aptitudeTestId?: string
  ): Promise<void> {
    try {
      // Prepare the feedback data for database insertion
      const feedbackData: any = {
        userId,
        interviewId,
        aptitudeTestId,
        strengths: feedback.strengths,
        performanceInsights: feedback.performanceInsights || [],
        aptitudeInsights: feedback.aptitudeInsights || [],
        ...feedback.scores,
      };

      const feedbackRecord = await prisma.feedback.create({
        data: feedbackData,
      });

      // Save improvement areas
      if (feedback.improvementAreas.length > 0) {
        await prisma.feedbackImprovement.createMany({
          data: feedback.improvementAreas.map(improvement => ({
            feedbackId: feedbackRecord.id,
            area: improvement.area,
            priority: improvement.priority,
            description: improvement.description,
          })),
        });
      }

      // Update interview record if provided
      if (interviewId && feedback.scores.interviewOverallScore) {
        await prisma.interview.update({
          where: { id: interviewId },
          data: {
            status: 'COMPLETED',
            completedAt: new Date(),
            fluencyScore: feedback.scores.fluencyScore,
            grammarScore: feedback.scores.grammarScore,
            confidenceScore: feedback.scores.confidenceScore,
            technicalKnowledgeScore: feedback.scores.technicalKnowledgeScore,
            vocabularyScore: feedback.scores.vocabularyScore,
            analyticalThinkingScore: feedback.scores.analyticalThinkingScore,
            overallScore: feedback.scores.interviewOverallScore,
          },
        });
      }

      // Update aptitude test record if provided
      if (aptitudeTestId && feedback.scores.aptitudeOverallScore) {
        await prisma.aptitudeTest.update({
          where: { id: aptitudeTestId },
          data: {
            status: 'COMPLETED',
            completedAt: new Date(),
            domainKnowledgeScore: feedback.scores.domainKnowledgeScore,
            quantitativeScore: feedback.scores.quantitativeScore,
            logicalReasoningScore: feedback.scores.logicalReasoningScore,
            verbalAbilityScore: feedback.scores.verbalAbilityScore,
            overallScore: feedback.scores.aptitudeOverallScore,
          },
        });
      }

    } catch (error) {
      console.error('Error saving feedback to database:', error);
      throw new Error('Failed to save feedback');
    }
  }
}