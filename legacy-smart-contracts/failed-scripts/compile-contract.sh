#!/bin/bash

# Ultra Simple Vault Compilation Script
echo "🔧 Compiling Ultra Simple Vault Contract..."

cd contracts/simple-vault

# Check if Aiken is installed
if ! command -v aiken &> /dev/null; then
    echo "❌ Aiken not installed. Installing..."
    curl -sSfL https://install.aiken-lang.org | sh
    export PATH="$HOME/.aiken/bin:$PATH"
fi

# Compile the contract
echo "🏗️ Building contract with Aiken..."
aiken build

if [ $? -eq 0 ]; then
    echo "✅ Contract compiled successfully!"
    
    # Show the generated plutus.json
    if [ -f "plutus.json" ]; then
        echo "📋 Generated Plutus script:"
        cat plutus.json | jq '.validators[0]'
        
        # Extract the CBOR hex
        CBOR=$(cat plutus.json | jq -r '.validators[0].compiledCode')
        echo ""
        echo "🎯 Contract CBOR: $CBOR"
        
        # Save deployment info
        mkdir -p ../../deployments
        cat > ../../deployments/simple-vault-build.json << EOF
{
  "contractName": "simple_vault",
  "version": "1.0.0", 
  "plutusVersion": "v3",
  "cborHex": "$CBOR",
  "compiledAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF
        echo "💾 Build info saved to deployments/simple-vault-build.json"
        
    else
        echo "❌ plutus.json not found after compilation"
        exit 1
    fi
else
    echo "❌ Compilation failed!"
    exit 1
fi