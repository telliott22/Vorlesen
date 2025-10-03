# Quickstart: Vorlesen Manual Testing Guide

**Purpose**: Validate all user stories and acceptance criteria from spec.md

---

## Prerequisites

1. **Environment Setup**:
   ```bash
   # Clone repository
   git clone https://github.com/telliott22/Vorlesen.git
   cd Vorlesen

   # Install dependencies
   npm install

   # Set environment variables
   cp .env.example .env.local
   # Edit .env.local and add:
   # ELEVENLABS_API_KEY=your_api_key_here

   # Start development server
   npm run dev
   ```

2. **Open browser**: Navigate to `http://localhost:3000`

3. **Test text samples**: Prepare these test texts:
   - **Short** (100 words): Single paragraph
   - **Medium** (1,000 words): ~2-3 pages
   - **Long** (10,000 words): ~20 pages
   - **Very long** (50,000 words): Full novella

---

## Test Suite

### Test 1: Basic Paste-Generate-Play Flow ✅
**Validates**: FR-001, FR-002, FR-004, FR-006, FR-009

**Steps**:
1. Paste short text (100 words) into text area
2. Select voice "Rachel" from dropdown
3. Click "Generate Speech" button
4. **Expected**: Loading indicator appears
5. Wait for completion (~5 seconds)
6. **Expected**: Audio player appears with controls
7. Click play button
8. **Expected**: Audio plays with correct text content
9. Test pause, seek, and speed controls
10. **Expected**: All controls function correctly

**Pass Criteria**:
- ✅ Audio matches pasted text word-for-word
- ✅ Playback controls (play, pause, seek, speed) all work
- ✅ Loading indicator visible during generation
- ✅ No errors displayed

---

### Test 2: Voice Selection ✅
**Validates**: FR-011

**Steps**:
1. Paste same text as Test 1
2. Select voice "Adam" (male)
3. Generate speech
4. Play audio and note voice characteristics
5. Repeat with voice "Domi" (female)
6. **Expected**: Three distinct voices, all natural-sounding

**Pass Criteria**:
- ✅ At least 2-3 voices available
- ✅ Voices sound distinct from each other
- ✅ No robotic artifacts
- ✅ Clear diction and natural pacing

---

### Test 3: Download Audio ✅
**Validates**: FR-005, FR-012

**Steps**:
1. After generating audio from Test 1
2. Click "Download MP3" button
3. **Expected**: File downloads to default folder
4. Check downloaded file properties
5. **Expected**: File is valid MP3, ~128kbps, plays in media player

**Pass Criteria**:
- ✅ File downloads successfully
- ✅ File extension is `.mp3`
- ✅ File plays in VLC/iTunes/Windows Media Player
- ✅ Audio quality matches in-browser playback

---

### Test 4: Long Text Chunking ✅
**Validates**: FR-013, FR-016

**Steps**:
1. Paste long text (10,000 words)
2. Click "Generate Speech"
3. **Expected**: Progress bar appears
4. Observe progress updates
5. **Expected**: Progress updates every 5-10 seconds
6. Wait for completion (~2-3 minutes)
7. **Expected**: Audio plays seamlessly (no gaps between chunks)

**Pass Criteria**:
- ✅ Progress indicator shows percentage (0-100%)
- ✅ Progress updates at least every 10 seconds
- ✅ Final audio has no audible gaps or clicks
- ✅ Text is complete (no missing sentences)

---

### Test 5: localStorage Persistence ✅
**Validates**: FR-015

**Steps**:
1. Generate audio from short text
2. Wait for completion
3. Note the audio player state
4. **Refresh the page** (F5 or Cmd+R)
5. **Expected**: Audio still available
6. Check "Recent Audio" section or saved list
7. **Expected**: Previously generated audio listed
8. Click saved audio to load
9. **Expected**: Audio plays immediately (no regeneration)

**Pass Criteria**:
- ✅ Audio persists after page refresh
- ✅ Saved audio list shows text preview, voice, timestamp
- ✅ Clicking saved audio loads instantly (<1 second)
- ✅ Playback quality identical to original

---

### Test 6: Playback Speed Control ✅
**Validates**: FR-009, FR-014

