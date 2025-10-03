
# Implementation Plan: Vorlesen - Author Proofreading TTS Tool

**Branch**: `001-build-a-tool` | **Date**: 2025-10-03 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/Users/tim/Code/Tim/text-to-speech/text-to-speech/specs/001-build-a-tool/spec.md`

## Execution Flow (/plan command scope)
```
1. Load feature spec from Input path
   → If not found: ERROR "No feature spec at {path}"
2. Fill Technical Context (scan for NEEDS CLARIFICATION)
   → Detect Project Type from file system structure or context (web=frontend+backend, mobile=app+api)
   → Set Structure Decision based on project type
3. Fill the Constitution Check section based on the content of the constitution document.
4. Evaluate Constitution Check section below
   → If violations exist: Document in Complexity Tracking
   → If no justification possible: ERROR "Simplify approach first"
   → Update Progress Tracking: Initial Constitution Check
5. Execute Phase 0 → research.md
   → If NEEDS CLARIFICATION remain: ERROR "Resolve unknowns"
6. Execute Phase 1 → contracts, data-model.md, quickstart.md, agent-specific template file (e.g., `CLAUDE.md` for Claude Code, `.github/copilot-instructions.md` for GitHub Copilot, `GEMINI.md` for Gemini CLI, `QWEN.md` for Qwen Code, or `AGENTS.md` for all other agents).
7. Re-evaluate Constitution Check section
   → If new violations: Refactor design, return to Phase 1
   → Update Progress Tracking: Post-Design Constitution Check
