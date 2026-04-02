import axios from 'axios';
import { ResumeAnalysis } from './resumeProcessingService';

export interface AIQuestion {
  id: string;
  text: string;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
  followUp?: string[];
}

export interface InterviewSession {
  sessionId: string;
  questions: AIQuestion[];
  currentQuestionIndex: number;
  responses: string[];
  resumeAnalysis?: ResumeAnalysis;
  conversationHistory: Array<{
    question: string;
    response: string;
    timestamp: Date;
  }>;
  totalQuestionCount: number;
  isComplete: boolean;
}

export class AIQuestionService {
  private ollamaUrl: string;
  private modelName: string;
  private sessions: Map<string, InterviewSession> = new Map();

  constructor() {
    this.ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
    this.modelName = process.env.OLLAMA_MODEL || 'gemma3';
  }

  async createInterviewSession(sessionId: string, resumeAnalysis: ResumeAnalysis): Promise<InterviewSession> {
    try {
      console.log('=== CREATING INTERVIEW SESSION ===');
      
      // First, check if Ollama is available
      const isOllamaHealthy = await this.healthCheck();
      if (!isOllamaHealthy) {
        console.error('Ollama is not available. Please ensure Ollama is running and the model is loaded.');
        throw new Error('AI service is not available. Please ensure Ollama is running and try again.');
      }
      
      console.log('✅ Ollama health check passed');
      console.log('Resume Analysis Summary:');
      console.log('- Skills count:', resumeAnalysis.skills?.length || 0);
      console.log('- Projects count:', resumeAnalysis.projects?.length || 0);
      console.log('- Work Experience count:', resumeAnalysis.workExperience?.length || 0);
      console.log('- Achievements count:', resumeAnalysis.achievements?.length || 0);
      console.log('- Experience level:', resumeAnalysis.experience);
      console.log('- Domain:', resumeAnalysis.domain);
      console.log('- Extracted text length:', resumeAnalysis.extractedText?.length || 0, 'characters');
      console.log('- Skills found:', resumeAnalysis.skills?.slice(0, 5).join(', ') || 'None');
      console.log('- Projects found:', resumeAnalysis.projects?.slice(0, 3).join(', ') || 'None');
      console.log('=== END SESSION CREATION DEBUG ===');
      
      // Calculate target number of questions but don't generate them all at once
      const baseQuestions = 8; // Increased base to ensure comprehensive interview
      const projectBonus = Math.min(resumeAnalysis.projects?.length || 0, 3);
      const experienceBonus = resumeAnalysis.workExperience?.length > 0 ? 2 : 0;
      const achievementBonus = resumeAnalysis.achievements?.length > 0 ? 1 : 0;
      const skillBonus = Math.min(Math.floor(resumeAnalysis.skills.length / 3), 3); // More generous skill bonus
      const certificationBonus = resumeAnalysis.certifications?.length > 0 ? 1 : 0;
      
      let totalQuestionCount = baseQuestions + projectBonus + experienceBonus + achievementBonus + skillBonus + certificationBonus;
      
      // Ensure minimum 10 questions for a comprehensive interview
      totalQuestionCount = Math.max(totalQuestionCount, 10);
      
      // Cap at 15 questions to avoid overly long interviews
      totalQuestionCount = Math.min(totalQuestionCount, 15);

      console.log(`=== QUESTION COUNT CALCULATION ===`);
      console.log(`Base Questions: ${baseQuestions}`);
      console.log(`Project Bonus: ${projectBonus} (from ${resumeAnalysis.projects?.length || 0} projects)`);
      console.log(`Experience Bonus: ${experienceBonus}`);
      console.log(`Achievement Bonus: ${achievementBonus}`);
      console.log(`Skill Bonus: ${skillBonus} (from ${resumeAnalysis.skills.length} skills)`);
      console.log(`Certification Bonus: ${certificationBonus}`);
      console.log(`TOTAL: ${totalQuestionCount} questions planned`);
      console.log(`=== END CALCULATION ===`);

      console.log(`Planning interview with ${totalQuestionCount} questions total`);

      // Generate only the first question
      const firstQuestion = await this.generateNextQuestion(resumeAnalysis, [], 0, totalQuestionCount);
      
      const session: InterviewSession = {
        sessionId,
        questions: [firstQuestion],
        currentQuestionIndex: 0,
        responses: [],
        resumeAnalysis,
        conversationHistory: [],
        totalQuestionCount,
        isComplete: false
      };

      this.sessions.set(sessionId, session);
      return session;
    } catch (error) {
      console.error('Error creating interview session:', error);
      throw error;
    }
  }

