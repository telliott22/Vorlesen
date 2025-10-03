import { test, expect } from '@playwright/test';

test.describe('Long Text Chunking', () => {
  test('should chunk long text and show progress updates', async ({ page }) => {
    // Navigate to home page
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');

    // Generate long text (10,000 words ≈ 60,000 characters)
    // This will require multiple chunks (4000 chars each = ~15 chunks)
    const paragraph = 'The quick brown fox jumps over the lazy dog. This is a test sentence for chunking long text into multiple API requests. ';
    const longText = paragraph.repeat(500); // ~60,000 characters

    // Paste long text
    const textarea = page.getByRole('textbox', { name: /paste your text/i });
    await textarea.fill(longText);

    // Select voice
    const voiceSelector = page.getByRole('combobox', { name: /choose voice/i });
    await voiceSelector.click();
    await page.getByRole('option').first().click();

    // Start generation
    const generateButton = page.getByRole('button', { name: /generate speech/i });
    await generateButton.click();

    // Assert progress bar appears
    const progressBar = page.getByRole('progressbar');
    await expect(progressBar).toBeVisible({ timeout: 2000 });

    // Monitor progress updates
    let progressValues: number[] = [];
    const maxWaitTime = 120000; // 2 minutes max
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitTime) {
      const progressText = await page.locator('[role="progressbar"]').textContent();
      if (progressText) {
        const match = progressText.match(/(\d+)%/);
        if (match) {
          const progress = parseInt(match[1]);
          if (progress > 0 && !progressValues.includes(progress)) {
            progressValues.push(progress);
          }
          if (progress === 100) break;
        }
      }
      await page.waitForTimeout(1000);
    }

    // Verify progress updated multiple times (at least 3 updates for chunked processing)
    expect(progressValues.length).toBeGreaterThanOrEqual(3);

    // Verify progress values are increasing
    for (let i = 1; i < progressValues.length; i++) {
      expect(progressValues[i]).toBeGreaterThan(progressValues[i - 1]);
    }

    // Verify final progress is 100%
    expect(progressValues[progressValues.length - 1]).toBe(100);

    // Wait for audio player to appear
    const audioPlayer = page.locator('audio');
    await expect(audioPlayer).toBeVisible({ timeout: 10000 });

    // Play audio and verify it plays seamlessly (no gaps)
    await audioPlayer.evaluate((audio: HTMLAudioElement) => audio.play());
    await page.waitForTimeout(3000);

    // Check audio is still playing (no errors)
    const isPlaying = await audioPlayer.evaluate(
      (audio: HTMLAudioElement) => !audio.paused && !audio.ended
    );
    expect(isPlaying).toBe(true);

    // Verify audio duration is reasonable (should be several minutes for 60K chars)
    const duration = await audioPlayer.evaluate((audio: HTMLAudioElement) => audio.duration);
    expect(duration).toBeGreaterThan(60); // At least 1 minute
  });

  test('should handle network errors during chunking', async ({ page }) => {
    await page.goto('http://localhost:3000');

    // Intercept API requests and simulate failure on 3rd request
    let requestCount = 0;
    await page.route('**/api/tts-chunk', (route) => {
      requestCount++;
      if (requestCount === 3) {
        // Fail the 3rd chunk
        route.abort('failed');
      } else {
        route.continue();
      }
    });

    // Generate moderately long text (will need ~5 chunks)
    const text = 'Test sentence for error handling. '.repeat(600); // ~20,000 chars
    await page.getByRole('textbox', { name: /paste your text/i }).fill(text);
    await page.getByRole('combobox', { name: /choose voice/i }).click();
    await page.getByRole('option').first().click();
    await page.getByRole('button', { name: /generate speech/i }).click();

    // Wait for error message or retry indicator
    const errorOrRetry = page.locator('[role="alert"], :text("retrying"), :text("retry")');
    await expect(errorOrRetry).toBeVisible({ timeout: 30000 });
  });
});
