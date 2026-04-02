import express from 'express';
import { transcribeAudio, transcribeStream, healthCheck, upload } from '../controllers/speechToTextController';
import { testConfidenceAnalysis, testConfidenceScenarios } from '../controllers/testConfidenceController';

const router = express.Router();

// Health check endpoint
router.get('/health', healthCheck);

// Transcribe uploaded audio file
router.post('/transcribe', upload.single('audio'), transcribeAudio);

// Real-time streaming transcription (future implementation)
router.post('/stream', transcribeStream);

// Test endpoints for confidence analysis
router.get('/test-confidence', testConfidenceAnalysis);
router.get('/test-confidence-scenarios', testConfidenceScenarios);

export default router;
