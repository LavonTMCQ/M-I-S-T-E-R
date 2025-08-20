#!/bin/bash

# M-I-S-T-E-R Setup Script
# Automated setup for Sydney's AI Agent System

set -e  # Exit on any error

echo "🚀 Setting up M-I-S-T-E-R - Sydney's AI Agent System"
echo "=================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "README.md" ] || [ ! -d "sydney-agents" ]; then
    print_error "Please run this script from the M-I-S-T-E-R repository root directory"
    exit 1
fi

print_status "Checking system requirements..."

# Check Node.js
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js 18+ first."
    print_status "Visit: https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    print_error "Node.js version 18+ required. Current version: $(node --version)"
    exit 1
fi

print_success "Node.js $(node --version) detected"

# Check npm
if ! command -v npm &> /dev/null; then
    print_error "npm is not installed"
    exit 1
fi

print_success "npm $(npm --version) detected"

# Navigate to sydney-agents directory
cd sydney-agents

print_status "Installing dependencies..."
npm install

if [ $? -eq 0 ]; then
    print_success "Dependencies installed successfully"
else
    print_error "Failed to install dependencies"
    exit 1
fi

# Check if .env file exists
if [ ! -f ".env" ]; then
    print_warning ".env file not found. Creating template..."
    cat > .env << EOF
GOOGLE_GENERATIVE_AI_API_KEY=AIzaSyDE-citv7MlLVRw_8XE9juqf5GM-2FSb3M

# Google Cloud API Key for Text-to-Speech and Speech-to-Text services
GOOGLE_API_KEY=AIzaSyBNU1uWipiCzM8dxCv0X2hpkiVX5Uk0QX4

# Google Cloud API Key for Text-to-Speech and Speech-to-Speech services
# This will use Application Default Credentials that we set up with gcloud auth
# The Google Voice provider will automatically use ADC if no API key is provided
GOOGLE_API_KEY=
EOF
    print_success ".env file created with API keys"
else
    print_success ".env file already exists with API keys"
fi

# Create quick start script
print_status "Creating quick start scripts..."

cat > start.sh << 'EOF'
#!/bin/bash
echo "🤖 Starting Mastra Development Server..."
npm run dev
EOF

cat > test-sone.sh << 'EOF'
#!/bin/bash
echo "🧪 Testing Sone Agent with Voice..."
node test-sone-voice.js
EOF

cat > test-trading.sh << 'EOF'
#!/bin/bash
echo "📈 Testing Trading Monitor..."
node test-trading-monitor.js
EOF

chmod +x start.sh test-sone.sh test-trading.sh

print_success "Quick start scripts created"

# Build the project
print_status "Building the project..."
npm run build

if [ $? -eq 0 ]; then
    print_success "Project built successfully"
else
    print_warning "Build failed, but you can still run in development mode"
fi

echo ""
echo "🎉 Setup Complete!"
echo "=================="
echo ""
echo "Quick Start Commands:"
echo "  ${GREEN}./start.sh${NC}        - Start Mastra development server"
echo "  ${GREEN}./test-sone.sh${NC}    - Test Sone agent with voice"
echo "  ${GREEN}./test-trading.sh${NC} - Test trading monitor"
echo ""
echo "Manual Commands:"
echo "  ${BLUE}npm run dev${NC}       - Start development server"
echo "  ${BLUE}npm run build${NC}     - Build project"
echo "  ${BLUE}npm run start${NC}     - Start production server"
echo ""
echo "Test Files Available:"
echo "  • test-sone-voice.js      - Voice capabilities"
echo "  • test-trading-monitor.js - Trading analysis"
echo "  • test-mrs-connection.js  - Financial integration"
echo "  • test-enhanced-sone.js   - Complete functionality"
echo ""
echo "🚀 Ready to go! Run ${GREEN}./start.sh${NC} to begin!"