  private async generateNextQuestion(
    analysis: ResumeAnalysis, 
    previousQuestions: AIQuestion[], 
    questionNumber: number,
    totalQuestions: number
  ): Promise<AIQuestion> {
    // Determine question focus first
    const previousTexts = previousQuestions.map(q => q.text.toLowerCase()).join(' ');
    const coveredProjects = analysis.projects?.filter(project => 
      previousTexts.includes(project.toLowerCase())
    ) || [];
    const coveredSkills = analysis.skills?.filter(skill => 
      previousTexts.includes(skill.toLowerCase())
    ) || [];
    
    const questionFocus = this.determineQuestionFocus(
      questionNumber / totalQuestions,
      questionNumber,
      analysis,
      coveredProjects,
      coveredSkills,
      previousQuestions
    );
    
    const prompt = this.createCategorySpecificPrompt(questionFocus, analysis, questionNumber, totalQuestions);
    
    try {
      console.log(`Generating question ${questionNumber + 1}/${totalQuestions}...`);
      console.log('=== PROMPT DEBUG ===');
      console.log('Skills available:', analysis.skills?.length || 0);
      console.log('Projects available:', analysis.projects?.length || 0);
      console.log('Question focus:', questionFocus.category);
      console.log('Prompt length:', prompt.length, 'characters');
      console.log('=== END PROMPT DEBUG ===');
      
      const response = await this.queryOllamaWithTimeout(prompt, 12000);
      const questions = this.parseQuestions(response);
      
      if (questions.length > 0) {
        console.log(`Successfully generated question ${questionNumber + 1}:`, questions[0].text.substring(0, 100) + '...');
        return questions[0];
      } else {
        console.log('AI response parsing failed, trying fallback question generation');
        
        // Fallback: Create a basic question based on the category
        const fallbackQuestion = this.createFallbackQuestion(questionFocus, analysis, questionNumber);
        if (fallbackQuestion) {
          console.log('Using fallback question:', fallbackQuestion.text.substring(0, 100) + '...');
          return fallbackQuestion;
        }
        
        throw new Error('Failed to parse AI response into valid question format');
      }
    } catch (error: any) {
      console.error(`Failed to generate question ${questionNumber + 1}:`, error.message);
      
      // Try fallback question before throwing error
      const fallbackQuestion = this.createFallbackQuestion(questionFocus, analysis, questionNumber);
      if (fallbackQuestion) {
        console.log('Using fallback question due to error:', fallbackQuestion.text.substring(0, 100) + '...');
        return fallbackQuestion;
      }
      
      throw error; // Let the calling function handle the error
    }
  }

  private createFallbackQuestion(questionFocus: any, analysis: ResumeAnalysis, questionNumber: number): AIQuestion | null {
    try {
      console.log('Creating fallback question for category:', questionFocus.category);
      
      let questionText = '';
      
      switch (questionFocus.category) {
        case 'introduction':
          questionText = `Could you tell me a bit about yourself and what got you interested in ${analysis.domain}?`;
          break;
          
        case 'technical':
          const skill = analysis.skills?.[0] || 'programming';
          questionText = `Can you tell me about your experience with ${skill}? What projects have you used it in?`;
          break;
          
        case 'project-specific':
          const project = analysis.projects?.[0] || 'one of your projects';
          questionText = `Can you walk me through ${project}? What was your role and what challenges did you face?`;
          break;
          
        case 'behavioral':
          questionText = `What's an achievement you're particularly proud of in your career? What impact did it have?`;
          break;
          
        case 'problem-solving':
          questionText = `Describe a complex technical problem you encountered and how you approached solving it.`;
          break;
          
        case 'learning-growth':
          questionText = `How do you stay updated with the latest developments in ${analysis.domain}?`;
          break;
          
        default:
          questionText = `Tell me about your experience in ${analysis.domain} and what interests you most about this field.`;
      }
      
      return {
        id: `fallback-${Date.now()}`,
        text: questionText,
        category: questionFocus.category || 'general',
        difficulty: questionFocus.difficulty || 'medium'
      };
      
    } catch (error) {
      console.error('Failed to create fallback question:', error);
      return null;
    }
  }

