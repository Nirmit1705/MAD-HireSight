/**
 * Vocabulary Analysis Service
 * Analyzes vocabulary sophistication using LLM with rule-based fallback
 */

import axios from 'axios';

export interface VocabularyAnalysis {
  totalWords: number;
  uniqueWords: number;
  typeTokenRatio: number; // TTR = unique_words / total_words
  vocabularyScore: number; // 0-100 scale
  vocabularyComplexity: 'basic' | 'intermediate' | 'advanced' | 'expert';
  averageWordLength: number;
  longWords: number; // Words with 6+ characters
  longWordPercentage: number;
  readabilityScore: number; // Simple readability metric
}

export class VocabularyAnalysisService {
  private ollamaUrl: string;
  private modelName: string;

  constructor() {
    this.ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
    this.modelName = process.env.OLLAMA_MODEL || 'gemma3';
  }
  /**
   * Analyze vocabulary sophistication using LLM with fallback to statistical analysis
   */
  async analyzeVocabulary(text: string): Promise<VocabularyAnalysis> {
    if (!text || text.trim().length === 0) {
      return this.getDefaultAnalysis();
    }

    // First, get basic statistics (always needed)
    const stats = this.calculateBasicStats(text);

    // Try LLM analysis for the vocabulary score
    let vocabularyScore = 70;
    let vocabularyComplexity: 'basic' | 'intermediate' | 'advanced' | 'expert' = 'intermediate';
    
    try {
      console.log('🤖 Using LLM for vocabulary analysis...');
      const llmResult = await this.analyzeVocabularyWithLLM(text);
      vocabularyScore = llmResult.score;
      vocabularyComplexity = llmResult.complexity;
      console.log('✅ LLM vocabulary analysis complete. Score:', vocabularyScore, 'Complexity:', vocabularyComplexity);
    } catch (error) {
      console.warn('⚠️ LLM vocabulary analysis failed, using statistical fallback');
      console.error('Error details:', error instanceof Error ? error.message : error);
      const fallbackResult = this.analyzeVocabularyFallback(stats);
      vocabularyScore = fallbackResult.score;
      vocabularyComplexity = fallbackResult.complexity;
      console.log('📋 Fallback vocabulary score:', vocabularyScore);
    }

    return {
      ...stats,
      vocabularyScore,
      vocabularyComplexity
    };
  }

  /**
   * Analyze vocabulary using LLM
   */
  private async analyzeVocabularyWithLLM(text: string): Promise<{ score: number; complexity: 'basic' | 'intermediate' | 'advanced' | 'expert' }> {
    const prompt = `Analyze vocabulary sophistication. Rate 0-100.

Text: "${text}"

Evaluate: word variety, advanced vocabulary, precision

Format:
SCORE: [0-100]
COMPLEXITY: [basic/intermediate/advanced/expert]

Guide:
85-100: Expert
70-84: Advanced
50-69: Intermediate
0-49: Basic`;

    try {
      const response = await axios.post(`${this.ollamaUrl}/api/generate`, {
        model: this.modelName,
        prompt,
        stream: false,
        options: { 
          temperature: 0.3,
          num_predict: 20,
          top_p: 0.9,
        }
      }, { 
        timeout: 3000 // 3 second timeout
      });

      if (!response.data?.response) {
        throw new Error('Invalid Ollama response');
      }
      
      const responseText = response.data.response.trim();
      
      // Extract score and complexity
      const scoreMatch = responseText.match(/SCORE:\s*(\d+)/i);
      const complexityMatch = responseText.match(/COMPLEXITY:\s*(basic|intermediate|advanced|expert)/i);
      
      if (scoreMatch && complexityMatch) {
        const score = Math.max(0, Math.min(100, parseInt(scoreMatch[1], 10)));
        const complexity = complexityMatch[1].toLowerCase() as 'basic' | 'intermediate' | 'advanced' | 'expert';
        return { score, complexity };
      }
      
      throw new Error('Could not extract score and complexity from LLM response');
      
    } catch (error) {
      console.error('LLM vocabulary analysis error:', error);
      throw error;
    }
  }

