import { TechnicalKnowledgeService, TechnicalAnalysis, ExpectedKeyword } from './technicalKnowledgeService';
import { VocabularyAnalysisService, VocabularyAnalysis } from './vocabularyAnalysisService';
import axios from 'axios';

export interface WordTimestamp {
  word: string;
  start: number;
  end: number;
  confidence: number;
  punctuated_word?: string;
}

export interface PauseAnalysis {
  duration: number; // in seconds
  position: number; // position between words (0-based index)
  type: 'short' | 'medium' | 'long' | 'excessive';
}

export interface FillerWordAnalysis {
  word: string;
  count: number;
  positions: number[]; // word positions where fillers occur
  percentage: number; // percentage of total words
}

export interface ConfidenceMetrics {
  overallScore: number; // 0-100 scale (rounded)
  fillerWordScore: number; // 0-100 scale (lower filler words = higher score, rounded)
  pauseScore: number; // 0-100 scale (optimal pauses = higher score, rounded)
  fluencyScore: number; // 0-100 scale (combination of above, rounded)
  technicalScore: number; // 0-100 scale (technical knowledge accuracy, rounded)
  vocabularyScore: number; // 0-100 scale (vocabulary sophistication, rounded)
  technicalAnalysis?: TechnicalAnalysis; // Detailed technical knowledge analysis
  vocabularyAnalysis: VocabularyAnalysis; // Vocabulary sophistication analysis
  breakdown: {
    totalWords: number;
    fillerWords: FillerWordAnalysis[];
    pauses: PauseAnalysis[];
    averagePauseDuration: number;
    speechRate: number; // words per minute
    totalSpeechTime: number; // total time speaking (excluding pauses)
    totalPauseTime: number; // total time in pauses
  };
}

export class SpeechAnalysisService {
  private technicalKnowledgeService: TechnicalKnowledgeService;
  private vocabularyAnalysisService: VocabularyAnalysisService;
  private ollamaUrl: string;
  private modelName: string;

  constructor() {
    this.technicalKnowledgeService = new TechnicalKnowledgeService();
    this.vocabularyAnalysisService = new VocabularyAnalysisService();
    this.ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
    this.modelName = process.env.OLLAMA_MODEL || 'gemma3';
  }

  // Common filler words to detect
  private readonly FILLER_WORDS = new Set([
    'um', 'uh', 'ah', 'er', 'hmm', 'well', 'so', 'like', 'you know', 
    'kind of', 'sort of', 'i mean', 'basically', 'actually', 'really',
    'just', 'maybe', 'i think', 'i guess', 'probably', 'definitely'
  ]);

  // Pause duration thresholds (in seconds)
  private readonly PAUSE_THRESHOLDS = {
    SHORT: 0.5,    // 0.0 - 0.5s: Natural pause
    MEDIUM: 1.0,   // 0.5 - 1.0s: Thinking pause
    LONG: 2.0,     // 1.0 - 2.0s: Long pause (may indicate uncertainty)
    EXCESSIVE: 2.0 // 2.0s+: Excessive pause (indicates low confidence)
  };

