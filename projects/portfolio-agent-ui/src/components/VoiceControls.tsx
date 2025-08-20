'use client';

import { Button } from '@/components/ui/button';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { VoiceSettings } from '@/hooks/useGoogleTTS';
import { 
  PlayIcon, 
  PauseIcon, 
  StopIcon, 
  SpeakerLoudIcon,
  SpeakerOffIcon 
} from '@radix-ui/react-icons';

interface VoiceControlsProps {
  isPlaying: boolean;
  isPaused: boolean;
  isLoading: boolean;
  currentVoice: VoiceSettings;
  availableVoices: VoiceSettings[];
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
  onVoiceChange: (voice: VoiceSettings) => void;
}

export function VoiceControls({
  isPlaying,
  isPaused,
  isLoading,
  currentVoice,
  availableVoices,
  onPlay,
  onPause,
  onStop,
  onVoiceChange,
}: VoiceControlsProps) {
  const getVoiceLabel = (voice: VoiceSettings) => {
    const type = voice.name.includes('Neural2') ? 'Neural2' :
                 voice.name.includes('Wavenet') ? 'Wavenet' : 'Standard';
    const gender = voice.ssmlGender === 'MALE' ? '♂' : 
                   voice.ssmlGender === 'FEMALE' ? '♀' : '⚲';
    const variant = voice.name.split('-').pop();
    return `${type} ${variant} ${gender}`;
  };

  return (
    <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
      {/* Play/Pause/Stop Controls */}
      <div className="flex items-center gap-1">
        {!isPlaying ? (
          <Button
            size="sm"
            variant="ghost"
            onClick={onPlay}
            disabled={isLoading || !isPaused}
            className="h-8 w-8 p-0"
            title="Resume"
          >
            <PlayIcon className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            size="sm"
            variant="ghost"
            onClick={onPause}
            disabled={isLoading}
            className="h-8 w-8 p-0"
            title="Pause"
          >
            <PauseIcon className="h-4 w-4" />
          </Button>
        )}
        
        <Button
          size="sm"
          variant="ghost"
          onClick={onStop}
          disabled={!isPlaying && !isPaused}
          className="h-8 w-8 p-0"
          title="Stop"
        >
          <StopIcon className="h-4 w-4" />
        </Button>
      </div>

      {/* Voice Status Indicator */}
      <div className="flex items-center gap-1">
        {isPlaying ? (
          <SpeakerLoudIcon className="h-4 w-4 text-green-500 animate-pulse" />
        ) : (
          <SpeakerOffIcon className="h-4 w-4 text-muted-foreground" />
        )}
        <span className="text-xs text-muted-foreground">
          {isLoading ? 'Loading...' : isPlaying ? 'Speaking' : isPaused ? 'Paused' : 'Ready'}
        </span>
      </div>

      {/* Voice Selector */}
      <Select
        value={currentVoice.name}
        onValueChange={(value) => {
          const voice = availableVoices.find(v => v.name === value);
          if (voice) onVoiceChange(voice);
        }}
      >
        <SelectTrigger className="w-[150px] h-8 text-xs">
          <SelectValue placeholder="Select voice" />
        </SelectTrigger>
        <SelectContent>
          {/* Standard Voices */}
          <div className="text-xs font-semibold px-2 py-1 text-muted-foreground">
            Standard Voices
          </div>
          {availableVoices
            .filter(v => v.name.includes('Standard'))
            .map((voice) => (
              <SelectItem key={voice.name} value={voice.name} className="text-xs">
                {getVoiceLabel(voice)}
              </SelectItem>
            ))}
          
          {/* Wavenet Voices */}
          <div className="text-xs font-semibold px-2 py-1 text-muted-foreground mt-2">
            Wavenet Voices (Better)
          </div>
          {availableVoices
            .filter(v => v.name.includes('Wavenet'))
            .map((voice) => (
              <SelectItem key={voice.name} value={voice.name} className="text-xs">
                {getVoiceLabel(voice)}
              </SelectItem>
            ))}
          
          {/* Neural2 Voices */}
          <div className="text-xs font-semibold px-2 py-1 text-muted-foreground mt-2">
            Neural2 Voices (Best)
          </div>
          {availableVoices
            .filter(v => v.name.includes('Neural2'))
            .map((voice) => (
              <SelectItem key={voice.name} value={voice.name} className="text-xs">
                {getVoiceLabel(voice)}
              </SelectItem>
            ))}
        </SelectContent>
      </Select>
    </div>
  );
}