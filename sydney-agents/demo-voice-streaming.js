#!/usr/bin/env node

/**
 * Comprehensive Demo: Sone's Voice Streaming Capabilities
 * 
 * This demo shows multiple ways to make Sone speak through your speakers:
 * 1. Manual tool usage - Sone uses her speakResponse tool when asked
 * 2. Automatic voice responses - Every response is automatically spoken
 * 3. Direct text-to-speech - Convert any text to Sone's voice
 */

import { soneAgent } from './src/mastra/agents/sone-agent.js';
import { autoVoiceSone, askSoneWithVoice, makeSoneSpeak } from './src/mastra/utils/auto-voice-wrapper.js';

async function demonstrateVoiceCapabilities() {
  console.log('🎤 Sone Voice Streaming Demo');
  console.log('============================\n');

  const resourceId = 'sydney-voice-demo';
  
  try {
    // Demo 1: Manual Tool Usage
    console.log('📢 DEMO 1: Manual Voice Tool Usage');
    console.log('Asking Sone to introduce herself using her voice...\n');
    
    const intro = await soneAgent.generate(
      'Hello Sydney! Please use your speakResponse tool to introduce yourself and explain your new voice capabilities. Make it warm and personal.',
      { resourceId, threadId: 'demo-1-intro' }
    );
    console.log('Sone\'s text response:', intro.text);
    console.log('\n---\n');

    // Wait a moment between demos
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Demo 2: Automatic Voice Responses
    console.log('📢 DEMO 2: Automatic Voice Responses');
    console.log('Using the auto-voice wrapper for seamless speech...\n');
    
    const autoResponse = await askSoneWithVoice(
      'Tell me about your memory capabilities and how you can help me with my daily tasks. Keep it conversational.',
      resourceId,
      'demo-2-auto'
    );
    console.log('Auto-voice response:', autoResponse.text);
    console.log('Voice enabled:', autoResponse.voiceEnabled);
    console.log('\n---\n');

    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Demo 3: Direct Text-to-Speech
    console.log('📢 DEMO 3: Direct Text-to-Speech');
    console.log('Converting custom text to Sone\'s voice...\n');
    
    const customText = "Hello Sydney! This is a demonstration of my text-to-speech capabilities. I can convert any text into natural-sounding speech using my professional female voice. This opens up many possibilities for our interactions!";
    
    const speechResult = await makeSoneSpeak(
      customText,
      resourceId,
      'demo-3-custom'
    );
    console.log('Speech conversion result:', speechResult);
    console.log('\n---\n');

    // Demo 4: Interactive Voice Session
    console.log('📢 DEMO 4: Interactive Voice Session');
    console.log('Having a natural conversation with voice responses...\n');

    const questions = [
      "What's the weather like for planning outdoor activities?",
      "Can you help me organize my schedule for tomorrow?",
      "What are some productivity tips you'd recommend?"
    ];

    for (let i = 0; i < questions.length; i++) {
      console.log(`Question ${i + 1}: ${questions[i]}`);
      
      const response = await askSoneWithVoice(
        questions[i],
        resourceId,
        `demo-4-q${i + 1}`
      );
      
      console.log(`Sone's response: ${response.text}\n`);
      
      // Brief pause between questions
      if (i < questions.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1500));
      }
    }

    console.log('---\n');

    // Demo 5: Voice Configuration Options
    console.log('📢 DEMO 5: Voice Configuration Options');
    console.log('Demonstrating different voice settings...\n');

    // Show current options
    console.log('Current voice options:', autoVoiceSone.getOptions());

    // Update options to disable auto-speak for this demo
    autoVoiceSone.updateOptions({ autoSpeak: false });
    
    const silentResponse = await askSoneWithVoice(
      'This response should not be automatically spoken.',
      resourceId,
      'demo-5-silent'
    );
    console.log('Silent response (no auto-speech):', silentResponse.text);
    console.log('Voice enabled:', silentResponse.voiceEnabled);

    // Re-enable auto-speak
    autoVoiceSone.updateOptions({ autoSpeak: true });
    console.log('\nAuto-speak re-enabled for future interactions.\n');

    // Final demo message
    console.log('📢 FINAL MESSAGE');
    await makeSoneSpeak(
      "This concludes the demonstration of my voice streaming capabilities. I can now speak to you through your computer speakers whenever you need to hear my voice. Whether you want automatic speech for all responses, manual control using my speakResponse tool, or direct text-to-speech conversion, I'm ready to communicate with you in whatever way works best!",
      resourceId,
      'demo-final'
    );

  } catch (error) {
    console.error('❌ Demo failed:', error);
  }
}

// Run the comprehensive demo
console.log('Starting Sone Voice Streaming Demo...\n');
demonstrateVoiceCapabilities().then(() => {
  console.log('\n✅ Voice streaming demo completed!');
  console.log('\nNext steps:');
  console.log('1. Use askSoneWithVoice() for automatic voice responses');
  console.log('2. Use makeSoneSpeak() to convert any text to speech');
  console.log('3. Ask Sone to use her speakResponse tool manually');
  console.log('4. Customize voice options using autoVoiceSone.updateOptions()');
}).catch((error) => {
  console.error('❌ Demo failed:', error);
});
