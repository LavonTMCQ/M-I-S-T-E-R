#!/usr/bin/env node

/**
 * Test script for Sone's Text-to-Speech capabilities
 * This script demonstrates how to use Sone's voice streaming functionality
 */

import { soneAgent } from './src/mastra/agents/sone-agent.js';

async function testSoneVoice() {
  console.log('🎤 Testing Sone\'s Text-to-Speech capabilities...\n');

  try {
    // Test 1: Basic TTS functionality
    console.log('Test 1: Basic voice response');
    const response1 = await soneAgent.generate(
      'Hello Sydney! Please use your speakResponse tool to say: "Hello, I am Sone, your AI assistant. I can now speak to you through your speakers!"',
      {
        resourceId: 'sydney-test',
        threadId: 'voice-test-1'
      }
    );
    console.log('Sone\'s response:', response1.text);
    console.log('---\n');

    // Test 2: Ask Sone to speak a specific message
    console.log('Test 2: Specific voice message');
    const response2 = await soneAgent.generate(
      'Please use your speakResponse tool to say: "Hello Sydney, I am Sone, your AI assistant. I can now speak to you through your computer speakers using my professional female voice. This is a test of my text-to-speech capabilities."',
      {
        resourceId: 'sydney-test',
        threadId: 'voice-test-2'
      }
    );
    console.log('Sone\'s response:', response2.text);
    console.log('---\n');

    // Test 3: Ask for a longer spoken response
    console.log('Test 3: Longer spoken explanation');
    const response3 = await soneAgent.generate(
      'Please explain your voice capabilities to Sydney using your speakResponse tool. Tell her about the different ways you can help her and how she can interact with you through voice.',
      {
        resourceId: 'sydney-test',
        threadId: 'voice-test-3'
      }
    );
    console.log('Sone\'s response:', response3.text);

  } catch (error) {
    console.error('❌ Error testing Sone\'s voice:', error);
  }
}

// Run the test
testSoneVoice().then(() => {
  console.log('\n✅ Voice testing completed!');
}).catch((error) => {
  console.error('❌ Voice testing failed:', error);
});
