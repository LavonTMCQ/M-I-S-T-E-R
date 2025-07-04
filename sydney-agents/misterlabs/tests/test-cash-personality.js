#!/usr/bin/env node

/**
 * CASH Personality Test
 * 
 * Test CASH's new legendary Philly developer personality
 */

console.log('💰 Testing CASH\'s Legendary Personality...\n');

async function testCashPersonality() {
  const testCases = [
    {
      name: 'Introduction Test',
      message: 'Yo CASH! Who are you and what do you do?',
      expectKeywords: ['philly', 'philadelphia', 'mister', 'mrs', 'cardano', 'legendary']
    },
    {
      name: 'Platform Reference Test', 
      message: 'Tell me about your platforms and what you\'ve built',
      expectKeywords: ['misterada.com', 'axonai.co', 'created', 'built']
    },
    {
      name: 'Casual Conversation Test',
      message: 'What\'s your take on the current market, bro?',
      expectKeywords: ['real', 'shit', 'market', 'analysis']
    },
    {
      name: 'Technical Question Test',
      message: 'Should I analyze Apple stock or Cardano today?',
      expectKeywords: ['mrs', 'mister', 'creation', 'aapl', 'ada']
    }
  ];

  console.log('🎭 Testing CASH\'s personality across different scenarios...\n');

  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i];
    console.log(`🧪 Test ${i + 1}: ${testCase.name}`);
    console.log(`📝 Message: "${testCase.message}"`);
    
    try {
      const response = await fetch('http://localhost:4112/api/agents/cashAgent/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          messages: [
            {
              role: 'user',
              content: testCase.message
            }
          ],
          resourceId: 'personality-test',
          threadId: `personality-test-${i}`
        }),
        signal: AbortSignal.timeout(60000) // 60 seconds for Gemini 2.5 Pro
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.text) {
        console.log(`💬 CASH Response: "${data.text.substring(0, 200)}${data.text.length > 200 ? '...' : ''}"`);
        
        // Check for personality keywords
        const responseText = data.text.toLowerCase();
        const foundKeywords = testCase.expectKeywords.filter(keyword => 
          responseText.includes(keyword.toLowerCase())
        );
        
        console.log(`🔍 Personality Check: Found ${foundKeywords.length}/${testCase.expectKeywords.length} expected elements`);
        if (foundKeywords.length > 0) {
          console.log(`✅ Keywords found: ${foundKeywords.join(', ')}`);
        }
        
        // Check for personality traits
        const personalityTraits = {
          'Casual/Laid Back': /\b(yo|what's good|bro|dude|man|shit|damn|fuck)\b/i.test(data.text),
          'Philly References': /\b(philly|philadelphia|east coast)\b/i.test(data.text),
          'Creator Pride': /\b(created|built|my creation|my baby|i made)\b/i.test(data.text),
          'Real Talk': /\b(real|straight up|honestly|truth|bullshit|keep it 100)\b/i.test(data.text),
          'Technical Expertise': /\b(mister|mrs|cardano|blockchain|analysis)\b/i.test(data.text)
        };
        
        const activeTraits = Object.entries(personalityTraits)
          .filter(([trait, present]) => present)
          .map(([trait]) => trait);
        
        console.log(`🎭 Personality Traits: ${activeTraits.join(', ') || 'None detected'}`);
        console.log(`✅ Test ${i + 1} completed\n`);
        
      } else {
        console.log('❌ No response text received\n');
      }
      
    } catch (error) {
      console.error(`❌ Test ${i + 1} failed: ${error.message}\n`);
    }
    
    // Wait between tests
    if (i < testCases.length - 1) {
      console.log('⏳ Waiting 2 seconds before next test...\n');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
}

// Run personality test
testCashPersonality().then(() => {
  console.log('📊 Personality Test Summary:');
  console.log('============================');
  console.log('🎭 CASH should demonstrate:');
  console.log('   • Laid back, East Coast personality');
  console.log('   • Pride in creating MRS and MISTER');
  console.log('   • References to Philly background');
  console.log('   • Casual language and real talk');
  console.log('   • Technical expertise with personality');
  console.log('   • Mentions of misterada.com and axonai.co');
  console.log('\n💰 CASH Personality Test Complete!');
}).catch(error => {
  console.error('❌ Personality test failed:', error);
  process.exit(1);
});
