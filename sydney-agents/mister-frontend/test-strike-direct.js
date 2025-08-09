/**
 * Direct Strike Finance API Test
 * 
 * Tests Strike Finance API directly to see what kind of error we get
 * with insufficient funds vs security checkpoint.
 */

import dotenv from 'dotenv';
dotenv.config();

async function testStrikeDirect() {
  console.log('🎯 Direct Strike Finance API Test');
  console.log('=' .repeat(40));

  try {
    // Create a mock agent address for testing
    console.log('\n1. Generate Test Agent Address:');
    const agentResponse = await fetch('http://localhost:3001/generate-credentials', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    
    if (!agentResponse.ok) {
      throw new Error(`Agent creation failed: ${agentResponse.status}`);
    }
    
    const agent = await agentResponse.json();
    console.log(`   ✅ Agent address: ${agent.address.substring(0, 25)}...`);

    // Test different Strike Finance API calls
    console.log('\n2. Testing Strike Finance API Endpoints:');

    // Test 1: Overall info endpoint (should work)
    console.log('\n   📊 Testing getOverallInfo endpoint...');
    try {
      const overallResponse = await fetch('https://app.strikefinance.org/api/perpetuals/getOverallInfo', {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/json, text/plain, */*',
          'Accept-Language': 'en-US,en;q=0.9',
          'Referer': 'https://app.strikefinance.org/',
          'Origin': 'https://app.strikefinance.org'
        }
      });

      const overallText = await overallResponse.text();
      console.log(`   Status: ${overallResponse.status}`);
      console.log(`   Response length: ${overallText.length} characters`);
      
      if (overallText.includes('<!DOCTYPE html>')) {
        console.log('   ❌ Got HTML response - security checkpoint detected');
        console.log(`   Content preview: ${overallText.substring(0, 100)}...`);
      } else {
        console.log('   ✅ Got non-HTML response - likely JSON');
        try {
          const overallData = JSON.parse(overallText);
          console.log('   ✅ Successfully parsed as JSON');
          console.log(`   Keys: ${Object.keys(overallData).join(', ')}`);
        } catch (parseError) {
          console.log('   ⚠️  Response is not HTML but also not valid JSON');
          console.log(`   Content: ${overallText.substring(0, 200)}...`);
        }
      }
    } catch (error) {
      console.log(`   ❌ Network error: ${error.message}`);
    }

    // Test 2: Open position with insufficient funds
    console.log('\n   💰 Testing openPosition with insufficient funds...');
    
    const positionRequest = {
      request: {
        address: agent.address,
        asset: { policyId: "", assetName: "" },
        assetTicker: "ADA",
        collateralAmount: 5, // WAY below 40 ADA minimum
        leverage: 2,
        position: 'Long'
      }
    };

    try {
      const positionResponse = await fetch('https://app.strikefinance.org/api/perpetuals/openPosition', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/json, text/plain, */*',
          'Accept-Language': 'en-US,en;q=0.9',
          'Origin': 'https://app.strikefinance.org',
          'Referer': 'https://app.strikefinance.org/'
        },
        body: JSON.stringify(positionRequest)
      });

      const positionText = await positionResponse.text();
      console.log(`   Status: ${positionResponse.status}`);
      console.log(`   Response length: ${positionText.length} characters`);
      
      if (positionText.includes('<!DOCTYPE html>') || positionText.includes('Security Checkpoint')) {
        console.log('   ❌ Got security checkpoint HTML response');
        console.log('   💡 This means we\'re hitting Vercel protection, not Strike business logic');
        
        // Look for specific security checkpoint indicators
        if (positionText.includes('Vercel')) {
          console.log('   🔒 Confirmed: Vercel security checkpoint');
        }
        if (positionText.includes('checking your browser')) {
          console.log('   🔒 Confirmed: Browser verification step');
        }
        
      } else {
        console.log('   ✅ Got non-HTML response from Strike API!');
        
        try {
          const positionData = JSON.parse(positionText);
          console.log('   ✅ Successfully parsed Strike API response as JSON');
          
          if (positionData.success === false) {
            console.log(`   🎯 Strike API Error: ${positionData.error || 'No error message'}`);
            
            if (positionData.error && positionData.error.toLowerCase().includes('insufficient')) {
              console.log('   🎉 PERFECT! This is Strike\'s insufficient funds error');
              console.log('   💡 We\'ve successfully bypassed security and hit business logic!');
            } else if (positionData.error && positionData.error.toLowerCase().includes('minimum')) {
              console.log('   🎉 PERFECT! This is Strike\'s minimum amount error');
              console.log('   💡 We\'ve successfully bypassed security and hit business logic!');
            } else {
              console.log('   💭 Different Strike API error - might be account/setup issue');
            }
          } else if (positionData.cbor) {
            console.log('   ❓ Unexpected: Strike accepted the low amount and returned CBOR?');
            console.log(`   CBOR length: ${positionData.cbor.length} characters`);
          } else {
            console.log('   ❓ Unknown Strike API response format');
            console.log(`   Response: ${JSON.stringify(positionData, null, 2)}`);
          }
          
        } catch (parseError) {
          console.log('   ⚠️  Strike API response is not JSON');
          console.log(`   Content: ${positionText.substring(0, 300)}...`);
        }
      }

    } catch (error) {
      console.log(`   ❌ Network error calling Strike API: ${error.message}`);
    }

    console.log('\n3. Summary:');
    console.log('   🎯 Goal: Reach Strike\'s business logic (insufficient funds error)');
    console.log('   🚧 Current: Likely hitting Vercel security checkpoint first');
    console.log('   💡 Next: Browser automation to establish legitimate session');
    
    console.log('\n4. What We Learned:');
    console.log('   - If HTML response: Security checkpoint blocking us');
    console.log('   - If JSON with error: Successfully reached Strike business logic');
    console.log('   - Need to bypass checkpoint to see real Strike Fund validation');

  } catch (error) {
    console.error('\n❌ TEST FAILED');
    console.error('Error:', error.message);
  }
}

// Check Cardano service and run
async function checkAndRun() {
  try {
    const healthResponse = await fetch('http://localhost:3001/health');
    if (healthResponse.ok) {
      console.log('✅ Cardano service is running');
      await testStrikeDirect();
    } else {
      throw new Error('Service not healthy');
    }
  } catch (error) {
    console.log('❌ Cardano service not running. Start it first:');
    console.log('   cd cardano-service && npm start');
  }
}

checkAndRun().catch(console.error);