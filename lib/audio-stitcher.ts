import { AudioChunk } from '@/types/storage';

/**
 * Stitch multiple audio chunks into a single MP3 blob
 * Uses simple binary concatenation - MP3 files can be joined at byte level
 *
 * @param chunks - Array of AudioChunk objects (base64 MP3 data)
 * @returns Promise<Blob> - Single MP3 blob
 */
export async function stitchAudioChunks(chunks: AudioChunk[]): Promise<Blob> {
  if (chunks.length === 0) {
    throw new Error('No audio chunks to stitch');
  }

  // Sort chunks by order to ensure correct sequencing
  const sortedChunks = [...chunks].sort((a, b) => a.order - b.order);

  // Convert all base64 chunks to ArrayBuffers and concatenate
  const audioBuffers = sortedChunks.map((chunk) => base64ToArrayBuffer(chunk.audioData));

  // Create a single blob from all audio data
  // MP3 format supports binary concatenation for seamless playback
  return new Blob(audioBuffers, { type: 'audio/mpeg' });
}

/**
 * Convert base64 string to ArrayBuffer
 */
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Create a blob URL from audio chunks for playback
 */
export async function createAudioURL(chunks: AudioChunk[]): Promise<string> {
  const blob = await stitchAudioChunks(chunks);
  return URL.createObjectURL(blob);
}
