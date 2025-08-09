/**
 * Simple Browser Test
 * 
 * Quick test to see what we get from Strike with browser automation
 */

import dotenv from 'dotenv';
dotenv.config();

async function simpleBrowserTest() {
  console.log('🔍 Simple Strike Browser Test');
  console.log('=' .repeat(30));
  
  try {
    console.log('\n1. Import and initialize browser service:');
    const { strikeBrowserService } = await import('./src/services/strike-browser-service.js');
    
    console.log('   🚀 Launching browser...');
    const initialized = await strikeBrowserService.initializeSession();
    console.log(`   Browser ready: ${initialized}`);
    
    if (initialized) {
      console.log('\n2. Test simple API call:');
      
      try {
        const result = await strikeBrowserService.testConnectivity();
        console.log(`   Success: ${result.success}`);
        
        if (result.success) {
          console.log('   🎉 API WORKS!');
          if (result.overallInfo) {
            console.log(`   Data: ${JSON.stringify(result.overallInfo).substring(0, 100)}`);
          }
        } else {
          console.log(`   Error: ${result.error}`);
          
          if (result.error.includes('HTML content')) {
            console.log('   💡 Still getting HTML - security checkpoint active');
          }
        }
        
      } catch (error) {
        console.log(`   Exception: ${error.message}`);
      }
      
      console.log('\n3. Cleanup:');
      await strikeBrowserService.cleanup();
      console.log('   ✅ Browser closed');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

simpleBrowserTest().catch(console.error);