  private createDynamicPrompt(
    analysis: ResumeAnalysis, 
    previousQuestions: AIQuestion[], 
    questionNumber: number,
    totalQuestions: number
  ): string {
    const skills = analysis.skills;
    const projects = analysis.projects || [];
    const workExp = analysis.workExperience || [];
    const achievements = analysis.achievements || [];
    const experience = analysis.experience;
    const domain = analysis.domain;

    // Create context from previous questions to avoid repetition
    const previousTopics = previousQuestions.map(q => q.category).join(', ');
    const previousTexts = previousQuestions.map(q => q.text.toLowerCase()).join(' ');
    
    // Track what has been covered to ensure diversity
    const coveredProjects = projects.filter(project => 
      previousTexts.includes(project.toLowerCase())
    );
    const coveredSkills = skills.filter(skill => 
      previousTexts.includes(skill.toLowerCase())
    );

    // Determine question focus based on interview progress and coverage
    const progress = questionNumber / totalQuestions;
    let questionFocus = this.determineQuestionFocus(
      progress, 
      questionNumber, 
      analysis, 
      coveredProjects, 
      coveredSkills, 
      previousQuestions
    );

    // Create specific prompts based on question category
    return this.createCategorySpecificPrompt(questionFocus, analysis, questionNumber, totalQuestions);
  }

  private createCategorySpecificPrompt(
    questionFocus: any,
    analysis: ResumeAnalysis,
    questionNumber: number,
    totalQuestions: number
  ): string {
    // Determine interview stage based on question number
    let currentStage = '';
    if (questionNumber === 0) currentStage = 'introduction';
    else if (questionNumber >= 1 && questionNumber <= 3) currentStage = 'skills';
    else if (questionNumber >= 4 && questionNumber <= 6) currentStage = 'projects';
    else if (questionNumber >= 7 && questionNumber <= 9) currentStage = 'achievements';
    else currentStage = 'general';

    // Build context of previous conversation (this would be populated in a real scenario)
    const previousQuestionsContext = questionNumber > 0 
      ? `Previous questions have covered: ${questionFocus.category} topics.`
      : 'This is the first question of the interview.';

    return `You are a professional technical interviewer conducting a real-time interview. Your role is to have a natural, flowing conversation with the candidate based on their resume and responses.

**CANDIDATE'S RESUME:**
Experience Level: ${analysis.experience}
Domain: ${analysis.domain}
Skills: ${analysis.skills.join(', ')}
Projects: ${analysis.projects.join(', ')}
Work Experience: ${analysis.workExperience.join(', ')}
Achievements: ${analysis.achievements.join(', ')}
Technologies: ${analysis.technologies?.join(', ') || 'Not specified'}
Certifications: ${analysis.certifications?.join(', ') || 'None'}

**RESUME EXCERPT:**
${analysis.extractedText.substring(0, 1000)}${analysis.extractedText.length > 1000 ? '...' : ''}

**INTERVIEW CONTEXT:**
- Current Question: ${questionNumber + 1} of ${totalQuestions}
- Interview Stage: ${currentStage}
- Target Category: ${questionFocus.category}
- Focus Area: ${questionFocus.focusArea}
- ${previousQuestionsContext}

**YOUR INTERVIEW APPROACH:**

**STAGE GUIDELINES:**
- **Introduction (Q1-2):** Warm welcome, ask them to introduce themselves, reference their background
- **Skills (Q3-5):** Explore specific technical skills, ask about practical experience and challenges
- **Projects (Q6-8):** Focus on specific projects, their role, challenges, and solutions
- **Achievements (Q9-10):** Explore accomplishments, impact, and professional growth
- **General (Q11+):** Behavioral and situational questions relevant to their background

**CRITICAL RULES:**

1. **ONLY ASK ONE QUESTION AT A TIME** - Generate exactly one question
2. **REFERENCE THEIR RESUME ACCURATELY** - Only mention skills, projects, and experiences actually listed
3. **MATCH CURRENT STAGE** - Ensure your question fits the ${currentStage} stage
4. **KEEP IT CONVERSATIONAL** - Sound like a real interviewer, not a script
5. **BE SPECIFIC** - Reference actual content from their resume

**QUESTION TYPE FOR THIS STAGE (${currentStage.toUpperCase()}):**

${this.getStageSpecificGuidance(currentStage, questionFocus, analysis)}

**RESPONSE FORMAT:**
Generate exactly ONE interview question in valid JSON format:
{"text": "your natural, conversational question here", "category": "${questionFocus.category}", "difficulty": "${questionFocus.difficulty}"}

**EXAMPLES OF GOOD QUESTIONS:**
${this.getExampleQuestions(currentStage, analysis)}

Now generate your interview question for the ${currentStage} stage, targeting ${questionFocus.category} category.`;
  }

