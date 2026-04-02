import axios from 'axios';

export interface LLMCategorizedResume {
  projects: Array<{
    name: string;
    description: string;
    technologies: string[];
    role: string;
  }>;
  workExperience: Array<{
    company: string;
    position: string;
    duration: string;
    responsibilities: string[];
  }>;
  achievements: string[];
  skills: {
    technical: string[];
    soft: string[];
    tools: string[];
  };
  education: Array<{
    degree: string;
    institution: string;
    year: string;
  }>;
  certifications: string[];
}

export class LLMResumeAnalyzer {
  private ollamaUrl: string;
  private modelName: string;

  constructor() {
    this.ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
    this.modelName = process.env.OLLAMA_MODEL || 'gemma3';
  }

  /**
   * Categorize resume sections using LLM
   */
  async categorizeResume(extractedText: string): Promise<LLMCategorizedResume> {
    try {
      console.log('🤖 Starting LLM-based resume categorization...');
      console.log(`📄 Text length: ${extractedText.length} characters`);
      
      const prompt = this.createCategorizationPrompt(extractedText);
      const response = await this.queryOllama(prompt);
      const categorized = this.parseCategorizationResponse(response);
      
      console.log('✅ LLM categorization complete:');
      console.log(`   - Projects: ${categorized.projects.length}`);
      console.log(`   - Work Experience: ${categorized.workExperience.length}`);
      console.log(`   - Achievements: ${categorized.achievements.length}`);
      console.log(`   - Technical Skills: ${categorized.skills.technical.length}`);
      
      return categorized;
    } catch (error) {
      console.error('❌ LLM categorization failed:', error);
      // Return empty structure if LLM fails
      return {
        projects: [],
        workExperience: [],
        achievements: [],
        skills: { technical: [], soft: [], tools: [] },
        education: [],
        certifications: []
      };
    }
  }

  private createCategorizationPrompt(resumeText: string): string {
    // Limit text to avoid token limits (keep first 4000 chars)
    const limitedText = resumeText.substring(0, 4000);
    
    return `You are an expert resume analyzer. Analyze the following resume text and categorize it into structured sections.

RESUME TEXT:
${limitedText}

Your task is to extract and categorize information into these sections:

1. PROJECTS: Actual projects the candidate worked on (not achievements or job descriptions)
2. WORK EXPERIENCE: Job positions, companies, and responsibilities
3. ACHIEVEMENTS: Awards, accomplishments, or notable results (NOT projects)
4. SKILLS: Technical skills, soft skills, and tools
5. EDUCATION: Degrees and institutions
6. CERTIFICATIONS: Professional certifications

IMPORTANT RULES:
- If something describes a software system, application, or development work → it's a PROJECT
- If something describes a job role or position → it's WORK EXPERIENCE
- If something describes an award, recognition, or quantifiable result → it's an ACHIEVEMENT
- Do NOT put the same item in multiple categories
- Extract actual names of projects, companies, and technologies
- For projects, identify the technologies used

Generate a JSON response with this exact format:
{
  "projects": [
    {
      "name": "Project name",
      "description": "Brief description",
      "technologies": ["tech1", "tech2"],
      "role": "Developer/Lead/etc"
    }
  ],
  "workExperience": [
    {
      "company": "Company name",
      "position": "Job title",
      "duration": "Time period",
      "responsibilities": ["resp1", "resp2"]
    }
  ],
  "achievements": [
    "Achievement description"
  ],
  "skills": {
    "technical": ["JavaScript", "Python", "React"],
    "soft": ["Leadership", "Communication"],
    "tools": ["Git", "Docker", "AWS"]
  },
  "education": [
    {
      "degree": "Degree name",
      "institution": "University name",
      "year": "Year"
    }
  ],
  "certifications": [
    "Certification name"
  ]
}

Analyze carefully and categorize correctly. Return ONLY the JSON, no additional text.`;
  }

  private parseCategorizationResponse(response: string): LLMCategorizedResume {
    try {
      // Extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        
        // Validate and return with defaults
        return {
          projects: Array.isArray(parsed.projects) ? parsed.projects : [],
          workExperience: Array.isArray(parsed.workExperience) ? parsed.workExperience : [],
          achievements: Array.isArray(parsed.achievements) ? parsed.achievements : [],
          skills: {
            technical: Array.isArray(parsed.skills?.technical) ? parsed.skills.technical : [],
            soft: Array.isArray(parsed.skills?.soft) ? parsed.skills.soft : [],
            tools: Array.isArray(parsed.skills?.tools) ? parsed.skills.tools : []
          },
          education: Array.isArray(parsed.education) ? parsed.education : [],
          certifications: Array.isArray(parsed.certifications) ? parsed.certifications : []
        };
      }
      
      throw new Error('No valid JSON found in response');
    } catch (error) {
      console.error('Failed to parse LLM categorization response:', error);
      console.log('Raw response:', response.substring(0, 500));
      
      // Return empty structure
      return {
        projects: [],
        workExperience: [],
        achievements: [],
        skills: { technical: [], soft: [], tools: [] },
        education: [],
        certifications: []
      };
    }
  }

  private async queryOllama(prompt: string): Promise<string> {
    try {
      const response = await axios.post(
        `${this.ollamaUrl}/api/generate`,
        {
          model: this.modelName,
          prompt: prompt,
          stream: false,
          options: {
            temperature: 0.3, // Lower temperature for more consistent categorization
            num_predict: 1000, // Allow longer response for detailed categorization
            num_ctx: 4096
          }
        },
        { timeout: 60000 } // Longer timeout for complex categorization
      );

      return response.data.response || '';
    } catch (error: any) {
      console.error('Ollama query failed:', error.message);
      throw error;
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await axios.get(`${this.ollamaUrl}/api/tags`, { timeout: 5000 });
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }
}
