import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { ContextualAIQuestionService } from '../services/contextualAIQuestionService';
import { ConversationService } from '../services/conversationService';
import { AuthenticatedRequest } from '../types/authTypes';

const prisma = new PrismaClient();

export class ContextualInterviewController {
  private contextualAIService: ContextualAIQuestionService;
  private conversationService: ConversationService;
  private ollamaUrl: string;
  private modelName: string;

  constructor() {
    this.contextualAIService = new ContextualAIQuestionService();
    this.conversationService = new ConversationService();
    this.ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
    this.modelName = process.env.OLLAMA_MODEL || 'gemma3';  // Match default in other services
  }

  /**
   * Format position enum to readable string
   * FULL_STACK_DEVELOPER -> "Full Stack Developer"
   */
  private formatPosition(position: string): string {
    return position
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  /**
   * Map domain/position string to Position enum
   */
  private mapToPositionEnum(domain: string): string {
    const domainLower = domain.toLowerCase();
    
    // Map common variations to enum values
    if (domainLower.includes('backend') || domainLower.includes('back-end')) {
      return 'BACKEND_DEVELOPER';
    }
    if (domainLower.includes('frontend') || domainLower.includes('front-end')) {
      return 'FRONTEND_DEVELOPER';
    }
    if (domainLower.includes('full stack') || domainLower.includes('fullstack')) {
      return 'FULL_STACK_DEVELOPER';
    }
    if (domainLower.includes('data') || domainLower.includes('analyst')) {
      return 'DATA_ANALYST';
    }
    if (domainLower.includes('ai') || domainLower.includes('ml') || domainLower.includes('machine learning')) {
      return 'AI_ML';
    }
    if (domainLower.includes('cloud') || domainLower.includes('devops')) {
      return 'CLOUD';
    }
    
    // Default to full stack
    return 'FULL_STACK_DEVELOPER';
  }

  /**
   * Start a contextual AI interview session
   */
  async startContextualInterview(req: AuthenticatedRequest, res: Response) {
    try {
      const { resumeAnalysis, position, domain, mode } = req.body;

      // Mode can be 'resume' or 'manual'
      const interviewMode = mode || (resumeAnalysis ? 'resume' : 'manual');

      // For manual mode, create a basic analysis from position and domain
      let analysis = resumeAnalysis;
      if (!analysis && interviewMode === 'manual') {
        if (!position || !domain) {
          return res.status(400).json({
            success: false,
            message: 'Position and domain required for manual mode interview'
          });
        }
        
        // Create a basic resume analysis for manual mode
        analysis = {
          extractedText: '',
          keywords: [],
          skills: [], // Will be populated with common skills for the domain
          experience: 'Mid-level',
          domain: domain,
          education: [],
          certifications: [],
          projects: [],
          projectDetails: [],
          workExperience: [],
          achievements: [],
          technologies: []
        };
        
        console.log(`🎯 Manual mode interview: ${position} in ${domain}`);
      } else if (!analysis) {
        return res.status(400).json({
          success: false,
          message: 'Resume analysis or position/domain required to start interview'
        });
      }

      // Check if AI service is available
      const aiHealthy = await this.contextualAIService.healthCheck();
      if (!aiHealthy) {
        return res.status(503).json({
          success: false,
          message: 'AI service is currently unavailable. Please try again later.'
        });
      }

      // Generate session ID
      const sessionId = `contextual-ai-interview-${req.user?.id}-${Date.now()}`;

      // Create contextual interview session with mode indicator
      const session = await this.contextualAIService.createInterviewSession(
        sessionId, 
        analysis,
        interviewMode,
        position  // Pass position for manual mode
      );

      // Get conversation context for the response
      const context = await this.conversationService.getContext(sessionId);

      res.json({
        success: true,
        data: {
          sessionId: session.sessionId,
          firstQuestion: session.questions[0],
          totalQuestions: session.totalQuestionCount,
          interviewMode: interviewMode,
          candidateProfile: {
            skills: analysis.skills?.slice(0, 5) || [],
            experience: analysis.experience,
            domain: analysis.domain
          },
          conversationStyle: 'contextual',
          message: interviewMode === 'resume' 
            ? 'Resume-based AI interview started. Questions will be personalized based on your resume.'
            : `General interview started for ${position} in ${domain}.`
        }
      });

    } catch (error) {
      console.error('Contextual AI interview start error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({
        success: false,
        message: 'Failed to start contextual AI interview',
        error: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      });
    }
  }

