'use client';

import { Progress } from '@/components/ui/progress';
import { ConversionStatus } from '@/types/tts';

interface ProgressIndicatorProps {
  status: ConversionStatus;
  progress: number; // 0-100
  currentChunk?: number;
  totalChunks?: number;
}

export function ProgressIndicator({
  status,
  progress,
  currentChunk,
  totalChunks,
}: ProgressIndicatorProps) {
  if (status === ConversionStatus.IDLE) {
    return null;
  }

  const getStatusMessage = () => {
    switch (status) {
      case ConversionStatus.SPLITTING:
        return 'Splitting text into chunks...';
      case ConversionStatus.PROCESSING:
        return currentChunk && totalChunks
          ? `Converting chunk ${currentChunk} of ${totalChunks}...`
          : 'Converting to speech...';
      case ConversionStatus.STITCHING:
        return 'Stitching audio together...';
      case ConversionStatus.COMPLETE:
        return 'Complete!';
      case ConversionStatus.FAILED:
        return 'Conversion failed';
      default:
        return 'Processing...';
    }
  };

  return (
    <div className="space-y-2" role="status" aria-live="polite">
      <div className="flex justify-between text-sm">
        <span className="font-medium">{getStatusMessage()}</span>
        <span className="text-muted-foreground">{Math.round(progress)}%</span>
      </div>
      <Progress value={progress} className="h-2" />
    </div>
  );
}
