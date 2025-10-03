export interface StoredAudio {
  id: string;
  textPreview: string;
  textHash: string;
  voice: string;
  chunks: AudioChunk[];
  totalDuration: number;
  createdAt: number;
  lastAccessedAt: number;
}

export interface AudioChunk {
  order: number;
  textContent: string;
  audioData: string; // base64
  durationSeconds: number;
  generatedAt: number;
}
