/**
 * Example demonstrating Sone's voice capabilities
 * This shows how to use text-to-speech and speech-to-text with Sone
 */

import { createReadStream, createWriteStream } from 'fs';
import path from 'path';
import { soneAgent } from '../src/mastra/agents/sone-agent';

async function demonstrateVoiceCapabilities() {
  console.log('🎤 Demonstrating Sone\'s Voice Capabilities');
  console.log('==========================================\n');

  // Example 1: Text-to-Speech
  console.log('1. Text-to-Speech Example');
  console.log('-------------------------');
  
  const textToSpeak = "Hello! I'm Sone, your AI assistant with voice capabilities. I can help you with systematic problem-solving and analysis.";
  
  try {
    // Generate speech from text
    const audioStream = await soneAgent.voice.speak(textToSpeak, {
      speaker: 'en-US-Studio-O', // Professional female voice
      languageCode: 'en-US',
      audioConfig: {
        audioEncoding: 'LINEAR16',
        speakingRate: 1.0,
        pitch: 0.0,
      },
    });

    // Save the audio to a file
    const audioFilePath = path.join(process.cwd(), 'sone-greeting.wav');
    const writer = createWriteStream(audioFilePath);
    
    audioStream.pipe(writer);
    
    await new Promise<void>((resolve, reject) => {
      writer.on('finish', () => {
        console.log(`✅ Audio saved to: ${audioFilePath}`);
        console.log('   You can play this file to hear Sone\'s voice!\n');
        resolve();
      });
      writer.on('error', reject);
    });

  } catch (error) {
    console.error('❌ Text-to-Speech Error:', error);
    console.log('   Make sure GOOGLE_API_KEY is set in your environment\n');
  }

  // Example 2: Speech-to-Text (if you have an audio file)
  console.log('2. Speech-to-Text Example');
  console.log('-------------------------');
  
  try {
    // You would need an actual audio file for this to work
    // const audioFilePath = path.join(process.cwd(), 'user-input.wav');
    // const audioStream = createReadStream(audioFilePath);
    
    // const transcript = await soneAgent.voice.listen(audioStream, {
    //   config: {
    //     encoding: 'LINEAR16',
    //     languageCode: 'en-US',
    //     sampleRateHertz: 16000,
    //   },
    // });
    
    // console.log(`🎯 Transcription: "${transcript}"`);
    
    console.log('📝 To test speech-to-text:');
    console.log('   1. Record an audio file (WAV format recommended)');
    console.log('   2. Uncomment the code above');
    console.log('   3. Update the audioFilePath to your file');
    console.log('   4. Run this example again\n');
    
  } catch (error) {
    console.error('❌ Speech-to-Text Error:', error);
  }

  // Example 3: Voice Conversation Flow
  console.log('3. Voice Conversation Flow');
  console.log('-------------------------');
  
  try {
    // Simulate a conversation with memory
    const userMessage = "Can you help me analyze a complex problem?";
    
    // Generate response with memory context
    const response = await soneAgent.generate(userMessage, {
      resourceId: 'voice-demo-user',
      threadId: 'voice-conversation-1',
    });

    console.log(`👤 User: "${userMessage}"`);
    console.log(`🤖 Sone: "${response.text}"`);
    
    // Convert response to speech
    const responseAudio = await soneAgent.voice.speak(response.text, {
      speaker: 'en-US-Studio-O',
      languageCode: 'en-US',
    });

    // Save response audio
    const responseAudioPath = path.join(process.cwd(), 'sone-response.wav');
    const responseWriter = createWriteStream(responseAudioPath);
    
    responseAudio.pipe(responseWriter);
    
    await new Promise<void>((resolve, reject) => {
      responseWriter.on('finish', () => {
        console.log(`✅ Response audio saved to: ${responseAudioPath}`);
        resolve();
      });
      responseWriter.on('error', reject);
    });

  } catch (error) {
    console.error('❌ Conversation Error:', error);
  }

  console.log('\n🎉 Voice demonstration complete!');
  console.log('\nNext steps:');
  console.log('- Set up your Google Cloud API key for voice services');
  console.log('- Try the audio files generated in your media player');
  console.log('- Integrate voice capabilities into your application');
  console.log('- Explore other voice providers (OpenAI, ElevenLabs) for different voice qualities');
}

// Run the demonstration
if (require.main === module) {
  demonstrateVoiceCapabilities().catch(console.error);
}

export { demonstrateVoiceCapabilities };
