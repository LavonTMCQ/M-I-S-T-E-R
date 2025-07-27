#!/usr/bin/env node

/**
 * VERIFY ACTUAL CONTRACT DEPLOYMENT
 * 
 * Check if the contract from howtostart.txt is actually deployed
 * and compare with our generated addresses.
 */

// Import will be done in functions

const BLOCKFROST_PROJECT_ID = 'mainnetKDR7gGfvHy85Mqr4nYtfjoXq7fX8R1Bu';
const BLOCKFROST_BASE_URL = 'https://cardano-mainnet.blockfrost.io/api/v0';

// Contract from howtostart.txt
const HOWTOSTART_CONTRACT = {
  address: 'addr1qycwlgqelwpd49hgqznn32ckppfjjhy9rfa9ufq9qvn2q58r9h8zuh',
  scriptHash: 'efa019fb82da96e800a738ab160853295c851a7a5e24050326a050e3',
  source: 'howtostart.txt'
};

// Our generated contract (NOT DEPLOYED)
const GENERATED_CONTRACT = {
  address: 'addr1w8gnkw8z0jlyk4zsrc6rp5nv5wa9nxqmceq50jdarf0c9gs2vc87j',
  scriptHash: 'd13b38e27cbe4b54501e3430d26ca3ba59981bc64147c9bd1a5f82a2',
  source: 'generated locally'
};

// Previously stuck contracts
const STUCK_CONTRACTS = [
  {
    address: 'addr1wxwx5rmqrwm4mpeg5ky6rt6lq76errkjjs490pewl9rqvrcqzrec7',
    scriptHash: '9c6a0f601bb75d8728a589a1af5f07b5918ed2942a57872ef946060f',
    source: 'stuck contract 1'
  },
  {
    address: 'addr1wyq32c96u0u04s54clgeqtjk6ffd56pcxnrmu4jzn57zj3sy9gwyk',
    scriptHash: '011560bae3f8fac295c7d1902e56d252da683834c7be56429d3c2946',
    source: 'stuck contract 2'
  }
];

console.log('🔍 VERIFYING ACTUAL CONTRACT DEPLOYMENTS');
console.log('=======================================');
console.log('');

async function checkContractDeployment(contract) {
  console.log(`🔍 Checking: ${contract.address}`);
  console.log(`📍 Source: ${contract.source}`);
  console.log(`🔑 Expected Script Hash: ${contract.scriptHash}`);

  try {
    const { default: fetch } = await import('node-fetch');

    // Check if address exists on blockchain
    const addressResponse = await fetch(`${BLOCKFROST_BASE_URL}/addresses/${contract.address}`, {
      headers: { 'project_id': BLOCKFROST_PROJECT_ID }
    });
    
    if (addressResponse.ok) {
      const addressData = await addressResponse.json();
      console.log(`✅ Address exists on blockchain`);
      console.log(`💰 Balance: ${parseInt(addressData.amount.find(a => a.unit === 'lovelace')?.quantity || '0') / 1000000} ADA`);
      
      // Check for UTxOs
      const utxosResponse = await fetch(`${BLOCKFROST_BASE_URL}/addresses/${contract.address}/utxos`, {
        headers: { 'project_id': BLOCKFROST_PROJECT_ID }
      });
      
      if (utxosResponse.ok) {
        const utxos = await utxosResponse.json();
        console.log(`📦 UTxOs: ${utxos.length}`);
        
        if (utxos.length > 0) {
          let totalBalance = 0;
          utxos.forEach((utxo, index) => {
            const adaAmount = parseInt(utxo.amount.find(a => a.unit === 'lovelace')?.quantity || '0');
            totalBalance += adaAmount;
            console.log(`   UTxO ${index + 1}: ${utxo.tx_hash}#${utxo.output_index} (${adaAmount / 1000000} ADA)`);
          });
          console.log(`💰 Total Balance: ${totalBalance / 1000000} ADA`);
        }
      }
      
      // Check if script exists
      const scriptResponse = await fetch(`${BLOCKFROST_BASE_URL}/scripts/${contract.scriptHash}`, {
        headers: { 'project_id': BLOCKFROST_PROJECT_ID }
      });
      
      if (scriptResponse.ok) {
        const scriptData = await scriptResponse.json();
        console.log(`✅ Script exists on blockchain`);
        console.log(`📜 Type: ${scriptData.type}`);
        console.log(`📏 Size: ${scriptData.size} bytes`);
      } else {
        console.log(`❌ Script not found on blockchain`);
      }
      
    } else {
      console.log(`❌ Address not found on blockchain: ${addressResponse.statusText}`);
    }
    
  } catch (error) {
    console.log(`❌ Error checking contract: ${error.message}`);
  }
  
  console.log('');
  console.log('---');
  console.log('');
}

async function main() {
  console.log('🎯 PRIORITY: Checking howtostart.txt contract...');
  await checkContractDeployment(HOWTOSTART_CONTRACT);
  
  console.log('🔍 Checking our generated contract (should NOT exist)...');
  await checkContractDeployment(GENERATED_CONTRACT);
  
  console.log('📊 Checking previously stuck contracts...');
  for (const contract of STUCK_CONTRACTS) {
    await checkContractDeployment(contract);
  }
  
  console.log('🏁 VERIFICATION COMPLETE');
  console.log('');
  console.log('📋 SUMMARY:');
  console.log('- howtostart.txt contract: Should be deployed and working');
  console.log('- Generated contract: Should NOT exist (was never deployed)');
  console.log('- Stuck contracts: Should exist but have mismatched scripts');
  console.log('');
  console.log('🎯 NEXT ACTION: Use the working contract from howtostart.txt');
}

main();
