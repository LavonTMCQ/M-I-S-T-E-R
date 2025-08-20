#!/bin/bash

# Add this to your ~/.zshrc or ~/.bashrc file:

# Claude ready notification
alias cr='afplay /System/Library/Sounds/Glass.aiff'

# Or for auto-sound after each command (more aggressive):
# This will play a sound after EVERY command completes
# precmd() {
#     afplay /System/Library/Sounds/Glass.aiff &
# }

echo "Add this line to your ~/.zshrc:"
echo ""
echo "alias cr='afplay /System/Library/Sounds/Glass.aiff'"
echo ""
echo "Then you can type 'cr' anytime to hear when I'm ready"
echo ""
echo "Or for automatic sound after every command:"
echo "precmd() { afplay /System/Library/Sounds/Glass.aiff & }"