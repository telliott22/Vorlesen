'use client';

import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ErrorResponse } from '@/types/audio';

interface ErrorDisplayProps {
  error: ErrorResponse | null;
  onRetry?: () => void;
  onDismiss?: () => void;
}

export function ErrorDisplay({ error, onRetry, onDismiss }: ErrorDisplayProps) {
  if (!error) return null;

  return (
    <div
      className="rounded-lg border border-destructive/50 bg-destructive/10 p-4"
      role="alert"
      aria-live="assertive"
    >
      <div className="flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
        <div className="flex-1 space-y-2">
          <p className="text-sm font-medium text-destructive">{error.error}</p>
          {error.retryable && (
            <p className="text-xs text-muted-foreground">
              {error.retryAfter
                ? `You can retry in ${error.retryAfter} seconds.`
                : 'You can try again.'}
            </p>
          )}
        </div>
        <div className="flex gap-2 shrink-0">
          {error.retryable && onRetry && (
            <Button
              size="sm"
              variant="outline"
              onClick={onRetry}
              className="h-8"
              aria-label="Retry conversion"
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Retry
            </Button>
          )}
          {onDismiss && (
            <Button
              size="sm"
              variant="ghost"
              onClick={onDismiss}
              className="h-8"
              aria-label="Dismiss error"
            >
              Dismiss
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
