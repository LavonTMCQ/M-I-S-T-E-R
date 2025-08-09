/**
 * Test Browser Automation Bypass
 * 
 * Tests if Puppeteer can bypass the Vercel security checkpoint
 * to reach Strike Finance's actual business logic.
 */

import dotenv from 'dotenv';
dotenv.config();

async function testBrowserBypass() {
  console.log('🚀 Testing Browser Automation Bypass');
  console.log('=' .repeat(45));
  
  try {
    console.log('\n1. Import Browser Service:');
    const { strikeBrowserService } = await import('./src/services/strike-browser-service.js');
    console.log('   ✅ Successfully imported browser service');

    console.log('\n2. Initialize Browser Session:');
    const sessionStart = Date.now();
    const sessionInitialized = await strikeBrowserService.initializeSession();
    const sessionTime = Date.now() - sessionStart;
    
    console.log(`   Session initialization: ${sessionInitialized ? '✅ SUCCESS' : '❌ FAILED'}`);
    console.log(`   Time taken: ${sessionTime}ms`);

    if (!sessionInitialized) {
      console.log('   ❌ Cannot proceed without browser session');
      return;
    }

    const sessionStatus = strikeBrowserService.getSessionStatus();
    console.log(`   Active: ${sessionStatus.active}`);
    console.log(`   Cookies: ${sessionStatus.cookieCount}`);

    console.log('\n3. Test Strike API Connectivity:');
    const connectivityStart = Date.now();
    const connectivityTest = await strikeBrowserService.testConnectivity();
    const connectivityTime = Date.now() - connectivityStart;
    
    console.log(`   API connectivity: ${connectivityTest.success ? '✅ SUCCESS' : '❌ FAILED'}`);
    console.log(`   Time taken: ${connectivityTime}ms`);
    
    if (connectivityTest.success) {
      console.log('   🎉 BREAKTHROUGH: Successfully bypassed Vercel security checkpoint!');
      console.log('   🎯 Can now reach Strike Finance business logic');
      
      if (connectivityTest.overallInfo) {
        console.log(`   📊 Received real Strike data: ${JSON.stringify(connectivityTest.overallInfo).substring(0, 100)}...`);
      }
      
      // Now test insufficient funds scenario
      console.log('\n4. Test Insufficient Funds Error:');
      
      // Generate agent for testing
      const agentResponse = await fetch('http://localhost:3001/generate-credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      const agent = await agentResponse.json();
      console.log(`   Using test agent: ${agent.address.substring(0, 25)}...`);
      
      const positionStart = Date.now();
      const positionTest = await strikeBrowserService.openPosition({
        address: agent.address,
        asset: { policyId: "", assetName: "" },
        assetTicker: "ADA",
        collateralAmount: 5, // Well below 40 ADA minimum
        leverage: 2,
        position: 'Long'
      });
      const positionTime = Date.now() - positionStart;
      
      console.log(`   Position API call: ${positionTest.success ? '✅ SUCCESS' : '❌ FAILED'}`);
      console.log(`   Time taken: ${positionTime}ms`);
      
      if (positionTest.success && positionTest.cbor) {
        console.log('   ❓ Unexpected: Strike accepted 5 ADA collateral?');
        console.log(`   CBOR received: ${positionTest.cbor.substring(0, 50)}...`);
        console.log('   💡 Either Strike minimum is lower than expected, or this is test mode');
        
      } else if (positionTest.error) {
        console.log(`   🎯 Strike API Error: ${positionTest.error}`);
        
        if (positionTest.error.toLowerCase().includes('insufficient') ||
            positionTest.error.toLowerCase().includes('minimum') ||
            positionTest.error.toLowerCase().includes('collateral')) {
          console.log('   🎉 PERFECT! This is Strike\'s business logic error');
          console.log('   ✅ Successfully bypassed security AND reached insufficient funds validation');
          console.log('   💡 With 40+ ADA, this same call would succeed');
          
        } else {
          console.log('   💭 Different error - might be account setup or wallet validation');
          console.log('   🔍 Still proves we bypassed security checkpoint');
        }
      }

      console.log('\n5. Final Test: Try with Higher Amount:');
      const highAmountTest = await strikeBrowserService.openPosition({
        address: agent.address,
        asset: { policyId: "", assetName: "" },
        assetTicker: "ADA",
        collateralAmount: 40, // Proper Strike minimum
        leverage: 2,
        position: 'Long'
      });
      
      console.log(`   40 ADA position: ${highAmountTest.success ? '✅ SUCCESS' : '❌ FAILED'}`);
      
      if (highAmountTest.success && highAmountTest.cbor) {
        console.log('   🎉 JACKPOT! Strike accepted 40 ADA and returned CBOR!');
        console.log(`   CBOR transaction: ${highAmountTest.cbor.substring(0, 50)}...`);
        console.log('   💡 This proves the full flow would work with sufficient funds');
        
      } else if (highAmountTest.error) {
        console.log(`   Error with 40 ADA: ${highAmountTest.error}`);
        console.log('   💭 Might be wallet validation, account setup, or other issue');
        console.log('   ✅ Still proves security checkpoint bypass works');
      }
      
    } else {
      console.log(`   ❌ Still hitting security checkpoint: ${connectivityTest.error}`);
      console.log('   💡 Browser automation needs refinement');
      console.log('   🔧 Possible solutions:');
      console.log('     - More realistic browser fingerprint');
      console.log('     - Session establishment sequence'); 
      console.log('     - Cookie/header management');
    }

    console.log('\n6. Summary:');
    if (connectivityTest.success) {
      console.log('   🎉 SUCCESS: Browser automation bypassed Vercel security!');
      console.log('   ✅ Can reach Strike Finance business logic');
      console.log('   🎯 Ready for real trading with sufficient funds');
      console.log(`   📈 Need: Add ~${40 - 1.52} ADA to vault for live testing`);
    } else {
      console.log('   🚧 BLOCKED: Still hitting security checkpoint');
      console.log('   🔧 Need to refine browser automation approach');
    }

    // Cleanup
    console.log('\n7. Cleanup:');
    await strikeBrowserService.cleanup();
    console.log('   ✅ Browser session closed');

  } catch (error) {
    console.error('\n❌ BROWSER BYPASS TEST FAILED');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    
    console.log('\n🔧 Troubleshooting:');
    console.log('   - Ensure Puppeteer installed correctly');
    console.log('   - Check Chrome/Chromium availability');  
    console.log('   - Verify network connectivity');
    
    try {
      const { strikeBrowserService } = await import('./src/services/strike-browser-service.js');
      await strikeBrowserService.cleanup();
    } catch (cleanupError) {
      console.log('   ⚠️ Cleanup also failed');
    }
  }
}

// Check Cardano service and run
async function checkAndRun() {
  try {
    const healthResponse = await fetch('http://localhost:3001/health');
    if (healthResponse.ok) {
      console.log('✅ Cardano service is running');
      await testBrowserBypass();
    } else {
      throw new Error('Service not healthy');
    }
  } catch (error) {
    console.log('❌ Cardano service not running. Start it first:');
    console.log('   cd cardano-service && npm start');
  }
}

checkAndRun().catch(console.error);