  /**
   * Calculate basic vocabulary statistics
   */
  private calculateBasicStats(text: string) {
    const cleanedText = text.toLowerCase().replace(/[^\w\s]/g, ' ');
    const allWords = cleanedText.split(/\s+/).filter(word => word.length > 0);
    
    const uniqueWords = new Set(allWords);
    const ttr = allWords.length > 0 ? (uniqueWords.size / allWords.length) : 0;

    // Calculate average word length
    const totalCharacters = allWords.reduce((sum, word) => sum + word.length, 0);
    const averageWordLength = allWords.length > 0 ? totalCharacters / allWords.length : 0;

    // Count long words (6+ characters)
    const longWords = allWords.filter(word => word.length >= 6).length;
    const longWordPercentage = allWords.length > 0 ? (longWords / allWords.length) * 100 : 0;

    // Simple readability score
    const readabilityScore = Math.round(Math.min(100, (averageWordLength * 10) + (longWordPercentage * 0.5)));

    return {
      totalWords: allWords.length,
      uniqueWords: uniqueWords.size,
      typeTokenRatio: Math.round(ttr * 10000) / 10000,
      averageWordLength: Math.round(averageWordLength * 100) / 100,
      longWords,
      longWordPercentage: Math.round(longWordPercentage * 100) / 100,
      readabilityScore
    };
  }

  /**
   * Fallback vocabulary analysis using statistical methods
   */
  private analyzeVocabularyFallback(stats: ReturnType<typeof this.calculateBasicStats>): { score: number; complexity: 'basic' | 'intermediate' | 'advanced' | 'expert' } {
    const { typeTokenRatio, uniqueWords, longWordPercentage, totalWords } = stats;

    // TTR scoring (0-70 points)
    let ttrScore;
    if (typeTokenRatio <= 0.3) {
      ttrScore = typeTokenRatio * 66.67;
    } else if (typeTokenRatio <= 0.5) {
      ttrScore = 20 + (typeTokenRatio - 0.3) * 150;
    } else if (typeTokenRatio <= 0.7) {
      ttrScore = 50 + (typeTokenRatio - 0.5) * 100;
    } else {
      ttrScore = 70;
    }

    // Complexity bonus (0-20 points)
    const complexityBonus = Math.min(20, longWordPercentage * 0.8);

    // Length bonus (0-10 points)
    let lengthBonus = 0;
    if (totalWords >= 100) lengthBonus = 10;
    else if (totalWords >= 50) lengthBonus = 8;
    else if (totalWords >= 25) lengthBonus = 5;
    else if (totalWords >= 10) lengthBonus = 2;

    const score = Math.round(Math.min(100, ttrScore + complexityBonus + lengthBonus));

    // Determine complexity
    let complexity: 'basic' | 'intermediate' | 'advanced' | 'expert';
    if ((typeTokenRatio >= 0.65 && uniqueWords >= 40) || (typeTokenRatio >= 0.7 && uniqueWords >= 30)) {
      complexity = 'expert';
    } else if ((typeTokenRatio >= 0.55 && uniqueWords >= 30) || (typeTokenRatio >= 0.6 && uniqueWords >= 20)) {
      complexity = 'advanced';
    } else if ((typeTokenRatio >= 0.45 && uniqueWords >= 15) || (typeTokenRatio >= 0.5 && uniqueWords >= 10)) {
      complexity = 'intermediate';
    } else {
      complexity = 'basic';
    }

    return { score, complexity };
  } 
        
  /**
   * Get default analysis for empty input
   */
  private getDefaultAnalysis(): VocabularyAnalysis {
    return {
      totalWords: 0,
      uniqueWords: 0,
      typeTokenRatio: 0,
      vocabularyScore: 0,
      vocabularyComplexity: 'basic',
      averageWordLength: 0,
      longWords: 0,
      longWordPercentage: 0,
      readabilityScore: 0
    };
  }

  /**
   * Get vocabulary insights and suggestions based on analysis
   */
  getVocabularyInsights(analysis: VocabularyAnalysis): string[] {
    const insights: string[] = [];

    if (analysis.vocabularyComplexity === 'basic') {
      insights.push("Try using more varied vocabulary to demonstrate your knowledge depth");
    }

    if (analysis.typeTokenRatio < 0.4) {
      insights.push("Consider using more diverse terminology to avoid repetition");
    }

    if (analysis.longWordPercentage < 15) {
      insights.push("Include more technical or sophisticated terms relevant to the topic");
    }

    if (analysis.vocabularyScore >= 80) {
      insights.push("Excellent vocabulary sophistication! Your word choice demonstrates expertise");
    } else if (analysis.vocabularyScore >= 60) {
      insights.push("Good vocabulary usage with room for more technical terminology");
    }

    if (analysis.averageWordLength < 4) {
      insights.push("Try incorporating longer, more descriptive terms when appropriate");
    }

    return insights;
  }
}
