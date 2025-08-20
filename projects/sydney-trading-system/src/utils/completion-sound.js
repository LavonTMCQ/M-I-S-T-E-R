#!/usr/bin/env node

/**
 * Completion Sound Utility
 * Plays a notification sound when Claude completes a task
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function playCompletionSound(type = 'success') {
  try {
    // macOS system sounds
    const sounds = {
      success: 'Glass',        // Pleasant completion sound
      error: 'Basso',         // Error sound
      alert: 'Hero',          // Important alert
      done: 'Blow',           // Task done
      notification: 'Ping',   // Simple notification
    };

    const soundName = sounds[type] || sounds.success;
    
    // Play system sound on macOS
    await execAsync(`afplay /System/Library/Sounds/${soundName}.aiff`);
    
    return { success: true, sound: soundName };
  } catch (error) {
    console.error('Failed to play sound:', error.message);
    
    // Fallback to terminal bell
    process.stdout.write('\x07');
    
    return { success: false, error: error.message };
  }
}

export async function sayMessage(message) {
  try {
    // Use macOS say command for text-to-speech
    await execAsync(`say "${message}"`);
    return { success: true, message };
  } catch (error) {
    console.error('Failed to speak message:', error.message);
    return { success: false, error: error.message };
  }
}

// Command line usage
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const command = args[0] || 'sound';
  
  if (command === 'sound') {
    const type = args[1] || 'success';
    playCompletionSound(type).then(result => {
      console.log(result.success ? `✅ Played ${result.sound} sound` : '❌ Sound failed');
    });
  } else if (command === 'say') {
    const message = args.slice(1).join(' ') || 'Task completed';
    sayMessage(message).then(result => {
      console.log(result.success ? `✅ Said: ${result.message}` : '❌ Speech failed');
    });
  }
}