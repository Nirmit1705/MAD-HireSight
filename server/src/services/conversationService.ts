import { redis } from '../config/redis';

export interface ConversationMessage {
  role: 'interviewer' | 'candidate';
  content: string;
  timestamp: Date;
  questionType?: string;
  isFollowUp?: boolean;
}

export interface InterviewContext {
  sessionId: string;
  candidateProfile: {
    skills: string[];
    experience: string;
    domain: string;
    projects: string[];
    workExperience: any[];
  };
  interviewFocus: string; // The main role/position being interviewed for
  currentTopic: string; // Current discussion topic
  topicHistory: string[]; // Topics covered so far
  conversationFlow: ConversationMessage[];
  interviewStyle: 'formal' | 'conversational'; // Keep consistent interviewer personality
  questionsAsked: number;
  maxQuestions: number;
  startTime: Date;
}

export class ConversationService {
  private static readonly SESSION_TTL = 3600; // 1 hour TTL for interview sessions
  private static readonly CONVERSATION_KEY_PREFIX = 'interview_conversation:';
  private static readonly CONTEXT_KEY_PREFIX = 'interview_context:';

  /**
   * Initialize a new interview conversation session
   */
  async initializeConversation(
    sessionId: string,
    candidateProfile: any,
    interviewFocus: string = 'Software Engineering'
  ): Promise<InterviewContext> {
    const context: InterviewContext = {
      sessionId,
      candidateProfile: {
        skills: candidateProfile.skills || [],
        experience: candidateProfile.experience || 'Not specified',
        domain: candidateProfile.domain || 'General',
        projects: candidateProfile.projects || [],
        workExperience: candidateProfile.workExperience || [],
      },
      interviewFocus,
      currentTopic: 'introduction',
      topicHistory: [],
      conversationFlow: [],
      interviewStyle: 'conversational',
      questionsAsked: 0,
      maxQuestions: 12,
      startTime: new Date(),
    };

    // Store context in Redis with TTL
    await redis.setex(
      this.getContextKey(sessionId),
      ConversationService.SESSION_TTL,
      JSON.stringify(context)
    );

    // Initialize conversation history
    await redis.setex(
      this.getConversationKey(sessionId),
      ConversationService.SESSION_TTL,
      JSON.stringify([])
    );

    return context;
  }

  /**
   * Add a message to the conversation history
   */
  async addMessage(
    sessionId: string,
    message: ConversationMessage
  ): Promise<void> {
    const conversationKey = this.getConversationKey(sessionId);
    const contextKey = this.getContextKey(sessionId);

    // Get current conversation
    const conversationData = await redis.get(conversationKey);
    const conversation: ConversationMessage[] = conversationData 
      ? JSON.parse(conversationData) 
      : [];

    // Add new message
    conversation.push(message);

    // Update conversation in Redis
    await redis.setex(
      conversationKey,
      ConversationService.SESSION_TTL,
      JSON.stringify(conversation)
    );

    // Update context if this is an interviewer message
    if (message.role === 'interviewer') {
      const contextData = await redis.get(contextKey);
      if (contextData) {
        const context: InterviewContext = JSON.parse(contextData);
        context.conversationFlow = conversation;
        context.questionsAsked++;
        
        // Update current topic based on question type
        if (message.questionType) {
          if (!message.isFollowUp && message.questionType !== context.currentTopic) {
            context.topicHistory.push(context.currentTopic);
            context.currentTopic = message.questionType;
          }
        }

        await redis.setex(
          contextKey,
          ConversationService.SESSION_TTL,
          JSON.stringify(context)
        );
      }
    }

    // Extend TTL when activity occurs
    await redis.expire(conversationKey, ConversationService.SESSION_TTL);
    await redis.expire(contextKey, ConversationService.SESSION_TTL);
  }

  /**
   * Get the full conversation history
   */
  async getConversation(sessionId: string): Promise<ConversationMessage[]> {
    const conversationData = await redis.get(this.getConversationKey(sessionId));
    if (!conversationData) return [];
    
    const conversation = JSON.parse(conversationData);
    // Convert timestamp strings back to Date objects
    return conversation.map((msg: any) => ({
      ...msg,
      timestamp: new Date(msg.timestamp)
    }));
  }

  /**
   * Get the interview context
   */
  async getContext(sessionId: string): Promise<InterviewContext | null> {
    const contextData = await redis.get(this.getContextKey(sessionId));
    if (!contextData) return null;
    
    const context = JSON.parse(contextData);
    // Convert startTime back to Date object since JSON.parse doesn't handle dates
    if (context.startTime) {
      context.startTime = new Date(context.startTime);
    }
    
    return context;
  }

  /**
   * Update the current topic/focus
   */
  async updateTopic(sessionId: string, newTopic: string): Promise<void> {
    const contextKey = this.getContextKey(sessionId);
    const contextData = await redis.get(contextKey);
    
    if (contextData) {
      const context: InterviewContext = JSON.parse(contextData);
      
      if (context.currentTopic !== newTopic) {
        context.topicHistory.push(context.currentTopic);
        context.currentTopic = newTopic;
        
        await redis.setex(
          contextKey,
          ConversationService.SESSION_TTL,
          JSON.stringify(context)
        );
      }
    }
  }

