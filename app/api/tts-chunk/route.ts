import { NextRequest, NextResponse } from 'next/server';
import { convertToSpeech, validateRequest } from '@/lib/tts-client';
import { TTSRequest, ErrorCode, ErrorResponse } from '@/types/audio';

export const runtime = 'nodejs';
export const maxDuration = 60; // 60 seconds max for Vercel hobby plan

/**
 * POST /api/tts-chunk
 * Convert a single text chunk to speech using Google Cloud TTS
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request structure
    if (!body.text || !body.voice) {
      return NextResponse.json(
        {
          error: 'Missing required fields: text and voice',
          code: ErrorCode.TEXT_EMPTY,
          retryable: false,
        },
        { status: 400 }
      );
    }

    const ttsRequest: TTSRequest = {
      text: body.text,
      voice: body.voice,
      format: body.format || 'mp3',
    };

    // Validate request parameters
    try {
      validateRequest(ttsRequest);
    } catch (validationError) {
      const err = validationError as ErrorResponse;
      return NextResponse.json(err, { status: 400 });
    }

    // Convert to speech
    try {
      const response = await convertToSpeech(ttsRequest);

      return NextResponse.json(response, { status: 200 });
    } catch (apiError) {
      const err = apiError as ErrorResponse;
      // Handle rate limiting
      if (err.code === ErrorCode.RATE_LIMIT) {
        return NextResponse.json(err, {
          status: 429,
          headers: {
            'Retry-After': String(err.retryAfter || 5),
          },
        });
      }

      // Handle API errors
      if (err.code === ErrorCode.API_ERROR) {
        return NextResponse.json(err, {
          status: err.retryable ? 503 : 500,
        });
      }

      // Generic error
      return NextResponse.json(
        {
          error: 'Failed to convert text to speech',
          code: ErrorCode.API_ERROR,
          retryable: true,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Unexpected error in /api/tts-chunk:', error);

    return NextResponse.json(
      {
        error: 'Internal server error',
        code: ErrorCode.API_ERROR,
        retryable: false,
      },
      { status: 500 }
    );
  }
}
