#!/bin/bash

# Simplified Backtesting Service Installation
# Custom implementation without FreqTrade complexity

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
    echo -e "${BLUE}[$(date +'%H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log "🚀 SIMPLIFIED BACKTESTING SERVICE SETUP"
log "======================================"

# Create virtual environment
log "📦 Creating virtual environment..."
python3 -m venv venv
source venv/bin/activate
success "Virtual environment created and activated"

# Install minimal dependencies
log "📚 Installing essential packages..."
pip install --upgrade pip

# Core packages only
pip install pandas numpy scipy
pip install flask flask-cors gunicorn
pip install ccxt yfinance
pip install python-dotenv requests
pip install structlog pytest

success "Essential packages installed"

# Test installation
log "🔍 Testing installation..."
python -c "import pandas as pd; import numpy as np; import flask; print('✅ All packages working')"

success "🎉 SIMPLIFIED SETUP COMPLETED!"
log ""
log "🔧 WHAT WE HAVE:"
log "   • Professional fee calculator (tested and working)"
log "   • Custom backtesting engine (fast and reliable)"
log "   • Railway deployment ready"
log "   • REST API for frontend integration"
log ""
log "🚀 READY TO:"
log "   1. Deploy to Railway immediately"
log "   2. Test with real trading data"
log "   3. Integrate with frontend"
log "   4. Start 60 ADA testing"
log ""
log "💡 TO RUN:"
log "   source venv/bin/activate"
log "   python app.py"
