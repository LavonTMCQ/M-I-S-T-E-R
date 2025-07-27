#!/usr/bin/env node

// Generate Cardano contract address from script hash
// Alternative method when cardano-cli has issues

const crypto = require('crypto');

// Production contract details
const SCRIPT_HASH = "efa019fb82da96e800a738ab160853295c851a7a5e24050326a050e3";
const NETWORK_TAG = 0x01; // Mainnet

// Bech32 encoding implementation
const CHARSET = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l';

function bech32Polymod(values) {
  const GEN = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3];
  let chk = 1;
  for (const value of values) {
    const top = chk >> 25;
    chk = (chk & 0x1ffffff) << 5 ^ value;
    for (let i = 0; i < 5; i++) {
      chk ^= ((top >> i) & 1) ? GEN[i] : 0;
    }
  }
  return chk;
}

function bech32HrpExpand(hrp) {
  const ret = [];
  for (let p = 0; p < hrp.length; p++) {
    ret.push(hrp.charCodeAt(p) >> 5);
  }
  ret.push(0);
  for (let p = 0; p < hrp.length; p++) {
    ret.push(hrp.charCodeAt(p) & 31);
  }
  return ret;
}

function bech32VerifyChecksum(hrp, data) {
  return bech32Polymod(bech32HrpExpand(hrp).concat(data)) === 1;
}

function bech32CreateChecksum(hrp, data) {
  const values = bech32HrpExpand(hrp).concat(data).concat([0, 0, 0, 0, 0, 0]);
  const polymod = bech32Polymod(values) ^ 1;
  const ret = [];
  for (let i = 0; i < 6; i++) {
    ret.push((polymod >> 5 * (5 - i)) & 31);
  }
  return ret;
}

function bech32Encode(hrp, data) {
  const combined = data.concat(bech32CreateChecksum(hrp, data));
  let ret = hrp + '1';
  for (const d of combined) {
    ret += CHARSET.charAt(d);
  }
  return ret;
}

function convertBits(data, fromBits, toBits, pad = true) {
  let acc = 0;
  let bits = 0;
  const ret = [];
  const maxv = (1 << toBits) - 1;
  const maxAcc = (1 << (fromBits + toBits - 1)) - 1;
  
  for (const value of data) {
    if (value < 0 || (value >> fromBits)) {
      return null;
    }
    acc = ((acc << fromBits) | value) & maxAcc;
    bits += fromBits;
    while (bits >= toBits) {
      bits -= toBits;
      ret.push((acc >> bits) & maxv);
    }
  }
  
  if (pad) {
    if (bits) {
      ret.push((acc << (toBits - bits)) & maxv);
    }
  } else if (bits >= fromBits || ((acc << (toBits - bits)) & maxv)) {
    return null;
  }
  
  return ret;
}

function generateContractAddress(scriptHash, networkTag = 0x01) {
  try {
    console.log('🔧 Generating Cardano contract address...');
    console.log(`📋 Script Hash: ${scriptHash}`);
    console.log(`🌐 Network: ${networkTag === 0x01 ? 'Mainnet' : 'Testnet'}`);
    
    // Convert script hash from hex to bytes
    const scriptHashBytes = Buffer.from(scriptHash, 'hex');
    
    // Create address bytes: [network_tag, script_type, script_hash]
    const addressBytes = Buffer.concat([
      Buffer.from([networkTag]), // Network tag (0x01 for mainnet)
      Buffer.from([0x30]),       // Script address type (0x30 for script)
      scriptHashBytes            // Script hash (28 bytes)
    ]);
    
    console.log(`📦 Address bytes length: ${addressBytes.length}`);
    console.log(`📦 Address bytes: ${addressBytes.toString('hex')}`);
    
    // Convert to 5-bit groups for bech32
    const converted = convertBits(Array.from(addressBytes), 8, 5);
    if (!converted) {
      throw new Error('Failed to convert address bytes to 5-bit groups');
    }
    
    // Encode with bech32
    const hrp = networkTag === 0x01 ? 'addr' : 'addr_test';
    const address = bech32Encode(hrp, converted);
    
    console.log(`✅ Generated address: ${address}`);
    console.log(`📏 Address length: ${address.length}`);
    
    return address;
    
  } catch (error) {
    console.error('❌ Error generating address:', error);
    return null;
  }
}

// Generate the production contract address
console.log('🚀 PRODUCTION AGENT VAULT ADDRESS GENERATION');
console.log('============================================');

const contractAddress = generateContractAddress(SCRIPT_HASH, NETWORK_TAG);

if (contractAddress) {
  console.log('');
  console.log('🎉 SUCCESS! Contract address generated:');
  console.log(`📍 Address: ${contractAddress}`);
  console.log(`🔑 Script Hash: ${SCRIPT_HASH}`);
  console.log('');
  console.log('🔧 Frontend Configuration:');
  console.log(`contractAddress: "${contractAddress}",`);
  console.log(`scriptHash: "${SCRIPT_HASH}",`);
  console.log('');
  console.log('✅ Ready for deployment and testing!');
} else {
  console.log('❌ Failed to generate contract address');
  process.exit(1);
}
