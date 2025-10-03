import { AudioChunk } from './storage';

export interface ConversionRequest {
  requestId: string;
  text: string;
  voice: string;
  chunks: TextChunk[];
  status: ConversionStatus;
  progress: number;
  completedChunks: AudioChunk[];
  failedChunks: FailedChunk[];
}

export interface TextChunk {
  order: number;
  text: string;
  startIndex: number;
  endIndex: number;
}

export interface FailedChunk {
  order: number;
  text: string;
  error: string;
  attemptCount: number;
  lastAttemptAt: number;
}

export enum ConversionStatus {
  IDLE = 'idle',
  SPLITTING = 'splitting',
  PROCESSING = 'processing',
  STITCHING = 'stitching',
  COMPLETE = 'complete',
  FAILED = 'failed',
}
