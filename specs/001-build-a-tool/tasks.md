# Tasks: Vorlesen - Author Proofreading TTS Tool

**Input**: Design documents from `/Users/tim/Code/Tim/text-to-speech/text-to-speech/specs/001-build-a-tool/`
**Prerequisites**: plan.md, research.md, data-model.md, contracts/, quickstart.md

## Execution Flow (main)
```
1. Load plan.md from feature directory ✅
   → Tech stack: Next.js 14, TypeScript 5, React 18, ShadCN, Tailwind, Google Cloud TTS
   → Structure: Next.js App Router (app/, components/, lib/, types/, tests/)
2. Load optional design documents ✅
   → data-model.md: 8 entities (StoredAudio, AudioChunk, ConversionRequest, TextChunk, etc.)
   → contracts/: 1 file (tts-chunk.openapi.yaml) → POST /api/tts-chunk, GET /api/health
   → research.md: Google Cloud TTS, lamejs, Web Audio API decisions
3. Generate tasks by category ✅
   → Setup: 4 tasks
   → Tests: 3 tasks [P]
   → Types: 3 tasks [P]
   → Core Libraries: 5 tasks
   → API Routes: 2 tasks
   → Components: 7 tasks (5 parallel)
   → Pages: 3 tasks
   → Integration/Polish: 5 tasks
4. Apply task rules ✅
   → Tests before implementation (TDD)
   → [P] for independent files
   → Dependencies: types → libs → API → components → pages
5. Number tasks sequentially: T001-T032 (32 tasks total)
6. Validate task completeness ✅
   → ✅ All contracts have tests
   → ✅ All entities have type definitions
   → ✅ All endpoints implemented
9. Return: SUCCESS (tasks ready for execution)
```

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions

## Path Conventions
Next.js 14 App Router structure:
- `app/` - Pages and API routes
- `components/` - React components
- `lib/` - Utilities and services
- `types/` - TypeScript type definitions
- `tests/` - Test files (e2e/, integration/, unit/)

---

## Phase 3.1: Setup

- [x] T001 Initialize Next.js 14 project with TypeScript and Tailwind CSS at repository root
  ```bash
  npx create-next-app@latest . --typescript --tailwind --app --src-dir=false --import-alias="@/*"
  ```

- [x] T002 Install core dependencies
  ```bash
  npm install @google-cloud/text-to-speech lamejs
  npm install -D @playwright/test vitest @vitest/ui msw
  ```

- [x] T003 [P] Install and configure ShadCN UI components
  ```bash
  npx shadcn-ui@latest init
  npx shadcn-ui@latest add button textarea select card progress
  ```

- [x] T004 [P] Create .env.example file with required environment variables
  ```
  GOOGLE_CLOUD_TTS_API_KEY=your_api_key_here
  # Or use service account:
  # GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
  ```

---

## Phase 3.2: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.3

**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**

- [x] T005 [P] Contract test for POST /api/tts-chunk in tests/integration/tts-api.test.ts
  - Test valid request with text, voice, format
  - Assert response schema: audioData (base64), durationSeconds, charactersUsed
  - Test 400 errors: empty text, text too long (>4000 chars), invalid voice
  - Test 429 rate limit handling
  - Use MSW to mock Google Cloud TTS API
  - **MUST FAIL** initially (no implementation yet)

- [x] T006 [P] E2E test for paste-generate-play flow in tests/e2e/paste-generate-play.spec.ts
  - Navigate to home page
  - Paste short text (100 words) into textarea
  - Select voice from dropdown
  - Click "Generate Speech" button
  - Assert loading indicator appears
  - Wait for completion
  - Assert audio player appears
  - Click play button, assert audio plays
  - Test playback controls (pause, seek, speed)
  - **MUST FAIL** initially (no components exist)

- [x] T007 [P] E2E test for chunking long text in tests/e2e/chunking.spec.ts
  - Paste long text (10,000 words)
  - Generate speech
  - Assert progress bar appears and updates
  - Verify multiple API calls (chunking logic)
  - Wait for completion
  - Assert audio plays seamlessly (no gaps)
  - **MUST FAIL** initially

