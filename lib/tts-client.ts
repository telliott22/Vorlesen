import { TextToSpeechClient } from '@google-cloud/text-to-speech';
import { TTSRequest, TTSResponse, ErrorCode, ErrorResponse } from '@/types/audio';

// Initialize Google Cloud TTS client
let ttsClient: TextToSpeechClient | null = null;

function getClient(): TextToSpeechClient {
  if (!ttsClient) {
    // Use API key from environment variable if available
    const apiKey = process.env.GOOGLE_CLOUD_TTS_API_KEY;
    const serviceAccountJson = process.env.GOOGLE_CLOUD_SERVICE_ACCOUNT;

    if (apiKey) {
      ttsClient = new TextToSpeechClient({
        apiKey: apiKey,
      });
    } else if (serviceAccountJson) {
      // Parse service account JSON from environment variable (for Vercel)
      const credentials = JSON.parse(serviceAccountJson);
      ttsClient = new TextToSpeechClient({
        credentials,
      });
    } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      // Use service account JSON file path (for local development)
      ttsClient = new TextToSpeechClient();
    } else {
      throw new Error('Google Cloud TTS credentials not configured');
    }
  }

  return ttsClient;
}

/**
 * Convert text to speech using Google Cloud TTS API
 *
 * @param request - TTSRequest with text, voice, and format
 * @returns Promise<TTSResponse> with base64 audio data
 * @throws ErrorResponse for API errors
 */
export async function convertToSpeech(
  request: TTSRequest,
  retries: number = 3
): Promise<TTSResponse> {
  const client = getClient();

  // Prepare the request
  const apiRequest = {
    input: { text: request.text },
    voice: {
      languageCode: request.voice.substring(0, 5), // e.g., "en-US"
      name: request.voice,
    },
    audioConfig: {
      audioEncoding: 'MP3' as const,
      sampleRateHertz: 44100,
      effectsProfileId: ['headphone-class-device'],
    },
  };

  try {
    const [response] = await client.synthesizeSpeech(apiRequest);

    if (!response.audioContent) {
      throw new Error('No audio content in response');
    }

    // Convert Buffer to base64
    const audioData = Buffer.from(response.audioContent as Uint8Array).toString('base64');

    // Estimate duration (rough: ~150 words per minute, ~5 chars per word)
    const wordCount = request.text.split(/\s+/).length;
    const durationSeconds = (wordCount / 150) * 60;

    return {
      audioData,
      durationSeconds: Math.round(durationSeconds * 10) / 10,
      charactersUsed: request.text.length,
    };
  } catch (error) {
    const err = error as { code?: number; message?: string };
    // Handle specific Google Cloud errors
    if (err.code === 429 || err.message?.includes('quota')) {
      const errorResponse: ErrorResponse = {
        error: 'Too many requests. Please wait.',
        code: ErrorCode.RATE_LIMIT,
        retryable: true,
        retryAfter: 5,
      };

      // Implement exponential backoff
      if (retries > 0) {
        const backoffTime = Math.pow(2, 4 - retries) * 1000; // 2s, 4s, 8s
        await new Promise((resolve) => setTimeout(resolve, backoffTime));
        return convertToSpeech(request, retries - 1);
      }

      throw errorResponse;
    }

    if (err.code === 401 || err.code === 403) {
      const errorResponse: ErrorResponse = {
        error: 'Service temporarily unavailable',
        code: ErrorCode.API_ERROR,
        retryable: false,
      };
      throw errorResponse;
    }

    // Generic API error
    const errorResponse: ErrorResponse = {
      error: 'Conversion failed. Please try again.',
      code: ErrorCode.API_ERROR,
      retryable: true,
    };

    if (retries > 0) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return convertToSpeech(request, retries - 1);
    }

    throw errorResponse;
  }
}

/**
 * Validate TTS request parameters
 *
 * @param request - TTSRequest to validate
 * @throws ErrorResponse if validation fails
 */
export function validateRequest(request: TTSRequest): void {
  if (!request.text || request.text.trim().length === 0) {
    const error: ErrorResponse = {
      error: 'Please paste some text to convert',
      code: ErrorCode.TEXT_EMPTY,
      retryable: false,
    };
    throw error;
  }

  if (request.text.length > 4000) {
    const error: ErrorResponse = {
      error: 'Text chunk too long (max 4000 characters)',
      code: ErrorCode.TEXT_TOO_LONG,
      retryable: false,
    };
    throw error;
  }

  // Validate voice format: en-US-Wavenet-D, en-US-Neural2-A, etc.
  const voicePattern = /^[a-z]{2}-[A-Z]{2}-(Wavenet|Neural2|Standard)-[A-Z]$/;
  if (!voicePattern.test(request.voice)) {
    const error: ErrorResponse = {
      error: 'Invalid voice selected',
      code: ErrorCode.INVALID_VOICE,
      retryable: false,
    };
    throw error;
  }
}
