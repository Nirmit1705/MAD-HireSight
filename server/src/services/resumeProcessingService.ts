import { createWorker } from 'tesseract.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import pdfParse from 'pdf-parse';
import pdf2pic from 'pdf2pic';
import AdmZip from 'adm-zip';
import { LLMResumeAnalyzer, LLMCategorizedResume } from './llmResumeAnalyzer';

export interface ProjectDetail {
  name: string;
  technologies: string[];
  description?: string;
}

export interface ResumeAnalysis {
  extractedText: string;
  keywords: string[];
  skills: string[];
  experience: string;
  domain: string;
  education: string[];
  certifications: string[];
  projects: string[];
  projectDetails: ProjectDetail[];  // New field for project-technology mapping
  workExperience: string[];
  achievements: string[];
  technologies: string[];
}

export class ResumeProcessingService {
  private worker: any = null;
  private llmAnalyzer: LLMResumeAnalyzer;

  constructor() {
    this.initializeOCR();
    this.llmAnalyzer = new LLMResumeAnalyzer();
  }

  private async initializeOCR() {
    try {
      this.worker = await createWorker('eng');
    } catch (error) {
      console.error('Failed to initialize OCR worker:', error);
    }
  }

  /**
   * Extract text from resume using hybrid approach
   */
  async extractTextFromResume(filePath: string, mimeType?: string): Promise<string> {
    try {
      console.log(`Processing file: ${filePath}, MIME type: ${mimeType}`);

      // Determine file type from extension if mimeType not provided
      const fileExtension = path.extname(filePath).toLowerCase();
      
      if (mimeType === 'application/pdf' || fileExtension === '.pdf') {
        return await this.extractFromPDF(filePath);
      } else if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || fileExtension === '.docx') {
        return await this.extractFromDocx(filePath);
      } else if (mimeType === 'application/msword' || fileExtension === '.doc') {
        // For older .doc files, fall back to OCR
        return await this.extractWithOCR(filePath);
      } else if (mimeType?.startsWith('image/') || ['.jpg', '.jpeg', '.png', '.gif', '.bmp'].includes(fileExtension)) {
        return await this.extractWithOCR(filePath);
      } else {
        throw new Error(`Unsupported file type: ${mimeType || fileExtension}`);
      }
    } catch (error) {
      console.error('Error extracting text from resume:', error);
      throw new Error(`Failed to extract text from resume: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Extract text from PDF using hybrid approach
   */
  private async extractFromPDF(filePath: string): Promise<string> {
    try {
      // First, try pdf-parse for text extraction
      console.log('Attempting PDF text extraction with pdf-parse...');
      const dataBuffer = fs.readFileSync(filePath);
      const pdfData = await pdfParse(dataBuffer);
      
      if (pdfData.text && pdfData.text.trim().length > 50) {
        console.log('Successfully extracted text from PDF using pdf-parse');
        return pdfData.text;
      }
      
      console.log('PDF text extraction yielded minimal text, falling back to OCR...');
      
      // If text extraction failed or yielded minimal text, convert to images and use OCR
      return await this.convertPDFToImagesAndOCR(filePath);
    } catch (error) {
      console.log('PDF text extraction failed, falling back to OCR...', error);
      return await this.convertPDFToImagesAndOCR(filePath);
    }
  }

  /**
   * Extract text from DOCX files
   */
  private async extractFromDocx(filePath: string): Promise<string> {
    try {
      console.log('Extracting text from DOCX file...');
      
      // For now, use a simple text extraction approach
      // This is a basic implementation using AdmZip to read the XML content
      const buffer = fs.readFileSync(filePath);
      const zip = new AdmZip(buffer);
      const documentXml = zip.readAsText('word/document.xml');
      
      // Basic XML text extraction
      const textContent = documentXml
        .replace(/<[^>]*>/g, ' ') // Remove XML tags
        .replace(/\s+/g, ' ') // Normalize whitespace
        .trim();
      
      if (textContent && textContent.length > 20) {
        console.log('Successfully extracted text from DOCX');
        return textContent;
      } else {
        throw new Error('No meaningful text extracted from DOCX');
      }
    } catch (error) {
      console.error('DOCX extraction failed:', error);
      throw new Error(`Failed to extract text from DOCX: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Convert PDF pages to images and run OCR
   */
  private async convertPDFToImagesAndOCR(filePath: string): Promise<string> {
    try {
      console.log('Converting PDF pages to images for OCR...');
      
      const convert = pdf2pic.fromPath(filePath, {
        density: 300,           // High quality
        saveFilename: "page",
        savePath: path.dirname(filePath),
        format: "png",
        width: 2000,
        height: 2000
      });

      // Convert all pages (max 5 pages to avoid excessive processing)
      const results = await convert.bulk(5);
      
      let allText = '';
      
      // Run OCR on each page
      for (const result of results) {
        try {
          if (result.path) {
            const pageText = await this.extractWithOCR(result.path);
            allText += pageText + '\n';
          }
        } catch (pageError) {
          console.warn(`Failed to process page ${result.page}:`, pageError);
        }
        
        // Clean up the temporary image file
        try {
          if (result.path) {
            fs.unlinkSync(result.path);
          }
        } catch (cleanupError) {
          console.warn('Failed to cleanup temporary image:', cleanupError);
        }
      }
      
      if (!allText.trim()) {
        throw new Error('No text could be extracted from PDF pages');
      }
      
      console.log('Successfully extracted text from PDF using OCR');
      return allText.trim();
    } catch (error) {
      console.error('PDF to images OCR failed:', error);
      throw new Error(`Failed to convert PDF to images for OCR: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Extract text using OCR (for images and fallback cases)
   */
  private async extractWithOCR(filePath: string): Promise<string> {
    try {
      if (!this.worker) {
        await this.initializeOCR();
      }

      const { data: { text } } = await this.worker.recognize(filePath);
      return text;
    } catch (error) {
      console.error('OCR processing error:', error);
      throw new Error('Failed to extract text using OCR');
    }
  }

  /**
   * Analyze resume text and extract relevant information with LLM enhancement
   */
  async analyzeResumeText(text: string): Promise<ResumeAnalysis> {
    const cleanText = text.toLowerCase();
    
    // Debug: Log the extracted text for verification
    console.log('=== EXTRACTED RESUME TEXT ===');
    console.log('Full text length:', text.length, 'characters');
    console.log('First 1000 characters:');
    console.log(text.substring(0, 1000));
    if (text.length > 1000) {
      console.log('...\nLast 500 characters:');
      console.log(text.substring(text.length - 500));
    }
    console.log('=== END EXTRACTED TEXT ===');
    
    // First, use traditional parsing for initial extraction
    const experience = this.extractExperience(cleanText);
    const domain = this.determineDomain([], []); // Will be updated after LLM analysis
    
    // Use LLM to categorize resume sections correctly
    console.log('🤖 Starting LLM-enhanced categorization...');
    let llmCategorized: LLMCategorizedResume | null = null;
    try {
      llmCategorized = await this.llmAnalyzer.categorizeResume(text);
    } catch (error) {
      console.log('⚠️ LLM categorization failed, falling back to traditional parsing');
    }
    
    // Extract skills from both traditional and LLM methods
    const traditionalSkills = this.extractSkills(cleanText);
    const llmSkills = llmCategorized ? [
      ...llmCategorized.skills.technical,
      ...llmCategorized.skills.tools
    ] : [];
    
    // Merge and deduplicate skills
    const allSkills = Array.from(new Set([...traditionalSkills, ...llmSkills]));
    const keywords = this.extractKeywords(cleanText, allSkills);
    
    // Use LLM-categorized data if available, otherwise fall back to traditional
    const projects = llmCategorized && llmCategorized.projects.length > 0
      ? llmCategorized.projects.map(p => p.name)
      : this.extractProjects(text);
      
    const workExperience = llmCategorized && llmCategorized.workExperience.length > 0
      ? llmCategorized.workExperience.map(w => `${w.position} at ${w.company}`)
      : this.extractWorkExperience(text);
      
    const achievements = llmCategorized && llmCategorized.achievements.length > 0
      ? llmCategorized.achievements
      : this.extractAchievements(text);
      
    const education = llmCategorized && llmCategorized.education.length > 0
      ? llmCategorized.education.map(e => `${e.degree} from ${e.institution}`)
      : this.extractEducation(cleanText);
      
    const certifications = llmCategorized && llmCategorized.certifications.length > 0
      ? llmCategorized.certifications
      : this.extractCertifications(cleanText);
    
    // Extract detailed project information
    const projectDetails: ProjectDetail[] = llmCategorized && llmCategorized.projects.length > 0
      ? llmCategorized.projects.map(p => ({
          name: p.name,
          technologies: p.technologies,
          description: p.description
        }))
      : this.extractProjectDetails(text);
    
    // Extract technologies
    const technologies = llmCategorized && llmCategorized.skills.tools.length > 0
      ? llmCategorized.skills.tools
      : this.extractTechnologies(cleanText);
    
    // Determine domain based on skills
    const finalDomain = this.determineDomain(allSkills, keywords);

    // Debug: Log categorization results
    console.log('=== LLM-ENHANCED ANALYSIS RESULTS ===');
    console.log(`- LLM Used: ${llmCategorized ? 'Yes' : 'No (fallback to traditional)'}`);
    console.log(`- Skills Count: ${allSkills.length} (Traditional: ${traditionalSkills.length}, LLM: ${llmSkills.length})`);
    console.log(`- Projects Count: ${projects.length}`);
    console.log(`- Work Experience Count: ${workExperience.length}`);
    console.log(`- Achievements Count: ${achievements.length}`);
    console.log(`- Experience Level: ${experience}`);
    console.log(`- Domain: ${finalDomain}`);
    console.log('=== END ANALYSIS ===');

    return {
      extractedText: text,
      keywords,
      skills: allSkills,
      experience,
      domain: finalDomain,
      education,
      certifications,
      projects,
      projectDetails,
      workExperience,
      achievements,
      technologies
    };
  }

  private extractExperience(text: string): string {
    // Look for explicit experience patterns with years
    const yearPatterns = [
      /(\d+)\s*\+?\s*(years?|yrs?)\s*(of\s*)?(experience|exp)/gi,
      /(\d+)\s*\+?\s*(years?|yrs?)\s*(in|with|of)/gi,
      /experience[:\s]*(\d+)\s*\+?\s*(years?|yrs?)/gi
    ];

    let experienceYears = 0;
    
    // Extract years of experience
    for (const pattern of yearPatterns) {
      const matches = text.match(pattern);
      if (matches) {
        for (const match of matches) {
          const yearMatch = match.match(/(\d+)/);
          if (yearMatch) {
            const years = parseInt(yearMatch[1]);
            experienceYears = Math.max(experienceYears, years);
          }
        }
      }
    }

    // Look for job title patterns that indicate seniority
    const seniorTitlePatterns = [
      /\b(senior|sr\.?)\s+(developer|engineer|analyst|consultant)/gi,
      /\b(lead|principal|staff|chief)\s+(developer|engineer|architect)/gi,
      /\b(team\s+lead|tech\s+lead|technical\s+lead)/gi
    ];

    const juniorTitlePatterns = [
      /\b(junior|jr\.?)\s+(developer|engineer|analyst)/gi,
      /\b(intern|trainee|associate)\s+(developer|engineer)/gi,
      /\bintern\b/gi
    ];

    let hasSeniorTitle = false;
    let hasJuniorTitle = false;

    for (const pattern of seniorTitlePatterns) {
      if (pattern.test(text)) {
        hasSeniorTitle = true;
        break;
      }
    }

    for (const pattern of juniorTitlePatterns) {
      if (pattern.test(text)) {
        hasJuniorTitle = true;
        break;
      }
    }

    // Determine experience level
    if (hasJuniorTitle || experienceYears <= 1) {
      return 'entry-level';
    } else if (hasSeniorTitle || experienceYears >= 5) {
      return 'senior';
    } else if (experienceYears >= 2) {
      return 'mid-level';
    }

    // Default to entry-level if no clear indicators
    return 'entry-level';
  }

  private extractSkills(text: string): string[] {
    const technicalSkills = [
      // Programming Languages
      'javascript', 'typescript', 'python', 'java', 'c++', 'c#', 'go', 'rust', 'php', 'ruby', 'swift', 'kotlin',
      
      // Frameworks & Libraries
      'react', 'angular', 'vue', 'nodejs', 'express', 'django', 'flask', 'spring', 'laravel', 'rails',
      'nextjs', 'nuxt', 'gatsby', 'svelte', 'ember',
      
      // Databases
      'mysql', 'postgresql', 'mongodb', 'redis', 'sqlite', 'oracle', 'cassandra', 'elasticsearch',
      
      // Cloud & DevOps
      'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'jenkins', 'gitlab', 'github actions', 'terraform',
      'ansible', 'vagrant', 'helm',
      
      // Data Science & ML
      'pandas', 'numpy', 'scikit-learn', 'tensorflow', 'pytorch', 'keras', 'jupyter', 'r',
      'tableau', 'power bi', 'spark', 'hadoop',
      
      // Mobile Development
      'react native', 'flutter', 'ionic', 'xamarin',
      
      // Other Technologies
      'git', 'linux', 'nginx', 'apache', 'graphql', 'rest api', 'microservices', 'agile', 'scrum',
      'jira', 'confluence', 'slack', 'figma', 'sketch', 'adobe',
      
      // Testing
      'jest', 'cypress', 'selenium', 'junit', 'pytest', 'mocha', 'chai',
      
      // Additional common skills
      'html', 'css', 'sass', 'less', 'bootstrap', 'tailwind', 'material ui', 'mui',
      'webpack', 'vite', 'babel', 'eslint', 'prettier', 'postman', 'insomnia',
      'firebase', 'supabase', 'stripe', 'paypal', 'oauth', 'jwt', 'cors',
      'vercel', 'netlify', 'heroku', 'digitalocean'
    ];

    const foundSkills: string[] = [];
    const lines = text.split('\n');
    
    // First, look for skills in project lines with pipe format
    for (const line of lines) {
      if (line.includes('|')) {
        const parts = line.split('|');
        if (parts.length >= 2) {
          // The part after the pipe likely contains technologies
          const techPart = parts.slice(1).join('|'); // Join in case there are multiple pipes
          
          // Split by commas and extract individual skills
          const potentialSkills = techPart.split(/[,;]/).map(s => s.trim().toLowerCase());
          
          for (const skill of potentialSkills) {
            // Check if this matches any of our known skills EXACTLY
            for (const knownSkill of technicalSkills) {
              if (skill === knownSkill.toLowerCase()) {
                if (!foundSkills.includes(knownSkill)) {
                  foundSkills.push(knownSkill);
                  console.log('Found exact skill from project line:', knownSkill);
                }
              }
            }
          }
        }
      }
    }
    
    // Then, look for skills in the general text using EXACT word boundaries
    const lowerText = text.toLowerCase();
    for (const skill of technicalSkills) {
      // Use strict word boundaries and exact matching
      const skillLower = skill.toLowerCase();
      const skillRegex = new RegExp(`\\b${skillLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      
      if (skillRegex.test(text) && !foundSkills.includes(skill)) {
        // Double-check by ensuring the skill appears as a complete word
        const words = lowerText.split(/\s+|[,;|()]/);
        if (words.includes(skillLower) || words.some(word => word === skillLower)) {
          foundSkills.push(skill);
          console.log('Found exact skill in text:', skill);
        }
      }
    }

    // Look for common skill variations and aliases (but still exact matches)
    const skillVariations: { [key: string]: string[] } = {
      'javascript': ['js'],
      'typescript': ['ts'],
      'nodejs': ['node.js', 'node'],
      'react': ['reactjs'],
      'angular': ['angularjs'],
      'vue': ['vuejs'],
      'c++': ['cpp'],
      'c#': ['csharp'],
      'postgresql': ['postgres'],
      'mongodb': ['mongo'],
      'rest api': ['restful api', 'rest'],
      'react native': ['rn']
    };

    // Check for skill variations with exact matching
    for (const [mainSkill, variations] of Object.entries(skillVariations)) {
      if (!foundSkills.includes(mainSkill)) {
        for (const variation of variations) {
          const variationRegex = new RegExp(`\\b${variation.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
          if (variationRegex.test(text)) {
            // Double-check exact match
            const words = lowerText.split(/\s+|[,;|()]/);
            if (words.includes(variation.toLowerCase())) {
              foundSkills.push(mainSkill);
              console.log('Found skill via exact variation:', mainSkill, 'from', variation);
              break;
            }
          }
        }
      }
    }

    // Look for skills in dedicated skills sections with exact matching
    const skillsSectionLines = this.extractFromSkillsSection(text);
    for (const skillLine of skillsSectionLines) {
      const skillLineLower = skillLine.toLowerCase();
      const skillWords = skillLineLower.split(/\s+|[,;|()]/);
      
      for (const skill of technicalSkills) {
        const skillLower = skill.toLowerCase();
        if (skillWords.includes(skillLower) && !foundSkills.includes(skill)) {
          foundSkills.push(skill);
          console.log('Found exact skill from skills section:', skill);
        }
      }
    }

    console.log('=== FINAL EXTRACTED SKILLS ===');
    console.log(foundSkills);
    console.log('=== END SKILL EXTRACTION ===');

    return foundSkills;
  }

  /**
   * Extract content specifically from skills sections
   */
  private extractFromSkillsSection(text: string): string[] {
    const lines = text.split('\n');
    const skillsLines: string[] = [];
    
    const skillsSectionIndicators = [
      /^\s*(technical\s+)?skills?\s*:?\s*$/i,
      /^\s*technologies?\s*:?\s*$/i,
      /^\s*programming\s+(languages?|skills?)\s*:?\s*$/i,
      /^\s*tech\s+stack\s*:?\s*$/i,
      /^\s*core\s+competencies\s*:?\s*$/i
    ];
    
    const sectionEndings = [
      /^\s*(work\s+)?experience\s*:?\s*$/i,
      /^\s*education\s*:?\s*$/i,
      /^\s*projects?\s*:?\s*$/i,
      /^\s*certifications?\s*:?\s*$/i,
      /^\s*achievements?\s*:?\s*$/i,
      /^\s*awards?\s*:?\s*$/i
    ];
    
    let inSkillsSection = false;
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      if (!trimmedLine) continue;
      
      if (skillsSectionIndicators.some(pattern => pattern.test(trimmedLine))) {
        inSkillsSection = true;
        console.log('=== ENTERING SKILLS SECTION ===');
        continue;
      }
      
      if (inSkillsSection && sectionEndings.some(pattern => pattern.test(trimmedLine))) {
        inSkillsSection = false;
        console.log('=== LEAVING SKILLS SECTION ===');
        continue;
      }
      
      if (inSkillsSection) {
        skillsLines.push(trimmedLine);
        console.log('Skills section line:', trimmedLine);
      }
    }
    
    return skillsLines;
  }

  private extractKeywords(text: string, skills: string[]): string[] {
    const businessKeywords = [
      'management', 'leadership', 'strategy', 'planning', 'analysis', 'optimization',
      'communication', 'collaboration', 'project management', 'team lead', 'architect',
      'design', 'development', 'implementation', 'deployment', 'testing', 'debugging',
      'performance', 'scalability', 'security', 'architecture', 'api', 'database',
      'frontend', 'backend', 'fullstack', 'devops', 'ci/cd', 'automation'
    ];

    const keywords = [...skills];
    
    for (const keyword of businessKeywords) {
      if (text.includes(keyword)) {
        keywords.push(keyword);
      }
    }

    // Remove duplicates and return top keywords
    return [...new Set(keywords)].slice(0, 15);
  }

  private determineDomain(skills: string[], keywords: string[]): string {
    const allTerms = [...skills, ...keywords].join(' ').toLowerCase();
    
    // Domain scoring with more specific criteria
    const domainScores = {
      'software-engineering': 0,
      'data-science': 0,
      'devops': 0,
      'product-management': 0,
      'ui-ux-design': 0,
      'cybersecurity': 0,
      'mobile-development': 0,
      'business-analysis': 0,
      'general': 0
    };

    // Software Engineering - require multiple programming indicators
    const softwareTerms = ['javascript', 'typescript', 'react', 'angular', 'vue', 'nodejs', 'python', 'java', 'c++', 'programming', 'developer', 'software engineer'];
    const softwareCount = softwareTerms.filter(term => allTerms.includes(term)).length;
    if (softwareCount >= 2) {
      domainScores['software-engineering'] = softwareCount * 2;
    }

    // Data Science - require specific DS tools
    const dataTerms = ['pandas', 'numpy', 'tensorflow', 'pytorch', 'machine learning', 'data science', 'analytics', 'jupyter', 'spark', 'tableau'];
    const dataCount = dataTerms.filter(term => allTerms.includes(term)).length;
    if (dataCount >= 2) {
      domainScores['data-science'] = dataCount * 2;
    }

    // DevOps - require multiple infrastructure tools
    const devopsTerms = ['docker', 'kubernetes', 'aws', 'azure', 'gcp', 'jenkins', 'terraform', 'ansible', 'ci/cd', 'devops engineer'];
    const devopsCount = devopsTerms.filter(term => allTerms.includes(term)).length;
    if (devopsCount >= 2) {
      domainScores['devops'] = devopsCount * 2;
    }

    // Mobile Development
    const mobileTerms = ['react native', 'flutter', 'ios', 'android', 'mobile', 'swift', 'kotlin'];
    const mobileCount = mobileTerms.filter(term => allTerms.includes(term)).length;
    if (mobileCount >= 1) {
      domainScores['mobile-development'] = mobileCount * 2;
    }

    // UI/UX Design
    const designTerms = ['figma', 'sketch', 'adobe', 'ui/ux', 'user interface', 'user experience', 'design'];
    const designCount = designTerms.filter(term => allTerms.includes(term)).length;
    if (designCount >= 2) {
      domainScores['ui-ux-design'] = designCount * 2;
    }

    // Product Management
    const pmTerms = ['product manager', 'product management', 'roadmap', 'stakeholder', 'agile', 'scrum'];
    const pmCount = pmTerms.filter(term => allTerms.includes(term)).length;
    if (pmCount >= 2) {
      domainScores['product-management'] = pmCount * 2;
    }

    // Cybersecurity
    const securityTerms = ['security', 'cybersecurity', 'penetration testing', 'vulnerability', 'cissp', 'ethical hacker'];
    const securityCount = securityTerms.filter(term => allTerms.includes(term)).length;
    if (securityCount >= 2) {
      domainScores['cybersecurity'] = securityCount * 2;
    }

    // Find the domain with the highest score
    const maxScore = Math.max(...Object.values(domainScores));
    
    // If no domain has a significant score, return 'general'
    if (maxScore < 2) {
      return 'general';
    }

    const topDomain = Object.entries(domainScores).find(([domain, score]) => score === maxScore)?.[0] || 'general';
    
    console.log('=== DOMAIN DETECTION DEBUG ===');
    console.log('All terms:', allTerms.substring(0, 200));
    console.log('Domain scores:', domainScores);
    console.log('Selected domain:', topDomain);
    console.log('=== END DOMAIN DEBUG ===');

    return topDomain;
  }

  private extractEducation(text: string): string[] {
    const educationKeywords = [
      'bachelor', 'master', 'phd', 'doctorate', 'mba', 'degree',
      'computer science', 'software engineering', 'information technology',
      'data science', 'artificial intelligence', 'machine learning',
      'business administration', 'engineering', 'mathematics'
    ];

    const education: string[] = [];
    
    for (const keyword of educationKeywords) {
      if (text.includes(keyword)) {
        education.push(keyword);
      }
    }

    return [...new Set(education)];
  }

  private extractCertifications(text: string): string[] {
    const certificationKeywords = [
      'aws certified', 'azure certified', 'google cloud',
      'cissp', 'cism', 'pmp', 'scrum master', 'product owner',
      'oracle certified', 'microsoft certified', 'cisco certified',
      'kubernetes', 'docker certified', 'terraform',
      'certified ethical hacker', 'security+'
    ];

    const certifications: string[] = [];
    
    for (const cert of certificationKeywords) {
      if (text.includes(cert)) {
        certifications.push(cert);
      }
    }

    return [...new Set(certifications)];
  }

  /**
   * Extract project names and descriptions
   */
  private extractProjectDetails(text: string): ProjectDetail[] {
    const projectDetails: ProjectDetail[] = [];
    const lines = text.split('\n');
    
    // Look for project sections
    const projectSectionIndicators = [
      /^\s*projects?\s*:?\s*$/i,
      /^\s*personal\s+projects?\s*:?\s*$/i,
      /^\s*side\s+projects?\s*:?\s*$/i,
      /^\s*notable\s+projects?\s*:?\s*$/i,
      /^\s*key\s+projects?\s*:?\s*$/i,
      /^\s*academic\s+projects?\s*:?\s*$/i
    ];
    
    // Section endings
    const sectionEndings = [
      /^\s*(work\s+)?experience\s*:?\s*$/i,
      /^\s*education\s*:?\s*$/i,
      /^\s*(technical\s+)?skills?\s*:?\s*$/i,
      /^\s*certifications?\s*:?\s*$/i,
      /^\s*achievements?\s*:?\s*$/i
    ];
    
    let inProjectSection = false;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (!line) continue;
      
      // Check if entering project section
      if (projectSectionIndicators.some(pattern => pattern.test(line))) {
        inProjectSection = true;
        console.log('=== EXTRACTING PROJECT DETAILS ===');
        continue;
      }
      
      // Check if leaving project section
      if (inProjectSection && sectionEndings.some(pattern => pattern.test(line))) {
        inProjectSection = false;
        console.log('=== END PROJECT DETAILS EXTRACTION ===');
        continue;
      }
      
      if (inProjectSection && line.length > 3) {
        // Handle "ProjectName | tech1, tech2, tech3" format
        if (line.includes('|')) {
          const parts = line.split('|');
          if (parts.length >= 2) {
            const projectName = parts[0].trim()
              .replace(/^\s*[-•▪▫‣⁃*]\s*/, '')
              .replace(/^\s*\d+\.\s*/, '')
              .replace(/^\s*project\s*:?\s*/i, '')
              .trim();
            
            const techPart = parts.slice(1).join('|').trim();
            const technologies = techPart.split(/[,;]/)
              .map(t => t.trim())
              .filter(t => t.length > 0);
            
            if (projectName && projectName.length > 2 && projectName.length < 80) {
              projectDetails.push({
                name: projectName,
                technologies: technologies,
                description: parts.length > 2 ? parts[2].trim() : undefined
              });
              console.log('Found project with technologies:', projectName, '→', technologies);
            }
          }
        }
        // Handle projects without explicit technology listing
        else if (/^\s*[-•▪▫‣⁃*]\s*/.test(line) || /^\s*\d+\.\s*/.test(line)) {
          let projectName = line
            .replace(/^\s*[-•▪▫‣⁃*]\s*/, '')
            .replace(/^\s*\d+\.\s*/, '')
            .replace(/^\s*project\s*:?\s*/i, '')
            .trim();
          
          if (projectName.includes(':')) {
            projectName = projectName.split(':')[0].trim();
          }
          
          if (projectName && projectName.length > 2 && projectName.length < 80) {
            projectDetails.push({
              name: projectName,
              technologies: [], // No explicit technologies listed
              description: undefined
            });
            console.log('Found project without explicit technologies:', projectName);
          }
        }
      }
    }
    
    console.log(`Extracted ${projectDetails.length} project details`);
    return projectDetails;
  }

  private extractProjects(text: string): string[] {
    const projects: string[] = [];
    const lines = text.split('\n');
    
    // Look for project sections
    const projectSectionIndicators = [
      /^\s*projects?\s*:?\s*$/i,
      /^\s*personal\s+projects?\s*:?\s*$/i,
      /^\s*side\s+projects?\s*:?\s*$/i,
      /^\s*notable\s+projects?\s*:?\s*$/i,
      /^\s*key\s+projects?\s*:?\s*$/i,
      /^\s*academic\s+projects?\s*:?\s*$/i
    ];
    
    // Section endings to stop project parsing
    const sectionEndings = [
      /^\s*(work\s+)?experience\s*:?\s*$/i,
      /^\s*education\s*:?\s*$/i,
      /^\s*(technical\s+)?skills?\s*:?\s*$/i,
      /^\s*certifications?\s*:?\s*$/i,
      /^\s*achievements?\s*:?\s*$/i,
      /^\s*awards?\s*:?\s*$/i,
      /^\s*publications?\s*:?\s*$/i,
      /^\s*languages?\s*:?\s*$/i,
      /^\s*hobbies?\s*:?\s*$/i,
      /^\s*interests?\s*:?\s*$/i,
      /^\s*references?\s*:?\s*$/i
    ];
    
    let inProjectSection = false;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Skip empty lines
      if (!line) continue;
      
      // Check if we're entering a project section
      if (projectSectionIndicators.some(pattern => pattern.test(line))) {
        inProjectSection = true;
        console.log('=== ENTERING PROJECT SECTION ===');
        console.log('Project section line:', line);
        continue;
      }
      
      // Check if we're leaving the project section
      if (inProjectSection && sectionEndings.some(pattern => pattern.test(line))) {
        inProjectSection = false;
        console.log('=== LEAVING PROJECT SECTION ===');
        console.log('New section line:', line);
        continue;
      }
      
      if (inProjectSection && line.length > 3) {
        console.log('Processing project line:', line);
        
        // Handle "ProjectName | tech1, tech2, tech3" format
        if (line.includes('|')) {
          const parts = line.split('|');
          if (parts.length >= 2) {
            const projectName = parts[0].trim();
            if (projectName && projectName.length > 2 && projectName.length < 80) {
              // Remove common prefixes/bullets
              const cleanProjectName = projectName
                .replace(/^\s*[-•▪▫‣⁃*]\s*/, '') // Remove bullet points
                .replace(/^\s*\d+\.\s*/, '') // Remove numbered lists
                .replace(/^\s*project\s*:?\s*/i, '') // Remove "Project:" prefix
                .trim();
              
              if (cleanProjectName && !this.isCommonSkill(cleanProjectName)) {
                projects.push(cleanProjectName);
                console.log('Found project with pipe format:', cleanProjectName);
              }
            }
          }
        }
        // Handle bullet point projects without pipe format
        else if (/^\s*[-•▪▫‣⁃*]\s*/.test(line) || /^\s*\d+\.\s*/.test(line)) {
          let projectName = line
            .replace(/^\s*[-•▪▫‣⁃*]\s*/, '') // Remove bullet points
            .replace(/^\s*\d+\.\s*/, '') // Remove numbered lists
            .replace(/^\s*project\s*:?\s*/i, '') // Remove "Project:" prefix
            .trim();
          
          // Take only the first part if it contains a colon or dash (likely separating name from description)
          if (projectName.includes(':')) {
            projectName = projectName.split(':')[0].trim();
          } else if (projectName.includes(' - ')) {
            projectName = projectName.split(' - ')[0].trim();
          }
          
          if (projectName && projectName.length > 2 && projectName.length < 80 && !this.isCommonSkill(projectName)) {
            projects.push(projectName);
            console.log('Found bullet project:', projectName);
          }
        }
        // Handle projects that start with capital letters (project titles)
        else if (/^[A-Z]/.test(line) && !this.isCommonSkill(line.split(' ')[0])) {
          let projectName = line;
          
          // Take only the first part if it contains separators
          if (projectName.includes(':')) {
            projectName = projectName.split(':')[0].trim();
          } else if (projectName.includes(' - ')) {
            projectName = projectName.split(' - ')[0].trim();
          } else if (projectName.includes('|')) {
            projectName = projectName.split('|')[0].trim();
          }
          
          // Limit to reasonable project name length
          const words = projectName.split(' ');
          if (words.length <= 6) { // Max 6 words for project name
            projectName = words.join(' ');
          } else {
            projectName = words.slice(0, 6).join(' ');
          }
          
          if (projectName && projectName.length > 2 && projectName.length < 80) {
            projects.push(projectName);
            console.log('Found capitalized project:', projectName);
          }
        }
      }
    }
    
    // Look for GitHub/portfolio links that might contain project names
    const githubMatches = text.match(/github\.com\/[\w\-_]+\/([\w\-_]+)/gi);
    if (githubMatches) {
      const githubProjects = githubMatches.map(m => {
        const parts = m.split('/');
        return parts[parts.length - 1].replace(/[-_]/g, ' ');
      }).filter(name => name.length > 2 && name.length < 30);
      
      projects.push(...githubProjects);
      console.log('Found GitHub projects:', githubProjects);
    }
    
    const uniqueProjects = [...new Set(projects)].slice(0, 8);
    console.log('=== FINAL EXTRACTED PROJECTS ===');
    console.log(uniqueProjects);
    console.log('=== END PROJECT EXTRACTION ===');
    
    return uniqueProjects;
  }

  /**
   * Check if a string is a common technical skill rather than a project name
   */
  private isCommonSkill(text: string): boolean {
    const commonSkills = [
      'javascript', 'typescript', 'python', 'java', 'react', 'angular', 'vue', 'nodejs', 'express',
      'html', 'css', 'sql', 'mongodb', 'mysql', 'postgresql', 'redis', 'docker', 'kubernetes',
      'aws', 'azure', 'gcp', 'git', 'github', 'gitlab', 'jenkins', 'ci/cd', 'rest', 'api',
      'microservices', 'graphql', 'firebase', 'nextjs', 'nuxt', 'gatsby', 'webpack', 'babel',
      'jest', 'cypress', 'selenium', 'junit', 'pytest', 'mocha', 'chai', 'figma', 'sketch'
    ];
    
    return commonSkills.some(skill => 
      text.toLowerCase().includes(skill.toLowerCase()) || 
      skill.toLowerCase().includes(text.toLowerCase())
    );
  }

  /**
   * Extract work experience companies and roles
   */
  private extractWorkExperience(text: string): string[] {
    const workExp: string[] = [];
    const lines = text.split('\n');
    
    // Work experience section indicators
    const experienceSectionIndicators = [
      /^\s*(work\s+)?experience\s*:?\s*$/i,
      /^\s*professional\s+experience\s*:?\s*$/i,
      /^\s*employment\s+history\s*:?\s*$/i,
      /^\s*career\s+history\s*:?\s*$/i,
      /^\s*work\s+history\s*:?\s*$/i
    ];
    
    // Section endings
    const sectionEndings = [
      /^\s*education\s*:?\s*$/i,
      /^\s*(technical\s+)?skills?\s*:?\s*$/i,
      /^\s*projects?\s*:?\s*$/i,
      /^\s*certifications?\s*:?\s*$/i,
      /^\s*achievements?\s*:?\s*$/i,
      /^\s*awards?\s*:?\s*$/i,
      /^\s*publications?\s*:?\s*$/i,
      /^\s*languages?\s*:?\s*$/i,
      /^\s*hobbies?\s*:?\s*$/i,
      /^\s*interests?\s*:?\s*$/i
    ];
    
    // Common company indicators
    const companyPatterns = [
      /\b(inc\.?|corp\.?|llc|ltd\.?|co\.?|company|technologies|tech|systems|solutions|labs|group)\b/i,
      /\b(software|consulting|development|engineering|technology)\b/i
    ];
    
    // Job title patterns
    const titlePatterns = [
      /\b(developer|engineer|programmer|analyst|consultant|architect|manager|lead|director|designer)\b/i,
      /\b(intern|associate|senior|junior|principal|staff|chief)\b/i
    ];
    
    // Date patterns that often accompany work experience
    const datePatterns = [
      /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|january|february|march|april|may|june|july|august|september|october|november|december)\b/i,
      /\b(20\d{2}|19\d{2})\b/,
      /\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/,
      /\b(present|current|now)\b/i
    ];
    
    let inExperienceSection = false;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Skip empty lines
      if (!line) continue;
      
      // Check if we're entering experience section
      if (experienceSectionIndicators.some(pattern => pattern.test(line))) {
        inExperienceSection = true;
        console.log('=== ENTERING EXPERIENCE SECTION ===');
        console.log('Experience section line:', line);
        continue;
      }
      
      // Check if we're leaving experience section
      if (inExperienceSection && sectionEndings.some(pattern => pattern.test(line))) {
        inExperienceSection = false;
        console.log('=== LEAVING EXPERIENCE SECTION ===');
        console.log('New section line:', line);
        continue;
      }
      
      if (inExperienceSection && line.length > 5 && line.length < 200) {
        const hasCompanyPattern = companyPatterns.some(pattern => pattern.test(line));
        const hasTitlePattern = titlePatterns.some(pattern => pattern.test(line));
        const hasDatePattern = datePatterns.some(pattern => pattern.test(line));
        
        // Include lines that have job titles, company indicators, or date patterns
        if (hasCompanyPattern || hasTitlePattern || hasDatePattern) {
          workExp.push(line);
          console.log('Found work experience:', line);
        }
        // Also include lines that look like company names or job titles (start with capital letter)
        else if (/^[A-Z]/.test(line) && !line.includes('|') && line.split(' ').length <= 8) {
          workExp.push(line);
          console.log('Found work experience (capitalized):', line);
        }
      }
    }
    
    // Also scan the entire text for obvious work experience patterns
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      if (trimmedLine.length > 5 && trimmedLine.length < 150) {
        const hasCompanyPattern = companyPatterns.some(pattern => pattern.test(trimmedLine));
        const hasTitlePattern = titlePatterns.some(pattern => pattern.test(trimmedLine));
        const hasDatePattern = datePatterns.some(pattern => pattern.test(trimmedLine));
        
        // Look for strong indicators of work experience
        if ((hasCompanyPattern && hasTitlePattern) || 
            (hasTitlePattern && hasDatePattern) ||
            (hasCompanyPattern && hasDatePattern)) {
          if (!workExp.includes(trimmedLine)) {
            workExp.push(trimmedLine);
          }
        }
      }
    }
    
    const uniqueWorkExp = [...new Set(workExp)].slice(0, 10);
    console.log('=== FINAL EXTRACTED WORK EXPERIENCE ===');
    console.log(uniqueWorkExp);
    console.log('=== END WORK EXPERIENCE EXTRACTION ===');
    
    return uniqueWorkExp;
  }

  /**
   * Extract achievements and accomplishments
   */
  private extractAchievements(text: string): string[] {
    const achievements: string[] = [];
    const lines = text.split('\n');
    
    // Achievement section indicators
    const achievementSectionIndicators = [
      /^\s*achievements?\s*:?\s*$/i,
      /^\s*accomplishments?\s*:?\s*$/i,
      /^\s*awards?\s*:?\s*$/i,
      /^\s*honors?\s*:?\s*$/i,
      /^\s*recognitions?\s*:?\s*$/i,
      /^\s*key\s+achievements?\s*:?\s*$/i
    ];
    
    // Section endings
    const sectionEndings = [
      /^\s*(work\s+)?experience\s*:?\s*$/i,
      /^\s*education\s*:?\s*$/i,
      /^\s*projects?\s*:?\s*$/i,
      /^\s*(technical\s+)?skills?\s*:?\s*$/i,
      /^\s*certifications?\s*:?\s*$/i,
      /^\s*languages?\s*:?\s*$/i,
      /^\s*hobbies?\s*:?\s*$/i,
      /^\s*interests?\s*:?\s*$/i
    ];
    
    // Refined achievement patterns - focus on actual accomplishments
    const achievementPatterns = [
      /\b(won|awarded|achieved|earned|received|recognized)\b.*\b(award|prize|recognition|certificate|honor)\b/i,
      /\b(increased|decreased|improved|optimized|reduced|enhanced|boosted)\b.*\b(\d+%|\$\d+|millions?|thousands?)\b/i,
      /\b(led|managed|supervised)\b.*\b(team|project|department)\b.*\b(people|members|developers)\b/i,
      /\b(published|presented|patent|research|paper|thesis)\b/i,
      /\b(first place|winner|top\s*\d+|ranked\s*\d+|scored\s*\d+)\b/i
    ];
    
    // Project-related patterns that should NOT be treated as achievements
    const projectPatterns = [
      /\b(built|developed|created|designed|implemented|coded|programmed)\b.*\b(system|application|website|app|platform|tool)\b/i,
      /\b(using|with|technologies|stack|framework|library)\b/i,
      /\b(react|angular|vue|node|java|python|javascript|html|css|sql|mongodb|mysql)\b/i
    ];
    
    // Bullet point indicators
    const bulletPatterns = [/^\s*[•·▪▫‣⁃]\s*/, /^\s*[-*]\s*/, /^\s*\d+\.\s*/];
    
    let inAchievementSection = false;
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      if (!trimmedLine) continue;
      
      // Check if we're entering achievement section
      if (achievementSectionIndicators.some(pattern => pattern.test(trimmedLine))) {
        inAchievementSection = true;
        console.log('=== ENTERING ACHIEVEMENT SECTION ===');
        continue;
      }
      
      // Check if we're leaving achievement section
      if (inAchievementSection && sectionEndings.some(pattern => pattern.test(trimmedLine))) {
        inAchievementSection = false;
        console.log('=== LEAVING ACHIEVEMENT SECTION ===');
        continue;
      }
      
      if (inAchievementSection && trimmedLine.length > 10 && trimmedLine.length < 200) {
        // Clean up the achievement text
        const cleanAchievement = trimmedLine.replace(/^\s*[•·▪▫‣⁃\-*\d\.]\s*/, '').trim();
        
        // Filter out project descriptions that ended up in achievement sections
        const isProjectDescription = projectPatterns.some(pattern => pattern.test(cleanAchievement));
        
        if (cleanAchievement && !isProjectDescription) {
          achievements.push(cleanAchievement);
          console.log('Found achievement in section:', cleanAchievement);
        } else if (isProjectDescription) {
          console.log('Filtered out project description from achievements:', cleanAchievement);
        }
      }
    }
    
    // Also scan for achievements throughout the text (outside dedicated sections)
    // But be more selective to avoid including project descriptions
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      if (trimmedLine.length > 10 && trimmedLine.length < 200) {
        const hasStrongAchievementPattern = achievementPatterns.some(pattern => pattern.test(trimmedLine));
        const isProjectDescription = projectPatterns.some(pattern => pattern.test(trimmedLine));
        const isBulletPoint = bulletPatterns.some(pattern => pattern.test(trimmedLine));
        
        // Only include if it has strong achievement indicators AND is not a project description
        if (hasStrongAchievementPattern && !isProjectDescription && (isBulletPoint || trimmedLine.includes('.'))) {
          const cleanAchievement = trimmedLine.replace(/^\s*[•·▪▫‣⁃\-*\d\.]\s*/, '').trim();
          if (cleanAchievement && !achievements.includes(cleanAchievement)) {
            achievements.push(cleanAchievement);
            console.log('Found achievement in text:', cleanAchievement);
          }
        }
      }
    }
    
    const uniqueAchievements = [...new Set(achievements)].slice(0, 8);
    console.log('=== FINAL EXTRACTED ACHIEVEMENTS ===');
    console.log(uniqueAchievements);
    console.log('=== END ACHIEVEMENT EXTRACTION ===');
    
    return uniqueAchievements;
  }

  /**
   * Extract specific technologies mentioned
   */
  private extractTechnologies(text: string): string[] {
    const technologies: string[] = [];
    
    // Enhanced technology patterns
    const techPatterns = [
      // Programming Languages
      /\b(javascript|typescript|python|java|c\+\+|c#|ruby|php|go|rust|swift|kotlin|scala|r|matlab)\b/gi,
      // Frameworks
      /\b(react|angular|vue|node\.?js|express|django|flask|spring|laravel|rails|asp\.net|next\.js|nuxt\.js)\b/gi,
      // Databases
      /\b(mysql|postgresql|mongodb|redis|elasticsearch|sqlite|oracle|sql\s+server|dynamodb|cassandra)\b/gi,
      // Cloud & DevOps
      /\b(aws|azure|gcp|google\s+cloud|docker|kubernetes|jenkins|terraform|ansible|chef|puppet)\b/gi,
      // Tools & Platforms
      /\b(git|github|gitlab|bitbucket|jira|confluence|slack|figma|sketch|photoshop|illustrator)\b/gi
    ];
    
    for (const pattern of techPatterns) {
      const matches = text.match(pattern);
      if (matches) {
        technologies.push(...matches.map(match => match.toLowerCase()));
      }
    }
    
    return [...new Set(technologies)];
  }

  /**
   * Configure multer for file uploads
   */
  static getUploadMiddleware() {
    const storage = multer.diskStorage({
      destination: (req, file, cb) => {
        const uploadDir = path.join(process.cwd(), 'uploads');
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
      },
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'resume-' + uniqueSuffix + path.extname(file.originalname));
      }
    });

    return multer({
      storage,
      limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
      },
      fileFilter: (req, file, cb) => {
        const allowedTypes = /pdf|doc|docx|jpg|jpeg|png/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);

        if (mimetype && extname) {
          return cb(null, true);
        } else {
          cb(new Error('Only PDF, DOC, DOCX, and image files are allowed!'));
        }
      }
    });
  }

  /**
   * Clean up uploaded file
   */
  static cleanupFile(filePath: string) {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (error) {
      console.error('Error cleaning up file:', error);
    }
  }
}