  /**
   * Generate conversation context for AI prompts
   */
  async getConversationContextForAI(sessionId: string): Promise<string> {
    const conversation = await this.getConversation(sessionId);
    const context = await this.getContext(sessionId);

    if (!context) {
      return 'No conversation context available.';
    }

    let contextString = `Interview Context:
- Role: ${context.interviewFocus}
- Candidate Experience: ${context.candidateProfile.experience}
- Domain: ${context.candidateProfile.domain}
- Key Skills: ${context.candidateProfile.skills.slice(0, 5).join(', ')}
- Current Topic: ${context.currentTopic}
- Topics Covered: ${context.topicHistory.join(', ')}
- Questions Asked: ${context.questionsAsked}/${context.maxQuestions}
- Interview Style: ${context.interviewStyle}

Recent Conversation:`;

    // Include last 6 messages for context
    const recentMessages = conversation.slice(-6);
    recentMessages.forEach((msg, index) => {
      const role = msg.role === 'interviewer' ? 'Interviewer' : 'Candidate';
      contextString += `\n${role}: ${msg.content}`;
    });

    return contextString;
  }

  /**
   * Clean up conversation data
   */
  async endConversation(sessionId: string): Promise<void> {
    await redis.del(this.getConversationKey(sessionId));
    await redis.del(this.getContextKey(sessionId));
  }

  /**
   * Get statistics about the conversation
   */
  async getConversationStats(sessionId: string): Promise<{
    totalMessages: number;
    questionsAsked: number;
    averageResponseLength: number;
    topicsCovered: string[];
    duration: number;
  } | null> {
    const conversation = await this.getConversation(sessionId);
    const context = await this.getContext(sessionId);

    if (!context) return null;

    const candidateResponses = conversation.filter(m => m.role === 'candidate');
    const avgResponseLength = candidateResponses.length > 0
      ? candidateResponses.reduce((sum, msg) => sum + msg.content.length, 0) / candidateResponses.length
      : 0;

    // Calculate duration safely, ensuring startTime is a valid Date
    let duration = 0;
    try {
      if (context.startTime) {
        const startTime = context.startTime instanceof Date ? context.startTime : new Date(context.startTime);
        duration = new Date().getTime() - startTime.getTime();
      }
    } catch (error) {
      console.warn('Failed to calculate conversation duration:', error);
      duration = 0;
    }

    return {
      totalMessages: conversation.length,
      questionsAsked: context.questionsAsked,
      averageResponseLength: Math.round(avgResponseLength),
      topicsCovered: [context.currentTopic, ...context.topicHistory],
      duration
    };
  }

  /**
   * Analyze conversation flow to detect if candidate is staying on topic
   */
  analyzeConversationFlow(conversation: ConversationMessage[]): {
    isOnTopic: boolean;
    flowDisruption: boolean;
    redirectionNeeded: boolean;
    confidence: number;
  } {
    if (conversation.length < 2) {
      return { isOnTopic: true, flowDisruption: false, redirectionNeeded: false, confidence: 1.0 };
    }

    const lastInterviewerMessage = conversation.filter(m => m.role === 'interviewer').slice(-1)[0];
    const lastCandidateMessage = conversation.filter(m => m.role === 'candidate').slice(-1)[0];

    if (!lastInterviewerMessage || !lastCandidateMessage) {
      return { isOnTopic: true, flowDisruption: false, redirectionNeeded: false, confidence: 1.0 };
    }

    // Analyze if candidate response is relevant to the question asked
    const questionKeywords = this.extractKeywords(lastInterviewerMessage.content);
    const responseKeywords = this.extractKeywords(lastCandidateMessage.content);
    
    // Check for topic relevance
    const commonKeywords = questionKeywords.filter(keyword => 
      responseKeywords.some(respKeyword => 
        respKeyword.toLowerCase().includes(keyword.toLowerCase()) ||
        keyword.toLowerCase().includes(respKeyword.toLowerCase())
      )
    );

    const relevanceScore = commonKeywords.length / Math.max(questionKeywords.length, 1);
    
    // Detect flow disruption patterns
    const disruptionPatterns = [
      /let me tell you about/i,
      /instead of that/i,
      /what I really want to talk about/i,
      /can we discuss/i,
      /I'd prefer to/i
    ];

    const flowDisruption = disruptionPatterns.some(pattern => 
      pattern.test(lastCandidateMessage.content)
    );

    // Determine if redirection is needed
    const isOnTopic = relevanceScore > 0.3 || lastCandidateMessage.content.length < 50; // Short answers are usually on topic
    const redirectionNeeded = flowDisruption || (!isOnTopic && relevanceScore < 0.2);

    return {
      isOnTopic,
      flowDisruption,
      redirectionNeeded,
      confidence: relevanceScore
    };
  }

  /**
   * Extract keywords from text for topic analysis
   */
  private extractKeywords(text: string): string[] {
    // Remove common stop words and extract meaningful terms
    const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'can', 'may', 'might', 'must', 'you', 'i', 'we', 'they', 'he', 'she', 'it', 'this', 'that', 'these', 'those']);
    
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3 && !stopWords.has(word))
      .slice(0, 10); // Top 10 keywords
  }

  private getConversationKey(sessionId: string): string {
    return `${ConversationService.CONVERSATION_KEY_PREFIX}${sessionId}`;
  }

  private getContextKey(sessionId: string): string {
    return `${ConversationService.CONTEXT_KEY_PREFIX}${sessionId}`;
  }
}