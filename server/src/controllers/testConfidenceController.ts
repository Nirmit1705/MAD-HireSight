import { Request, Response } from 'express';
import { SpeechAnalysisService, WordTimestamp } from '../services/speechAnalysisService';

const speechAnalysis = new SpeechAnalysisService();

/**
 * Test endpoint for confidence analysis with sample data
 */
export const testConfidenceAnalysis = async (req: Request, res: Response) => {
  try {
    // Sample word timestamps that simulate real Deepgram response
    const sampleWords: WordTimestamp[] = [
      { word: "Well", start: 0.0, end: 0.3, confidence: 0.85 },
      { word: "um", start: 0.5, end: 0.7, confidence: 0.95 },
      { word: "I", start: 1.2, end: 1.3, confidence: 0.99 },
      { word: "have", start: 1.4, end: 1.6, confidence: 0.98 },
      { word: "been", start: 1.7, end: 1.9, confidence: 0.97 },
      { word: "working", start: 2.0, end: 2.4, confidence: 0.96 },
      { word: "as", start: 2.5, end: 2.6, confidence: 0.99 },
      { word: "a", start: 2.7, end: 2.8, confidence: 0.99 },
      { word: "software", start: 2.9, end: 3.3, confidence: 0.95 },
      { word: "developer", start: 3.4, end: 3.8, confidence: 0.94 },
      { word: "for", start: 3.9, end: 4.0, confidence: 0.98 },
      { word: "like", start: 5.5, end: 5.7, confidence: 0.92 },
      { word: "three", start: 6.0, end: 6.3, confidence: 0.96 },
      { word: "years", start: 6.4, end: 6.8, confidence: 0.97 },
      { word: "now", start: 6.9, end: 7.1, confidence: 0.98 },
      { word: "and", start: 7.2, end: 7.3, confidence: 0.99 },
      { word: "uh", start: 9.0, end: 9.2, confidence: 0.89 },
      { word: "I", start: 10.1, end: 10.2, confidence: 0.99 },
      { word: "really", start: 10.3, end: 10.6, confidence: 0.96 },
      { word: "enjoy", start: 10.7, end: 11.0, confidence: 0.95 },
      { word: "you", start: 11.1, end: 11.2, confidence: 0.98 },
      { word: "know", start: 11.3, end: 11.5, confidence: 0.97 },
      { word: "building", start: 11.6, end: 12.0, confidence: 0.94 },
      { word: "applications", start: 12.1, end: 12.8, confidence: 0.92 },
      { word: "that", start: 12.9, end: 13.1, confidence: 0.98 },
      { word: "help", start: 13.2, end: 13.4, confidence: 0.97 },
      { word: "people", start: 13.5, end: 13.9, confidence: 0.96 }
    ];

    // Analyze confidence metrics
    const confidenceMetrics = await speechAnalysis.analyzeConfidence(sampleWords);

    res.json({
      success: true,
      data: {
        confidenceMetrics,
        sampleTranscript: "Well um I have been working as a software developer for like three years now and uh I really enjoy you know building applications that help people",
        analysis: {
          totalWords: sampleWords.length,
          detectedFillers: confidenceMetrics.breakdown.fillerWords.map(f => f.word),
          pauseCount: confidenceMetrics.breakdown.pauses.length,
          overallConfidence: confidenceMetrics.overallScore
        }
      },
      message: 'Confidence analysis test completed successfully'
    });

  } catch (error) {
    console.error('Test confidence analysis error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to test confidence analysis',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Test endpoint with different confidence scenarios
 */
export const testConfidenceScenarios = async (req: Request, res: Response) => {
  try {
    const scenarios = [
      {
        name: 'High Confidence',
        words: [
          { word: "I", start: 0.0, end: 0.1, confidence: 0.99 },
          { word: "have", start: 0.2, end: 0.4, confidence: 0.98 },
          { word: "extensive", start: 0.5, end: 0.9, confidence: 0.96 },
          { word: "experience", start: 1.0, end: 1.5, confidence: 0.95 },
          { word: "in", start: 1.6, end: 1.7, confidence: 0.99 },
          { word: "React", start: 1.8, end: 2.1, confidence: 0.97 },
          { word: "development", start: 2.2, end: 2.8, confidence: 0.94 }
        ]
      },
      {
        name: 'Low Confidence (Many Fillers)',
        words: [
          { word: "Um", start: 0.0, end: 0.3, confidence: 0.91 },
          { word: "well", start: 1.5, end: 1.8, confidence: 0.89 },
          { word: "like", start: 2.0, end: 2.2, confidence: 0.92 },
          { word: "I", start: 3.0, end: 3.1, confidence: 0.99 },
          { word: "think", start: 3.2, end: 3.5, confidence: 0.96 },
          { word: "uh", start: 5.0, end: 5.3, confidence: 0.88 },
          { word: "maybe", start: 6.2, end: 6.5, confidence: 0.94 },
          { word: "I", start: 7.0, end: 7.1, confidence: 0.99 },
          { word: "can", start: 7.2, end: 7.4, confidence: 0.97 },
          { word: "you", start: 8.5, end: 8.6, confidence: 0.98 },
          { word: "know", start: 8.7, end: 8.9, confidence: 0.96 },
          { word: "help", start: 9.0, end: 9.3, confidence: 0.95 }
        ]
      },
      {
        name: 'Long Pauses',
        words: [
          { word: "I", start: 0.0, end: 0.1, confidence: 0.99 },
          { word: "worked", start: 3.5, end: 3.9, confidence: 0.96 },
          { word: "on", start: 4.0, end: 4.1, confidence: 0.98 },
          { word: "several", start: 6.8, end: 7.3, confidence: 0.94 },
          { word: "projects", start: 10.2, end: 10.8, confidence: 0.92 }
        ]
      }
    ];

    const results = await Promise.all(scenarios.map(async scenario => ({
      name: scenario.name,
      metrics: await speechAnalysis.analyzeConfidence(scenario.words as WordTimestamp[])
    })));

    res.json({
      success: true,
      data: {
        scenarios: results
      },
      message: 'Confidence scenario testing completed'
    });

  } catch (error) {
    console.error('Test confidence scenarios error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to test confidence scenarios',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};