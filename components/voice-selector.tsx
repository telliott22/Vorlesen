'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface VoiceSelectorProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

const VOICE_OPTIONS = [
  {
    value: 'en-US-Wavenet-D',
    label: 'Male (Wavenet)',
    description: 'Natural male voice',
  },
  {
    value: 'en-US-Wavenet-F',
    label: 'Female (Wavenet)',
    description: 'Natural female voice',
  },
  {
    value: 'en-US-Neural2-A',
    label: 'Male (Neural)',
    description: 'Premium male voice',
  },
];

export function VoiceSelector({ value, onChange, disabled = false }: VoiceSelectorProps) {
  return (
    <div className="space-y-2">
      <label htmlFor="voice-select" className="text-sm font-medium">
        Voice
      </label>
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger id="voice-select" className="w-full">
          <SelectValue placeholder="Select a voice" />
        </SelectTrigger>
        <SelectContent>
          {VOICE_OPTIONS.map((voice) => (
            <SelectItem key={voice.value} value={voice.value}>
              <div className="flex flex-col">
                <span>{voice.label}</span>
                <span className="text-xs text-muted-foreground">{voice.description}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
