import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';
import { TTSRequest, TTSResponse, ErrorCode, ErrorResponse } from '@/types/audio';

const VALID_VOICES = [
  'en-US-AriaNeural',
  'en-US-JennyNeural',
  'en-GB-RyanNeural',
  'en-US-RogerNeural',
  'en-US-GuyNeural',
  'en-US-AvaNeural',
  'en-GB-SoniaNeural',
  'en-US-AndrewNeural',
  'en-US-BrianNeural',
  'en-US-EmmaNeural',
];

/**
 * Escape text for embedding in the SSML that Edge TTS expects
 */
function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Whether the paid Azure Speech backup is set up (see .env.example)
 */
export function isAzureConfigured(): boolean {
  return !!process.env.AZURE_SPEECH_KEY && !!process.env.AZURE_SPEECH_REGION;
}

/**
 * Synthesize text with Edge TTS and return the MP3 bytes
 */
async function synthesizeWithEdge(text: string, voice: string): Promise<Buffer> {
  const tts = new MsEdgeTTS({ connectionTimeoutMs: 8000, synthesisTimeoutMs: 15000 });
  try {
    await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
    const { audioStream } = tts.toStream(escapeXml(text));
    const chunks: Buffer[] = [];
    for await (const chunk of audioStream) {
      chunks.push(chunk as Buffer);
    }
    return Buffer.concat(chunks);
  } finally {
    tts.close();
  }
}

/**
 * Synthesize text with the official Azure Speech API (same voices as Edge TTS)
 */
async function synthesizeWithAzure(text: string, voice: string): Promise<Buffer> {
  if (!isAzureConfigured()) {
    throw new Error('Azure Speech backup is not configured');
  }

  const locale = voice.split('-').slice(0, 2).join('-');
  const ssml =
    `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="${locale}">` +
    `<voice name="${voice}">${escapeXml(text)}</voice></speak>`;

  const response = await fetch(
    `https://${process.env.AZURE_SPEECH_REGION}.tts.speech.microsoft.com/cognitiveservices/v1`,
    {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': process.env.AZURE_SPEECH_KEY!,
        'Content-Type': 'application/ssml+xml',
        'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3',
        'User-Agent': 'vorlesen',
      },
      body: ssml,
      signal: AbortSignal.timeout(30000),
    }
  );

  if (!response.ok) {
    throw new Error(`Azure Speech error: HTTP ${response.status} ${await response.text()}`);
  }

  return Buffer.from(await response.arrayBuffer());
}

/**
 * Try free Edge TTS first; if it fails, fall back to Azure Speech when configured
 */
async function synthesize(text: string, voice: string, provider?: 'azure'): Promise<Buffer> {
  if (provider === 'azure') {
    return synthesizeWithAzure(text, voice);
  }

  try {
    return await synthesizeWithEdge(text, voice);
  } catch (edgeError) {
    if (!isAzureConfigured()) {
      throw edgeError;
    }
    console.warn('Edge TTS failed, using Azure Speech backup:', (edgeError as Error).message);
    return synthesizeWithAzure(text, voice);
  }
}

/**
 * Convert text to speech using Edge TTS (free Microsoft neural voices),
 * with Azure Speech as a backup
 */
export async function convertToSpeech(
  request: TTSRequest,
  // Each attempt can take ~25s when Edge TTS is down, so retry less when the backup runs too
  retries: number = isAzureConfigured() ? 1 : 3
): Promise<TTSResponse> {
  try {
    // Pad with leading and trailing pauses so Edge TTS doesn't clip words
    const paddedText = '... ' + request.text.trimEnd() + ' .';
    const audio = await synthesize(paddedText, request.voice, request.provider);

    if (audio.byteLength === 0) {
      throw new Error('No audio data received');
    }

    const audioData = audio.toString('base64');

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
    console.error(`TTS attempt failed (${retries} retries left):`, err.message);

    if (retries > 0) {
      const backoffTime = Math.pow(2, 4 - retries) * 1000;
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
