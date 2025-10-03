# Data Model: Vorlesen

**Date**: 2025-10-03

## Overview
Vorlesen uses client-side data models only. No server-side database. All state is ephemeral (request-scoped) on the server or persisted in browser localStorage on the client.

---

## Client-Side Models (localStorage)

### StoredAudio
Represents a completed TTS conversion stored for replay.

**Fields**:
- `id`: `string` - Unique identifier (hash of text + voice + timestamp)
- `textPreview`: `string` - First 200 chars of original text for display
- `textHash`: `string` - SHA-256 hash of full text (for deduplication)
- `voice`: `string` - Voice ID used for generation (e.g., "en-US-Wavenet-D")
- `chunks`: `AudioChunk[]` - Array of audio chunk metadata
- `totalDuration`: `number` - Total audio length in seconds
- `createdAt`: `number` - Unix timestamp (milliseconds)
- `lastAccessedAt`: `number` - Unix timestamp for LRU eviction

**Validation Rules**:
- `id` must be unique
- `textPreview` max length 200 characters
- `voice` must match one of available voices
- `chunks` array must not be empty
- `totalDuration` must be positive
- `createdAt` <= `lastAccessedAt`

**State Transitions**: None (immutable once created)

**Storage Key**: `vorlesen_audio_{id}`

**Index Key**: `vorlesen_index` → JSON array of `{id, textPreview, createdAt, totalDuration}`

---

### AudioChunk
Represents a single TTS-generated audio segment.

**Fields**:
- `order`: `number` - Original sequence number (0-indexed)
- `textContent`: `string` - Text that generated this chunk (for debugging)
- `audioData`: `string` - Base64-encoded MP3 data
- `durationSeconds`: `number` - Chunk duration
- `generatedAt`: `number` - Unix timestamp

**Validation Rules**:
- `order` >= 0
- `textContent` max length 5,000 characters
- `audioData` must be valid base64
- `durationSeconds` > 0

**Storage**: Embedded in `StoredAudio.chunks` array

---

### ConversionRequest (transient, not persisted)
Tracks state during active conversion.

**Fields**:
- `requestId`: `string` - UUID for this conversion
- `text`: `string` - Full original text
- `voice`: `string` - Selected voice ID
- `chunks`: `TextChunk[]` - Text split into chunks
- `status`: `ConversionStatus` - Current state
- `progress`: `number` - Percentage complete (0-100)
- `completedChunks`: `AudioChunk[]` - Successfully generated chunks
- `failedChunks`: `FailedChunk[]` - Chunks that failed with error

**State Transitions**:
```
idle → splitting → processing → stitching → complete
                              ↓
                           failed (if all retries exhausted)
```

**Validation Rules**:
- `text` not empty
- `voice` must be valid
- `progress` between 0-100
- `status` must follow transition rules

---

### TextChunk
Represents a segment of text to be converted.

**Fields**:
- `order`: `number` - Sequence position
- `text`: `string` - Chunk text content
- `startIndex`: `number` - Character offset in original text
- `endIndex`: `number` - End character offset

**Validation Rules**:
- `text` length <= 4,000 characters
- `startIndex` < `endIndex`
- `endIndex` - `startIndex` == `text.length`

---

### FailedChunk
Tracks failed conversion attempts.

**Fields**:
- `order`: `number` - Original chunk order
- `text`: `string` - Text content
- `error`: `string` - Error message
- `attemptCount`: `number` - Number of retry attempts
- `lastAttemptAt`: `number` - Unix timestamp

**Validation Rules**:
- `attemptCount` >= 1
- `error` not empty

---

## Server-Side Models (Request-Scoped)

### TTSRequest
API request payload for TTS conversion.

**Fields**:
- `text`: `string` - Text to convert (max 4,000 chars per chunk)
- `voice`: `string` - Voice ID
- `format`: `string` - Audio format (always "mp3_44100_128")

**Validation Rules**:
- `text` length 1-4,000 characters
- `text` not empty/whitespace
- `voice` must match Google Cloud TTS voice ID pattern (e.g., "en-US-Wavenet-D")
- `format` must be "mp3_44100_128"

**Example**:
```json
{
  "text": "The quick brown fox jumps over the lazy dog.",
  "voice": "en-US-Wavenet-D",
  "format": "mp3_44100_128"
}
```

---

### TTSResponse
API response from TTS conversion.

**Fields**:
- `audioData`: `Buffer` - Binary MP3 audio data
- `durationSeconds`: `number` - Audio length
- `charactersUsed`: `number` - Characters billed

**Validation Rules**:
- `audioData` not empty
- `durationSeconds` > 0
- `charactersUsed` matches request text length

**Example**:
```json
{
  "audioData": "<binary MP3>",
  "durationSeconds": 2.4,
  "charactersUsed": 44
}
```

---