  private getStageSpecificGuidance(stage: string, questionFocus: any, analysis: ResumeAnalysis): string {
    switch (stage) {
      case 'introduction':
        return `Ask them to introduce themselves and share what drew them to ${analysis.domain}. Reference something specific from their background that interests you. Keep it warm and welcoming.`;
      
      case 'skills':
        const skill = questionFocus.focusArea.includes('specifically') 
          ? questionFocus.focusArea.split('specifically ')[1] 
          : analysis.skills[0];
        return `Explore their experience with ${skill}. Ask about practical usage, challenges faced, or what they find interesting about this technology. Build on their introduction if relevant.`;
      
      case 'projects':
        const project = analysis.projects[0] || 'their projects';
        return `Focus on a specific project: ${project}. Ask about their role, the challenges they faced, or technical decisions they made. Only reference technologies explicitly mentioned with this project.`;
      
      case 'achievements':
        return `Explore their professional accomplishments, certifications, or career growth. Ask about impact, learning outcomes, or how achievements shaped their career path.`;
      
      case 'general':
        return `Ask behavioral or situational questions relevant to their ${analysis.experience} level in ${analysis.domain}. Focus on problem-solving, teamwork, or future goals based on their background.`;
      
      default:
        return `Generate a professional interview question appropriate for their background and experience level.`;
    }
  }

  private getExampleQuestions(stage: string, analysis: ResumeAnalysis): string {
    switch (stage) {
      case 'introduction':
        return `"Welcome! I've been looking at your background in ${analysis.domain}, and I'm particularly interested in your experience with ${analysis.skills[0] || 'technology'}. Could you start by telling me a bit about yourself and what drew you to this field?"`;
      
      case 'skills':
        const skill = analysis.skills[0] || 'programming';
        return `"I noticed you've worked with ${skill}. What's been your experience with it, and what aspects do you find most challenging or interesting?"`;
      
      case 'projects':
        const project = analysis.projects[0] || 'your projects';
        return `"You mentioned '${project}' in your resume. Can you walk me through what that project involved and what your specific contributions were?"`;
      
      case 'achievements':
        return `"I see you've accomplished quite a bit in your career. What's an achievement you're particularly proud of, and what impact did it have?"`;
      
      case 'general':
        return `"Given your experience in ${analysis.domain}, how do you typically approach learning new technologies or solving complex problems?"`;
      
      default:
        return `"Tell me about your experience in ${analysis.domain} and what motivates you in this field."`;
    }
  }