**Steps**:
1. Generate and play audio from Test 1
2. Locate speed control (0.5x, 1x, 1.5x, 2x buttons)
3. Set speed to 0.5x
4. **Expected**: Audio plays at half speed
5. Set speed to 1.5x
6. **Expected**: Audio plays at 1.5x speed
7. Set speed to 2x
8. **Expected**: Audio plays at double speed
9. **Verify**: No audio regeneration occurs (check network tab)

**Pass Criteria**:
- ✅ Speed control visible and accessible
- ✅ Speed changes apply immediately without regeneration
- ✅ Audio pitch preserved at all speeds (no chipmunk effect)
- ✅ No network requests when changing speed

---

### Test 7: Empty Text Validation ✅
**Validates**: FR-008, Edge Case

**Steps**:
1. Leave text area empty
2. Click "Generate Speech"
3. **Expected**: Error message appears
4. **Expected**: Message text: "Please paste some text to convert"
5. **Expected**: No API request made (check network tab)

**Pass Criteria**:
- ✅ Error message displayed
- ✅ Error message user-friendly (no technical jargon)
- ✅ No loading indicator appears
- ✅ No network request

---

### Test 8: Network Error Handling ✅
**Validates**: FR-008, Edge Case

**Steps**:
1. Open browser DevTools → Network tab
2. Enable "Offline" mode
3. Paste short text and click "Generate Speech"
4. **Expected**: Error message appears
5. **Expected**: Message mentions network/connection issue
6. Disable "Offline" mode
7. Click "Retry" button
8. **Expected**: Generation succeeds

**Pass Criteria**:
- ✅ Offline error detected and displayed
- ✅ Error message user-friendly
- ✅ Retry button appears
- ✅ Retry succeeds when connection restored

---

### Test 9: API Rate Limit Handling ✅
**Validates**: FR-008, Resilience IV

**Steps**:
1. Paste very long text (50,000 words)
2. Click "Generate Speech"
3. **Expected**: Multiple chunk requests start
4. If rate limit hit (429 response):
5. **Expected**: Progress pauses with "Retrying..." message
6. **Expected**: Automatic retry after delay (5-10 seconds)
7. **Expected**: Generation resumes and completes

**Pass Criteria**:
- ✅ Rate limit detected automatically
- ✅ User sees retry message
- ✅ System retries without user intervention
- ✅ Generation eventually completes (may take 5+ minutes)

---

### Test 10: Concurrent Generation Prevention ✅
**Validates**: Edge Case

**Steps**:
1. Paste short text and click "Generate Speech"
2. While generation in progress, paste different text
3. Attempt to click "Generate Speech" again
4. **Expected**: Button disabled or shows "Generating..." state
5. Wait for first generation to complete
6. **Expected**: Button re-enabled

