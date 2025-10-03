'use client';

import { Textarea } from '@/components/ui/textarea';

interface TextInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function TextInput({
  value,
  onChange,
  disabled = false,
  placeholder = 'Paste your text here...',
}: TextInputProps) {
  const charCount = value.length;

  return (
    <div className="space-y-2">
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder={placeholder}
        className="min-h-[300px] resize-y font-mono text-sm"
        aria-label="Text to convert to speech"
      />
      <div className="flex justify-between text-sm text-muted-foreground">
        <span>{charCount.toLocaleString()} characters</span>
        {charCount > 4000 && (
          <span className="text-amber-600">
            Will be split into {Math.ceil(charCount / 4000)} chunks
          </span>
        )}
      </div>
    </div>
  );
}