  /**
   * Analyze confidence metrics from Deepgram word-level timestamps
   * Includes technical knowledge analysis based on expected keywords
   */
  async analyzeConfidence(
    words: WordTimestamp[], 
    userAnswer?: string, 
    expectedKeywords?: ExpectedKeyword[], 
    questionText?: string,
    position?: string
  ): Promise<ConfidenceMetrics> {
    if (!words || words.length === 0) {
      return this.getDefaultMetrics();
    }

    const fillerWords = this.analyzeFillerWords(words);
    const pauses = this.analyzePauses(words);
    const speechTiming = this.analyzeSpeechTiming(words, pauses);

    // Calculate individual scores (all rounded to integers)
    const fillerWordScore = Math.round(this.calculateFillerWordScore(fillerWords, words.length));
    const pauseScore = Math.round(this.calculatePauseScore(pauses, speechTiming.totalSpeechTime));
    
    console.log('📊 Component Scores:', { fillerWordScore, pauseScore });
    
    // Calculate grammar score using LLM analysis
    let grammarScore = 70; // Default fallback
    if (userAnswer) {
      try {
        console.log('🤖 Using LLM for grammar analysis...');
        console.log('📝 Input text:', userAnswer.substring(0, 100) + (userAnswer.length > 100 ? '...' : ''));
        grammarScore = await this.calculateGrammarScoreWithLLM(userAnswer);
        console.log('✅ LLM grammar analysis complete. Score:', grammarScore);
      } catch (error) {
        console.warn('⚠️ LLM grammar analysis failed, using rule-based fallback');
        console.error('Error details:', error instanceof Error ? error.message : error);
        grammarScore = this.calculateGrammarScoreFallback(userAnswer);
        console.log('📋 Fallback grammar score:', grammarScore);
      }
    }
    
    console.log('📐 Grammar Score:', grammarScore);
    
    // Fluency now includes grammar analysis
    const fluencyScore = Math.round(this.calculateFluencyScore(fillerWordScore, pauseScore, grammarScore));
    
    console.log('🎯 FLUENCY CALCULATION:', {
      fillerWordScore,
      pauseScore,
      grammarScore,
      calculatedFluency: fluencyScore,
      formula: `(${fillerWordScore} * 0.3) + (${pauseScore} * 0.3) + (${grammarScore} * 0.4)`
    });

    // Technical knowledge analysis
    let technicalScore = 70; // Default score if no technical analysis
    let technicalAnalysis: TechnicalAnalysis | undefined;

    if (userAnswer) {
      // Generate expected keywords if not provided
      let keywords = expectedKeywords;
      if (!keywords && questionText && position) {
        keywords = this.technicalKnowledgeService.generateExpectedKeywords(questionText, position);
      }

      if (keywords && keywords.length > 0) {
        technicalAnalysis = this.technicalKnowledgeService.analyzeTechnicalKnowledge(
          userAnswer, 
          keywords, 
          questionText
        );
        technicalScore = technicalAnalysis.overallScore;
      }
    }

    // Analyze vocabulary sophistication
    const vocabularyAnalysis = await this.vocabularyAnalysisService.analyzeVocabulary(userAnswer || '');
    const vocabularyScore = vocabularyAnalysis.vocabularyScore;

    // Overall confidence score (weighted combination, rounded)
    const overallScore = Math.round(
      (fillerWordScore * 0.20) + 
      (pauseScore * 0.20) + 
      (fluencyScore * 0.15) +
      (technicalScore * 0.30) + // Technical knowledge has highest weight
      (vocabularyScore * 0.15)   // Vocabulary sophistication
    );

    return {
      overallScore,
      fillerWordScore,
      pauseScore,
      fluencyScore,
      technicalScore,
      vocabularyScore,
      technicalAnalysis,
      vocabularyAnalysis,
      breakdown: {
        totalWords: words.length,
        fillerWords,
        pauses,
        averagePauseDuration: pauses.length > 0 
          ? pauses.reduce((sum, p) => sum + p.duration, 0) / pauses.length 
          : 0,
        speechRate: speechTiming.speechRate,
        totalSpeechTime: speechTiming.totalSpeechTime,
        totalPauseTime: speechTiming.totalPauseTime
      }
    };
  }

  /**
   * Analyze filler words in the transcript
   */
  private analyzeFillerWords(words: WordTimestamp[]): FillerWordAnalysis[] {
    const fillerAnalysis = new Map<string, { count: number; positions: number[] }>();

    words.forEach((word, index) => {
      const cleanWord = word.word.toLowerCase().replace(/[.,!?;]/g, '');
      
      if (this.FILLER_WORDS.has(cleanWord)) {
        if (!fillerAnalysis.has(cleanWord)) {
          fillerAnalysis.set(cleanWord, { count: 0, positions: [] });
        }
        
        const analysis = fillerAnalysis.get(cleanWord)!;
        analysis.count++;
        analysis.positions.push(index);
      }
    });

    return Array.from(fillerAnalysis.entries()).map(([word, data]) => ({
      word,
      count: data.count,
      positions: data.positions,
      percentage: (data.count / words.length) * 100
    }));
  }

