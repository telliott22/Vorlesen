'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { TextInput } from '@/components/text-input';
import { VoiceSelector } from '@/components/voice-selector';
import { ProgressIndicator } from '@/components/progress-indicator';
import { ErrorDisplay } from '@/components/error-display';
import { AudioPlayer } from '@/components/audio-player';
import { chunkText } from '@/lib/audio-chunker';
import { createAudioURL } from '@/lib/audio-stitcher';
import { saveAudio } from '@/lib/storage';
import { generateHash, generateUUID, truncateText } from '@/lib/utils';
import { ConversionStatus } from '@/types/tts';
import { AudioChunk } from '@/types/storage';
import { ErrorResponse, ErrorCode } from '@/types/audio';

export default function HomePage() {
  const [text, setText] = useState('');
  const [voice, setVoice] = useState('en-US-Wavenet-D');
  const [status, setStatus] = useState(ConversionStatus.IDLE);
  const [progress, setProgress] = useState(0);
  const [currentChunk, setCurrentChunk] = useState(0);
  const [totalChunks, setTotalChunks] = useState(0);
  const [error, setError] = useState<ErrorResponse | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioId, setAudioId] = useState<string | null>(null);

  const handleConvert = async () => {
    if (!text.trim()) {
      setError({
        error: 'Please paste some text to convert',
        code: ErrorCode.TEXT_EMPTY,
        retryable: false,
      });
      return;
    }

    setError(null);
    setStatus(ConversionStatus.SPLITTING);
    setProgress(0);

    try {
      // Split text into chunks
      const chunks = chunkText(text);
      setTotalChunks(chunks.length);
      setStatus(ConversionStatus.PROCESSING);

      const audioChunks: AudioChunk[] = [];
      const failedChunks: number[] = [];

      // Process each chunk
      for (let i = 0; i < chunks.length; i++) {
        setCurrentChunk(i + 1);

        try {
          const response = await fetch('/api/tts-chunk', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              text: chunks[i].text,
              voice,
              format: 'mp3',
            }),
          });

          if (!response.ok) {
            const errorData = await response.json();
            if (response.status === 429) {
              // Rate limited - wait and retry
              await new Promise((resolve) =>
                setTimeout(resolve, (errorData.retryAfter || 5) * 1000)
              );
              i--; // Retry this chunk
              continue;
            }
            failedChunks.push(i);
            continue;
          }

          const data = await response.json();
          audioChunks.push({
            order: chunks[i].order,
            textContent: chunks[i].text,
            audioData: data.audioData,
            durationSeconds: data.durationSeconds,
            generatedAt: Date.now(),
          });

          // Update progress
          setProgress(Math.round(((i + 1) / chunks.length) * 100));
        } catch (err) {
          console.error(`Failed to convert chunk ${i}:`, err);
          failedChunks.push(i);
        }
      }

      if (failedChunks.length > 0) {
        setError({
          error: `Failed to convert ${failedChunks.length} chunk(s). Try again.`,
          code: ErrorCode.API_ERROR,
          retryable: true,
        });
        setStatus(ConversionStatus.FAILED);
        return;
      }

      if (audioChunks.length === 0) {
        setError({
          error: 'No audio chunks were generated. Please try again.',
          code: ErrorCode.API_ERROR,
          retryable: true,
        });
        setStatus(ConversionStatus.FAILED);
        return;
      }

      // Stitch audio together
      setStatus(ConversionStatus.STITCHING);
      const url = await createAudioURL(audioChunks);
      setAudioUrl(url);

      // Save to localStorage
      const id = generateUUID();
      const textHash = await generateHash(text);
      const totalDuration = audioChunks.reduce(
        (sum, chunk) => sum + chunk.durationSeconds,
        0
      );

      saveAudio({
        id,
        textPreview: truncateText(text, 100),
        textHash,
        voice,
        chunks: audioChunks,
        totalDuration,
        createdAt: Date.now(),
        lastAccessedAt: Date.now(),
      });

      setAudioId(id);
      setStatus(ConversionStatus.COMPLETE);
      setProgress(100);
    } catch (err) {
      console.error('Conversion error:', err);
      const error = err as Error;
      setError({
        error: error.message || 'An unexpected error occurred',
        code: ErrorCode.API_ERROR,
        retryable: true,
      });
      setStatus(ConversionStatus.FAILED);
    }
  };

  const handleDownload = () => {
    if (!audioUrl) return;

    const a = document.createElement('a');
    a.href = audioUrl;
    a.download = `vorlesen-${audioId || Date.now()}.mp3`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleRetry = () => {
    setError(null);
    handleConvert();
  };

  const isProcessing =
    status === ConversionStatus.SPLITTING ||
    status === ConversionStatus.PROCESSING ||
    status === ConversionStatus.STITCHING;

  return (
    <main className="container mx-auto max-w-4xl py-8 px-4">
      <div className="space-y-8">
        {/* Header */}
        <div className="space-y-2 text-center">
          <h1 className="text-4xl font-bold tracking-tight">Vorlesen</h1>
          <p className="text-muted-foreground">
            Convert your text to speech for proofreading
          </p>
        </div>

        {/* Main card */}
        <Card className="p-6 space-y-6">
          <TextInput
            value={text}
            onChange={setText}
            disabled={isProcessing}
            placeholder="Paste your text here to convert it to speech..."
          />

          <VoiceSelector value={voice} onChange={setVoice} disabled={isProcessing} />

          <Button
            onClick={handleConvert}
            disabled={isProcessing || !text.trim()}
            className="w-full"
            size="lg"
          >
            {isProcessing ? 'Converting...' : 'Convert to Speech'}
          </Button>

          {status !== ConversionStatus.IDLE && (
            <ProgressIndicator
              status={status}
              progress={progress}
              currentChunk={currentChunk}
              totalChunks={totalChunks}
            />
          )}

          <ErrorDisplay error={error} onRetry={handleRetry} onDismiss={() => setError(null)} />
        </Card>

        {/* Audio player */}
        {audioUrl && status === ConversionStatus.COMPLETE && (
          <AudioPlayer audioUrl={audioUrl} onDownload={handleDownload} />
        )}
      </div>
    </main>
  );
}
