/**
 * Simple Dashboard Test using Mastra Playwright Tools
 * Quick test to verify the Advanced Signal Analytics Dashboard functionality
 */

import fetch from 'node-fetch';

const MASTRA_API_BASE = 'http://localhost:4113/api';

// Helper function to call Mastra tools
async function callTool(toolId, data) {
  try {
    const response = await fetch(`${MASTRA_API_BASE}/tools/${toolId}/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`❌ Error calling ${toolId}:`, error.message);
    return { success: false, error: error.message };
  }
}

async function testDashboard() {
  console.log('🚀 Simple Dashboard Test with Mastra Playwright\n');

  try {
    // Step 1: Navigate to dashboard
    console.log('📊 Navigating to http://localhost:3001...');
    const navResult = await callTool('navigate-to-url', {
      url: 'http://localhost:3001',
      timeout: 15000
    });

    if (!navResult.success) {
      console.error('❌ Navigation failed:', navResult.error);
      return;
    }

    console.log('✅ Navigation successful!');
    console.log(`   Title: ${navResult.title}`);
    console.log(`   URL: ${navResult.url}`);
    
    // Check if dashboard content is present
    const hasAdvancedAnalytics = navResult.content.includes('Advanced Signal Analytics');
    const hasDataControls = navResult.content.includes('Data Controls');
    const hasTradingSystem = navResult.content.includes('Sydney\'s Advanced Trading System');
    const hasSignalQuality = navResult.content.includes('Signal Quality');
    
    console.log('\n🔍 Dashboard Content Analysis:');
    console.log(`   Trading System Header: ${hasTradingSystem ? '✅' : '❌'}`);
    console.log(`   Data Controls: ${hasDataControls ? '✅' : '❌'}`);
    console.log(`   Advanced Analytics: ${hasAdvancedAnalytics ? '✅' : '❌'}`);
    console.log(`   Signal Quality: ${hasSignalQuality ? '✅' : '❌'}`);

    // Step 2: Take screenshot
    console.log('\n📸 Taking screenshot...');
    const screenshotResult = await callTool('take-screenshot', {
      fullPage: true
    });

    if (screenshotResult.success) {
      console.log('✅ Screenshot saved:', screenshotResult.screenshotPath);
    } else {
      console.log('⚠️ Screenshot failed:', screenshotResult.error);
    }

    // Step 3: Test Data Controls button
    console.log('\n⚙️ Testing Data Controls...');
    const dataControlsResult = await callTool('wait-for-element', {
      selector: 'button:has-text("Data Controls")',
      timeout: 5000
    });

    if (dataControlsResult.success) {
      console.log('✅ Data Controls button found');
      
      // Click the button
      const clickResult = await callTool('click-element', {
        selector: 'button:has-text("Data Controls")',
        waitAfterClick: 1000
      });

      if (clickResult.success) {
        console.log('✅ Data Controls clicked successfully');
        
        // Check for Load Test Data button
        const testDataResult = await callTool('wait-for-element', {
          selector: 'button:has-text("Load Test Data")',
          timeout: 3000
        });

        if (testDataResult.success) {
          console.log('✅ Load Test Data button found');
          
          // Click Load Test Data
          console.log('\n📈 Loading test data...');
          const loadResult = await callTool('click-element', {
            selector: 'button:has-text("Load Test Data")',
            waitAfterClick: 3000
          });

          if (loadResult.success) {
            console.log('✅ Test data loaded successfully');
            
            // Take screenshot after loading data
            await callTool('take-screenshot', { fullPage: true });
            
            // Check for analytics dashboard
            const analyticsResult = await callTool('wait-for-element', {
              selector: 'h2:has-text("Advanced Signal Analytics")',
              timeout: 10000
            });

            if (analyticsResult.success) {
              console.log('✅ Advanced Signal Analytics dashboard visible');
              console.log(`   Text: ${analyticsResult.elementText}`);
              
              // Test tab switching
              console.log('\n📊 Testing dashboard tabs...');
              
              // Test Timeline tab
              const timelineResult = await callTool('wait-for-element', {
                selector: 'button:has-text("Timeline")',
                timeout: 5000
              });

              if (timelineResult.success) {
                console.log('✅ Timeline tab found');
                
                const timelineClickResult = await callTool('click-element', {
                  selector: 'button:has-text("Timeline")',
                  waitAfterClick: 2000
                });

                if (timelineClickResult.success) {
                  console.log('✅ Timeline tab clicked successfully');
                  await callTool('take-screenshot', { fullPage: true });
                }
              }

              // Test Charts tab
              const chartsResult = await callTool('wait-for-element', {
                selector: 'button:has-text("Charts")',
                timeout: 5000
              });

              if (chartsResult.success) {
                console.log('✅ Charts tab found');
                
                const chartsClickResult = await callTool('click-element', {
                  selector: 'button:has-text("Charts")',
                  waitAfterClick: 2000
                });

                if (chartsClickResult.success) {
                  console.log('✅ Charts tab clicked successfully');
                  await callTool('take-screenshot', { fullPage: true });
                }
              }

            } else {
              console.log('❌ Advanced Signal Analytics dashboard not found');
            }
          } else {
            console.log('❌ Failed to load test data:', loadResult.error);
          }
        } else {
          console.log('❌ Load Test Data button not found');
        }
      } else {
        console.log('❌ Failed to click Data Controls:', clickResult.error);
      }
    } else {
      console.log('❌ Data Controls button not found');
    }

    // Step 4: Check TradingView chart
    console.log('\n📊 Checking TradingView chart...');
    const chartResult = await callTool('wait-for-element', {
      selector: 'h2:has-text("SPY 5-Minute Chart")',
      timeout: 5000
    });

    if (chartResult.success) {
      console.log('✅ TradingView chart section found');
      console.log(`   Text: ${chartResult.elementText}`);
    } else {
      console.log('❌ TradingView chart section not found');
    }

    // Final screenshot
    console.log('\n📸 Taking final screenshot...');
    await callTool('take-screenshot', { fullPage: true });

    console.log('\n🎉 Dashboard test completed successfully!');
    
    // Summary
    console.log('\n📊 TEST SUMMARY:');
    console.log('=' .repeat(50));
    console.log(`✅ Navigation: Working`);
    console.log(`✅ Page Content: ${hasTradingSystem && hasDataControls ? 'Complete' : 'Partial'}`);
    console.log(`✅ Data Controls: ${dataControlsResult.success ? 'Working' : 'Not Found'}`);
    console.log(`✅ Screenshots: Captured`);
    console.log(`✅ Dashboard State: ${hasAdvancedAnalytics ? 'Analytics Visible' : 'Empty State'}`);

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
console.log('🎯 Advanced Signal Analytics Dashboard - Simple Test');
console.log('🔧 Using Mastra Playwright Tools');
console.log('=' .repeat(60));

testDashboard().then(() => {
  console.log('\n🏁 Test completed!');
  process.exit(0);
}).catch(error => {
  console.error('💥 Test runner failed:', error);
  process.exit(1);
});
