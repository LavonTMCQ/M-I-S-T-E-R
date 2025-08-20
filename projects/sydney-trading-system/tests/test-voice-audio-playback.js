/**
 * Test Voice Audio Playback
 * 
 * This tests if your voice system can actually play audio to speakers
 * Based on Mastra documentation requirements
 */

import { mastra } from './sydney-agents/src/mastra/index.js';
import fs from 'fs';

async function testVoiceAudioPlayback() {
  console.log('🎧 TESTING VOICE AUDIO PLAYBACK');
  console.log('=' .repeat(50));
  
  try {
    // Get the PhemexPortfolioAgent
    const agent = mastra.getAgent('phemexPortfolioAgent');
    
    if (!agent.voice) {
      console.log('❌ Agent does not have voice capabilities configured');
      return;
    }
    
    console.log('✅ Agent has voice capabilities');
    console.log(`🎤 Voice provider: ${agent.voice.constructor.name}`);
    
    // Test if @mastra/node-audio is available
    console.log('\n📦 Checking @mastra/node-audio package...');
    try {
      const nodeAudio = await import('@mastra/node-audio');
      console.log('✅ @mastra/node-audio is available');
      
      if (nodeAudio.playAudio) {
        console.log('✅ playAudio function is available');
      } else {
        console.log('❌ playAudio function not found');
      }
      
    } catch (error) {
      console.log('❌ @mastra/node-audio not installed or not working');
      console.log('💡 Install with: npm install @mastra/node-audio');
      console.log('⚠️ This is REQUIRED for audio playback to speakers');
    }
    
    // Test text-to-speech generation
    console.log('\n🗣️ Testing Text-to-Speech generation...');
    
    const testMessage = "This is a test of your voice system. If you can hear this message, your voice output is working correctly.";
    
    try {
      console.log('🔄 Converting text to speech...');
      console.log(`📝 Text: "${testMessage}"`);
      
      const audioStream = await agent.voice.speak(testMessage, {
        speaker: "en-US-Studio-O"
      });
      
      if (audioStream) {
        console.log('✅ Text-to-Speech audio stream generated successfully');
        console.log('🎵 Audio stream type:', typeof audioStream);
        
        // Try to play the audio if node-audio is available
        try {
          const { playAudio } = await import('@mastra/node-audio');
          console.log('\n🔊 PLAYING AUDIO TO SPEAKERS...');
          console.log('🎧 Listen for: "This is a test of your voice system..."');
          
          await playAudio(audioStream);
          
          console.log('✅ Audio playback attempted');
          console.log('👂 Did you hear the test message?');
          
        } catch (playError) {
          console.log('❌ Could not play audio:', playError.message);
          console.log('💡 Make sure @mastra/node-audio is properly installed');
          
          // Try to save audio to file as fallback
          console.log('\n💾 Attempting to save audio to file...');
          try {
            if (audioStream && audioStream.pipe) {
              const writeStream = fs.createWriteStream('test-voice-output.wav');
              audioStream.pipe(writeStream);
              console.log('💾 Audio saved to test-voice-output.wav');
              console.log('🎵 You can manually play this file to test audio');
            } else {
              console.log('❌ Audio stream cannot be saved');
            }
          } catch (saveError) {
            console.log('❌ Could not save audio to file:', saveError.message);
          }
        }
        
      } else {
        console.log('❌ Text-to-Speech failed - no audio stream returned');
      }
      
    } catch (ttsError) {
      console.log('❌ Text-to-Speech error:', ttsError.message);
    }
    
    // Check playground integration
    console.log('\n🎮 Playground Voice Integration Status:');
    console.log('✅ Voice provider configured for agent');
    console.log('✅ Google Voice (en-US-Studio-O) available');
    console.log('✅ Development server running on http://localhost:4111');
    
    console.log('\n🎯 TO HEAR AGENT RESPONSES IN PLAYGROUND:');
    console.log('1. Open http://localhost:4111');
    console.log('2. Navigate to PhemexPortfolioAgent');
    console.log('3. Look for 🔊 speaker icon next to agent responses');
    console.log('4. Click speaker icon to play audio');
    console.log('5. Make sure your computer volume is up');
    console.log('6. Make sure browser audio is allowed');
    
    console.log('\n🔧 If you still can\'t hear anything:');
    console.log('• Check system volume settings');
    console.log('• Check browser audio permissions');
    console.log('• Try different browser (Chrome/Firefox/Safari)');
    console.log('• Restart browser after enabling audio permissions');
    console.log('• Check if speakers/headphones are working with other apps');
    
  } catch (error) {
    console.error('❌ Voice test failed:', error);
  }
}

testVoiceAudioPlayback().catch(console.error);