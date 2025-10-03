import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

/**
 * GET /api/health
 * Health check endpoint for monitoring
 */
export async function GET() {
  const isConfigured =
    !!process.env.GOOGLE_CLOUD_TTS_API_KEY ||
    !!process.env.GOOGLE_APPLICATION_CREDENTIALS;

  return NextResponse.json(
    {
      status: 'ok',
      timestamp: new Date().toISOString(),
      ttsConfigured: isConfigured,
    },
    { status: 200 }
  );
}