  private createDetailedResumeContext(analysis: ResumeAnalysis): string {
    let context = `Experience Level: ${analysis.experience}\n`;
    context += `Domain: ${analysis.domain}\n\n`;

    // Core Skills with more detail
    if (analysis.skills.length > 0) {
      context += `TECHNICAL SKILLS:\n`;
      const primarySkills = analysis.skills.slice(0, 8);
      const secondarySkills = analysis.skills.slice(8, 15);
      context += `Primary: ${primarySkills.join(', ')}\n`;
      if (secondarySkills.length > 0) {
        context += `Additional: ${secondarySkills.join(', ')}\n`;
      }
      context += `\n`;
    }

    // Projects with more context
    if (analysis.projects && analysis.projects.length > 0) {
      context += `PROJECTS:\n`;
      analysis.projects.slice(0, 5).forEach((project, index) => {
        context += `${index + 1}. "${project}"\n`;
      });
      context += `\n`;
    }

    // Work Experience
    if (analysis.workExperience && analysis.workExperience.length > 0) {
      context += `WORK EXPERIENCE:\n`;
      analysis.workExperience.slice(0, 4).forEach((exp, index) => {
        context += `${index + 1}. ${exp}\n`;
      });
      context += `\n`;
    }

    // Achievements
    if (analysis.achievements && analysis.achievements.length > 0) {
      context += `KEY ACHIEVEMENTS:\n`;
      analysis.achievements.slice(0, 3).forEach((achievement, index) => {
        context += `${index + 1}. ${achievement}\n`;
      });
      context += `\n`;
    }

    // Technologies
    if (analysis.technologies && analysis.technologies.length > 0) {
      context += `TECHNOLOGIES USED: ${analysis.technologies.slice(0, 12).join(', ')}\n\n`;
    }

    // Certifications
    if (analysis.certifications && analysis.certifications.length > 0) {
      context += `CERTIFICATIONS: ${analysis.certifications.join(', ')}\n\n`;
    }

    // Education
    if (analysis.education && analysis.education.length > 0) {
      context += `EDUCATION: ${analysis.education.join(', ')}\n\n`;
    }

    // Add a sample from the extracted text for more context
    if (analysis.extractedText && analysis.extractedText.length > 100) {
      const textSample = analysis.extractedText.substring(0, 800);
      context += `RESUME EXCERPT:\n"${textSample}${analysis.extractedText.length > 800 ? '...' : ''}"\n\n`;
    }

    return context;
  }

