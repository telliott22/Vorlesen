import { NextResponse } from 'next/server';
import { isAzureConfigured } from '@/lib/tts-client';

export const runtime = 'nodejs';

/**
 * GET /api/health
 * Health check endpoint for monitoring
 */
export async function GET() {
  return NextResponse.json(
    {
      status: 'ok',
      timestamp: new Date().toISOString(),
      ttsConfigured: true, // Edge TTS needs no credentials
      azureBackupConfigured: isAzureConfigured(),
    },
    { status: 200 }
  );
}
