'use client';

import { useState, useRef, useCallback } from 'react';

export interface VoiceSettings {
  languageCode: string;
  name: string;
  ssmlGender: 'MALE' | 'FEMALE' | 'NEUTRAL';
  speakingRate?: number;
  pitch?: number;
}

export const AVAILABLE_VOICES: VoiceSettings[] = [
  // US English Voices
  { languageCode: 'en-US', name: 'en-US-Standard-A', ssmlGender: 'MALE' },
  { languageCode: 'en-US', name: 'en-US-Standard-B', ssmlGender: 'MALE' },
  { languageCode: 'en-US', name: 'en-US-Standard-C', ssmlGender: 'FEMALE' },
  { languageCode: 'en-US', name: 'en-US-Standard-D', ssmlGender: 'MALE' },
  { languageCode: 'en-US', name: 'en-US-Standard-E', ssmlGender: 'FEMALE' },
  { languageCode: 'en-US', name: 'en-US-Standard-F', ssmlGender: 'FEMALE' },
  { languageCode: 'en-US', name: 'en-US-Standard-G', ssmlGender: 'FEMALE' },
  { languageCode: 'en-US', name: 'en-US-Standard-H', ssmlGender: 'FEMALE' },
  { languageCode: 'en-US', name: 'en-US-Standard-I', ssmlGender: 'MALE' },
  { languageCode: 'en-US', name: 'en-US-Standard-J', ssmlGender: 'MALE' },
  // Wavenet voices (higher quality)
  { languageCode: 'en-US', name: 'en-US-Wavenet-A', ssmlGender: 'MALE' },
  { languageCode: 'en-US', name: 'en-US-Wavenet-B', ssmlGender: 'MALE' },
  { languageCode: 'en-US', name: 'en-US-Wavenet-C', ssmlGender: 'FEMALE' },
  { languageCode: 'en-US', name: 'en-US-Wavenet-D', ssmlGender: 'MALE' },
  { languageCode: 'en-US', name: 'en-US-Wavenet-E', ssmlGender: 'FEMALE' },
  { languageCode: 'en-US', name: 'en-US-Wavenet-F', ssmlGender: 'FEMALE' },
  // Neural2 voices (newest, highest quality)
  { languageCode: 'en-US', name: 'en-US-Neural2-A', ssmlGender: 'MALE' },
  { languageCode: 'en-US', name: 'en-US-Neural2-C', ssmlGender: 'FEMALE' },
  { languageCode: 'en-US', name: 'en-US-Neural2-D', ssmlGender: 'MALE' },
  { languageCode: 'en-US', name: 'en-US-Neural2-E', ssmlGender: 'FEMALE' },
  { languageCode: 'en-US', name: 'en-US-Neural2-F', ssmlGender: 'FEMALE' },
  { languageCode: 'en-US', name: 'en-US-Neural2-G', ssmlGender: 'FEMALE' },
  { languageCode: 'en-US', name: 'en-US-Neural2-H', ssmlGender: 'FEMALE' },
  { languageCode: 'en-US', name: 'en-US-Neural2-I', ssmlGender: 'MALE' },
  { languageCode: 'en-US', name: 'en-US-Neural2-J', ssmlGender: 'MALE' },
];

export const useGoogleTTS = (apiKey: string) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  // Default to Neural2-C (high quality female voice)
  const neural2C = AVAILABLE_VOICES.find(v => v.name === 'en-US-Neural2-C') || AVAILABLE_VOICES[0];
  const [currentVoice, setCurrentVoice] = useState<VoiceSettings>(neural2C);

  const synthesizeSpeech = useCallback(async (
    text: string,
    voice?: VoiceSettings
  ): Promise<string> => {
    const selectedVoice = voice || currentVoice;
    
    const url = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`;
    
    const requestBody = {
      input: { text },
      voice: {
        languageCode: selectedVoice.languageCode,
        name: selectedVoice.name,
        ssmlGender: selectedVoice.ssmlGender,
      },
      audioConfig: {
        audioEncoding: 'MP3',
        speakingRate: selectedVoice.speakingRate || 1.0,
        pitch: selectedVoice.pitch || 0,
      },
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'Failed to synthesize speech');
    }

    const data = await response.json();
    return data.audioContent;
  }, [apiKey, currentVoice]);

  const speak = useCallback(async (text: string, voice?: VoiceSettings) => {
    try {
      setIsLoading(true);
      setError(null);

      // Stop any current playback
      stop();

      // Get audio from Google TTS
      const audioContent = await synthesizeSpeech(text, voice);
      
      // Convert base64 to audio
      const audio = new Audio(`data:audio/mp3;base64,${audioContent}`);
      audioRef.current = audio;

      // Set up event listeners
      audio.onplay = () => {
        setIsPlaying(true);
        setIsPaused(false);
      };

      audio.onpause = () => {
        setIsPaused(true);
      };

      audio.onended = () => {
        setIsPlaying(false);
        setIsPaused(false);
      };

      audio.onerror = (e) => {
        setError('Failed to play audio');
        setIsPlaying(false);
        setIsPaused(false);
      };

      // Play the audio
      await audio.play();
      setIsLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to speak text');
      setIsLoading(false);
      setIsPlaying(false);
      setIsPaused(false);
    }
  }, [synthesizeSpeech]);

  const pause = useCallback(() => {
    if (audioRef.current && isPlaying) {
      audioRef.current.pause();
      setIsPaused(true);
    }
  }, [isPlaying]);

  const resume = useCallback(() => {
    if (audioRef.current && isPaused) {
      audioRef.current.play();
      setIsPaused(false);
    }
  }, [isPaused]);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    setIsPlaying(false);
    setIsPaused(false);
  }, []);

  const changeVoice = useCallback((voice: VoiceSettings) => {
    setCurrentVoice(voice);
  }, []);

  return {
    speak,
    pause,
    resume,
    stop,
    changeVoice,
    isLoading,
    isPlaying,
    isPaused,
    error,
    currentVoice,
    availableVoices: AVAILABLE_VOICES,
  };
};