  private determineQuestionFocus(
    progress: number,
    questionNumber: number,
    analysis: ResumeAnalysis,
    coveredProjects: string[],
    coveredSkills: string[],
    previousQuestions: AIQuestion[]
  ) {
    console.log(`=== QUESTION FOCUS DEBUG ===`);
    console.log(`Question Number: ${questionNumber + 1}`);
    console.log(`Interview Stage Distribution:`);
    console.log(`- Question 1: Introduction`);
    console.log(`- Questions 2-4: Technical Skills`);
    console.log(`- Questions 5-7: Projects`);
    console.log(`- Questions 8-10: Achievements & Experience`);
    console.log(`- Additional: Mixed categories`);
    
    // Progressive interview structure matching new prompt system
    if (questionNumber === 0) {
      console.log(`→ Selected: Introduction`);
      return {
        category: 'introduction',
        difficulty: 'easy',
        focusArea: `background in ${analysis.domain}`,
        instruction: 'Start with a warm introduction question',
        requirement: 'Ask them to introduce themselves and their background'
      };
    }
    
    if (questionNumber >= 1 && questionNumber <= 3) {
      console.log(`→ Selected: Technical Skills (Questions 2-4)`);
      const skillIndex = questionNumber - 1;
      const targetSkill = analysis.skills[skillIndex] || analysis.skills[0];
      return {
        category: 'technical',
        focusArea: `specifically ${targetSkill}`,
        difficulty: questionNumber === 1 ? 'easy' : 'medium',
        instruction: 'Ask about their technical skills and experience',
        requirement: `Focus on their experience with ${targetSkill}`
      };
    }
    
    if (questionNumber >= 4 && questionNumber <= 6) {
      console.log(`→ Selected: Projects (Questions 5-7)`);
      const projectIndex = questionNumber - 4;
      const targetProject = analysis.projects[projectIndex] || analysis.projects[0];
      return {
        category: 'project-specific',
        focusArea: `for ${targetProject}`,
        difficulty: 'medium',
        instruction: 'Ask about a specific project they worked on',
        requirement: `Ask about their "${targetProject}" project`
      };
    }
    
    if (questionNumber >= 7 && questionNumber <= 9) {
      console.log(`→ Selected: Achievements & Experience (Questions 8-10)`);
      const behavioralTopics = ['achievements', 'teamwork', 'communication', 'problem-solving'];
      const topicIndex = (questionNumber - 7) % behavioralTopics.length;
      const topic = behavioralTopics[topicIndex];
      return {
        category: 'behavioral',
        focusArea: topic,
        difficulty: 'medium',
        instruction: `Ask about ${topic} and professional experience`,
        requirement: `Focus on their ${topic} and professional growth`
      };
    }
    
    // Mixed questions for extended interviews
    const categories = ['technical', 'behavioral', 'problem-solving', 'learning-growth'];
    const categoryIndex = questionNumber % categories.length;
    const selectedCategory = categories[categoryIndex];
    
    console.log(`→ Additional question: ${selectedCategory}`);
    
    switch (selectedCategory) {
      case 'technical':
        const skillIndex = questionNumber % analysis.skills.length;
        return {
          category: 'technical',
          focusArea: `specifically ${analysis.skills[skillIndex]}`,
          difficulty: 'medium',
          instruction: 'Ask about advanced technical concepts',
          requirement: `Focus on advanced aspects of ${analysis.skills[skillIndex]}`
        };
      case 'behavioral':
        const behavioralAreas = ['Teamwork', 'Communication', 'Leadership', 'Problem-solving'];
        const areaIndex = questionNumber % behavioralAreas.length;
        return {
          category: 'behavioral',
          focusArea: behavioralAreas[areaIndex],
          difficulty: 'medium',
          instruction: 'Ask about behavioral and interpersonal skills',
          requirement: `Focus on ${behavioralAreas[areaIndex]} skills`
        };
      case 'problem-solving':
        return {
          category: 'problem-solving',
          focusArea: 'technical challenges',
          difficulty: 'medium',
          instruction: 'Ask about technical challenges and problem-solving',
          requirement: 'Ask about a technical challenge they solved'
        };
      case 'learning-growth':
        return {
          category: 'learning-growth',
          focusArea: 'continuous learning',
          difficulty: 'medium',
          instruction: 'Ask about continuous learning and growth',
          requirement: 'Ask about how they stay current with technology trends'
        };
      default:
        return {
          category: 'general',
          focusArea: 'overall experience',
          difficulty: 'medium',
          instruction: 'Ask a general technical question',
          requirement: 'Ask about their overall technical approach and methodology'
        };
    }
  }

  async processResponse(sessionId: string, userResponse: string): Promise<{
    nextQuestion: AIQuestion | null;
    isComplete: boolean;
    shouldContinue: boolean;
    isFollowUp: boolean;
  }> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    // Save response and conversation history
    session.responses.push(userResponse);
    
    if (session.currentQuestionIndex < session.questions.length) {
      session.conversationHistory.push({
        question: session.questions[session.currentQuestionIndex].text,
        response: userResponse,
        timestamp: new Date()
      });
    }
    
    session.currentQuestionIndex++;

    console.log(`=== INTERVIEW PROGRESS DEBUG ===`);
    console.log(`Current Question Index (after increment): ${session.currentQuestionIndex}`);
    console.log(`Total Question Count: ${session.totalQuestionCount}`);
    console.log(`Questions Generated So Far: ${session.questions.length}`);
    console.log(`Responses Collected: ${session.responses.length}`);
    console.log(`Questions Actually Answered: ${session.responses.length}`);
    console.log(`Should Continue? Questions answered (${session.responses.length}) < Total planned (${session.totalQuestionCount})`);
    console.log(`Is Complete Check: ${session.currentQuestionIndex} >= ${session.totalQuestionCount} = ${session.currentQuestionIndex >= session.totalQuestionCount}`);
    console.log(`=== END PROGRESS DEBUG ===`);

    // Check if interview is complete - use responses length and ensure minimum questions
    const minimumQuestions = 8; // Ensure at least 8 questions for a comprehensive interview
    const shouldComplete = session.responses.length >= session.totalQuestionCount && session.responses.length >= minimumQuestions;
    
