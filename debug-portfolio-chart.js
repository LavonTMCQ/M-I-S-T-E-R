// Debug script for portfolio chart issues
console.log('=== PORTFOLIO CHART DEBUG ===');

// Check if we're on the dashboard page
if (window.location.pathname.includes('dashboard')) {
  console.log('✅ On dashboard page');
  
  // Wait a bit for React to render
  setTimeout(() => {
    // Check for portfolio performance data in React state
    console.log('🔍 Checking for portfolio chart elements...');
    
    // Look for the portfolio performance chart container
    const chartContainers = document.querySelectorAll('[class*="chart"]');
    console.log(`Found ${chartContainers.length} chart containers`);
    
    // Look for portfolio performance specific elements
    const portfolioElements = document.querySelectorAll('[class*="portfolio"], [class*="performance"]');
    console.log(`Found ${portfolioElements.length} portfolio/performance elements`);
    
    // Check for Recharts elements (the chart library)
    const rechartsElements = document.querySelectorAll('.recharts-wrapper, .recharts-surface');
    console.log(`Found ${rechartsElements.length} Recharts elements`);
    
    // Check for any error messages
    const errorElements = document.querySelectorAll('[class*="error"]');
    console.log(`Found ${errorElements.length} error elements`);
    
    // Check for loading states
    const loadingElements = document.querySelectorAll('[class*="loading"], [class*="spinner"]');
    console.log(`Found ${loadingElements.length} loading elements`);
    
    // Look for the specific Portfolio Performance card
    const portfolioCard = Array.from(document.querySelectorAll('*')).find(el => 
      el.textContent && el.textContent.includes('Portfolio Performance')
    );
    
    if (portfolioCard) {
      console.log('✅ Found Portfolio Performance card');
      console.log('Card content:', portfolioCard.textContent.substring(0, 200));
      
      // Check if it has chart data
      const chartInCard = portfolioCard.querySelector('.recharts-wrapper');
      if (chartInCard) {
        console.log('✅ Found chart in Portfolio Performance card');
      } else {
        console.log('❌ No chart found in Portfolio Performance card');
      }
    } else {
      console.log('❌ Portfolio Performance card not found');
    }
    
    // Check React DevTools if available
    if (window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
      console.log('✅ React DevTools available');
    }
    
  }, 2000); // Wait 2 seconds for everything to load
  
} else {
  console.log('❌ Not on dashboard page, current path:', window.location.pathname);
}