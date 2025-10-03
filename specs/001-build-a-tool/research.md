# Research: Vorlesen TTS Implementation

**Date**: 2025-10-03
**Status**: Complete

## Research Questions

### 1. TTS Provider Selection

**Decision**: ElevenLabs API

**Rationale**:
- High-quality, natural-sounding voices (meets FR-003)
- Cost-effective: ~$0.30 per 1K characters ($3 for 10K words typical manuscript)
- REST API with simple integration
- Supports MP3 output natively
- Multiple voice options (male/female) for FR-011
- Streaming support for chunked processing
- 5,000 character limit per request → natural chunking boundary

**Alternatives Considered**:
- **Google Cloud TTS**: $4 per 1M characters (cheaper), but less natural voices, more complex auth
- **Amazon Polly**: $4 per 1M characters, good quality, but requires AWS SDK complexity
- **Azure Speech**: Similar quality, but higher complexity for serverless setup
- **OpenAI TTS**: $15 per 1M characters, excellent quality but 5x more expensive

**Implementation Notes**:
- API key stored in Vercel environment variables
- Rate limit: 10 requests/second (sufficient for chunked processing)
- Text chunking at sentence boundaries, max 4,000 chars per chunk (safety margin)

---

### 2. Audio Chunking Strategy

**Decision**: Sentence-boundary chunking with 4,000 character limit

**Rationale**:
- ElevenLabs has 5,000 char limit; 4,000 provides safety margin
- Sentence boundaries prevent mid-word cuts that sound unnatural
- Average sentence: 15-25 words (~100-150 characters) - good granularity
- 4,000 chars ≈ 25-30 sentences ≈ 1-2 minutes audio
- Progress updates every chunk align with 5-second constitutional target

**Alternatives Considered**:
- **Fixed 5K chunks**: Risks mid-word cuts, poor UX
- **Paragraph boundaries**: Too large, inconsistent (some paragraphs 10K+ chars)
- **Word boundaries**: Too small, excessive API calls, rate limit risk

**Implementation Notes**:
- Use regex to split on `.!?` followed by whitespace
- Handle edge cases: abbreviations (Dr., Mr.), ellipsis (...), decimal numbers
- Preserve original text metadata for stitching order
- Queue chunks with exponential backoff retry

---

### 3. MP3 Stitching in Browser

**Decision**: Use `AudioContext` + `OfflineAudioContext` for concatenation

**Rationale**:
- Native Web Audio API - no external dependencies
- Works in all modern browsers (Chrome, Firefox, Safari, Edge)
- Can decode MP3 → PCM → re-encode to single MP3
- Maintains audio quality without transcoding loss
- Lightweight (~100 lines of code)

**Alternatives Considered**:
- **ffmpeg.wasm**: 25MB WASM binary, overkill for simple concatenation
- **lamejs**: Pure JS MP3 encoder, but slower and larger than native AudioContext
- **Server-side stitching**: Violates serverless/stateless principle, storage complexity

**Implementation Notes**:
```typescript
// Pseudo-code for stitching
async function stitchChunks(chunks: ArrayBuffer[]): Promise<Blob> {
  const audioContext = new AudioContext();
  const decodedChunks = await Promise.all(
    chunks.map(chunk => audioContext.decodeAudioData(chunk))
  );

  const totalLength = decodedChunks.reduce((sum, buf) => sum + buf.length, 0);
  const offlineContext = new OfflineAudioContext(2, totalLength, 44100);

  let offset = 0;
  decodedChunks.forEach(buffer => {
    const source = offlineContext.createBufferSource();
    source.buffer = buffer;
    source.connect(offlineContext.destination);
    source.start(offset / 44100);
    offset += buffer.length;
  });

  const stitched = await offlineContext.startRendering();
  return encodeToMP3(stitched); // Using MediaRecorder or lamejs
}
```

**Challenge**: AudioContext can decode MP3, but native encoding requires MediaRecorder (which produces WebM/Opus by default). May need lamejs for true MP3 output, or accept WebM for in-browser playback and convert to MP3 only for download if needed.

**Resolution**: Store chunks as base64 MP3s in localStorage. For playback, create blob URLs from concatenated chunks. For download, use lamejs for final MP3 encoding (~100KB lib, acceptable).

---

### 4. localStorage Strategy

**Decision**: Store audio as base64-encoded chunks with metadata index

**Rationale**:
- localStorage limit: 5-10MB per origin (browser-dependent)
- 1 minute MP3 @ 128kbps ≈ 1MB
- Base64 encoding adds 33% overhead → 1.3MB per minute
- Can store ~4 minutes audio safely (5,000-word story ≈ 3-4 minutes)
- For longer texts: store most recent chunks, discard oldest
- Metadata tracks chunk order, voice, timestamp

**Alternatives Considered**:
- **IndexedDB**: More storage (50MB+), but overkill and more complex API
- **Cache API**: Designed for network resources, awkward for generated audio
- **SessionStorage**: Only 5MB and lost on tab close, doesn't meet FR-015

**Implementation Notes**:
```typescript
interface StoredAudio {
  id: string;               // hash of text + voice
  text: string;             // original text (first 500 chars for display)
  voice: string;            // voice ID used
  chunks: string[];         // base64 MP3 chunks
  chunkOrder: number[];     // original order if shuffled
  createdAt: number;        // timestamp
  totalDuration: number;    // seconds
}
```

- Use LRU eviction if storage exceeds 80% capacity
- Compression: gzip text before storing (can reduce 50-70% for prose)
- Index structure: `audio_index` → array of metadata, `audio_{id}_chunk_{n}` → chunk data

