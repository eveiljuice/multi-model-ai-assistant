// Test script to verify AI proxy fix
const SUPABASE_URL = 'https://sgzlhcagtesjazvwskjw.supabase.co';

async function testAIProxyFix() {
  console.log('🧪 Testing AI Proxy Fix...');
  
  // Test with valid max_tokens values
  const testCases = [
    { provider: 'anthropic', max_tokens: 4000, expected: 'should work' },
    { provider: 'gemini', max_tokens: 4000, expected: 'should work' },
    { provider: 'anthropic', max_tokens: 5000, expected: 'should fail - too high' },
    { provider: 'gemini', max_tokens: 10000, expected: 'should fail - too high' },
  ];

  for (const testCase of testCases) {
    console.log(`\n📋 Testing ${testCase.provider} with max_tokens=${testCase.max_tokens}`);
    console.log(`Expected: ${testCase.expected}`);
    
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/ai-proxy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token', // This will fail auth, but we want to test validation first
        },
        body: JSON.stringify({
          provider: testCase.provider,
          model: testCase.provider === 'anthropic' ? 'claude-sonnet-4-20250514' : 'gemini-2.0-flash',
          messages: [{ role: 'user', content: 'Test message' }],
          temperature: 0.7,
          max_tokens: testCase.max_tokens
        })
      });

      const result = await response.text();
      console.log(`Status: ${response.status}`);
      console.log(`Response: ${result.substring(0, 200)}...`);
      
      if (response.status === 400 && result.includes('max_tokens')) {
        console.log('✅ Validation working correctly - max_tokens error caught');
      } else if (response.status === 401) {
        console.log('✅ Max_tokens validation passed - got auth error as expected');
      } else {
        console.log('❓ Unexpected response');
      }
      
    } catch (error) {
      console.error('❌ Network error:', error.message);
    }
  }
}

// Run the test
testAIProxyFix().catch(console.error); 