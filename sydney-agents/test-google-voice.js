/**
 * Simple test script to verify Google Voice integration with Sone agent
 */

import { soneAgent } from './src/mastra/agents/sone-agent.js';

async function testGoogleVoice() {
  console.log('🎤 Testing Sone Agent with Google Voice Integration');
  console.log('=================================================\n');

  try {
    // Check if voice is available
    if (!soneAgent.voice) {
      console.log('❌ No voice provider configured');
      return;
    }

    console.log('✅ Voice provider detected:', soneAgent.voice.constructor.name);

    // Test 1: Simple text-to-speech
    console.log('\n1. Testing Text-to-Speech');
    console.log('-------------------------');
    
    const testText = "Hello! I'm Sone, your AI assistant with Google Voice capabilities.";
    console.log(`📝 Converting to speech: "${testText}"`);
    
    const audioStream = await soneAgent.voice.speak(testText, {
      speaker: 'en-US-Studio-O',
      languageCode: 'en-US',
    });

    if (audioStream) {
      console.log('✅ Text-to-speech successful! Audio stream generated.');
      console.log('🔊 Audio stream type:', audioStream.constructor.name);
    } else {
      console.log('❌ Text-to-speech failed - no audio stream returned');
    }

    // Test 2: Get available speakers
    console.log('\n2. Testing Available Speakers');
    console.log('-----------------------------');
    
    if (typeof soneAgent.voice.getSpeakers === 'function') {
      const speakers = await soneAgent.voice.getSpeakers();
      console.log(`✅ Found ${speakers.length} available speakers:`);
      speakers.slice(0, 5).forEach((speaker, index) => {
        console.log(`   ${index + 1}. ${speaker.voiceId} (${speaker.languageCodes?.join(', ') || 'N/A'})`);
      });
      if (speakers.length > 5) {
        console.log(`   ... and ${speakers.length - 5} more speakers`);
      }
    } else {
      console.log('ℹ️  getSpeakers method not available');
    }

    // Test 3: Agent conversation with voice
    console.log('\n3. Testing Agent Conversation');
    console.log('-----------------------------');
    
    const userMessage = "Can you tell me about your voice capabilities?";
    console.log(`👤 User: "${userMessage}"`);
    
    const response = await soneAgent.generate(userMessage, {
      resourceId: 'test-user',
      threadId: 'voice-test-thread',
    });

    console.log(`🤖 Sone: "${response.text}"`);
    
    // Convert response to speech
    const responseAudio = await soneAgent.voice.speak(response.text, {
      speaker: 'en-US-Studio-O',
      languageCode: 'en-US',
    });

    if (responseAudio) {
      console.log('✅ Response converted to speech successfully!');
    } else {
      console.log('❌ Failed to convert response to speech');
    }

    console.log('\n🎉 Google Voice integration test completed successfully!');
    console.log('\nNext steps:');
    console.log('- The audio streams can be saved to files or played directly');
    console.log('- Speech-to-text can be tested with audio input files');
    console.log('- Real-time voice conversations can be implemented');

  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run the test
testGoogleVoice().catch(console.error);
