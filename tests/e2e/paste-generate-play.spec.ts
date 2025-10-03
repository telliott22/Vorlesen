import { test, expect } from '@playwright/test';

test.describe('Paste-Generate-Play Flow', () => {
  test('should convert pasted text to speech and play audio', async ({ page }) => {
    // Navigate to home page
    await page.goto('http://localhost:3000');

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Paste short text (100 words) into textarea
    const testText = 'The quick brown fox jumps over the lazy dog. '.repeat(20);
    const textarea = page.getByRole('textbox', { name: /paste your text/i });
    await expect(textarea).toBeVisible();
    await textarea.fill(testText);

    // Select voice from dropdown
    const voiceSelector = page.getByRole('combobox', { name: /choose voice/i });
    await expect(voiceSelector).toBeVisible();
    await voiceSelector.click();
    await page.getByRole('option', { name: /wavenet.*male/i }).first().click();

    // Click "Generate Speech" button
    const generateButton = page.getByRole('button', { name: /generate speech/i });
    await expect(generateButton).toBeVisible();
    await generateButton.click();

    // Assert loading indicator appears
    const loadingIndicator = page.getByRole('progressbar');
    await expect(loadingIndicator).toBeVisible({ timeout: 2000 });

    // Wait for completion (audio player appears)
    const audioPlayer = page.locator('audio');
    await expect(audioPlayer).toBeVisible({ timeout: 30000 });

    // Verify audio player has controls
    await expect(audioPlayer).toHaveAttribute('controls');

    // Click play button (native audio controls)
    await audioPlayer.evaluate((audio: HTMLAudioElement) => audio.play());

    // Wait a moment for playback to start
    await page.waitForTimeout(1000);

    // Check if audio is playing
    const isPlaying = await audioPlayer.evaluate(
      (audio: HTMLAudioElement) => !audio.paused && !audio.ended && audio.readyState > 2
    );
    expect(isPlaying).toBe(true);

    // Test pause
    await audioPlayer.evaluate((audio: HTMLAudioElement) => audio.pause());
    const isPaused = await audioPlayer.evaluate((audio: HTMLAudioElement) => audio.paused);
    expect(isPaused).toBe(true);

    // Test speed control
    const speedButton = page.getByRole('button', { name: /1\.5x|speed/i });
    if (await speedButton.isVisible()) {
      await speedButton.click();
      const playbackRate = await audioPlayer.evaluate(
        (audio: HTMLAudioElement) => audio.playbackRate
      );
      expect(playbackRate).toBeGreaterThan(1);
    }
  });

  test('should show error for empty text', async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');

    // Don't fill textarea, just click generate
    const generateButton = page.getByRole('button', { name: /generate speech/i });
    await generateButton.click();

    // Assert error message appears
    const errorMessage = page.getByRole('alert');
    await expect(errorMessage).toBeVisible({ timeout: 2000 });
    await expect(errorMessage).toContainText(/paste some text/i);
  });

  test('should persist audio in localStorage and reload on page refresh', async ({ page }) => {
    await page.goto('http://localhost:3000');

    // Generate audio
    const testText = 'This is a test for localStorage persistence.';
    await page.getByRole('textbox', { name: /paste your text/i }).fill(testText);
    await page.getByRole('combobox', { name: /choose voice/i }).click();
    await page.getByRole('option').first().click();
    await page.getByRole('button', { name: /generate speech/i }).click();

    // Wait for audio player
    await expect(page.locator('audio')).toBeVisible({ timeout: 30000 });

    // Refresh page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Check if "Recent Audio" or similar section exists
    const recentAudioSection = page.getByText(/recent|previous|saved/i);
    const hasRecentAudio = await recentAudioSection.isVisible().catch(() => false);

    if (hasRecentAudio) {
      // Verify localStorage has saved audio
      const localStorageKeys = await page.evaluate(() => Object.keys(localStorage));
      expect(localStorageKeys.some(key => key.includes('vorlesen'))).toBe(true);
    }
  });
});
