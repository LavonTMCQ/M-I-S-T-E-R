# Sone Voice Streaming Guide

## Overview

Sone can now speak her responses through your computer speakers using her professional female voice (Google's `en-US-Studio-O`). This guide shows you how to use her voice streaming capabilities.

## 🎤 Voice Capabilities

### 1. Manual Voice Tool Usage
Ask Sone to use her `speakResponse` tool to vocalize specific responses:

```javascript
const response = await soneAgent.generate(
  'Please use your speakResponse tool to tell me about the weather.',
  { resourceId: 'sydney', threadId: 'weather-check' }
);
```

### 2. Automatic Voice Responses
Use the auto-voice wrapper for seamless speech conversion:

```javascript
import { askSoneWithVoice } from './src/mastra/utils/auto-voice-wrapper.js';

const response = await askSoneWithVoice(
  'How can you help me today?',
  'sydney',
  'daily-check'
);
// Sone's response will automatically be spoken through your speakers
```

### 3. Direct Text-to-Speech
Convert any text to Sone's voice:

```javascript
import { makeSoneSpeak } from './src/mastra/utils/auto-voice-wrapper.js';

await makeSoneSpeak(
  'Hello Sydney! This is a custom message in my voice.',
  'sydney',
  'custom-message'
);
```

## 🔧 Technical Details

### Audio Playback System
- **Voice Provider**: Google Cloud Text-to-Speech
- **Voice**: `en-US-Studio-O` (professional female voice)
- **Audio Format**: WAV (converted from Google's output)
- **Playback Method**: System audio player (`afplay` on macOS, `powershell` on Windows, `aplay/paplay/ffplay` on Linux)

### How It Works
1. Text is sent to Google Cloud TTS API
2. Audio stream is received and buffered
3. Audio is saved to a temporary WAV file
4. System audio player plays the file through speakers
5. Temporary file is cleaned up (unless `saveAudio: true`)

## 🎛️ Configuration Options

### Voice Options
```javascript
import { autoVoiceSone } from './src/mastra/utils/auto-voice-wrapper.js';

// Configure voice behavior
autoVoiceSone.updateOptions({
  autoSpeak: true,           // Automatically speak all responses
  speaker: 'en-US-Studio-O', // Voice to use
  saveAudio: false,          // Save audio files to disk
  skipAutoSpeakFor: ['debug', 'error'] // Skip auto-speech for these keywords
});
```

### Speaker Options
You can override the default voice for specific requests:
- `en-US-Studio-O` (default) - Professional female voice
- `en-US-Studio-M` - Professional male voice  
- `en-US-Casual-K` - Casual female voice
- And many more Google Cloud voices

## 🚀 Quick Start

### Run the Demo
```bash
node demo-voice-streaming.js
```

### Test Basic Functionality
```bash
node test-sone-voice.js
```

### Interactive Usage
```javascript
import { askSoneWithVoice } from './src/mastra/utils/auto-voice-wrapper.js';

// Ask Sone something and hear her response
const response = await askSoneWithVoice(
  'Tell me about your capabilities',
  'sydney',
  'capabilities-check'
);

console.log('Text:', response.text);
console.log('Voice enabled:', response.voiceEnabled);
```

## 🎯 Use Cases

### 1. Daily Briefings
```javascript
await askSoneWithVoice(
  'Give me a summary of my schedule and priorities for today',
  'sydney',
  'daily-briefing'
);
```

### 2. Learning Sessions
```javascript
await askSoneWithVoice(
  'Explain quantum computing in simple terms',
  'sydney',
  'learning-quantum'
);
```

### 3. Emotional Support
```javascript
await askSoneWithVoice(
  'I had a challenging day. Can you provide some encouragement?',
  'sydney',
  'emotional-support'
);
```

### 4. Custom Announcements
```javascript
await makeSoneSpeak(
  'Reminder: Your meeting with the team starts in 10 minutes.',
  'sydney',
  'meeting-reminder'
);
```

## 🔍 Troubleshooting

### Audio Not Playing
1. **Check system audio**: Ensure your speakers/headphones are working
2. **Check permissions**: Some systems require audio permissions
3. **Check platform**: The system uses different audio players per OS
4. **Check logs**: Look for error messages in the console

### Voice Quality Issues
1. **Internet connection**: Google TTS requires internet access
2. **API key**: Ensure the Google API key is valid and has TTS permissions
3. **Rate limits**: Google has usage limits for TTS API

### Performance Issues
1. **Audio buffering**: Large texts take longer to convert
2. **Temporary files**: Audio files are created temporarily during playback
3. **Cleanup**: Files are automatically deleted unless `saveAudio: true`

## 🎵 Advanced Features

### Save Audio Files
```javascript
const response = await soneAgent.generate(
  'Please use your speakResponse tool to explain AI, and save the audio file.',
  { resourceId: 'sydney', threadId: 'ai-explanation' }
);
```

### Custom Voice Selection
```javascript
await makeSoneSpeak(
  'This is a test with a different voice.',
  'sydney',
  'voice-test',
  'en-US-Studio-M' // Male voice
);
```

### Conditional Auto-Speech
```javascript
autoVoiceSone.updateOptions({
  skipAutoSpeakFor: ['debug', 'error', 'technical', 'code']
});
```

## 🎉 Integration Tips

1. **Conversational Flow**: Use voice for important messages and summaries
2. **User Preference**: Let users toggle voice on/off based on context
3. **Content Type**: Use voice for explanations, avoid for code/technical details
4. **Timing**: Consider when voice is appropriate (meetings, quiet environments)
5. **Accessibility**: Voice output improves accessibility for visually impaired users

---

**Enjoy hearing Sone speak! 🎤✨**
