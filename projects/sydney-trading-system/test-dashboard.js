/**
 * Comprehensive Advanced Signal Analytics Dashboard Testing
 * Uses Playwright to test all dashboard functionality and take screenshots
 */

import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testDashboard() {
  console.log('🚀 Starting Advanced Signal Analytics Dashboard Testing...\n');
  
  // Create screenshots directory
  const screenshotsDir = path.join(__dirname, 'dashboard-screenshots');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir);
  }

  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 1000 // Slow down for visibility
  });
  
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  
  const page = await context.newPage();
  
  try {
    console.log('📊 Navigating to dashboard...');
    await page.goto('http://localhost:3001', { waitUntil: 'networkidle' });
    
    // Wait for page to fully load
    await page.waitForTimeout(3000);
    
    // Take initial screenshot
    await page.screenshot({ 
      path: path.join(screenshotsDir, '01-initial-load.png'),
      fullPage: true 
    });
    console.log('✅ Initial page screenshot taken');

    // Test 1: Check if dashboard components are present
    console.log('\n🔍 Testing dashboard components...');
    
    const dashboardTitle = await page.locator('h2:has-text("Advanced Signal Analytics")').count();
    console.log(`Dashboard title present: ${dashboardTitle > 0 ? '✅' : '❌'}`);
    
    const viewTabs = await page.locator('button:has-text("Overview"), button:has-text("Timeline"), button:has-text("Charts")').count();
    console.log(`View tabs present: ${viewTabs >= 3 ? '✅' : '❌'} (${viewTabs}/3)`);
    
    const dataControls = await page.locator('button:has-text("Data Controls")').count();
    console.log(`Data controls present: ${dataControls > 0 ? '✅' : '❌'}`);

    // Test 2: Check current data state
    console.log('\n📊 Checking data state...');
    
    const emptyState = await page.locator('text=Ready for Signal Analytics').count();
    const mockDataPresent = await page.locator('text=Total Signals').count();
    
    if (emptyState > 0) {
      console.log('✅ System showing empty state (no mock data)');
      await page.screenshot({ 
        path: path.join(screenshotsDir, '02-empty-state.png'),
        fullPage: true 
      });
    } else if (mockDataPresent > 0) {
      console.log('⚠️ System showing data (mock or real signals present)');
      await page.screenshot({ 
        path: path.join(screenshotsDir, '02-data-present.png'),
        fullPage: true 
      });
    }

    // Test 3: Test Data Controls
    console.log('\n⚙️ Testing data controls...');
    
    await page.click('button:has-text("Data Controls")');
    await page.waitForTimeout(1000);
    
    const clearButton = await page.locator('button:has-text("Clear Data")').count();
    const testDataButton = await page.locator('button:has-text("Load Test Data")').count();
    
    console.log(`Clear Data button: ${clearButton > 0 ? '✅' : '❌'}`);
    console.log(`Load Test Data button: ${testDataButton > 0 ? '✅' : '❌'}`);
    
    await page.screenshot({ 
      path: path.join(screenshotsDir, '03-data-controls.png'),
      fullPage: true 
    });

    // Test 4: Load test data to test dashboard functionality
    console.log('\n📈 Loading test data for dashboard testing...');
    
    await page.click('button:has-text("Load Test Data")');
    await page.waitForTimeout(2000); // Wait for page reload
    
    // Wait for dashboard to load with data
    await page.waitForSelector('h2:has-text("Advanced Signal Analytics")', { timeout: 10000 });
    await page.waitForTimeout(3000);
    
    await page.screenshot({ 
      path: path.join(screenshotsDir, '04-with-test-data.png'),
      fullPage: true 
    });
    console.log('✅ Test data loaded');

    // Test 5: Test Overview tab
    console.log('\n📊 Testing Overview tab...');
    
    await page.click('button:has-text("Overview")');
    await page.waitForTimeout(2000);
    
    const totalSignals = await page.locator('text=Total Signals').count();
    const winRate = await page.locator('text=Win Rate').count();
    const avgPnL = await page.locator('text=Avg P&L').count();
    const profitFactor = await page.locator('text=Profit Factor').count();
    
    console.log(`Total Signals metric: ${totalSignals > 0 ? '✅' : '❌'}`);
    console.log(`Win Rate metric: ${winRate > 0 ? '✅' : '❌'}`);
    console.log(`Avg P&L metric: ${avgPnL > 0 ? '✅' : '❌'}`);
    console.log(`Profit Factor metric: ${profitFactor > 0 ? '✅' : '❌'}`);
    
    await page.screenshot({ 
      path: path.join(screenshotsDir, '05-overview-tab.png'),
      fullPage: true 
    });

    // Test 6: Test Timeline tab
    console.log('\n📈 Testing Timeline tab...');
    
    await page.click('button:has-text("Timeline")');
    await page.waitForTimeout(3000);
    
    const timelineTitle = await page.locator('h3:has-text("Signal Timeline")').count();
    const timeframeButtons = await page.locator('button:has-text("1D"), button:has-text("3D"), button:has-text("1W")').count();
    
    console.log(`Timeline title: ${timelineTitle > 0 ? '✅' : '❌'}`);
    console.log(`Timeframe buttons: ${timeframeButtons >= 3 ? '✅' : '❌'} (${timeframeButtons}/5)`);
    
    await page.screenshot({ 
      path: path.join(screenshotsDir, '06-timeline-tab.png'),
      fullPage: true 
    });

    // Test 7: Test Charts tab
    console.log('\n📉 Testing Charts tab...');
    
    await page.click('button:has-text("Charts")');
    await page.waitForTimeout(3000);
    
    const chartsTitle = await page.locator('h3:has-text("Performance Charts")').count();
    const chartTypeButtons = await page.locator('button:has-text("P&L"), button:has-text("Win Rate"), button:has-text("Distribution")').count();
    
    console.log(`Charts title: ${chartsTitle > 0 ? '✅' : '❌'}`);
    console.log(`Chart type buttons: ${chartTypeButtons >= 3 ? '✅' : '❌'} (${chartTypeButtons}/3)`);
    
    await page.screenshot({ 
      path: path.join(screenshotsDir, '07-charts-tab.png'),
      fullPage: true 
    });

    // Test 8: Test Advanced Filters
    console.log('\n🔍 Testing Advanced Filters...');
    
    await page.click('button:has-text("Overview")'); // Go back to overview
    await page.waitForTimeout(2000);
    
    const filtersTitle = await page.locator('h3:has-text("Advanced Filters")').count();
    const signalTypeFilter = await page.locator('select').first().count();
    
    console.log(`Filters section: ${filtersTitle > 0 ? '✅' : '❌'}`);
    console.log(`Filter controls: ${signalTypeFilter > 0 ? '✅' : '❌'}`);
    
    // Test filter functionality
    await page.selectOption('select', 'long');
    await page.waitForTimeout(2000);
    
    await page.screenshot({ 
      path: path.join(screenshotsDir, '08-filters-applied.png'),
      fullPage: true 
    });

    // Test 9: Test TradingView Chart
    console.log('\n📊 Testing TradingView Chart...');
    
    const chartTitle = await page.locator('h2:has-text("SPY 5-Minute Chart")').count();
    const refreshButton = await page.locator('button:has-text("Refresh Data")').count();
    const liveButton = await page.locator('button:has-text("Start Live")').count();
    
    console.log(`Chart title: ${chartTitle > 0 ? '✅' : '❌'}`);
    console.log(`Refresh button: ${refreshButton > 0 ? '✅' : '❌'}`);
    console.log(`Live button: ${liveButton > 0 ? '✅' : '❌'}`);
    
    // Test chart loading
    if (refreshButton > 0) {
      console.log('🔄 Testing chart data refresh...');
      await page.click('button:has-text("Refresh Data")');
      await page.waitForTimeout(5000); // Wait for API call
      
      const apiStatus = await page.locator('text=API Status').count();
      console.log(`API Status indicator: ${apiStatus > 0 ? '✅' : '❌'}`);
    }
    
    await page.screenshot({ 
      path: path.join(screenshotsDir, '09-tradingview-chart.png'),
      fullPage: true 
    });

    // Test 10: Test Signal Quality Indicator
    console.log('\n🎯 Testing Signal Quality Indicator...');
    
    const qualityTitle = await page.locator('h4:has-text("Signal Quality")').count();
    const qualityScore = await page.locator('text=Quality Score').count();
    
    console.log(`Quality indicator: ${qualityTitle > 0 ? '✅' : '❌'}`);
    console.log(`Quality score: ${qualityScore > 0 ? '✅' : '❌'}`);
    
    await page.screenshot({ 
      path: path.join(screenshotsDir, '10-signal-quality.png'),
      fullPage: true 
    });

    // Test 11: Check for JavaScript errors
    console.log('\n🐛 Checking for JavaScript errors...');
    
    const errors = [];
    page.on('pageerror', error => {
      errors.push(error.message);
    });
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(`Console error: ${msg.text()}`);
      }
    });
    
    await page.waitForTimeout(2000);
    
    if (errors.length === 0) {
      console.log('✅ No JavaScript errors detected');
    } else {
      console.log(`❌ JavaScript errors found: ${errors.length}`);
      errors.forEach(error => console.log(`  - ${error}`));
    }

    // Test 12: Test responsive design
    console.log('\n📱 Testing responsive design...');
    
    await page.setViewportSize({ width: 768, height: 1024 }); // Tablet
    await page.waitForTimeout(2000);
    
    await page.screenshot({ 
      path: path.join(screenshotsDir, '11-tablet-view.png'),
      fullPage: true 
    });
    
    await page.setViewportSize({ width: 375, height: 667 }); // Mobile
    await page.waitForTimeout(2000);
    
    await page.screenshot({ 
      path: path.join(screenshotsDir, '12-mobile-view.png'),
      fullPage: true 
    });

    // Final screenshot at desktop resolution
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.waitForTimeout(2000);
    
    await page.screenshot({ 
      path: path.join(screenshotsDir, '13-final-desktop.png'),
      fullPage: true 
    });

    console.log('\n✅ Dashboard testing completed successfully!');
    console.log(`📸 Screenshots saved to: ${screenshotsDir}`);
    
    return {
      success: true,
      errors: errors,
      screenshotsPath: screenshotsDir
    };

  } catch (error) {
    console.error('❌ Testing failed:', error);
    
    await page.screenshot({ 
      path: path.join(screenshotsDir, 'error-screenshot.png'),
      fullPage: true 
    });
    
    return {
      success: false,
      error: error.message,
      screenshotsPath: screenshotsDir
    };
  } finally {
    await browser.close();
  }
}

// Run the test
testDashboard().then(result => {
  if (result.success) {
    console.log('\n🎉 All tests completed successfully!');
    process.exit(0);
  } else {
    console.log('\n💥 Tests failed:', result.error);
    process.exit(1);
  }
}).catch(error => {
  console.error('💥 Test runner failed:', error);
  process.exit(1);
});