    if (shouldComplete) {
      console.log(`🏁 INTERVIEW COMPLETED: ${session.responses.length}/${session.totalQuestionCount} questions answered (minimum ${minimumQuestions})`);
      session.isComplete = true;
      return { 
        nextQuestion: null, 
        isComplete: true, 
        shouldContinue: false, 
        isFollowUp: false 
      };
    }

    // Generate the next question dynamically with retry logic
    try {
      const nextQuestionNumber = session.responses.length; // Use responses length for question numbering
      console.log(`Generating question ${nextQuestionNumber + 1}/${session.totalQuestionCount}...`);
      
      let nextQuestion: AIQuestion;
      let retryCount = 0;
      const maxRetries = 2;
      
      while (retryCount <= maxRetries) {
        try {
          nextQuestion = await this.generateNextQuestion(
            session.resumeAnalysis!,
            session.questions,
            nextQuestionNumber, // Use response-based numbering
            session.totalQuestionCount
          );
          break; // Success, exit retry loop
        } catch (error) {
          retryCount++;
          console.warn(`Question generation attempt ${retryCount} failed:`, error);
          
          if (retryCount > maxRetries) {
            throw error; // Re-throw after all retries exhausted
          }
          
          // Brief delay before retry
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      session.questions.push(nextQuestion!);
      
      return { 
        nextQuestion: nextQuestion!, 
        isComplete: false, 
        shouldContinue: true, 
        isFollowUp: false 
      };
    } catch (error) {
      console.error('Failed to generate next question after retries:', error);
      
      // If we can't generate a question, end the interview gracefully
      session.isComplete = true;
      return { 
        nextQuestion: null, 
        isComplete: true, 
        shouldContinue: false, 
        isFollowUp: false 
      };
    }
  }

  private async queryOllamaWithTimeout(prompt: string, timeoutMs: number): Promise<string> {
    try {
      const response = await axios.post(`${this.ollamaUrl}/api/generate`, {
        model: this.modelName,
        prompt,
        stream: false,
        options: { 
          temperature: 0.7, // Slightly reduced for more focused responses
          num_predict: 300, // Increased to allow complete JSON responses
          top_p: 0.85, // Slightly more focused
          repeat_penalty: 1.2, // Higher to avoid repetition
          stop: ['"}\n', '"}]', 'Question:', 'QUESTION:'] // Better stop tokens for JSON
        }
      }, { 
        timeout: timeoutMs
      });

      if (!response.data?.response) {
        throw new Error('Invalid Ollama response');
      }
      
      return response.data.response.trim();
    } catch (error: any) {
      if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        throw new Error(`Request timed out after ${timeoutMs}ms`);
      }
      
      throw error;
    }
  }