### ErrorResponse
Standardized API error format.

**Fields**:
- `error`: `string` - Error message (user-friendly)
- `code`: `string` - Error code (e.g., "TEXT_TOO_LONG", "INVALID_VOICE")
- `retryable`: `boolean` - Whether client should retry
- `retryAfter?`: `number` - Seconds to wait before retry (for rate limits)

**Example**:
```json
{
  "error": "Too many requests. Please wait.",
  "code": "RATE_LIMIT",
  "retryable": true,
  "retryAfter": 5
}
```

---

## Enums

### ConversionStatus
```typescript
enum ConversionStatus {
  IDLE = "idle",
  SPLITTING = "splitting",
  PROCESSING = "processing",
  STITCHING = "stitching",
  COMPLETE = "complete",
  FAILED = "failed"
}
```

### ErrorCode
```typescript
enum ErrorCode {
  TEXT_EMPTY = "TEXT_EMPTY",
  TEXT_TOO_LONG = "TEXT_TOO_LONG",
  INVALID_VOICE = "INVALID_VOICE",
  RATE_LIMIT = "RATE_LIMIT",
  API_ERROR = "API_ERROR",
  STORAGE_FULL = "STORAGE_FULL",
  NETWORK_ERROR = "NETWORK_ERROR",
  AUDIO_DECODE_ERROR = "AUDIO_DECODE_ERROR"
}
```

---

## Relationships

```
StoredAudio (1) ----< (N) AudioChunk
  └─ contains ordered array of chunks

ConversionRequest (1) ----< (N) TextChunk
  └─ splits text into chunks

ConversionRequest (1) ----< (N) FailedChunk
  └─ tracks failed conversion attempts
```

---

## Storage Strategy

### localStorage Keys
- `vorlesen_index`: JSON array of audio metadata for listing
- `vorlesen_audio_{id}`: Full StoredAudio object
- `vorlesen_settings`: User preferences (last used voice, etc.)

### Size Management
- **Target limit**: 5MB total storage
- **Per-audio limit**: ~1.5MB (1 minute @ 128kbps MP3 + 33% base64 overhead)
- **Max stored audios**: ~3 full conversions
- **Eviction policy**: Oldest `createdAt` timestamp deleted first when >80% capacity

### Calculation
```typescript
function estimateSize(audio: StoredAudio): number {
  // base64 overhead: *1.33, JSON overhead: *1.1
  return audio.chunks.reduce((sum, chunk) =>
    sum + chunk.audioData.length, 0
  ) * 1.33 * 1.1;
}
```

---

## Data Flow

### 1. User Pastes Text → Conversion
```
User Input (text, voice)
  ↓
ConversionRequest created (transient)
  ↓
Text split into TextChunks
  ↓
For each chunk: POST /api/tts-chunk
  ↓
AudioChunk created from response
  ↓
All chunks → stitch into single audio
  ↓
StoredAudio created → save to localStorage
```

### 2. User Plays Saved Audio
```
Read vorlesen_index from localStorage
  ↓
User selects audio by ID
  ↓
Load vorlesen_audio_{id}
  ↓
Decode base64 chunks → ArrayBuffer[]
  ↓
Create Blob URL → <audio src={url} />
  ↓
Update lastAccessedAt
```

### 3. Storage Full → Eviction
```
Check localStorage usage before save
  ↓
If >80% capacity:
  ↓
Read vorlesen_index
  ↓
Sort by createdAt (oldest first)
  ↓
Delete oldest StoredAudio
  ↓
Update vorlesen_index
  ↓
Retry save
```

---

## Type Definitions (TypeScript)

```typescript
// types/storage.ts
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

// types/tts.ts
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

// types/audio.ts
export interface TTSRequest {
  text: string;
  voice: string;
  format: string;
}

export interface TTSResponse {
  audioData: Buffer;
  durationSeconds: number;
  charactersUsed: number;
}

export interface ErrorResponse {
  error: string;
  code: ErrorCode;
  retryable: boolean;
  retryAfter?: number;
}

export enum ConversionStatus {
  IDLE = "idle",
  SPLITTING = "splitting",
  PROCESSING = "processing",
  STITCHING = "stitching",
  COMPLETE = "complete",
  FAILED = "failed"
}

export enum ErrorCode {
  TEXT_EMPTY = "TEXT_EMPTY",
  TEXT_TOO_LONG = "TEXT_TOO_LONG",
  INVALID_VOICE = "INVALID_VOICE",
  RATE_LIMIT = "RATE_LIMIT",
  API_ERROR = "API_ERROR",
  STORAGE_FULL = "STORAGE_FULL",
  NETWORK_ERROR = "NETWORK_ERROR",
  AUDIO_DECODE_ERROR = "AUDIO_DECODE_ERROR"
}
```

---

**Status**: ✅ Data model complete
