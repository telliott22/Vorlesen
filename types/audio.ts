export interface TTSRequest {
  text: string;
  voice: string;
  format: string;
}

export interface TTSResponse {
  audioData: string; // base64
  durationSeconds: number;
  charactersUsed: number;
}

export interface ErrorResponse {
  error: string;
  code: ErrorCode;
  retryable: boolean;
  retryAfter?: number;
}

export enum ErrorCode {
  TEXT_EMPTY = 'TEXT_EMPTY',
  TEXT_TOO_LONG = 'TEXT_TOO_LONG',
  INVALID_VOICE = 'INVALID_VOICE',
  RATE_LIMIT = 'RATE_LIMIT',
  API_ERROR = 'API_ERROR',
  STORAGE_FULL = 'STORAGE_FULL',
  NETWORK_ERROR = 'NETWORK_ERROR',
  AUDIO_DECODE_ERROR = 'AUDIO_DECODE_ERROR',
}
