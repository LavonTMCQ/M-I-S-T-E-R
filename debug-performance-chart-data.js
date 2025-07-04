// Debug script to check PerformanceChart data
console.log('=== PERFORMANCE CHART DATA DEBUG ===');

// Check if we're on the analytics tab
const analyticsTab = document.querySelector('[data-state="active"][value="analytics"]') || 
                    document.querySelector('.analytics') ||
                    Array.from(document.querySelectorAll('*')).find(el => 
                      el.textContent && el.textContent.includes('Portfolio Performance')
                    );

if (analyticsTab) {
  console.log('✅ Analytics tab is active or found');
} else {
  console.log('❌ Analytics tab not found or not active');
  console.log('Available tabs:', Array.from(document.querySelectorAll('[role="tab"]')).map(tab => tab.textContent));
}

// Check for React errors in console
console.log('🔍 Checking for React component errors...');

// Look for any elements with "Performance" in their text
const performanceElements = Array.from(document.querySelectorAll('*')).filter(el => 
  el.textContent && el.textContent.toLowerCase().includes('performance')
);
console.log(`Found ${performanceElements.length} elements with "performance" text`);

performanceElements.forEach((el, index) => {
  console.log(`Performance element ${index + 1}:`, el.textContent.substring(0, 100));
});

// Check for chart-related CSS classes
const chartClasses = [
  'recharts-wrapper',
  'recharts-surface', 
  'chart-container',
  'performance-chart',
  'portfolio-chart'
];

chartClasses.forEach(className => {
  const elements = document.querySelectorAll(`.${className}`);
  console.log(`Found ${elements.length} elements with class "${className}"`);
});

// Check if there are any hidden elements
const hiddenElements = document.querySelectorAll('[style*="display: none"], [hidden]');
console.log(`Found ${hiddenElements.length} hidden elements`);

// Check for error boundaries or error messages
const errorTexts = ['error', 'failed', 'not found', 'undefined'];
errorTexts.forEach(errorText => {
  const elements = Array.from(document.querySelectorAll('*')).filter(el => 
    el.textContent && el.textContent.toLowerCase().includes(errorText)
  );
  if (elements.length > 0) {
    console.log(`Found ${elements.length} elements with "${errorText}":`, 
      elements.map(el => el.textContent.substring(0, 50))
    );
  }
});

// Check React DevTools for component state
if (window.React) {
  console.log('✅ React is available');
} else {
  console.log('❌ React not found in global scope');
}