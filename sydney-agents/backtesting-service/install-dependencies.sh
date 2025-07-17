#!/bin/bash

# FreqTrade + VectorBT Installation Script
# Complete setup for professional backtesting

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
    echo -e "${BLUE}[$(date +'%H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log "🚀 INSTALLING FREQTRADE + VECTORBT"
log "=================================="

# Check Python version
PYTHON_VERSION=$(python3 --version 2>&1 | awk '{print $2}' | cut -d. -f1,2)
log "Python version: $PYTHON_VERSION"

if [[ $(echo "$PYTHON_VERSION < 3.8" | bc -l) -eq 1 ]]; then
    error "Python 3.8+ required. Current version: $PYTHON_VERSION"
fi

# Create virtual environment
log "📦 Creating virtual environment..."
if [ ! -d "venv" ]; then
    python3 -m venv venv
    success "Virtual environment created"
else
    log "Virtual environment already exists"
fi

# Activate virtual environment
source venv/bin/activate
success "Virtual environment activated"

# Upgrade pip
log "⬆️ Upgrading pip..."
pip install --upgrade pip

# Install system dependencies (macOS)
if [[ "$OSTYPE" == "darwin"* ]]; then
    log "🍎 Installing macOS dependencies..."
    
    # Check if Homebrew is installed
    if ! command -v brew &> /dev/null; then
        warning "Homebrew not found. Installing..."
        /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    fi
    
    # Install TA-Lib
    if ! brew list ta-lib &> /dev/null; then
        log "Installing TA-Lib via Homebrew..."
        brew install ta-lib
        success "TA-Lib installed"
    else
        log "TA-Lib already installed"
    fi
    
    # Install other dependencies
    brew install freetype pkg-config
fi

# Install Python packages
log "📚 Installing Python packages..."

# Core data science packages
pip install numpy==1.24.3
pip install pandas==2.1.4
pip install scipy==1.11.4

# TA-Lib Python wrapper
pip install TA-Lib

# FreqTrade
log "🤖 Installing FreqTrade..."
pip install freqtrade[all]

# VectorBT
log "⚡ Installing VectorBT..."
pip install vectorbt

# Additional packages for our service
pip install flask flask-cors gunicorn
pip install ccxt yfinance
pip install python-dotenv requests
pip install structlog
pip install pytest pytest-asyncio

success "All packages installed successfully!"

# Verify installations
log "🔍 Verifying installations..."

# Test FreqTrade
if python -c "import freqtrade; print('FreqTrade version:', freqtrade.__version__)" 2>/dev/null; then
    success "FreqTrade installed and working"
else
    error "FreqTrade installation failed"
fi

# Test VectorBT
if python -c "import vectorbt as vbt; print('VectorBT version:', vbt.__version__)" 2>/dev/null; then
    success "VectorBT installed and working"
else
    error "VectorBT installation failed"
fi

# Test TA-Lib
if python -c "import talib; print('TA-Lib working')" 2>/dev/null; then
    success "TA-Lib installed and working"
else
    error "TA-Lib installation failed"
fi

# Create FreqTrade configuration
log "⚙️ Creating FreqTrade configuration..."

mkdir -p user_data/strategies
mkdir -p user_data/data
mkdir -p user_data/logs

# Create basic FreqTrade config
cat > user_data/config.json << 'EOF'
{
    "max_open_trades": 3,
    "stake_currency": "USDT",
    "stake_amount": 100,
    "tradable_balance_ratio": 0.99,
    "fiat_display_currency": "USD",
    "dry_run": true,
    "dry_run_wallet": 1000,
    "cancel_open_orders_on_exit": false,
    "trading_mode": "spot",
    "margin_mode": "",
    "unfilledtimeout": {
        "entry": 10,
        "exit": 10,
        "exit_timeout_count": 0,
        "unit": "minutes"
    },
    "entry_pricing": {
        "price_side": "same",
        "use_order_book": true,
        "order_book_top": 1,
        "price_last_balance": 0.0,
        "check_depth_of_market": {
            "enabled": false,
            "bids_to_ask_delta": 1
        }
    },
    "exit_pricing": {
        "price_side": "same",
        "use_order_book": true,
        "order_book_top": 1
    },
    "exchange": {
        "name": "kraken",
        "key": "",
        "secret": "",
        "ccxt_config": {},
        "ccxt_async_config": {},
        "pair_whitelist": [
            "ADA/USD"
        ],
        "pair_blacklist": []
    },
    "pairlists": [
        {"method": "StaticPairList"}
    ],
    "timeframe": "15m",
    "dataformat_ohlcv": "json",
    "internals": {
        "process_throttle_secs": 5
    }
}
EOF

