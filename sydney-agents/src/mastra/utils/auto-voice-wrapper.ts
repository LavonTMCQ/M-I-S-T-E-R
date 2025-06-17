/**
 * Auto-Voice Wrapper for Sone Agent
 * This utility automatically converts Sone's text responses to speech
 */

import { soneAgent } from '../agents/sone-agent.js';

export interface VoiceOptions {
  autoSpeak?: boolean;
  speaker?: string;
  saveAudio?: boolean;
  skipAutoSpeakFor?: string[]; // Array of keywords that should skip auto-speak
}

export class AutoVoiceSone {
  private options: VoiceOptions;

  constructor(options: VoiceOptions = {}) {
    this.options = {
      autoSpeak: true,
      speaker: 'en-US-Studio-O',
      saveAudio: false,
      skipAutoSpeakFor: ['debug', 'error', 'warning'],
      ...options
    };
  }

  /**
   * Generate a response from Sone and optionally convert it to speech
   */
  async generateWithVoice(
    message: string,
    context: { resourceId: string; threadId: string },
    voiceOptions?: Partial<VoiceOptions>
  ) {
    const mergedOptions = { ...this.options, ...voiceOptions };

    try {
      // Generate the text response
      console.log('🤖 Generating response from Sone...');
      const response = await soneAgent.generate(message, context);

      // Check if we should auto-speak this response
      const shouldAutoSpeak = mergedOptions.autoSpeak && 
        !this.shouldSkipAutoSpeak(response.text, mergedOptions.skipAutoSpeakFor || []);

      if (shouldAutoSpeak) {
        console.log('🎤 Auto-converting response to speech...');
        
        // Use Sone's speakResponse tool to vocalize the response
        const ttsMessage = `Please use your speakResponse tool to speak this exact text: "${response.text}"`;
        
        try {
          await soneAgent.generate(ttsMessage, {
            resourceId: context.resourceId,
            threadId: `${context.threadId}-tts`
          });
          console.log('✅ Response converted to speech successfully');
        } catch (ttsError) {
          console.warn('⚠️  Auto-speech failed, but text response is available:', ttsError);
        }
      }

      return {
        text: response.text,
        voiceEnabled: shouldAutoSpeak,
        options: mergedOptions
      };

    } catch (error) {
      console.error('❌ Error in generateWithVoice:', error);
      throw error;
    }
  }

  /**
   * Manually convert any text to speech using Sone's voice
   */
  async speakText(
    text: string,
    context: { resourceId: string; threadId: string },
    speaker?: string
  ) {
    try {
      console.log(`🎤 Converting text to speech: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`);
      
      const speakerOption = speaker ? `, using speaker: ${speaker}` : '';
      const ttsMessage = `Please use your speakResponse tool to speak this exact text${speakerOption}: "${text}"`;
      
      const response = await soneAgent.generate(ttsMessage, context);
      
      return {
        success: true,
        text: text,
        response: response.text
      };
    } catch (error) {
      console.error('❌ Error in speakText:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Check if a response should skip auto-speak based on keywords
   */
  private shouldSkipAutoSpeak(text: string, skipKeywords: string[]): boolean {
    const lowerText = text.toLowerCase();
    return skipKeywords.some(keyword => lowerText.includes(keyword.toLowerCase()));
  }

  /**
   * Update voice options
   */
  updateOptions(newOptions: Partial<VoiceOptions>) {
    this.options = { ...this.options, ...newOptions };
  }

  /**
   * Get current voice options
   */
  getOptions(): VoiceOptions {
    return { ...this.options };
  }
}

// Create a default instance for easy use
export const autoVoiceSone = new AutoVoiceSone();

// Convenience functions
export async function askSoneWithVoice(
  message: string,
  resourceId: string = 'sydney-default',
  threadId: string = `thread-${Date.now()}`
) {
  return autoVoiceSone.generateWithVoice(message, { resourceId, threadId });
}

export async function makeSoneSpeak(
  text: string,
  resourceId: string = 'sydney-default',
  threadId: string = `speak-${Date.now()}`
) {
  return autoVoiceSone.speakText(text, { resourceId, threadId });
}
