import { AudioChunk } from '@/types/storage';
import lamejs from 'lamejs';

/**
 * Stitch multiple audio chunks into a single MP3 blob
 * Uses Web Audio API to decode and concatenate, then lamejs to encode
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

  // If only one chunk, return it directly
  if (sortedChunks.length === 1) {
    const audioData = base64ToArrayBuffer(sortedChunks[0].audioData);
    return new Blob([audioData], { type: 'audio/mpeg' });
  }

  // Create AudioContext for decoding
  const audioContext = new AudioContext();
  const decodedBuffers: AudioBuffer[] = [];

  // Decode all chunks
  for (const chunk of sortedChunks) {
    const arrayBuffer = base64ToArrayBuffer(chunk.audioData);
    try {
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      decodedBuffers.push(audioBuffer);
    } catch (error) {
      console.error('Failed to decode audio chunk:', error);
      throw new Error(`Failed to decode audio chunk ${chunk.order}`);
    }
  }

  // Calculate total length
  const totalLength = decodedBuffers.reduce((sum, buffer) => sum + buffer.length, 0);
  const numberOfChannels = decodedBuffers[0].numberOfChannels;
  const sampleRate = decodedBuffers[0].sampleRate;

  // Create offline context for stitching
  const offlineContext = new OfflineAudioContext(numberOfChannels, totalLength, sampleRate);

  // Create buffer sources and schedule them sequentially
  let offset = 0;
  for (const buffer of decodedBuffers) {
    const source = offlineContext.createBufferSource();
    source.buffer = buffer;
    source.connect(offlineContext.destination);
    source.start(offset / sampleRate);
    offset += buffer.length;
  }

  // Render the stitched audio
  const stitchedBuffer = await offlineContext.startRendering();

  // Encode to MP3 using lamejs
  const mp3Data = encodeToMP3(stitchedBuffer);

  // Convert to ArrayBuffer for Blob (cast needed for TypeScript compatibility)
  return new Blob([mp3Data as unknown as BlobPart], { type: 'audio/mpeg' });
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
 * Encode AudioBuffer to MP3 using lamejs
 */
function encodeToMP3(audioBuffer: AudioBuffer): Uint8Array {
  const channels = audioBuffer.numberOfChannels;
  const sampleRate = audioBuffer.sampleRate;
  const kbps = 128;

  const mp3encoder = new lamejs.Mp3Encoder(channels, sampleRate, kbps);
  const mp3Data: Uint8Array[] = [];

  const sampleBlockSize = 1152; // Standard MP3 frame size
  const samples = channels === 2
    ? [
        convertToInt16(audioBuffer.getChannelData(0)),
        convertToInt16(audioBuffer.getChannelData(1))
      ]
    : [convertToInt16(audioBuffer.getChannelData(0))];

  for (let i = 0; i < samples[0].length; i += sampleBlockSize) {
    const leftChunk = samples[0].subarray(i, i + sampleBlockSize);
    const rightChunk = channels === 2
      ? samples[1].subarray(i, i + sampleBlockSize)
      : leftChunk;

    const mp3buf = mp3encoder.encodeBuffer(leftChunk, rightChunk);
    if (mp3buf.length > 0) {
      mp3Data.push(mp3buf);
    }
  }

  // Flush remaining data
  const finalBuf = mp3encoder.flush();
  if (finalBuf.length > 0) {
    mp3Data.push(finalBuf);
  }

  // Concatenate all MP3 chunks
  const totalLength = mp3Data.reduce((sum, chunk) => sum + chunk.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of mp3Data) {
    result.set(chunk, offset);
    offset += chunk.length;
  }

  return result;
}

/**
 * Convert Float32Array to Int16Array for MP3 encoding
 */
function convertToInt16(buffer: Float32Array): Int16Array {
  const int16 = new Int16Array(buffer.length);
  for (let i = 0; i < buffer.length; i++) {
    const s = Math.max(-1, Math.min(1, buffer[i]));
    int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return int16;
}

/**
 * Create a blob URL from audio chunks for playback
 */
export async function createAudioURL(chunks: AudioChunk[]): Promise<string> {
  const blob = await stitchAudioChunks(chunks);
  return URL.createObjectURL(blob);
}
