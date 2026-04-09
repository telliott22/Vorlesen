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
    value: 'en-US-Journey-D',
    label: 'Journey Male',
    description: 'Best quality — natural & conversational',
  },
  {
    value: 'en-US-Journey-F',
    label: 'Journey Female',
    description: 'Best quality — warm & expressive',
  },
  {
    value: 'en-US-Journey-O',
    label: 'Journey Male Alt',
    description: 'Best quality — calm & engaging',
  },
  {
    value: 'en-US-Neural2-D',
    label: 'Neural Male',
    description: 'Premium quality — clear & confident',
  },
  {
    value: 'en-US-Neural2-F',
    label: 'Neural Female',
    description: 'Premium quality — natural & warm',
  },
  {
    value: 'en-US-Neural2-A',
    label: 'Neural Male Deep',
    description: 'Premium quality — deep & authoritative',
  },
  {
    value: 'en-US-Neural2-C',
    label: 'Neural Female Alt',
    description: 'Premium quality — soft & articulate',
  },
  {
    value: 'en-US-Neural2-H',
    label: 'Neural Female Bright',
    description: 'Premium quality — bright & friendly',
  },
  {
    value: 'en-US-Neural2-I',
    label: 'Neural Male Warm',
    description: 'Premium quality — warm & relaxed',
  },
  {
    value: 'en-US-Neural2-J',
    label: 'Neural Male Narrator',
    description: 'Premium quality — polished narrator',
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
