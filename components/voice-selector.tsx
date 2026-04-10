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
    value: 'en-US-AriaNeural',
    label: 'Aria',
    description: 'Expressive female — versatile & lively (US)',
  },
  {
    value: 'en-US-JennyNeural',
    label: 'Jenny',
    description: 'Clear female — great for narration (US)',
  },
  {
    value: 'en-GB-RyanNeural',
    label: 'Ryan',
    description: 'Engaging male — friendly & natural (British)',
  },
  {
    value: 'en-US-RogerNeural',
    label: 'Roger',
    description: 'Deep male — narrator style (US)',
  },
  {
    value: 'en-US-GuyNeural',
    label: 'Guy',
    description: 'Relaxed male — easy-going & conversational (US)',
  },
  {
    value: 'en-US-AvaNeural',
    label: 'Ava',
    description: 'Warm female — natural & expressive (US)',
  },
  {
    value: 'en-GB-SoniaNeural',
    label: 'Sonia',
    description: 'Polished female — elegant & clear (British)',
  },
  {
    value: 'en-US-AndrewNeural',
    label: 'Andrew',
    description: 'Calm male — natural & human (US)',
  },
  {
    value: 'en-US-BrianNeural',
    label: 'Brian',
    description: 'Confident male — clear & authoritative (US)',
  },
  {
    value: 'en-US-EmmaNeural',
    label: 'Emma',
    description: 'Soft female — natural & narrating (US)',
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
