#!/bin/bash

# One-liner setup and start script for M-I-S-T-E-R

echo "🚀 M-I-S-T-E-R Quick Start"
echo "========================="

# Check if in correct directory
if [ ! -d "sydney-agents" ]; then
    echo "❌ Run this from the M-I-S-T-E-R repository root"
    exit 1
fi

# Quick setup and start
cd sydney-agents && \
echo "📦 Installing dependencies..." && \
npm install && \
echo "🤖 Starting Sone Agent System..." && \
npm run dev
