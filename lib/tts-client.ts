import { EdgeTTS } from 'edge-tts-universal';
import { TTSRequest, TTSResponse, ErrorCode, ErrorResponse } from '@/types/audio';

const VALID_VOICES = [
  'en-US-AvaMultilingualNeural',
  'en-US-BrianMultilingualNeural',
  'en-GB-RyanNeural',
  'en-US-AndrewMultilingualNeural',
  'en-US-EmmaMultilingualNeural',
  'en-GB-SoniaNeural',
  'en-US-AriaNeural',
  'en-US-GuyNeural',

  'en-US-JennyNeural',
  'en-US-RogerNeural',
];

/**
 * Convert text to speech using Edge TTS (free Microsoft neural voices)
 *
 * @param request - TTSRequest with text, voice, and format
 * @returns Promise<TTSResponse> with base64 audio data
 * @throws ErrorResponse for API errors
 */
export async function convertToSpeech(
  request: TTSRequest,
  retries: number = 3
): Promise<TTSResponse> {
  try {
    const tts = new EdgeTTS(request.text, request.voice);
    const result = await tts.synthesize();

    const arrayBuffer = await result.audio.arrayBuffer();
    const audioData = Buffer.from(arrayBuffer).toString('base64');

    // Estimate duration (~150 words per minute, ~5 chars per word)
    const wordCount = request.text.split(/\s+/).length;
    const durationSeconds = (wordCount / 150) * 60;

    return {
      audioData,
      durationSeconds: Math.round(durationSeconds * 10) / 10,
      charactersUsed: request.text.length,
    };
  } catch (error) {
    const err = error as { message?: string };

    // Retry on transient failures
    if (retries > 0) {
      const backoffTime = Math.pow(2, 4 - retries) * 500; // 1s, 2s, 4s
      await new Promise((resolve) => setTimeout(resolve, backoffTime));
      return convertToSpeech(request, retries - 1);
    }

    const errorResponse: ErrorResponse = {
      error: err.message || 'Conversion failed. Please try again.',
      code: ErrorCode.API_ERROR,
      retryable: true,
    };
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

  if (!VALID_VOICES.includes(request.voice)) {
    const error: ErrorResponse = {
      error: 'Invalid voice selected',
      code: ErrorCode.INVALID_VOICE,
      retryable: false,
    };
    throw error;
  }
}
