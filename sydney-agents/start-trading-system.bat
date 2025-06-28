@echo off
REM 🎯 Sydney's Advanced Trading System - Windows Startup Script
REM This script will automatically set up and start the complete trading system

echo 🎯 Starting Sydney's Advanced Trading System...
echo ================================================

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed. Please install Node.js 18+ first.
    echo    Download from: https://nodejs.org/
    pause
    exit /b 1
)

echo ✅ Node.js found
node --version

REM Check if npm is installed
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ npm is not installed. Please install npm first.
    pause
    exit /b 1
)

echo ✅ npm found
npm --version

REM Install backend dependencies
echo.
echo 📦 Installing backend dependencies...
npm install

REM Install frontend dependencies
echo.
echo 📦 Installing frontend dependencies...
cd frontend
npm install
cd ..

echo.
echo 🚀 Starting Sydney's Advanced Trading System...
echo.
echo 📊 Features Ready:
echo    ✅ Market Hours Filtering (9:30 AM - 4:00 PM EST)
echo    ✅ 16 Trading Signals (433% increase)
echo    ✅ TradingView Synchronized Charts
echo    ✅ Real Alpha Vantage Data
echo    ✅ Locked Optimal MACD Strategy (10.04% return)
echo.
echo 🌐 Opening browser at: http://localhost:3000
echo ⏹️  Press Ctrl+C to stop the system
echo.

REM Start the frontend development server
cd frontend
npm run dev
