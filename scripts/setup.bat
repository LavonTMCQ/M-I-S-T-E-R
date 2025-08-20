@echo off
setlocal enabledelayedexpansion

REM M-I-S-T-E-R Setup Script for Windows
REM Automated setup for Sydney's AI Agent System

echo 🚀 Setting up M-I-S-T-E-R - Sydney's AI Agent System
echo ==================================================

REM Check if we're in the right directory
if not exist "README.md" (
    echo [ERROR] Please run this script from the M-I-S-T-E-R repository root directory
    pause
    exit /b 1
)

if not exist "sydney-agents" (
    echo [ERROR] sydney-agents directory not found
    pause
    exit /b 1
)

echo [INFO] Checking system requirements...

REM Check Node.js
node --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js is not installed. Please install Node.js 18+ first.
    echo Visit: https://nodejs.org/
    pause
    exit /b 1
)

echo [SUCCESS] Node.js detected
node --version

REM Check npm
npm --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] npm is not installed
    pause
    exit /b 1
)

echo [SUCCESS] npm detected
npm --version

REM Navigate to sydney-agents directory
cd sydney-agents

echo [INFO] Installing dependencies...
npm install

if errorlevel 1 (
    echo [ERROR] Failed to install dependencies
    pause
    exit /b 1
)

echo [SUCCESS] Dependencies installed successfully

REM Check if .env file exists
if not exist ".env" (
    echo [WARNING] .env file not found. Creating template...
    (
        echo GOOGLE_GENERATIVE_AI_API_KEY=AIzaSyDE-citv7MlLVRw_8XE9juqf5GM-2FSb3M
        echo.
        echo # Google Cloud API Key for Text-to-Speech and Speech-to-Text services
        echo GOOGLE_API_KEY=AIzaSyBNU1uWipiCzM8dxCv0X2hpkiVX5Uk0QX4
        echo.
        echo # Google Cloud API Key for Text-to-Speech and Speech-to-Text services
        echo # This will use Application Default Credentials that we set up with gcloud auth
        echo # The Google Voice provider will automatically use ADC if no API key is provided
        echo GOOGLE_API_KEY=
    ) > .env
    echo [SUCCESS] .env file created with API keys
) else (
    echo [SUCCESS] .env file already exists with API keys
)

echo [INFO] Creating quick start scripts...

REM Create start.bat
(
    echo @echo off
    echo echo 🤖 Starting Mastra Development Server...
    echo npm run dev
    echo pause
) > start.bat

REM Create test-sone.bat
(
    echo @echo off
    echo echo 🧪 Testing Sone Agent with Voice...
    echo node test-sone-voice.js
    echo pause
) > test-sone.bat

REM Create test-trading.bat
(
    echo @echo off
    echo echo 📈 Testing Trading Monitor...
    echo node test-trading-monitor.js
    echo pause
) > test-trading.bat

echo [SUCCESS] Quick start scripts created

echo [INFO] Building the project...
npm run build

if errorlevel 1 (
    echo [WARNING] Build failed, but you can still run in development mode
) else (
    echo [SUCCESS] Project built successfully
)

echo.
echo 🎉 Setup Complete!
echo ==================
echo.
echo Quick Start Commands:
echo   start.bat        - Start Mastra development server
echo   test-sone.bat    - Test Sone agent with voice
echo   test-trading.bat - Test trading monitor
echo.
echo Manual Commands:
echo   npm run dev      - Start development server
echo   npm run build    - Build project
echo   npm run start    - Start production server
echo.
echo Test Files Available:
echo   • test-sone-voice.js      - Voice capabilities
echo   • test-trading-monitor.js - Trading analysis
echo   • test-mrs-connection.js  - Financial integration
echo   • test-enhanced-sone.js   - Complete functionality
echo.
echo 🚀 Ready to go! Run start.bat to begin!
echo.
pause