success "FreqTrade configuration created"

# Test FreqTrade CLI
log "🧪 Testing FreqTrade CLI..."
if freqtrade --version > /dev/null 2>&1; then
    success "FreqTrade CLI working"
    freqtrade --version
else
    error "FreqTrade CLI not working"
fi

# Create sample strategy
log "📝 Creating sample Fibonacci strategy..."

cat > user_data/strategies/FibonacciStrategy.py << 'EOF'
import numpy as np
import pandas as pd
from freqtrade.strategy import IStrategy
import talib.abstract as ta

class FibonacciStrategy(IStrategy):
    """
    Fibonacci Retracement Strategy for Agent Vault
    """
    
    minimal_roi = {
        "60": 0.01,
        "30": 0.02,
        "0": 0.04
    }
    
    stoploss = -0.10
    timeframe = '15m'
    
    def populate_indicators(self, dataframe: pd.DataFrame, metadata: dict) -> pd.DataFrame:
        # Calculate swing highs and lows
        dataframe['swing_high'] = dataframe['high'].rolling(window=20).max()
        dataframe['swing_low'] = dataframe['low'].rolling(window=20).min()
        
        # Calculate Fibonacci levels
        fib_range = dataframe['swing_high'] - dataframe['swing_low']
        dataframe['fib_23.6'] = dataframe['swing_low'] + (fib_range * 0.236)
        dataframe['fib_38.2'] = dataframe['swing_low'] + (fib_range * 0.382)
        dataframe['fib_50.0'] = dataframe['swing_low'] + (fib_range * 0.500)
        dataframe['fib_61.8'] = dataframe['swing_low'] + (fib_range * 0.618)
        dataframe['fib_78.6'] = dataframe['swing_low'] + (fib_range * 0.786)
        
        # RSI
        dataframe['rsi'] = ta.RSI(dataframe, timeperiod=14)
        
        # Volume
        dataframe['volume_sma'] = dataframe['volume'].rolling(window=20).mean()
        
        return dataframe
    
    def populate_entry_trend(self, dataframe: pd.DataFrame, metadata: dict) -> pd.DataFrame:
        dataframe.loc[
            (
                # Price near Fibonacci levels
                (abs(dataframe['close'] - dataframe['fib_61.8']) / dataframe['close'] < 0.005) |
                (abs(dataframe['close'] - dataframe['fib_50.0']) / dataframe['close'] < 0.005)
            ) &
            (dataframe['rsi'] < 40) &  # Oversold
            (dataframe['volume'] > dataframe['volume_sma']),  # Volume confirmation
            'enter_long'
        ] = 1
        
        return dataframe
    
    def populate_exit_trend(self, dataframe: pd.DataFrame, metadata: dict) -> pd.DataFrame:
        dataframe.loc[
            (dataframe['rsi'] > 70) |  # Overbought
            (dataframe['close'] > dataframe['fib_78.6']),  # Target reached
            'exit_long'
        ] = 1
        
        return dataframe
EOF

success "Sample Fibonacci strategy created"

# Download sample data
log "📊 Downloading sample data..."
freqtrade download-data --exchange kraken --pairs ADA/USD --timeframes 15m --days 30 --config user_data/config.json || warning "Data download failed (exchange API might be limited)"

log ""
success "🎉 INSTALLATION COMPLETED SUCCESSFULLY!"
log ""
log "🔧 NEXT STEPS:"
log "   1. Activate virtual environment: source venv/bin/activate"
log "   2. Test FreqTrade: freqtrade backtesting --strategy FibonacciStrategy --config user_data/config.json"
log "   3. Test VectorBT: python -c 'import vectorbt as vbt; print(\"VectorBT ready!\")'"
log "   4. Run our service: python app.py"
log ""
log "📁 FILES CREATED:"
log "   • user_data/config.json - FreqTrade configuration"
log "   • user_data/strategies/FibonacciStrategy.py - Sample strategy"
log "   • venv/ - Virtual environment with all packages"
log ""
log "💡 USEFUL COMMANDS:"
log "   • freqtrade --help - FreqTrade help"
log "   • freqtrade list-strategies - List available strategies"
log "   • freqtrade backtesting --help - Backtesting help"
EOF