  /**
   * Analyze pauses between words using timestamps
   */
  private analyzePauses(words: WordTimestamp[]): PauseAnalysis[] {
    const pauses: PauseAnalysis[] = [];

    for (let i = 0; i < words.length - 1; i++) {
      const currentWord = words[i];
      const nextWord = words[i + 1];
      
      // Calculate pause duration (gap between end of current word and start of next)
      const pauseDuration = nextWord.start - currentWord.end;
      
      // Only consider significant pauses (> 0.1s to filter out natural speech gaps)
      if (pauseDuration > 0.1) {
        let pauseType: PauseAnalysis['type'];
        
        if (pauseDuration <= this.PAUSE_THRESHOLDS.SHORT) {
          pauseType = 'short';
        } else if (pauseDuration <= this.PAUSE_THRESHOLDS.MEDIUM) {
          pauseType = 'medium';
        } else if (pauseDuration <= this.PAUSE_THRESHOLDS.LONG) {
          pauseType = 'long';
        } else {
          pauseType = 'excessive';
        }

        pauses.push({
          duration: pauseDuration,
          position: i,
          type: pauseType
        });
      }
    }

    return pauses;
  }

  /**
   * Calculate speech timing metrics
   */
  private analyzeSpeechTiming(words: WordTimestamp[], pauses: PauseAnalysis[]) {
    if (words.length === 0) {
      return { speechRate: 0, totalSpeechTime: 0, totalPauseTime: 0 };
    }

    const totalAudioDuration = words[words.length - 1].end - words[0].start;
    const totalPauseTime = pauses.reduce((sum, pause) => sum + pause.duration, 0);
    const totalSpeechTime = totalAudioDuration - totalPauseTime;
    
    // Calculate words per minute (WPM)
    const speechRate = totalSpeechTime > 0 
      ? (words.length / totalSpeechTime) * 60 
      : 0;

    return {
      speechRate,
      totalSpeechTime,
      totalPauseTime
    };
  }

  /**
   * Calculate filler word confidence score (0-100)
   */
  private calculateFillerWordScore(fillerWords: FillerWordAnalysis[], totalWords: number): number {
    const totalFillerWords = fillerWords.reduce((sum, filler) => sum + filler.count, 0);
    const fillerPercentage = (totalFillerWords / totalWords) * 100;

    // Score based on filler word percentage
    // 0-2%: Excellent (90-100)
    // 2-5%: Good (75-89)
    // 5-10%: Average (50-74)
    // 10-15%: Poor (25-49)
    // 15%+: Very poor (0-24)
    
    if (fillerPercentage <= 2) {
      return Math.max(90, 100 - (fillerPercentage * 5));
    } else if (fillerPercentage <= 5) {
      return Math.max(75, 90 - ((fillerPercentage - 2) * 5));
    } else if (fillerPercentage <= 10) {
      return Math.max(50, 75 - ((fillerPercentage - 5) * 5));
    } else if (fillerPercentage <= 15) {
      return Math.max(25, 50 - ((fillerPercentage - 10) * 5));
    } else {
      return Math.max(0, 25 - ((fillerPercentage - 15) * 2));
    }
  }