---

## Phase 3.3: Type Definitions

- [ ] T008 [P] Create storage types in types/storage.ts
  ```typescript
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
  ```

- [ ] T009 [P] Create TTS types in types/tts.ts
  ```typescript
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
    IDLE = "idle",
    SPLITTING = "splitting",
    PROCESSING = "processing",
    STITCHING = "stitching",
    COMPLETE = "complete",
    FAILED = "failed"
  }
  ```

- [ ] T010 [P] Create API types in types/audio.ts
  ```typescript
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

## Phase 3.4: Core Libraries

- [ ] T011 Create text chunking utility in lib/audio-chunker.ts
  - Function: `chunkText(text: string, maxChars: number = 4000): TextChunk[]`
  - Split on sentence boundaries (. ! ? followed by whitespace)
  - Handle edge cases: abbreviations (Dr., Mr.), ellipsis (...), decimals
  - Ensure no chunk exceeds maxChars
  - Return TextChunk array with order, text, startIndex, endIndex
  - Add unit tests in tests/unit/audio-chunker.test.ts

- [ ] T012 Create Google Cloud TTS client wrapper in lib/tts-client.ts
  - Function: `convertToSpeech(request: TTSRequest): Promise<TTSResponse>`
  - Initialize Google Cloud TTS client with API key from env
  - Call textToSpeech.synthesizeSpeech() with request
  - Return base64-encoded MP3 audio data
  - Handle errors: rate limits (429), auth (401), API errors (500)
  - Implement exponential backoff for retries (up to 3 attempts)

- [ ] T013 Create audio stitching utility in lib/audio-stitcher.ts
  - Function: `stitchAudioChunks(chunks: AudioChunk[]): Promise<Blob>`
  - Use Web Audio API to decode MP3 chunks to PCM
  - Concatenate PCM buffers in order
  - Re-encode to MP3 using lamejs library
  - Return Blob suitable for audio player or download
  - Handle errors: decode failures, encoding errors

- [ ] T014 Create localStorage wrapper in lib/storage.ts
  - Function: `saveAudio(audio: StoredAudio): void`
  - Function: `loadAudio(id: string): StoredAudio | null`
  - Function: `listAudios(): Array<{id, textPreview, createdAt, totalDuration}>`
  - Function: `deleteAudio(id: string): void`
  - Function: `estimateStorageUsage(): number` (in bytes)
  - Implement LRU eviction when >80% capacity (5MB limit)
  - Store index in `vorlesen_index`, audios in `vorlesen_audio_{id}`

- [ ] T015 Create utility helpers in lib/utils.ts
  - Function: `generateHash(text: string): string` (SHA-256)
  - Function: `generateUUID(): string`
  - Function: `formatDuration(seconds: number): string` (e.g., "2:34")
  - Function: `cn(...classes: string[]): string` (Tailwind class merger)
  - Re-export from ShadCN utils if available

---

## Phase 3.5: API Routes

- [ ] T016 Implement POST /api/tts-chunk in app/api/tts-chunk/route.ts
  - Parse request body: { text, voice, format }
  - Validate: text length 1-4000 chars, voice matches pattern, format is "mp3_44100_128"
  - Call lib/tts-client.convertToSpeech()
  - Return JSON: { audioData, durationSeconds, charactersUsed }
  - Error handling: return ErrorResponse with appropriate code
  - **Tests from T005 should now PASS**

- [ ] T017 Implement GET /api/health in app/api/health/route.ts
  - Return JSON: { status: "ok", timestamp: Date.now() }
  - Simple health check endpoint

---

## Phase 3.6: UI Components

- [ ] T018 [P] Create text input component in components/text-input.tsx
  - Textarea with ShadCN styling
  - Props: value, onChange, placeholder, maxLength (optional display)
  - ARIA: aria-label="Paste your text here"
  - Auto-resize height based on content
  - Character count display

- [ ] T019 [P] Create voice selector component in components/voice-selector.tsx
  - Select dropdown with ShadCN Select component
  - Options: en-US-Wavenet-D (Male), en-US-Wavenet-F (Female), en-US-Neural2-A (Male)
  - Props: value, onChange
  - ARIA: aria-label="Choose voice"
  - Display friendly names: "Wavenet D (Male)", etc.

- [ ] T020 [P] Create progress indicator in components/progress-indicator.tsx
  - Progress bar with ShadCN Progress component
  - Props: progress (0-100), status (idle/processing/complete/failed)
  - Display percentage text: "35% complete"
  - ARIA: role="progressbar", aria-valuenow, aria-valuemin=0, aria-valuemax=100
  - Show status message: "Generating speech..." or "Complete!"

- [ ] T021 [P] Create error display in components/error-display.tsx
  - Card with ShadCN Card component
  - Props: error (ErrorResponse), onRetry (optional callback)
  - Display user-friendly error message
  - Show "Retry" button if retryable is true
  - ARIA: role="alert", aria-live="assertive"
  - Auto-dismiss after 10 seconds (optional)

- [ ] T022 [P] Create audio player component in components/audio-player.tsx
  - Native HTML5 <audio> element with custom controls
  - Props: audioSrc (Blob URL), onPlay, onPause
  - Controls: play/pause, seek bar, current time / duration
  - Speed control buttons: 0.5x, 1x, 1.5x, 2x
  - Download button
  - ARIA: native <audio> has built-in accessibility

- [ ] T023 Main page component in app/page.tsx (Part 1: State & Handlers)
  - Import all components from Phase 3.6
  - useState for: text, voice, conversionRequest, audioBlob, error
  - Handler: handleGenerate() - chunks text, calls /api/tts-chunk for each chunk, updates progress
  - Handler: handlePlay() - creates Blob URL from stitched audio
  - Handler: handleDownload() - triggers download of audio file
  - Handler: handleRetry() - retries failed chunks

- [ ] T024 Main page component in app/page.tsx (Part 2: Rendering)
  - Layout: centered card with text input, voice selector, generate button
  - Conditional rendering: show progress indicator during generation
  - Conditional rendering: show audio player when complete
  - Conditional rendering: show error display on failure
  - Apply Tailwind classes for responsive design
  - **E2E tests from T006-T007 should now PASS**

---

## Phase 3.7: Root Layout & Styles

- [ ] T025 Update root layout in app/layout.tsx
  - Set up HTML lang="en"
  - Add metadata: title "Vorlesen - Text to Speech for Authors", description
  - Include font optimization (next/font)
  - Wrap children with any providers (if needed for state management)

- [ ] T026 Update global styles in app/globals.css
  - Tailwind directives: @tailwind base, components, utilities
  - Custom CSS variables for theming (if needed)
  - Typography styles for better readability
  - Focus visible styles for accessibility

- [ ] T027 Create .gitignore entries
  - Add .env.local, node_modules/, .next/, out/, service-account.json

---

## Phase 3.8: Integration & Polish

- [ ] T028 [P] Accessibility audit
  - Run axe-core or Lighthouse accessibility scan
  - Verify all interactive elements have ARIA labels
  - Test keyboard navigation: Tab through all controls
  - Test screen reader (VoiceOver/NVDA): verify announcements
  - Ensure color contrast meets WCAG 2.1 AA (4.5:1 for text)
  - Fix any issues found

- [ ] T029 [P] localStorage persistence integration
  - After audio generation, call lib/storage.saveAudio()
  - On page load, call lib/storage.listAudios() and display recent audios
  - Add "Load Previous" section to UI (list of saved audios)
  - Click saved audio → load instantly without regeneration
  - Update lastAccessedAt on load

- [ ] T030 [P] Error handling refinement
  - Test all error scenarios from quickstart.md (empty text, network offline, rate limit)
  - Ensure ErrorResponse codes map to user-friendly messages
  - Test retry logic: automatic exponential backoff
  - Test manual retry button for failed chunks

- [ ] T031 Cross-browser testing
  - Test on Chrome, Firefox, Safari, Edge (latest versions)
  - Verify Web Audio API works (Safari may need polyfill)
  - Test localStorage limits (5-10MB)
  - Verify MP3 playback in all browsers

- [ ] T032 Run manual testing suite from quickstart.md
  - Execute all 15 test scenarios
  - Record pass/fail for each test
  - Fix any failing tests
  - Document any known issues or browser-specific behaviors

---

## Dependencies

**Setup before everything**:
- T001-T004 must complete before any other tasks

**Tests before implementation (TDD)**:
- T005-T007 (tests) before T016-T024 (implementation)

**Types before libraries**:
- T008-T010 (types) before T011-T015 (libraries)

**Libraries before API**:
- T011-T015 (libraries) before T016-T017 (API routes)

**API before components**:
- T016-T017 (API) before T023-T024 (page components that call API)

**Components before pages**:
- T018-T022 (components) before T023-T024 (page that uses components)

**Pages before polish**:
- T023-T026 (pages/layout) before T028-T032 (integration/polish)

**Blocking dependencies**:
- T011 (audio-chunker) blocks T023 (page generation logic)
- T012 (tts-client) blocks T016 (API route)
- T013 (audio-stitcher) blocks T023 (page stitching logic)
- T014 (storage) blocks T029 (persistence integration)
- T018-T022 (all components) block T023-T024 (page assembly)

---

## Parallel Execution Examples

### Parallel Group 1: Setup (after T001-T002)
```bash
# Launch T003-T004 together:
Task: "Install and configure ShadCN UI components"
Task: "Create .env.example file with required environment variables"
```

### Parallel Group 2: Tests (TDD phase)
```bash
# Launch T005-T007 together:
Task: "Contract test for POST /api/tts-chunk in tests/integration/tts-api.test.ts"
Task: "E2E test for paste-generate-play flow in tests/e2e/paste-generate-play.spec.ts"
Task: "E2E test for chunking long text in tests/e2e/chunking.spec.ts"
```

### Parallel Group 3: Type Definitions
```bash
# Launch T008-T010 together:
Task: "Create storage types in types/storage.ts"
Task: "Create TTS types in types/tts.ts"
Task: "Create API types in types/audio.ts"
```

### Parallel Group 4: UI Components
```bash
# Launch T018-T022 together:
Task: "Create text input component in components/text-input.tsx"
Task: "Create voice selector component in components/voice-selector.tsx"
Task: "Create progress indicator in components/progress-indicator.tsx"
Task: "Create error display in components/error-display.tsx"
Task: "Create audio player component in components/audio-player.tsx"
```

### Parallel Group 5: Integration & Polish
```bash
# Launch T028-T030 together:
Task: "Accessibility audit"
Task: "localStorage persistence integration"
Task: "Error handling refinement"
```

---

## Notes

- **[P] tasks** = different files, no dependencies, can run in parallel
- **Verify tests fail** before implementing (TDD discipline)
- **Commit after each task** for clean history
- **Avoid vague tasks** - each task has specific file path and clear deliverable
- **Same file conflicts** - T023 and T024 both edit app/page.tsx, so T024 must wait for T023

---

## Validation Checklist

- [x] All contracts have corresponding tests (T005 tests POST /api/tts-chunk)
- [x] All entities have type definitions (T008-T010 cover all entities from data-model.md)
- [x] All tests come before implementation (T005-T007 before T016-T024)
- [x] Parallel tasks truly independent (verified no file conflicts in [P] tasks)
- [x] Each task specifies exact file path (all tasks have explicit paths)
- [x] No task modifies same file as another [P] task (T023/T024 sequential, not [P])

---

**Total Tasks**: 32
**Parallelizable Tasks**: 15 (marked with [P])
**Estimated Completion Time**: 20-30 hours (depending on experience level)

**Ready for execution**: ✅ All tasks are specific, testable, and dependency-ordered
