import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

// MSW server to mock Google Cloud TTS API
const server = setupServer(
  http.post('https://texttospeech.googleapis.com/v1/text:synthesize', () => {
    return HttpResponse.json({
      audioContent: 'bW9jayBhdWRpbyBkYXRh', // base64: "mock audio data"
    });
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('POST /api/tts-chunk', () => {
  const API_URL = 'http://localhost:3000/api/tts-chunk';

  it('should convert valid text to speech', async () => {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: 'The quick brown fox jumps over the lazy dog.',
        voice: 'en-US-Wavenet-D',
        format: 'mp3_44100_128',
      }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();

    expect(data).toHaveProperty('audioData');
    expect(data).toHaveProperty('durationSeconds');
    expect(data).toHaveProperty('charactersUsed');
    expect(typeof data.audioData).toBe('string');
    expect(typeof data.durationSeconds).toBe('number');
    expect(data.charactersUsed).toBe(44);
  });

  it('should return 400 for empty text', async () => {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: '',
        voice: 'en-US-Wavenet-D',
        format: 'mp3_44100_128',
      }),
    });

    expect(response.status).toBe(400);
    const data = await response.json();

    expect(data.error).toBe('Please paste some text to convert');
    expect(data.code).toBe('TEXT_EMPTY');
    expect(data.retryable).toBe(false);
  });

  it('should return 400 for text too long (>4000 chars)', async () => {
    const longText = 'a'.repeat(4001);
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: longText,
        voice: 'en-US-Wavenet-D',
        format: 'mp3_44100_128',
      }),
    });

    expect(response.status).toBe(400);
    const data = await response.json();

    expect(data.error).toBe('Text chunk too long (max 4000 characters)');
    expect(data.code).toBe('TEXT_TOO_LONG');
    expect(data.retryable).toBe(false);
  });

  it('should return 400 for invalid voice', async () => {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: 'Hello world',
        voice: 'invalid-voice',
        format: 'mp3_44100_128',
      }),
    });

    expect(response.status).toBe(400);
    const data = await response.json();

    expect(data.error).toBe('Invalid voice selected');
    expect(data.code).toBe('INVALID_VOICE');
    expect(data.retryable).toBe(false);
  });

  it('should handle rate limiting (429)', async () => {
    // Mock rate limit response
    server.use(
      http.post('https://texttospeech.googleapis.com/v1/text:synthesize', () => {
        return new HttpResponse(null, { status: 429 });
      })
    );

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: 'Test text',
        voice: 'en-US-Wavenet-D',
        format: 'mp3_44100_128',
      }),
    });

    expect(response.status).toBe(429);
    const data = await response.json();

    expect(data.error).toBe('Too many requests. Please wait.');
    expect(data.code).toBe('RATE_LIMIT');
    expect(data.retryable).toBe(true);
    expect(data).toHaveProperty('retryAfter');
  });
});
