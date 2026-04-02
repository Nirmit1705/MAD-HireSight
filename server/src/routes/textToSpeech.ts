import express from 'express';
import { synthesizeSpeech, getVoices, healthCheck, synthesizeSpeechGet } from '../controllers/textToSpeechController';

const router = express.Router();

// Health check endpoint
router.get('/health', healthCheck);

// Get available voices
router.get('/voices', getVoices);

// Synthesize speech from text (POST method)
router.post('/synthesize', synthesizeSpeech);

// Synthesize speech from text (GET method for easier client integration)
router.get('/synthesize', synthesizeSpeechGet);

export default router;