8. Plan Phase 2 → Describe task generation approach (DO NOT create tasks.md)
9. STOP - Ready for /tasks command
```

**IMPORTANT**: The /plan command STOPS at step 7. Phases 2-4 are executed by other commands:
- Phase 2: /tasks command creates tasks.md
- Phase 3-4: Implementation execution (manual or via tools)

## Summary
Vorlesen is a serverless web application that enables authors to proofread their work by converting text to speech. Users paste their manuscript (unlimited length), select from 2-3 voices, and generate MP3 audio that can be played in-browser or downloaded. The system uses Google Cloud Text-to-Speech API (cost-optimized at $0.004/1K chars, 75x cheaper than premium alternatives) to prioritize volume over ultra-premium quality. Long texts are chunked automatically, with progress indicators and localStorage persistence for instant replay. No authentication required—paste, generate, listen.

## Technical Context
**Language/Version**: TypeScript 5.x, Node.js 18+
**Primary Dependencies**: Next.js 14+, React 18+, ShadCN UI, Tailwind CSS, Google Cloud TTS client
**Storage**: Browser localStorage only (no server-side database)
**Testing**: Vitest/Jest for unit tests, Playwright for E2E, MSW for API mocking
**Target Platform**: Vercel serverless platform, modern evergreen browsers (Chrome, Firefox, Safari, Edge)
**Project Type**: web (Next.js app with API routes - single unified project)
**Performance Goals**: First chunk starts processing <2s, progress updates every 5s, <50MB localStorage usage
**Constraints**: Serverless function timeout (10min Vercel limit), localStorage 5-10MB typical browser limit, TTS API rate limits
**Scale/Scope**: Single-page application, ~5 components, ~3 API routes, support texts up to 100K words chunked

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. Simplicity First ✅ PASS
- No authentication system - direct paste-and-use workflow
- No user accounts or complex state management
- Single-page app with minimal navigation
- All technical complexity (API keys, chunking logic) hidden from users

### II. User-Centric Design ✅ PASS
- Interface designed for non-technical authors
- No configuration required from users
- Clear visual feedback (progress indicators, loading states)
- Accessible design (keyboard navigation, screen readers planned)
- Graceful error messages without technical jargon

### III. Serverless Architecture ✅ PASS
- Next.js API routes (serverless functions on Vercel)
- No persistent backend servers
- Client-side state via localStorage
- Ephemeral request-scoped processing
- No database infrastructure

### IV. Resilience & Error Handling ✅ PASS
- Text chunking to handle API limits
- Per-chunk retry logic without losing progress
- Audio stitching with correct ordering
- User-friendly error messages
- Preserves input text across page refreshes

### V. Performance & Scale ✅ PASS
- First chunk processes within 2 seconds (constitution target)
- Progress updates every 5 seconds (constitution target)
- localStorage caching for instant replay
- Chunked processing prevents blocking on long texts
- Visible progress indicators for perceived performance

## Project Structure

### Documentation (this feature)
```
specs/[###-feature]/
├── plan.md              # This file (/plan command output)
├── research.md          # Phase 0 output (/plan command)
├── data-model.md        # Phase 1 output (/plan command)
├── quickstart.md        # Phase 1 output (/plan command)
├── contracts/           # Phase 1 output (/plan command)
└── tasks.md             # Phase 2 output (/tasks command - NOT created by /plan)
```

### Source Code (repository root)
```
app/
├── api/
│   ├── tts/
│   │   └── route.ts           # POST /api/tts - TTS conversion endpoint
│   ├── tts-chunk/
│   │   └── route.ts           # POST /api/tts-chunk - Single chunk processing
│   └── health/
│       └── route.ts           # GET /api/health - Health check
├── page.tsx                   # Main landing page
├── layout.tsx                 # Root layout with providers
└── globals.css                # Global styles + Tailwind

components/
├── ui/                        # ShadCN components
│   ├── button.tsx
│   ├── textarea.tsx
│   ├── select.tsx
│   ├── progress.tsx
│   └── card.tsx
├── text-input.tsx             # Text paste area component
├── voice-selector.tsx         # Voice selection dropdown
├── audio-player.tsx           # Audio playback with controls
├── progress-indicator.tsx     # Conversion progress display
└── error-display.tsx          # Error message component

lib/
├── tts-client.ts              # TTS API client wrapper
├── audio-chunker.ts           # Text chunking logic
├── audio-stitcher.ts          # MP3 chunk stitching
├── storage.ts                 # localStorage wrapper
└── utils.ts                   # Common utilities

types/
├── tts.ts                     # TTS-related types
├── audio.ts                   # Audio-related types
└── storage.ts                 # Storage types

tests/
├── e2e/
│   ├── paste-generate-play.spec.ts
│   ├── download.spec.ts
│   └── chunking.spec.ts
├── integration/
│   ├── tts-api.test.ts
│   └── audio-stitching.test.ts
└── unit/
    ├── audio-chunker.test.ts
    ├── storage.test.ts
    └── utils.test.ts

public/
└── favicon.ico
```

**Structure Decision**: Next.js 14 App Router structure (unified web application). All API routes are serverless functions. Client components in `components/`, server-side utilities in `lib/`, API routes in `app/api/`. Tests organized by type (e2e, integration, unit).

## Phase 0: Outline & Research ✅ COMPLETE

**Research Questions Resolved**:
1. TTS Provider Selection → Google Cloud TTS API (volume-optimized, 75x cheaper than premium)
2. Audio Chunking Strategy → Sentence-boundary chunking, 4,000 char limit
3. MP3 Stitching → Web Audio API + lamejs for encoding
4. localStorage Strategy → Base64 chunks with LRU eviction
5. Progress Tracking → Sequential API calls with client-side state
6. Accessibility → ShadCN (Radix) + manual ARIA enhancements
7. Error Handling → Four categories with user-friendly messages

**Output**: ✅ research.md created with all decisions documented

## Phase 1: Design & Contracts ✅ COMPLETE

**Entities Identified** (from spec):
- StoredAudio (localStorage): Persisted audio with metadata
- AudioChunk: Individual MP3 segments
- ConversionRequest (transient): Active conversion state tracking
- TextChunk: Text split for API calls
- TTSRequest/Response: API contracts

**API Endpoints Designed**:
- `POST /api/tts-chunk`: Convert single text chunk to speech
- `GET /api/health`: Health check

**Outputs Created**:
1. ✅ data-model.md: 8 entities with fields, validation, state transitions, TypeScript types
2. ✅ contracts/tts-chunk.openapi.yaml: Full OpenAPI 3.0 spec with examples
3. ✅ quickstart.md: 15 manual test scenarios covering all acceptance criteria
4. ✅ CLAUDE.md: Agent context file updated with tech stack

**Contract Test Strategy** (to be implemented in Phase 3):
- tests/integration/tts-api.test.ts: Validate POST /api/tts-chunk request/response schemas
- tests/e2e/paste-generate-play.spec.ts: End-to-end user flow validation

## Phase 2: Task Planning Approach
*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy**:
The `/tasks` command will generate tasks from Phase 1 artifacts following TDD principles:

1. **Setup Tasks** (3-5 tasks):
   - Initialize Next.js project with TypeScript
   - Install dependencies (ShadCN, Tailwind, lamejs, testing tools)
   - Configure Vercel environment variables
   - Set up test infrastructure (Vitest, Playwright, MSW)

2. **Contract Test Tasks** (2-3 tasks) [P]:
   - tests/integration/tts-api.test.ts: POST /api/tts-chunk contract
   - tests/e2e/paste-generate-play.spec.ts: Core user flow
   - These MUST be written first and MUST fail

3. **Type Definition Tasks** (1-2 tasks) [P]:
   - types/storage.ts: StoredAudio, AudioChunk types
   - types/tts.ts: ConversionRequest, TTSRequest/Response types
   - types/audio.ts: Error types

4. **Core Library Tasks** (5-7 tasks):
   - lib/audio-chunker.ts: Text splitting logic
   - lib/tts-client.ts: Google Cloud TTS API wrapper
   - lib/audio-stitcher.ts: Web Audio concatenation + lamejs encoding
   - lib/storage.ts: localStorage CRUD with LRU eviction
   - lib/utils.ts: Common helpers

5. **API Route Tasks** (2-3 tasks):
   - app/api/tts-chunk/route.ts: POST endpoint implementation
   - app/api/health/route.ts: Health check endpoint

6. **Component Tasks** (5-7 tasks) [P where independent]:
   - components/ui/*: ShadCN setup (button, textarea, select, progress, card)
   - components/text-input.tsx: Text paste area
   - components/voice-selector.tsx: Voice dropdown
   - components/audio-player.tsx: Playback controls
   - components/progress-indicator.tsx: Conversion progress
   - components/error-display.tsx: Error messages

7. **Page Tasks** (2-3 tasks):
   - app/layout.tsx: Root layout with providers
   - app/page.tsx: Main landing page integrating all components
   - app/globals.css: Tailwind + custom styles

8. **Integration & Polish Tasks** (3-5 tasks):
   - Accessibility audit (ARIA labels, keyboard nav)
   - Error handling refinement
   - Performance testing (chunk size, storage limits)
   - Cross-browser testing (Safari AudioContext polyfill)
   - Run quickstart.md manual test suite

**Ordering Strategy**:
- Setup → Types → Tests (failing) → Libraries → API → Components → Pages → Integration
- Mark [P] for independent files (types, parallel components, unit tests)
- Dependencies: Types before everything, libraries before API, API before components, components before pages

**Estimated Output**:
- 28-35 numbered tasks in tasks.md
- ~8-10 [P] parallelizable tasks
- Clear dependency chains documented

**Key Principles**:
- TDD: All tests written and failing before implementation
- One file per task where possible (enables parallelization)
- Sequential for same-file edits
- Constitution compliance verified throughout

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation
*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)  
**Phase 4**: Implementation (execute tasks.md following constitutional principles)  
**Phase 5**: Validation (run tests, execute quickstart.md, performance validation)

## Complexity Tracking
*Fill ONLY if Constitution Check has violations that must be justified*

**No Violations**: All constitutional principles satisfied. No complexity deviations to justify.


## Progress Tracking
*This checklist is updated during execution flow*

**Phase Status**:
- [x] Phase 0: Research complete (/plan command) ✅
- [x] Phase 1: Design complete (/plan command) ✅
- [x] Phase 2: Task planning approach documented (/plan command - describe approach only) ✅
- [ ] Phase 3: Tasks generated (/tasks command) - **NEXT STEP**
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS ✅ (no violations)
- [x] Post-Design Constitution Check: PASS ✅ (no violations)
- [x] All NEEDS CLARIFICATION resolved ✅ (5 clarifications completed in spec)
- [x] Complexity deviations documented ✅ (none)

**Artifacts Generated**:
- [x] plan.md (this file)
- [x] research.md
- [x] data-model.md
- [x] contracts/tts-chunk.openapi.yaml
- [x] quickstart.md
- [x] CLAUDE.md

---
*Based on Constitution v1.0.0 - See `.specify/memory/constitution.md`*
