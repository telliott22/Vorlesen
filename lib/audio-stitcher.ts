import { AudioChunk } from '@/types/storage';

/**
 * Stitch multiple audio chunks into a single audio blob.
 * Single chunk: pass through as MP3.
 * Multiple chunks: decode with AudioContext and concatenate as WAV
 * to avoid glitches from naive MP3 binary concatenation.
 */
export async function stitchAudioChunks(chunks: AudioChunk[]): Promise<Blob> {
  if (chunks.length === 0) {
    throw new Error('No audio chunks to stitch');
  }

  const sortedChunks = [...chunks].sort((a, b) => a.order - b.order);

  if (sortedChunks.length === 1) {
    const buffer = base64ToArrayBuffer(sortedChunks[0].audioData);
    return new Blob([buffer], { type: 'audio/mpeg' });
  }

  const audioContext = new AudioContext();

  try {
    const decodedBuffers: AudioBuffer[] = [];

    for (const chunk of sortedChunks) {
      const arrayBuffer = base64ToArrayBuffer(chunk.audioData);
      const decoded = await audioContext.decodeAudioData(arrayBuffer.slice(0));
      decodedBuffers.push(decoded);
    }

    const sampleRate = decodedBuffers[0].sampleRate;
    const channels = decodedBuffers[0].numberOfChannels;
    const totalLength = decodedBuffers.reduce((sum, buf) => sum + buf.length, 0);

    const combined = audioContext.createBuffer(channels, totalLength, sampleRate);

    let offset = 0;
    for (const buffer of decodedBuffers) {
      for (let ch = 0; ch < channels; ch++) {
        combined.getChannelData(ch).set(buffer.getChannelData(ch), offset);
      }
      offset += buffer.length;
    }

    return audioBufferToWav(combined);
  } finally {
    await audioContext.close();
  }
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

export async function createAudioURL(chunks: AudioChunk[]): Promise<string> {
  const blob = await stitchAudioChunks(chunks);
  return URL.createObjectURL(blob);
}

function audioBufferToWav(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const bitDepth = 16;
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;
  const dataSize = buffer.length * blockAlign;
  const headerSize = 44;

  const arrayBuffer = new ArrayBuffer(headerSize + dataSize);
  const view = new DataView(arrayBuffer);

  writeString(view, 0, 'RIFF');
  view.setUint32(4, headerSize + dataSize - 8, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  const channelData: Float32Array[] = [];
  for (let ch = 0; ch < numChannels; ch++) {
    channelData.push(buffer.getChannelData(ch));
  }

  let offset = headerSize;
  for (let i = 0; i < buffer.length; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      const sample = Math.max(-1, Math.min(1, channelData[ch][i]));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
      offset += 2;
    }
  }

  return new Blob([arrayBuffer], { type: 'audio/wav' });
}

function writeString(view: DataView, offset: number, str: string): void {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}