  private parseQuestions(response: string): AIQuestion[] {
    try {
      let jsonText = response.trim();
      
      console.log('=== PARSING AI RESPONSE ===');
      console.log('Raw response length:', response.length);
      console.log('First 200 chars:', response.substring(0, 200));
      
      // Remove markdown code blocks if present
      if (jsonText.includes('```json') || jsonText.includes('```')) {
        console.log('Removing markdown code blocks...');
        jsonText = jsonText
          .replace(/```json\s*/gi, '')
          .replace(/```\s*/g, '')
          .trim();
        console.log('After removing markdown:', jsonText.substring(0, 100));
      }
      
      // Handle single question JSON (not array)
      if (jsonText.startsWith('{') && jsonText.includes('"text"')) {
        console.log('Converting single object to array...');
        jsonText = `[${jsonText}]`;
      }
      
      // Extract JSON from text that might have extra content
      let jsonMatch = jsonText.match(/\[[\s\S]*\]/) || jsonText.match(/\{[\s\S]*?\}/);
      if (jsonMatch) {
        jsonText = jsonMatch[0];
        console.log('Extracted JSON match:', jsonText.substring(0, 100));
        
        // If it's a single object, wrap in array
        if (jsonText.startsWith('{')) {
          jsonText = `[${jsonText}]`;
        }
      } else {
        // Try to extract just the JSON part if it's mixed with other text
        const jsonStart = jsonText.indexOf('{');
        const jsonEnd = jsonText.lastIndexOf('}');
        
        if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
          const extractedJson = jsonText.substring(jsonStart, jsonEnd + 1);
          console.log('Manually extracted JSON:', extractedJson.substring(0, 100));
          jsonText = `[${extractedJson}]`;
        } else {
          throw new Error('No valid JSON structure found in response');
        }
      }
      
      // Clean up JSON - handle common formatting issues
      jsonText = jsonText
        .replace(/,(\s*[}\]])/g, '$1') // Remove trailing commas
        .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Remove control characters
        .replace(/([{,]\s*)(\w+):/g, '$1"$2":') // Quote unquoted keys
        .replace(/:\s*'([^']*)'/g, ': "$1"') // Convert single quotes to double
        .replace(/\n/g, ' ') // Replace newlines with spaces
        .replace(/\r/g, '') // Remove carriage returns
        .trim();
      
      console.log('Final JSON to parse:', jsonText.substring(0, 200));
      
      const parsed = JSON.parse(jsonText);
      const questionArray = Array.isArray(parsed) ? parsed : [parsed];
      
      console.log('Successfully parsed questions:', questionArray.length);
      
      const validQuestions = questionArray
        .filter(q => {
          const isValid = q && q.text && typeof q.text === 'string' && q.text.length > 10;
          if (!isValid) {
            console.log('Filtering out invalid question:', q);
          }
          return isValid;
        })
        .map((q: any, index: number) => ({
          id: `ai-${Date.now()}-${index}`,
          text: q.text.trim().replace(/^["']|["']$/g, ''),
          category: q.category || 'general',
          difficulty: (['easy', 'medium', 'hard'].includes(q.difficulty)) ? q.difficulty : 'medium'
        }));
      
      console.log('=== END PARSING ===');
      return validQuestions;
      
    } catch (error: any) {
      console.error('Failed to parse AI response:', error.message);
      console.log('Raw response (first 300 chars):', response.substring(0, 300));
      console.log('Attempted to parse as JSON:', response.substring(0, 200));
      return [];
    }
  }

  async testOllamaConnection(prompt: string): Promise<string> {
    return this.queryOllamaWithTimeout(prompt, 10000);
  }

  getSession(sessionId: string): InterviewSession | undefined {
    return this.sessions.get(sessionId);
  }

  completeSession(sessionId: string): void {
    this.sessions.delete(sessionId);
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await axios.get(`${this.ollamaUrl}/api/tags`, { timeout: 3000 });
      return response.status === 200;
    } catch {
      return false;
    }
  }

  private createResumeSummary(analysis: ResumeAnalysis): string {
    let summary = `CANDIDATE PROFILE:\n`;
    summary += `Experience Level: ${analysis.experience}\n`;
    summary += `Domain: ${analysis.domain}\n`;
    summary += `Core Skills: ${analysis.skills.slice(0, 8).join(', ')}\n\n`;

    if (analysis.projects && analysis.projects.length > 0) {
      summary += `PROJECTS:\n`;
      analysis.projects.slice(0, 5).forEach((project, index) => {
        summary += `${index + 1}. ${project}\n`;
      });
      summary += `\n`;
    }

    if (analysis.workExperience && analysis.workExperience.length > 0) {
      summary += `WORK EXPERIENCE:\n`;
      analysis.workExperience.slice(0, 4).forEach((exp, index) => {
        summary += `${index + 1}. ${exp}\n`;
      });
      summary += `\n`;
    }

    if (analysis.achievements && analysis.achievements.length > 0) {
      summary += `KEY ACHIEVEMENTS:\n`;
      analysis.achievements.slice(0, 3).forEach((achievement, index) => {
        summary += `${index + 1}. ${achievement}\n`;
      });
      summary += `\n`;
    }

    if (analysis.technologies && analysis.technologies.length > 0) {
      summary += `TECHNOLOGIES: ${analysis.technologies.slice(0, 10).join(', ')}\n`;
    }

    if (analysis.certifications && analysis.certifications.length > 0) {
      summary += `CERTIFICATIONS: ${analysis.certifications.join(', ')}\n`;
    }

    return summary;
  }
}