  /**
   * Calculate pause confidence score (0-100)
   */
  private calculatePauseScore(pauses: PauseAnalysis[], totalSpeechTime: number): number {
    if (pauses.length === 0) {
      return 85; // Good score for no excessive pauses, but not perfect
    }

    const longPauses = pauses.filter(p => p.type === 'long').length;
    const excessivePauses = pauses.filter(p => p.type === 'excessive').length;
    const averagePauseDuration = pauses.reduce((sum, p) => sum + p.duration, 0) / pauses.length;

    // Penalty for excessive pauses
    let score = 100;
    
    // Penalize long pauses
    score -= longPauses * 5;
    
    // Heavily penalize excessive pauses
    score -= excessivePauses * 15;
    
    // Penalize if average pause duration is too long
    if (averagePauseDuration > this.PAUSE_THRESHOLDS.MEDIUM) {
      score -= (averagePauseDuration - this.PAUSE_THRESHOLDS.MEDIUM) * 10;
    }

    // Bonus for optimal pause distribution (some pauses are natural and good)
    const pauseRate = pauses.length / (totalSpeechTime / 60); // pauses per minute
    if (pauseRate >= 5 && pauseRate <= 15) {
      score += 5; // Bonus for natural pause frequency
    }

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  /**
   * Calculate overall fluency score including grammar
   */
  private calculateFluencyScore(fillerWordScore: number, pauseScore: number, grammarScore: number): number {
    // Fluency is combination of smooth speech flow AND proper grammar
    // Grammar is now a major component (40% weight)
    const baseScore = (fillerWordScore * 0.30) + (pauseScore * 0.30) + (grammarScore * 0.40);
    
    // Bonus if all aspects are high (synergistic effect)
    if (fillerWordScore >= 80 && pauseScore >= 80 && grammarScore >= 80) {
      return Math.min(100, baseScore + 5);
    }
    
    // Penalty if grammar is very poor (grammar is critical for fluency)
    if (grammarScore < 40) {
      return Math.max(0, baseScore - 15);
    }
    
    // Penalty if any aspect is very poor
    if (fillerWordScore < 40 || pauseScore < 40) {
      return Math.max(0, baseScore - 10);
    }
    
    return Math.round(baseScore);
  }

  /**
   * Calculate grammar score using LLM analysis
   */
  private async calculateGrammarScoreWithLLM(text: string): Promise<number> {
    if (!text || text.trim().length === 0) {
      return 0;
    }

    const prompt = `Analyze this text for grammar quality. Score 0-100.

Text: "${text}"

Scoring:
90-100: Excellent grammar
75-89: Good, minor issues
60-74: Acceptable, some errors
40-59: Poor, multiple errors
0-39: Very poor

Respond with ONLY the number.`;

    try {
      const response = await axios.post(`${this.ollamaUrl}/api/generate`, {
        model: this.modelName,
        prompt,
        stream: false,
        options: { 
          temperature: 0.3,
          num_predict: 5, // Only need a number
          top_p: 0.9,
        }
      }, { 
        timeout: 3000 // 3 second timeout - faster response
      });

      if (!response.data?.response) {
        throw new Error('Invalid Ollama response');
      }
      
      const scoreText = response.data.response.trim();
      
      // Extract number from response
      const scoreMatch = scoreText.match(/\d+/);
      if (scoreMatch) {
        const score = parseInt(scoreMatch[0], 10);
        // Ensure score is within bounds
        return Math.max(0, Math.min(100, score));
      }
      
      throw new Error('Could not extract score from LLM response');
      
    } catch (error) {
      console.error('LLM grammar analysis error:', error);
      throw error; // Re-throw to trigger fallback
    }
  }

  /**
   * Fallback grammar score calculation (rule-based)
   * Used when LLM is unavailable
   */
  private calculateGrammarScoreFallback(text: string): number {
    if (!text || text.trim().length === 0) {
      return 0;
    }

    let score = 100;
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const words = text.toLowerCase().split(/\s+/).filter(w => w.length > 0);
    
    if (sentences.length === 0 || words.length === 0) {
      return 50; // Minimal text
    }

    // 1. Sentence structure analysis
    const avgSentenceLength = words.length / sentences.length;
    
    // Too short sentences (< 4 words) or too long (> 30 words) indicate poor grammar
    if (avgSentenceLength < 4) {
      score -= 20; // Fragment-like sentences
    } else if (avgSentenceLength > 30) {
      score -= 15; // Run-on sentences
    } else if (avgSentenceLength >= 8 && avgSentenceLength <= 20) {
      score += 5; // Ideal sentence length
    }

    // 2. Check for articles and determiners (should be present in well-formed sentences)
    const articlesAndDeterminers = ['the', 'a', 'an', 'this', 'that', 'these', 'those', 'my', 'your', 'his', 'her', 'its', 'our', 'their'];
    const hasArticles = articlesAndDeterminers.some(article => 
      words.includes(article) || words.some(w => w.startsWith(article + ' '))
    );
    
    if (!hasArticles && words.length > 5) {
      score -= 15; // Missing articles suggests poor grammar (e.g., "I good boy" vs "I am a good boy")
    }

    // 3. Check for verb presence and basic verb forms
    const commonVerbs = ['am', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
                          'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 
                          'can', 'could', 'should', 'may', 'might', 'must'];
    const hasVerbs = commonVerbs.some(verb => words.includes(verb));
    
    if (!hasVerbs && words.length > 3) {
      score -= 20; // Missing basic verbs suggests incomplete sentences
    }

    // 4. Subject-verb agreement patterns (basic check)
    // Check for common mistakes like "I is", "we was", etc.
    const grammarMistakes = [
      /\bi is\b/i,
      /\bhe are\b/i,
      /\bshe are\b/i,
      /\bit are\b/i,
      /\bthey is\b/i,
      /\bwe was\b/i,
      /\byou was\b/i,
      /\bthey was\b/i,
      /\bi are\b/i,
      /\bi were\b/i,
      /\bhe am\b/i,
      /\bshe am\b/i
    ];
    
    const mistakeCount = grammarMistakes.filter(pattern => pattern.test(text)).length;
    score -= mistakeCount * 15; // Heavy penalty for subject-verb agreement errors

    // 5. Check for repeated words (stuttering or lack of fluency)
    const wordPairs: string[] = [];
    for (let i = 0; i < words.length - 1; i++) {
      const cleanWord1 = words[i].replace(/[.,!?;:]/g, '');
      const cleanWord2 = words[i + 1].replace(/[.,!?;:]/g, '');
      if (cleanWord1 === cleanWord2 && cleanWord1.length > 2) {
        wordPairs.push(cleanWord1);
      }
    }
    score -= wordPairs.length * 10; // Penalty for word repetition

    // 6. Check for proper sentence starts (capitalization pattern suggests structure)
    const startsWithCapital = sentences.filter(s => {
      const trimmed = s.trim();
      return trimmed.length > 0 && /^[A-Z]/.test(trimmed);
    }).length;
    
    const capitalizationRatio = startsWithCapital / sentences.length;
    if (capitalizationRatio < 0.5) {
      score -= 10; // Poor capitalization suggests informal or incomplete sentences
    }

    // 7. Check for prepositions and conjunctions (indicate complex, well-formed sentences)
    const connectingWords = ['and', 'but', 'or', 'because', 'since', 'although', 'while', 
                              'when', 'where', 'which', 'who', 'that', 'if', 'unless',
                              'in', 'on', 'at', 'to', 'for', 'with', 'from', 'about'];
    const connectingWordsCount = connectingWords.filter(word => words.includes(word)).length;
    
    if (connectingWordsCount === 0 && words.length > 8) {
      score -= 10; // Lack of connecting words in longer answers suggests simple/choppy grammar
    } else if (connectingWordsCount >= 3) {
      score += 5; // Bonus for using connecting words (shows sentence complexity)
    }

    // 8. Check for pronoun usage (indicates proper sentence structure)
    const pronouns = ['i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them'];
    const hasPronoun = pronouns.some(pronoun => words.includes(pronoun));
    
    if (!hasPronoun && words.length > 5) {
      score -= 8; // Missing pronouns might indicate incomplete thoughts
    }

    // 9. Check for excessive one-word or two-word "sentences"
    const veryShortSentences = sentences.filter(s => s.trim().split(/\s+/).length < 3).length;
    if (veryShortSentences > sentences.length / 2) {
      score -= 15; // Too many fragments
    }

    // 10. Bonus for variety in sentence structure
    const sentenceLengths = sentences.map(s => s.trim().split(/\s+/).length);
    const uniqueLengths = new Set(sentenceLengths).size;
    if (uniqueLengths >= 3 && sentences.length >= 3) {
      score += 5; // Varied sentence structure is good
    }

    // Ensure score is within bounds
    return Math.max(0, Math.min(100, Math.round(score)));
  }

  /**
   * Get default metrics for empty input
   */
  private getDefaultMetrics(): ConfidenceMetrics {
    return {
      overallScore: 0,
      fillerWordScore: 0,
      pauseScore: 0,
      fluencyScore: 0,
      technicalScore: 0,
      vocabularyScore: 0,
      vocabularyAnalysis: {
        totalWords: 0,
        uniqueWords: 0,
        typeTokenRatio: 0,
        vocabularyScore: 0,
        vocabularyComplexity: 'basic',
        averageWordLength: 0,
        longWords: 0,
        longWordPercentage: 0,
        readabilityScore: 0
      },
      breakdown: {
        totalWords: 0,
        fillerWords: [],
        pauses: [],
        averagePauseDuration: 0,
        speechRate: 0,
        totalSpeechTime: 0,
        totalPauseTime: 0
      }
    };
  }
}