---

### 5. Progress Tracking & Streaming

**Decision**: Client-side chunking with sequential API calls + progress hooks

**Rationale**:
- Next.js API routes don't support true streaming responses (no SSE in Vercel Edge)
- Instead: Client sends chunk requests sequentially, updates progress after each
- Meets 5-second progress update target (each chunk ~1-2min audio = ~5-10s processing)
- Simple request/response pattern, no WebSocket complexity

**Alternatives Considered**:
- **Server-Sent Events**: Not supported in Vercel Edge runtime
- **WebSockets**: Requires persistent connection, violates serverless model
- **Long polling**: Wasteful, delays progress updates

**Implementation Notes**:
```typescript
async function generateAudio(text: string, voice: string, onProgress: (p: number) => void) {
  const chunks = chunkText(text);
  const audioChunks: ArrayBuffer[] = [];

  for (let i = 0; i < chunks.length; i++) {
    const response = await fetch('/api/tts-chunk', {
      method: 'POST',
      body: JSON.stringify({ text: chunks[i], voice }),
    });
    const audio = await response.arrayBuffer();
    audioChunks.push(audio);
    onProgress((i + 1) / chunks.length * 100);
  }

  return stitchChunks(audioChunks);
}
```

- Exponential backoff on 429 (rate limit) and 5xx errors
- Retry failed chunks up to 3 times before surfacing error to user
- Cancel in-flight requests if user navigates away

---

### 6. Accessibility (WCAG 2.1 AA)

**Decision**: ShadCN components + manual ARIA enhancements

**Rationale**:
- ShadCN built on Radix UI primitives - WCAG AA compliant by default
- Keyboard navigation: Tab, Enter, Space for all interactions
- Screen reader: Announce progress updates via `aria-live="polite"`
- Focus management: Trap focus in modal states (loading overlay)
- Color contrast: Tailwind defaults meet AA (4.5:1 for text)

**Implementation Notes**:
- Text input: `<textarea aria-label="Paste your text here" />`
- Voice selector: `<Select aria-label="Choose voice" />`
- Progress: `<div role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100} />`
- Audio player: Native `<audio controls>` (built-in accessibility)
- Errors: `<div role="alert" aria-live="assertive">` for immediate announcement

---

### 7. Error Handling Taxonomy

**Decision**: Four error categories with user-friendly messages

1. **Validation Errors** (4xx client-side)
   - Empty text: "Please paste some text to convert"
   - Text too long (>100K words): "Text is very long. This may take several minutes."
   - Invalid voice: "Please select a voice"

2. **API Errors** (TTS provider)
   - 429 Rate limit: "Too many requests. Retrying in {n} seconds..."
   - 401 Auth: "Service temporarily unavailable" (hide API key issue from user)
   - 500 Server: "Conversion failed. Please try again."

3. **Browser Errors**
   - localStorage full: "Storage full. Please clear old audio or try a shorter text."
   - AudioContext unavailable: "Your browser doesn't support audio playback"

4. **Network Errors**
   - Timeout: "Request timed out. Retrying..."
   - Offline: "You're offline. Please check your connection."

**Implementation**:
- All errors logged to console for debugging
- User sees friendly message + optional "Retry" button
- Failed chunks show inline error with per-chunk retry

---

## Technology Stack Summary

| Component | Technology | Version | Rationale |
|-----------|-----------|---------|-----------|
| Framework | Next.js | 14.x | App Router, API routes, Vercel optimization |
| Language | TypeScript | 5.x | Type safety, better DX |
| UI Library | ShadCN + Radix | Latest | Accessible, customizable, Tailwind-native |
| Styling | Tailwind CSS | 3.x | Utility-first, fast iteration |
| TTS Provider | ElevenLabs | v1 | Best quality/cost ratio |
| Audio Processing | Web Audio API | Native | Browser-native, no deps |
| MP3 Encoding | lamejs | 1.2.1 | Lightweight, pure JS |
| Storage | localStorage | Native | Simple, sufficient for 4min audio |
| Testing (Unit) | Vitest | 1.x | Fast, Vite-native |
| Testing (E2E) | Playwright | 1.x | Cross-browser, reliable |
| API Mocking | MSW | 2.x | Service worker-based, realistic |

---

## Open Questions / Decisions Deferred to Implementation

1. **Voice Selection**: Which specific ElevenLabs voices to expose?
   - Defer to implementation: Test 5-6 voices, pick 2-3 most natural
   - Criteria: Clear diction, neutral accent, distinct male/female options

2. **Chunk Retry UI**: Should retry be automatic or user-initiated?
   - Defer to implementation: Automatic with exponential backoff (up to 3 attempts), then show manual retry button

3. **localStorage Eviction**: LRU or timestamp-based?
   - Defer to implementation: Timestamp-based (delete oldest first) - simpler, predictable

4. **Analytics**: Track usage (text length, voice preference, errors)?
   - Defer to post-MVP: No analytics initially (complexity + privacy concerns)

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| TTS API cost overrun | Medium | High | Set Vercel env var limit, implement client-side text length warning |
| localStorage quota exceeded | High | Medium | Implement eviction, show storage usage meter |
| Audio stitching quality issues | Low | High | Extensive testing with various text lengths, fallback to separate file downloads |
| Browser compatibility (Safari) | Medium | Medium | Polyfill AudioContext, test on Safari 15+ |
| Rate limiting (10 req/s) | Low | Medium | Exponential backoff, queue chunks |

---

**Status**: ✅ All research complete, ready for Phase 1 (Design & Contracts)