  /**
   * Submit answer and get contextual response
   */
  async submitContextualAnswer(req: AuthenticatedRequest, res: Response) {
    try {
      const { sessionId, answer } = req.body;

      if (!sessionId || !answer) {
        return res.status(400).json({
          success: false,
          message: 'Session ID and answer are required'
        });
      }

      if (answer.trim().length < 5) {
        return res.status(400).json({
          success: false,
          message: 'Please provide a more detailed answer (minimum 5 characters)'
        });
      }

      console.log('📝 Processing contextual answer for sessionId:', sessionId);
      
      // Check if session exists before processing
      const sessionInfo = this.contextualAIService.getSessionInfo(sessionId);
      console.log('📊 Session info:', sessionInfo);
      
      if (!sessionInfo.exists) {
        console.error('❌ Session not found:', {
          requestedSessionId: sessionId,
          availableSessions: sessionInfo.allSessionIds,
          totalSessions: sessionInfo.totalSessions
        });
        
        return res.status(404).json({
          success: false,
          message: 'Interview session not found. The session may have expired or been lost due to server restart.',
          debug: process.env.NODE_ENV === 'development' ? {
            requestedSessionId: sessionId,
            availableSessions: sessionInfo.allSessionIds,
            totalSessions: sessionInfo.totalSessions
          } : undefined
        });
      }

      // Process response with contextual AI
      const result = await this.contextualAIService.processResponse(sessionId, answer.trim());

      const session = this.contextualAIService.getSession(sessionId);
      if (!session) {
        return res.status(404).json({
          success: false,
          message: 'Interview session not found'
        });
      }

      // Get conversation statistics
      const conversationStats = await this.conversationService.getConversationStats(sessionId);

      res.json({
        success: true,
        data: {
          nextQuestion: result.nextQuestion,
          humanResponse: result.humanResponse, // New field for human-like responses
          shouldContinue: result.shouldContinue,
          isFollowUp: result.isFollowUp,
          isComplete: result.isComplete,
          progress: {
            currentQuestion: session.currentQuestionIndex + 1,
            totalQuestions: session.totalQuestionCount,
            conversationLength: session.conversationHistory.length,
            questionsAnswered: session.responses.length
          },
          conversationContext: {
            totalMessages: conversationStats?.totalMessages || 0,
            averageResponseLength: conversationStats?.averageResponseLength || 0,
            topicsCovered: conversationStats?.topicsCovered || []
          },
          message: result.isFollowUp 
            ? 'Contextual follow-up question generated' 
            : result.isComplete 
              ? 'Interview completed successfully'
              : 'Moving to next question with context awareness'
        }
      });

    } catch (error) {
      console.error('Contextual answer submission error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({
        success: false,
        message: 'Failed to process contextual answer',
        error: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      });
    }
  }

  /**
   * Complete contextual AI interview session
   */
  async completeContextualInterview(req: AuthenticatedRequest, res: Response) {
    try {
      // Generate unique request ID for tracking
      const requestId = `REQ_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      console.log('🔵 RAW REQUEST BODY:', req.body);
      const { sessionId, scores } = req.body;
      console.log(`🔵 [${requestId}] EXTRACTED sessionId:`, sessionId);
      console.log(`🔵 [${requestId}] EXTRACTED scores:`, scores);
      console.log('🔵 SCORES TYPE:', typeof scores);
      console.log('🔵 SCORES IS OBJECT:', scores && typeof scores === 'object');
      
      const userId = req.user?.id;

      if (!sessionId) {
        return res.status(400).json({
          success: false,
          message: 'Session ID is required'
        });
      }

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User authentication required'
        });
      }

      console.log(`🔵 [${requestId}] Starting interview completion for session:`, sessionId);
      
      const session = this.contextualAIService.getSession(sessionId);
      if (!session) {
        console.log(`❌ [${requestId}] Session not found`);
        return res.status(404).json({
          success: false,
          message: 'Interview session not found'
        });
      }
      
      console.log(`✅ [${requestId}] Session found, proceeding with completion`);

      // Get final conversation statistics
      const conversationStats = await this.conversationService.getConversationStats(sessionId);
      const finalConversation = await this.conversationService.getConversation(sessionId);

      // Calculate duration in seconds from conversation stats or estimate from session
      let duration = 0;
      if (conversationStats?.duration && conversationStats.duration > 0) {
        // Convert milliseconds to seconds
        duration = Math.round(conversationStats.duration / 1000);
      } else {
        // Fallback: estimate based on number of questions (avg 2 min per question = 120 seconds)
        duration = Math.max(session.responses.length * 120, 60);
      }
      
      console.log('Interview duration calculation:', {
        statsAvailable: !!conversationStats,
        statsDuration: conversationStats?.duration,
        calculatedSeconds: duration
      });

      // Calculate scores (use provided scores or default to conversation quality metrics)
      const conversationQuality = this.assessConversationQuality(finalConversation);
      
      console.log('=== BACKEND SCORE PROCESSING ===');
      console.log('📥 Received scores from frontend:', scores);
      console.log('🔄 Calculated conversation quality:', conversationQuality);
      console.log('✅ Using frontend scores?', !!scores);
      console.log('📊 Type of scores:', typeof scores);
      console.log('📊 Is scores null/undefined?', scores === null || scores === undefined);
      
      // If scores are provided from frontend, use them directly (they come from speech analysis)
      // Only fall back to conversation quality if scores object is not provided at all
      const interviewScores = scores ? {
        fluencyScore: scores.fluencyScore ?? 0,
        grammarScore: scores.grammarScore ?? 0,
        confidenceScore: scores.confidenceScore ?? 0,
        technicalKnowledgeScore: scores.technicalKnowledgeScore ?? 0,
        vocabularyScore: scores.vocabularyScore ?? 0,
        analyticalThinkingScore: scores.analyticalThinkingScore ?? 0,
        overallScore: scores.overallScore ?? 0
      } : {
        fluencyScore: conversationQuality.fluency ?? 0,
        grammarScore: conversationQuality.grammar ?? 0,
        confidenceScore: conversationQuality.confidence ?? 0,
        technicalKnowledgeScore: conversationQuality.technicalKnowledge ?? 0,
        vocabularyScore: conversationQuality.vocabulary ?? 0,
        analyticalThinkingScore: conversationQuality.analyticalThinking ?? 0,
        overallScore: conversationQuality.overall ?? 0
      };
      
      console.log('💾 Final scores to save in database:', interviewScores);
      console.log('🎯 Overall score to save:', interviewScores.overallScore);
      console.log('🎯 Source:', scores ? 'FRONTEND SCORES' : 'CONVERSATION QUALITY');
      console.log('=== SCORE PROCESSING COMPLETE ===');

      // Determine position from session (resume analysis domain or manual selection)
      const rawPosition = session.resumeAnalysis?.domain || session.position || 'Full Stack Developer';
      const positionEnum = this.mapToPositionEnum(rawPosition);
      // Use raw position for display to maintain consistency with what user sees
      const displayPosition = rawPosition;
      console.log('📋 Raw position:', rawPosition);
      console.log('📋 Position enum (for DB):', positionEnum);
      console.log('📋 Display position:', displayPosition);

      // Save interview results to database
      console.log(`💾 [${requestId}] Creating interview record in database...`);
      const interviewRecord = await prisma.interview.create({
        data: {
          userId,
          position: positionEnum as any,  // Use enum value for database
          status: 'COMPLETED',
          ...interviewScores,
          duration,
          completedAt: new Date()
        }
      });

      console.log(`✅ [${requestId}] Interview saved to database with ID ${interviewRecord.id}:`, {
        id: interviewRecord.id,
        overallScore: interviewRecord.overallScore,
        fluencyScore: interviewRecord.fluencyScore,
        grammarScore: interviewRecord.grammarScore,
        confidenceScore: interviewRecord.confidenceScore,
        technicalKnowledgeScore: interviewRecord.technicalKnowledgeScore,
        vocabularyScore: interviewRecord.vocabularyScore,
        analyticalThinkingScore: interviewRecord.analyticalThinkingScore,
        duration: interviewRecord.duration
      });

      // Generate LLM-based feedback for strengths and improvement areas
      console.log('🤖 Generating LLM-based feedback...');
      
      // Get candidate responses from session
      const candidateResponses = session.responses.map((r, i) => `${i + 1}. ${r}`).join('\n');
      
      const feedbackPrompt = `You are an expert interview coach. Analyze this interview performance and provide specific, actionable feedback.

Interview Details:
- Position: ${displayPosition}
- Duration: ${Math.round(duration / 60)} minutes ${duration % 60} seconds
- Questions Answered: ${session.responses.length}

Performance Scores:
- Overall: ${interviewScores.overallScore}%
- Fluency: ${interviewScores.fluencyScore}%
- Grammar: ${interviewScores.grammarScore}%
- Confidence: ${interviewScores.confidenceScore}%
- Technical Knowledge: ${interviewScores.technicalKnowledgeScore}%
- Vocabulary: ${interviewScores.vocabularyScore}%
- Analytical Thinking: ${interviewScores.analyticalThinkingScore}%

Candidate's Responses:
${candidateResponses}

Provide feedback in the following JSON format (use EXACT scores from above):
{
  "strengths": [
    "Grammar: ${interviewScores.grammarScore}% - Demonstrates excellent written and verbal communication",
    "Vocabulary: ${interviewScores.vocabularyScore}% - Shows strong command of technical terminology",
    "Confidence: ${interviewScores.confidenceScore}% - Exhibits clear self-assurance in responses"
  ],
  "improvementAreas": [
    {"area": "Technical Depth", "priority": "HIGH", "description": "Provide more detailed technical examples"},
    {"area": "Response Structure", "priority": "MEDIUM", "description": "Organize answers using STAR method"}
  ],
  "performanceInsights": [
    "Achieved ${interviewScores.overallScore}% overall - ${interviewScores.overallScore >= 80 ? 'excellent performance' : 'good foundation'}",
    "Top strengths: Grammar (${interviewScores.grammarScore}%), Fluency (${interviewScores.fluencyScore}%), Confidence (${interviewScores.confidenceScore}%)",
    "Ready for ${displayPosition} roles with ${interviewScores.technicalKnowledgeScore >= 75 ? 'solid technical skills' : 'more technical practice needed'}"
  ]
}

CRITICAL: Use EXACT scores from Performance Scores above!
- Strengths: Pick top 3 areas, use "SkillName: [EXACT SCORE]% - Description"
- Performance Insights: Must reference actual percentages, not generic statements
- NO trailing commas, valid JSON only

Respond ONLY with valid JSON, no markdown.`;

      let llmFeedback: any = null;
      try {
        console.log(`🤖 Attempting to connect to Ollama at ${this.ollamaUrl}...`);
        console.log(`🤖 Using model: ${this.modelName}`);
        
        // Quick health check first (2 second timeout)
        const healthController = new AbortController();
        const healthTimeout = setTimeout(() => healthController.abort(), 2000);
        
        try {
          const healthCheck = await fetch(`${this.ollamaUrl}/api/tags`, {
            signal: healthController.signal
          });
          clearTimeout(healthTimeout);
          
          if (!healthCheck.ok) {
            console.log('⚠️ Ollama is running but returned error on health check');
          } else {
            console.log('✅ Ollama is running and responsive');
          }
        } catch (healthError) {
          clearTimeout(healthTimeout);
          console.log('⚠️ Ollama appears to be offline or not responding');
          throw new Error('Ollama not available');
        }
        
        // Proceed with actual generation (30 second timeout for model inference)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
        
        console.log('🎯 Sending feedback generation request...');
        const ollamaResponse = await fetch(`${this.ollamaUrl}/api/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: this.modelName,  // Use configured model name
            prompt: feedbackPrompt,
            stream: false,
            options: {
              temperature: 0.7,
              num_predict: 1000
            }
          }),
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);

        if (ollamaResponse.ok) {
          const ollamaData: any = await ollamaResponse.json();
          const feedbackText = ollamaData.response.trim();
          console.log('📝 Raw LLM response:', feedbackText.substring(0, 200) + '...');
          
          // Extract JSON from response (handle markdown code blocks)
          const jsonMatch = feedbackText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            llmFeedback = JSON.parse(jsonMatch[0]);
            console.log('✅ LLM feedback generated successfully');
            console.log('📊 LLM feedback content:', {
              strengthsCount: llmFeedback.strengths?.length,
              improvementAreasCount: llmFeedback.improvementAreas?.length,
              performanceInsightsCount: llmFeedback.performanceInsights?.length
            });
          } else {
            console.warn('⚠️ No JSON found in LLM response');
          }
        } else {
          const errorText = await ollamaResponse.text();
          console.error('❌ Ollama response not OK:', {
            status: ollamaResponse.status,
            statusText: ollamaResponse.statusText,
            error: errorText
          });
          console.log('💡 Tip: Make sure Ollama is running and the model is available');
          console.log(`💡 Run: ollama pull ${this.modelName}`);
          console.log(`💡 Or set OLLAMA_MODEL environment variable to an available model`);
        }
      } catch (llmError: any) {
        if (llmError.name === 'AbortError') {
          console.error('❌ LLM request timed out after 30 seconds');
          console.log('💡 The model might be loading for the first time or is too slow');
        } else if (llmError.message === 'Ollama not available') {
          console.error('❌ Ollama service is not running');
          console.log('💡 Start Ollama with: ollama serve');
        } else {
          console.error('❌ LLM feedback generation failed:', llmError.message || llmError);
        }
        console.log('💡 Using fallback feedback generation instead');
      }

      // Fallback to basic feedback if LLM fails
      if (!llmFeedback) {
        console.log('⚠️ Using fallback feedback');
        llmFeedback = {
          strengths: [
            `Confidence: ${interviewScores.confidenceScore}% - ${interviewScores.confidenceScore >= 80 ? 'Demonstrated excellent self-assurance and composure throughout responses' : 'Showed good confidence with room to strengthen assertiveness'}`,
            `Fluency: ${interviewScores.fluencyScore}% - ${interviewScores.fluencyScore >= 80 ? 'Exhibited strong communication flow with minimal pauses' : 'Developing smooth communication skills with occasional hesitations'}`,
            `Vocabulary: ${interviewScores.vocabularyScore}% - ${interviewScores.vocabularyScore >= 80 ? 'Used rich professional and technical terminology effectively' : 'Applied adequate vocabulary with opportunities to expand technical terms'}`
          ],
          improvementAreas: [
            ...(interviewScores.technicalKnowledgeScore < 70 ? [{
              area: 'Technical Knowledge',
              priority: 'HIGH',
              description: `Expand your technical depth in ${displayPosition} with advanced topics and real-world examples`
            }] : []),
            ...(interviewScores.analyticalThinkingScore < 70 ? [{
              area: 'Analytical Thinking',
              priority: 'MEDIUM',
              description: 'Demonstrate structured problem-solving frameworks and logical reasoning'
            }] : []),
            ...(interviewScores.fluencyScore < 70 ? [{
              area: 'Communication Fluency',
              priority: 'MEDIUM',
              description: 'Practice smooth transitions and flow between ideas'
            }] : [])
          ],
          performanceInsights: [
            `Achieved ${interviewScores.overallScore}% overall score - ${interviewScores.overallScore >= 80 ? 'excellent performance showing strong readiness' : interviewScores.overallScore >= 60 ? 'good foundation with some areas to strengthen' : 'needs improvement across multiple areas'}`,
            `Strong areas: ${[
              interviewScores.confidenceScore >= 80 ? `Confidence (${interviewScores.confidenceScore}%)` : null, 
              interviewScores.fluencyScore >= 80 ? `Fluency (${interviewScores.fluencyScore}%)` : null, 
              interviewScores.grammarScore >= 80 ? `Grammar (${interviewScores.grammarScore}%)` : null, 
              interviewScores.vocabularyScore >= 80 ? `Vocabulary (${interviewScores.vocabularyScore}%)` : null
            ].filter(Boolean).join(', ') || 'Focus on building foundational skills across all areas'}`,
            `For ${displayPosition} roles: ${interviewScores.technicalKnowledgeScore >= 75 ? `Technical knowledge is solid (${interviewScores.technicalKnowledgeScore}%)` : `Build stronger technical depth (current: ${interviewScores.technicalKnowledgeScore}%)`}`,
            session.responses.length >= 8 ? 'Excellent engagement with comprehensive responses throughout the interview' : session.responses.length >= 5 ? 'Good response depth - consider elaborating more on technical details' : 'Provide more detailed responses to better showcase your knowledge and experience'
          ]
        };
      }

      // Save feedback to database with nested improvement records
      console.log(`💾 [${requestId}] Creating feedback record in database...`);
      await prisma.feedback.create({
        data: {
          userId,
          interviewId: interviewRecord.id,
          // Interview scores
          fluencyScore: interviewScores.fluencyScore,
          grammarScore: interviewScores.grammarScore,
          confidenceScore: interviewScores.confidenceScore,
          technicalKnowledgeScore: interviewScores.technicalKnowledgeScore,
          vocabularyScore: interviewScores.vocabularyScore,
          analyticalThinkingScore: interviewScores.analyticalThinkingScore,
          interviewOverallScore: interviewScores.overallScore,
          // Feedback content
          strengths: llmFeedback.strengths,
          performanceInsights: llmFeedback.performanceInsights,
          aptitudeInsights: [],
          // Nested create for improvements
          improvements: {
            create: llmFeedback.improvementAreas.map((area: any) => ({
              area: area.area,
              priority: area.priority,
              description: area.description
            }))
          }
        }
      });

      console.log('💾 Feedback saved to database');

      // Generate interview summary with conversation context
      const summary = {
        sessionId,
        interviewId: interviewRecord.id,
        totalQuestions: session.conversationHistory.length,
        questionsAnswered: session.responses.length,
        duration,
        averageResponseLength: conversationStats?.averageResponseLength || 0,
        topicsCovered: conversationStats?.topicsCovered || [],
        conversationQuality,
        scores: interviewScores,
        skills: session.resumeAnalysis?.skills || [],
        domain: session.resumeAnalysis?.domain,
        position: displayPosition,  // Use display position to maintain consistency
        completedAt: interviewRecord.completedAt,
        interviewType: 'contextual-ai'
      };

      // Clean up session and conversation data
      this.contextualAIService.completeSession(sessionId);
      await this.conversationService.endConversation(sessionId);

      // Create structured feedback response
      const feedbackResponse = {
        id: interviewRecord.id,
        userId,
        interviewId: interviewRecord.id,
        position: displayPosition,  // Use raw position for consistency
        // Interview Scores
        fluencyScore: interviewScores.fluencyScore,
        grammarScore: interviewScores.grammarScore,
        confidenceScore: interviewScores.confidenceScore,
        technicalKnowledgeScore: interviewScores.technicalKnowledgeScore,
        vocabularyScore: interviewScores.vocabularyScore,
        analyticalThinkingScore: interviewScores.analyticalThinkingScore,
        interviewOverallScore: interviewScores.overallScore,
        // Feedback content
        strengths: llmFeedback.strengths,
        performanceInsights: llmFeedback.performanceInsights,
        aptitudeInsights: [],
        improvements: llmFeedback.improvementAreas.map((area: any) => ({
          area: area.area,
          priority: area.priority,
          description: area.description
        })),
        createdAt: interviewRecord.createdAt.toISOString(),
        updatedAt: interviewRecord.updatedAt.toISOString()
      };

      console.log('📤 Sending feedback response to frontend:', {
        position: feedbackResponse.position,
        strengthsCount: feedbackResponse.strengths?.length,
        improvementsCount: feedbackResponse.improvements?.length,
        performanceInsightsCount: feedbackResponse.performanceInsights?.length,
        scores: {
          fluency: feedbackResponse.fluencyScore,
          overall: feedbackResponse.interviewOverallScore
        }
      });

      res.json({
        success: true,
        data: {
          summary,
          feedback: feedbackResponse,
          message: 'Contextual AI interview completed successfully'
        }
      });

    } catch (error) {
      console.error('Contextual interview completion error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({
        success: false,
        message: 'Failed to complete contextual interview',
        error: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      });
    }
  }

  /**
   * Get current contextual interview session status
   */
  async getContextualSessionStatus(req: AuthenticatedRequest, res: Response) {
    try {
      const { sessionId } = req.params;
      
      const session = this.contextualAIService.getSession(sessionId);
      if (!session) {
        return res.status(404).json({
          success: false,
          message: 'Interview session not found'
        });
      }

      // Get conversation context
      const context = await this.conversationService.getContext(sessionId);
      const conversationStats = await this.conversationService.getConversationStats(sessionId);

      res.json({
        success: true,
        data: {
          sessionId: session.sessionId,
          currentQuestion: session.questions[session.currentQuestionIndex],
          progress: {
            currentQuestion: session.currentQuestionIndex + 1,
            totalQuestions: session.totalQuestionCount,
            conversationLength: session.conversationHistory.length,
            questionsAnswered: session.responses.length
          },
          candidateProfile: {
            skills: session.resumeAnalysis?.skills.slice(0, 5) || [],
            experience: session.resumeAnalysis?.experience,
            domain: session.resumeAnalysis?.domain
          },
          conversationContext: {
            currentTopic: context?.currentTopic,
            topicsHistory: context?.topicHistory || [],
            interviewStyle: context?.interviewStyle || 'conversational',
            totalMessages: conversationStats?.totalMessages || 0,
            averageResponseLength: conversationStats?.averageResponseLength || 0
          },
          interviewType: 'contextual-ai'
        }
      });

    } catch (error) {
      console.error('Contextual session status error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({
        success: false,
        message: 'Failed to get contextual session status',
        error: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      });
    }
  }

  /**
   * Get conversation history for debugging/review
   */
  async getConversationHistory(req: AuthenticatedRequest, res: Response) {
    try {
      const { sessionId } = req.params;
      
      const conversation = await this.conversationService.getConversation(sessionId);
      const context = await this.conversationService.getContext(sessionId);

      if (!context) {
        return res.status(404).json({
          success: false,
          message: 'Conversation not found'
        });
      }

      res.json({
        success: true,
        data: {
          sessionId,
          conversation: conversation.map(msg => ({
            role: msg.role,
            content: msg.content,
            timestamp: msg.timestamp,
            questionType: msg.questionType,
            isFollowUp: msg.isFollowUp
          })),
          context: {
            currentTopic: context.currentTopic,
            topicsHistory: context.topicHistory,
            questionsAsked: context.questionsAsked,
            maxQuestions: context.maxQuestions,
            interviewStyle: context.interviewStyle
          }
        }
      });

    } catch (error) {
      console.error('Conversation history error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({
        success: false,
        message: 'Failed to get conversation history',
        error: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      });
    }
  }

  /**
   * Health check for contextual AI services
   */
  async healthCheck(req: Request, res: Response) {
    try {
      const aiHealthy = await this.contextualAIService.healthCheck();
      
      res.json({
        success: true,
        data: {
          contextualAI: aiHealthy,
          conversationService: true, // Always available as it uses Redis
          redis: true, // Assume Redis is available if no errors
          timestamp: new Date(),
          features: {
            contextAware: true,
            humanLikeResponses: true,
            followUpQuestions: true,
            topicRedirection: true
          }
        }
      });

    } catch (error) {
      console.error('Contextual AI health check error:', error);
      res.status(500).json({
        success: false,
        message: 'Contextual AI health check failed'
      });
    }
  }

  /**
   * Assess conversation quality based on various metrics
   */
  private assessConversationQuality(conversation: any[]): {
    overall: number;
    fluency: number;
    grammar: number;
    confidence: number;
    technicalKnowledge: number;
    vocabulary: number;
    analyticalThinking: number;
  } {
    const candidateMessages = conversation.filter(m => m.role === 'candidate');
    
    if (candidateMessages.length === 0) {
      return {
        overall: 0,
        fluency: 0,
        grammar: 0,
        confidence: 0,
        technicalKnowledge: 0,
        vocabulary: 0,
        analyticalThinking: 0
      };
    }

    // Calculate fluency (based on response length and coherence)
    const avgLength = candidateMessages.reduce((sum, msg) => sum + msg.content.length, 0) / candidateMessages.length;
    const fluency = Math.min(avgLength / 150, 1) * 100; // 150 chars = good fluency

    // Calculate grammar (placeholder - based on sentence structure)
    const grammar = Math.min((avgLength / 100) * 80, 100); // Simple heuristic

    // Calculate confidence (based on use of assertive language)
    const confidenceKeywords = ['definitely', 'certainly', 'confident', 'sure', 'believe', 'know', 'understand'];
    const confidenceScore = candidateMessages.reduce((score, msg) => {
      const keywordCount = confidenceKeywords.filter(keyword => 
        msg.content.toLowerCase().includes(keyword)
      ).length;
      return score + keywordCount;
    }, 0);
    const confidence = Math.min(confidenceScore / candidateMessages.length * 50, 100);

    // Calculate technical knowledge (based on technical terms and examples)
    const technicalKeywords = ['algorithm', 'database', 'api', 'framework', 'system', 'architecture', 'design', 'implementation', 'performance'];
    const technicalScore = candidateMessages.reduce((score, msg) => {
      const keywordCount = technicalKeywords.filter(keyword => 
        msg.content.toLowerCase().includes(keyword)
      ).length;
      return score + keywordCount;
    }, 0);
    const technicalKnowledge = Math.min(technicalScore / candidateMessages.length * 40, 100);

    // Calculate vocabulary (based on unique words and complexity)
    const allWords = candidateMessages.map(m => m.content.toLowerCase().split(/\s+/)).flat();
    const uniqueWords = new Set(allWords);
    const vocabulary = Math.min((uniqueWords.size / allWords.length) * 200, 100);

    // Calculate analytical thinking (based on examples, reasoning, problem-solving)
    const analyticalKeywords = ['example', 'instance', 'because', 'therefore', 'however', 'analysis', 'solution', 'approach', 'consider'];
    const analyticalScore = candidateMessages.reduce((score, msg) => {
      const keywordCount = analyticalKeywords.filter(keyword => 
        msg.content.toLowerCase().includes(keyword)
      ).length;
      return score + keywordCount;
    }, 0);
    const analyticalThinking = Math.min(analyticalScore / candidateMessages.length * 35, 100);

    const overall = (fluency + grammar + confidence + technicalKnowledge + vocabulary + analyticalThinking) / 6;

    return {
      overall: Math.round(overall),
      fluency: Math.round(fluency),
      grammar: Math.round(grammar),
      confidence: Math.round(confidence),
      technicalKnowledge: Math.round(technicalKnowledge),
      vocabulary: Math.round(vocabulary),
      analyticalThinking: Math.round(analyticalThinking)
    };
  }

  /**
   * Debug endpoint to list all active sessions
   */
  async listActiveSessions(req: AuthenticatedRequest, res: Response) {
    try {
      const sessions = [];
      
      // Get basic session info without exposing sensitive data
      for (const [sessionId] of this.contextualAIService['sessions']) {
        const sessionInfo = this.contextualAIService.getSessionInfo(sessionId);
        sessions.push({
          sessionId,
          exists: sessionInfo.exists,
          currentQuestionIndex: sessionInfo.session?.currentQuestionIndex || 0,
          totalQuestions: sessionInfo.session?.totalQuestionCount || 0,
          isComplete: sessionInfo.session?.isComplete || false,
          responseCount: sessionInfo.session?.responses?.length || 0
        });
      }

      res.json({
        success: true,
        totalActiveSessions: sessions.length,
        sessions: process.env.NODE_ENV === 'development' ? sessions : sessions.length
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('List sessions error:', error);

      res.status(500).json({
        success: false,
        message: 'Failed to list active sessions',
        error: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      });
    }
  }

  /**
   * Get interview history for the authenticated user
   */
  async getInterviewHistory(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      const { limit = 10 } = req.query;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated'
        });
      }

      console.log('=== FETCHING INTERVIEW HISTORY ===');
      console.log('User ID:', userId);
      console.log('Limit:', limit);

      const interviews = await prisma.interview.findMany({
        where: { userId },
        orderBy: { completedAt: 'desc' },
        take: parseInt(limit as string),
        include: {
          feedback: {
            select: {
              strengths: true,
              improvements: true,
              performanceInsights: true
            }
          }
        }
      });

      console.log(`📚 Found ${interviews.length} interviews in database`);
      interviews.forEach((interview, index) => {
        console.log(`Interview ${index + 1}:`, {
          id: interview.id,
          overallScore: interview.overallScore,
          fluencyScore: interview.fluencyScore,
          grammarScore: interview.grammarScore,
          confidenceScore: interview.confidenceScore,
          technicalKnowledgeScore: interview.technicalKnowledgeScore,
          vocabularyScore: interview.vocabularyScore,
          analyticalThinkingScore: interview.analyticalThinkingScore,
          duration: interview.duration,
          completedAt: interview.completedAt,
          position: interview.position
        });
      });

      const responseData = interviews.map(interview => ({
        id: interview.id,
        position: this.formatPosition(interview.position),  // Format position for display
        domain: this.formatPosition(interview.position),     // Format domain too
        status: interview.status,
        overallScore: interview.overallScore,
        fluencyScore: interview.fluencyScore,
        grammarScore: interview.grammarScore,
        confidenceScore: interview.confidenceScore,
        technicalKnowledgeScore: interview.technicalKnowledgeScore,
        vocabularyScore: interview.vocabularyScore,
        analyticalThinkingScore: interview.analyticalThinkingScore,
        duration: interview.duration,
        completedAt: interview.completedAt,
        feedback: interview.feedback || null
      }));

      console.log('📤 Sending response with interviews:', responseData);
      console.log('=== HISTORY FETCH COMPLETE ===');

      res.json({
        success: true,
        data: {
          interviews: responseData
        }
      });
    } catch (error) {
      console.error('❌ Error in getInterviewHistory:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch interview history'
      });
    }
  }

  /**
   * Get a single interview by ID
   */
  async getInterviewById(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      const { id } = req.params;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated'
        });
      }

      const interview = await prisma.interview.findFirst({
        where: { 
          id,
          userId // Ensure user can only access their own interviews
        },
        include: {
          feedback: {
            include: {
              improvements: true  // Include full improvement records
            }
          }
        }
      });

      if (!interview) {
        return res.status(404).json({
          success: false,
          message: 'Interview not found'
        });
      }

      // Format position for display
      const formattedPosition = this.formatPosition(interview.position);

      // Format feedback if available
      const formattedFeedback = interview.feedback ? {
        id: interview.feedback.id,
        strengths: interview.feedback.strengths,
        performanceInsights: interview.feedback.performanceInsights,
        aptitudeInsights: interview.feedback.aptitudeInsights,
        improvements: interview.feedback.improvements.map(imp => ({
          id: imp.id,
          area: imp.area,
          priority: imp.priority,
          description: imp.description
        })),
        // Include interview scores in feedback
        fluencyScore: interview.fluencyScore,
        grammarScore: interview.grammarScore,
        confidenceScore: interview.confidenceScore,
        technicalKnowledgeScore: interview.technicalKnowledgeScore,
        vocabularyScore: interview.vocabularyScore,
        analyticalThinkingScore: interview.analyticalThinkingScore,
        interviewOverallScore: interview.overallScore,
        position: formattedPosition,
        createdAt: interview.feedback.createdAt.toISOString(),
        updatedAt: interview.feedback.updatedAt.toISOString()
      } : null;

      res.json({
        success: true,
        data: {
          interview: {
            id: interview.id,
            position: formattedPosition,  // Use formatted position
            domain: formattedPosition,     // Use formatted position for domain too
            status: interview.status,
            overallScore: interview.overallScore,
            fluencyScore: interview.fluencyScore,
            grammarScore: interview.grammarScore,
            confidenceScore: interview.confidenceScore,
            technicalKnowledgeScore: interview.technicalKnowledgeScore,
            vocabularyScore: interview.vocabularyScore,
            analyticalThinkingScore: interview.analyticalThinkingScore,
            duration: interview.duration,
            completedAt: interview.completedAt,
            feedback: formattedFeedback
          }
        }
      });
    } catch (error) {
      console.error('Error in getInterviewById:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch interview details'
      });
    }
  }
}
