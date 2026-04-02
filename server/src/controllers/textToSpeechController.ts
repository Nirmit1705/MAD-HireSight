import { Request, Response } from 'express';
import { createClient } from '@deepgram/sdk';

// Initialize Deepgram client
const deepgram = createClient(process.env.DEEPGRAM_API_KEY || '');

// GET endpoint for easier client integration (especially for mobile)
export const synthesizeSpeechGet = async (req: Request, res: Response) => {
  try {
    const { text, voice = 'aura-luna-en' } = req.query;

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'No text provided for synthesis' 
      });
    }

    if (!process.env.DEEPGRAM_API_KEY) {
      return res.status(500).json({ 
        success: false, 
        error: 'Deepgram API key not configured' 
      });
    }

    // Log text length for debugging
    console.log(`🎤 TTS GET Request - Text length: ${text.length} characters, Voice: ${voice}`);
    
    // Warn about potentially long processing times
    if (text.length > 1000) {
      console.log(`⚠️ Long text detected (${text.length} chars) - TTS may take longer than usual`);
    }

    // Use Deepgram to synthesize speech
    const response = await deepgram.speak.request(
      { text },
      {
        voice: voice as string,
        encoding: 'linear16',
        sample_rate: 48000,
      }
    );

    const stream = await response.getStream();
    if (!stream) {
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to get audio stream from Deepgram' 
      });
    }

    // Set appropriate headers for audio response
    res.set({
      'Content-Type': 'audio/wav',
      'Content-Disposition': 'inline; filename="speech.wav"',
      'Cache-Control': 'no-cache',
    });

    // Stream the audio data
    const reader = stream.getReader();
    const pump = async (): Promise<void> => {
      const { done, value } = await reader.read();
      if (done) {
        res.end();
        return;
      }
      res.write(value);
      return pump();
    };

    await pump();

  } catch (error) {
    console.error('Text-to-speech GET error:', error);
    
    // More specific error handling
    if (error instanceof Error) {
      if (error.message.includes('401') || error.message.includes('unauthorized')) {
        return res.status(401).json({ 
          success: false, 
          error: 'Invalid Deepgram API key' 
        });
      }
      if (error.message.includes('429')) {
        return res.status(429).json({ 
          success: false, 
          error: 'API rate limit exceeded' 
        });
      }
      if (error.message.includes('400')) {
        return res.status(400).json({ 
          success: false, 
          error: 'Invalid request parameters' 
        });
      }
    }
    
    res.status(500).json({ 
      success: false, 
      error: 'Failed to synthesize speech',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const synthesizeSpeech = async (req: Request, res: Response) => {
  try {
    const { text, voice = 'aura-luna-en' } = req.body;

    if (!text || text.trim().length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'No text provided for synthesis' 
      });
    }

    if (!process.env.DEEPGRAM_API_KEY) {
      return res.status(500).json({ 
        success: false, 
        error: 'Deepgram API key not configured' 
      });
    }

    // Log text length for debugging
    console.log(`🎤 TTS Request - Text length: ${text.length} characters, Voice: ${voice}`);
    
    // Warn about potentially long processing times
    if (text.length > 1000) {
      console.log(`⚠️ Long text detected (${text.length} chars) - TTS may take longer than usual`);
    }

    // Use Deepgram to synthesize speech
    const response = await deepgram.speak.request(
      { text },
      {
        voice,
        encoding: 'linear16',
        sample_rate: 48000,
      }
    );

    const stream = await response.getStream();
    if (!stream) {
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to get audio stream from Deepgram' 
      });
    }

    // Set appropriate headers for audio response
    res.set({
      'Content-Type': 'audio/wav',
      'Content-Disposition': 'inline; filename="speech.wav"',
      'Cache-Control': 'no-cache',
    });

    // Stream the audio data
    const reader = stream.getReader();
    const pump = async (): Promise<void> => {
      const { done, value } = await reader.read();
      if (done) {
        res.end();
        return;
      }
      res.write(value);
      return pump();
    };

    await pump();

  } catch (error) {
    console.error('Text-to-speech error:', error);
    
    // More specific error handling
    if (error instanceof Error) {
      if (error.message.includes('401') || error.message.includes('unauthorized')) {
        return res.status(401).json({ 
          success: false, 
          error: 'Invalid Deepgram API key' 
        });
      }
      if (error.message.includes('429')) {
        return res.status(429).json({ 
          success: false, 
          error: 'API rate limit exceeded' 
        });
      }
      if (error.message.includes('400')) {
        return res.status(400).json({ 
          success: false, 
          error: 'Invalid request parameters' 
        });
      }
    }
    
    res.status(500).json({ 
      success: false, 
      error: 'Failed to synthesize speech',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Get available voices
export const getVoices = async (req: Request, res: Response) => {
  try {
    // Deepgram Aura voices (as of current API)
    const voices = [
      {
        id: 'aura-luna-en',
        name: 'Luna',
        language: 'en-US',
        gender: 'female',
        description: 'Warm and professional female voice'
      },
      {
        id: 'aura-stella-en',
        name: 'Stella',
        language: 'en-US',
        gender: 'female',
        description: 'Clear and articulate female voice'
      },
      {
        id: 'aura-athena-en',
        name: 'Athena',
        language: 'en-US',
        gender: 'female',
        description: 'Confident and authoritative female voice'
      },
      {
        id: 'aura-hera-en',
        name: 'Hera',
        language: 'en-US',
        gender: 'female',
        description: 'Professional and friendly female voice'
      },
      {
        id: 'aura-orion-en',
        name: 'Orion',
        language: 'en-US',
        gender: 'male',
        description: 'Professional and engaging male voice'
      },
      {
        id: 'aura-arcas-en',
        name: 'Arcas',
        language: 'en-US',
        gender: 'male',
        description: 'Warm and approachable male voice'
      },
      {
        id: 'aura-perseus-en',
        name: 'Perseus',
        language: 'en-US',
        gender: 'male',
        description: 'Clear and authoritative male voice'
      },
      {
        id: 'aura-angus-en',
        name: 'Angus',
        language: 'en-US',
        gender: 'male',
        description: 'Friendly and conversational male voice'
      }
    ];

    res.json({
      success: true,
      voices,
      defaultVoice: 'aura-luna-en'
    });

  } catch (error) {
    console.error('Get voices error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get available voices' 
    });
  }
};

// Health check endpoint for text-to-speech service
export const healthCheck = async (req: Request, res: Response) => {
  try {
    const hasApiKey = !!process.env.DEEPGRAM_API_KEY;
    
    res.json({
      success: true,
      service: 'text-to-speech',
      status: 'healthy',
      deepgram: {
        configured: hasApiKey,
        defaultVoice: 'aura-luna-en'
      }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: 'Service health check failed' 
    });
  }
};