**Pass Criteria**:
- ✅ Cannot start second generation during first
- ✅ UI clearly indicates generation in progress
- ✅ No race conditions (second request doesn't cancel first)

---

### Test 11: localStorage Full Scenario ✅
**Validates**: Edge Case, Error Handling

**Steps**:
1. Generate and save multiple long audio files (10,000 words each)
2. Continue until localStorage ~5MB full
3. Attempt to generate one more audio
4. **Expected**: Old audio auto-deleted to make space
5. **OR**: Error message: "Storage full. Please clear old audio."
6. Check saved audio list
7. **Expected**: Oldest audio removed first

**Pass Criteria**:
- ✅ Storage limit handled gracefully
- ✅ Either auto-eviction or clear error message
- ✅ App doesn't crash
- ✅ New audio can be generated after clearing space

---

### Test 12: Special Characters in Text ✅
**Validates**: Edge Case

**Steps**:
1. Paste text with special characters: quotes (" "), apostrophes ('), em-dashes (—), ellipsis (…), numbers (1,234.56)
2. Generate speech
3. Play audio
4. **Expected**: All characters pronounced correctly
   - Quotes: Pause or intonation change
   - Numbers: "One thousand two hundred thirty-four point five six"
   - Ellipsis: Pause

**Pass Criteria**:
- ✅ Special characters don't break generation
- ✅ Punctuation reflected in speech (pauses, intonation)
- ✅ Numbers pronounced correctly

---

### Test 13: Browser Compatibility ✅
**Validates**: Quality Standards

**Steps**:
1. Repeat Tests 1-6 on:
   - Chrome (latest)
   - Firefox (latest)
   - Safari (latest)
   - Edge (latest)
2. **Expected**: All tests pass on all browsers

**Pass Criteria**:
- ✅ Chrome: Full functionality
- ✅ Firefox: Full functionality
- ✅ Safari: Full functionality (may need AudioContext polyfill)
- ✅ Edge: Full functionality

---

### Test 14: Accessibility (Keyboard Navigation) ✅
**Validates**: Quality Standards (WCAG 2.1 AA)

**Steps**:
1. Use only keyboard (no mouse):
2. Tab to text area
3. Paste text (Cmd/Ctrl+V)
4. Tab to voice selector
5. Use arrow keys to select voice
6. Tab to "Generate Speech" button
7. Press Enter
8. **Expected**: Generation starts
9. After completion, Tab to audio player
10. Press Space to play/pause
11. Use arrow keys to seek

**Pass Criteria**:
- ✅ All interactive elements reachable via Tab
- ✅ Enter/Space activate buttons
- ✅ Arrow keys control select/audio
- ✅ Focus indicators visible
- ✅ No keyboard traps

---

### Test 15: Accessibility (Screen Reader) ✅
**Validates**: Quality Standards (WCAG 2.1 AA)

**Steps**:
1. Enable screen reader (VoiceOver on Mac, NVDA on Windows)
2. Navigate page with screen reader
3. **Expected**: Announcements:
   - "Text input, paste your text here"
   - "Voice selector, choose voice"
   - "Generate Speech button"
   - "Progress, 25% complete" (during generation)
   - "Audio player, play button"

**Pass Criteria**:
- ✅ All elements have ARIA labels
- ✅ Progress updates announced
- ✅ Error messages announced immediately
- ✅ Audio player controls labeled

---

## Acceptance Criteria Checklist

### User Story 1: Paste and Generate ✅
- [x] Author can paste any length text
- [x] Author selects voice from 2-3 options
- [x] Author clicks single button to generate
- [x] System converts text to speech
- [x] Audio playback controls appear

### User Story 2: Play Audio ✅
- [x] Author can play audio in browser
- [x] Playback controls: play, pause, seek
- [x] Speed control available (0.5x - 2x)
- [x] No regeneration on speed change

### User Story 3: Download Audio ✅
- [x] Author can download MP3 file
- [x] Downloaded file plays in external players
- [x] File size reasonable (~1MB per minute)

### User Story 4: No Authentication ✅
- [x] No login required
- [x] No signup required
- [x] Direct access to functionality

### User Story 5: Progress Feedback ✅
- [x] Loading indicator during generation
- [x] Progress percentage visible
- [x] Progress updates every 5-10 seconds

### User Story 6: Error Handling ✅
- [x] Empty text validated
- [x] Network errors caught
- [x] Rate limits handled with retry
- [x] Storage full handled gracefully

### User Story 7: Persistence ✅
- [x] Audio saved in localStorage
- [x] Audio persists across page refresh
- [x] Saved audio loads instantly

---

## Performance Validation

### Performance Targets from Constitution

1. **First chunk starts <2 seconds** ✅
   - Measure: Time from button click to first API request
   - Pass: <2s on average over 10 runs

2. **Progress updates every 5 seconds** ✅
   - Measure: Time between progress percentage changes
   - Pass: <5s on average

3. **localStorage usage <50MB** ✅
   - Measure: `navigator.storage.estimate()` after saving 3 long audios
   - Pass: <50MB total

---

## Sign-Off

**Tester Name**: ___________________
**Date**: ___________________
**Environment**: Browser: ___________ Version: ___________

**All tests passed**: [ ] Yes [ ] No

**Issues found** (if any):
- Issue 1: ___________________
- Issue 2: ___________________

**Ready for production**: [ ] Yes [ ] No

---

**Status**: ✅ Quickstart test suite complete, ready for execution
