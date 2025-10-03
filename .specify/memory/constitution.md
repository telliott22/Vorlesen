<!--
Sync Impact Report:
Version: N/A → 1.0.0 (Initial ratification)
Modified Principles: N/A (initial creation)
Added Sections: All sections (initial constitution)
Removed Sections: None
Templates Status:
  ✅ plan-template.md - Constitution Check section references this file
  ✅ spec-template.md - Aligned with user-centric requirements approach
  ✅ tasks-template.md - Aligned with TDD and phase-based execution
Follow-up TODOs: None
-->

# Vorlesen Constitution

## Core Principles

### I. Simplicity First

The system MUST prioritize simplicity over features. Every feature addition MUST be justified by direct user value, not technical elegance or "nice-to-have" capabilities. No authentication, no user accounts, no complex state management unless absolutely required for core functionality.

**Rationale**: Authors need a tool that works immediately without friction. The proofreading workflow should be: paste text → generate speech → listen. Any additional steps reduce adoption and utility.

### II. User-Centric Design

All user-facing interactions MUST be designed for non-technical users. The interface MUST be accessible, intuitive, and forgiving of user errors. Technical complexity (API keys, configuration, formats) MUST be hidden from users.

**Rationale**: Authors are focused on their writing, not technology. The tool succeeds when it becomes invisible—when users think about their prose, not about how to operate the tool.

### III. Serverless Architecture

The system MUST be deployable as serverless functions without persistent backend infrastructure. State MUST be client-side (browser localStorage) or ephemeral (request-scoped). No databases, no servers to maintain.

**Rationale**: Vercel hosting constraint drives this, but it also enforces simplicity. Serverless forces stateless thinking and reduces operational complexity.

### IV. Resilience & Error Handling

The system MUST handle failures gracefully. Long text MUST be chunked to handle API limits. Failed chunks MUST be retryable without losing progress. Errors MUST show clear, actionable messages to users, never exposing technical details.

**Rationale**: TTS APIs have limits and may fail. Users may paste 50,000-word manuscripts. The tool must handle scale and failures without frustrating users or losing their work.

### V. Performance & Scale

The system MUST optimize for perceived performance. Show progress during long conversions. Cache generated audio in localStorage for instant replay. Stream or chunk large texts rather than blocking. Target: conversions start within 2 seconds, progress visible every 5 seconds.

**Rationale**: Authors will proofread long documents. A 10,000-word story that takes 5 minutes to convert is acceptable IF progress is visible. A 1,000-word piece that blocks for 30 seconds with no feedback feels broken.

## Technical Constraints

**Stack**: Next.js 14+, ShadCN UI components, Tailwind CSS
**Hosting**: Vercel (serverless functions, no persistent backend)
**TTS Provider**: Must support high-quality voices, low cost per character, API-based
**Audio Format**: MP3 (browser compatibility, file size balance)
**Storage**: Browser localStorage only (no server-side persistence)
**Browser Support**: Modern evergreen browsers (Chrome, Firefox, Safari, Edge latest versions)

## Quality Standards

**Accessibility**: MUST meet WCAG 2.1 AA standards (keyboard navigation, screen reader support, sufficient contrast)
**Audio Quality**: Voices MUST sound natural (no robotic artifacts), support 2-3 selectable options
**Error Recovery**: MUST preserve user's text input across page refreshes, MUST allow retry of failed chunks without re-pasting
**Performance**: First chunk MUST begin processing within 2 seconds, progress indicator MUST update every 5 seconds during long conversions
**Testing**: MUST include contract tests for TTS API integration, MUST include E2E tests for core user flows (paste → generate → play → download)

## Development Workflow

**Specification-First**: Every feature MUST have a complete spec.md before planning
**Test-Driven**: Contract tests and integration tests MUST be written and failing before implementation
**Incremental**: Features MUST be broken into small, testable tasks
**Review Gates**: Constitution compliance MUST be checked before and after design phase

## Governance

This constitution supersedes all other development practices and preferences. Any deviation from these principles MUST be explicitly documented in the Complexity Tracking section of the implementation plan with justification.

**Amendment Process**:
- Proposed changes MUST be documented with rationale
- Breaking changes require MAJOR version bump
- New principles or sections require MINOR version bump
- Clarifications or wording fixes require PATCH version bump

**Compliance**:
- All implementation plans MUST include Constitution Check section
- All pull requests MUST verify constitutional compliance
- Violations without justification MUST be rejected

**Runtime Guidance**: Agent-specific development guidance is maintained in repository root (e.g., `CLAUDE.md`, `.github/copilot-instructions.md`). These files provide implementation patterns that align with constitutional principles.

**Version**: 1.0.0 | **Ratified**: 2025-10-03 | **Last Amended**: 2025-10-03
