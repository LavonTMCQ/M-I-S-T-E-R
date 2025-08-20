#!/bin/bash

# Claude Completion Notification Script
# Plays a sound when Claude finishes working

# Function to play completion sound
play_sound() {
    local sound_type="${1:-success}"
    
    # Play system sound (macOS)
    if [[ "$OSTYPE" == "darwin"* ]]; then
        case "$sound_type" in
            "success")
                afplay /System/Library/Sounds/Glass.aiff
                ;;
            "done")
                afplay /System/Library/Sounds/Hero.aiff
                ;;
            "alert")
                afplay /System/Library/Sounds/Ping.aiff
                ;;
            "error")
                afplay /System/Library/Sounds/Basso.aiff
                ;;
            *)
                afplay /System/Library/Sounds/Glass.aiff
                ;;
        esac
    else
        # Fallback to terminal bell for other systems
        echo -e "\a"
    fi
}

# Function to speak message
speak_message() {
    local message="${1:-Claude has finished working}"
    
    if [[ "$OSTYPE" == "darwin"* ]]; then
        say "$message"
    else
        echo "$message"
    fi
}

# Main execution
if [ "$1" == "speak" ]; then
    speak_message "${2:-Claude has completed your request}"
else
    play_sound "${1:-success}"
fi

echo "🔔 Notification sent!"