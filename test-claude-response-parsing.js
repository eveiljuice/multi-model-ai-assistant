// Test Claude response parsing logic
console.log('🧪 CLAUDE RESPONSE PARSING TEST\n');

// Test scenarios for different response formats
function testResponseParsing() {
  
  console.log('1. 📋 Testing AI Service parsing logic...\n');
  
  // Scenario 1: Valid Claude response
  console.log('Scenario 1: ✅ Valid Claude response');
  const validClaudeResponse = {
    response: {
      content: [{ type: 'text', text: 'Hello from Claude!' }],
      usage: { input_tokens: 10, output_tokens: 5 }
    }
  };
  
  try {
    // Simulate aiService.ts parsing logic (line ~260)
    if (validClaudeResponse.response?.content?.[0]?.text) {
      const content = validClaudeResponse.response.content[0].text;
      const tokens = (validClaudeResponse.response.usage?.input_tokens || 0) + 
                    (validClaudeResponse.response.usage?.output_tokens || 0);
      console.log('  ✅ Content extracted:', content);
      console.log('  ✅ Tokens calculated:', tokens);
    } else {
      console.log('  ❌ Invalid Anthropic response format');
    }
  } catch (e) {
    console.log('  ❌ Parsing error:', e.message);
  }
  
  console.log('\nScenario 2: ❌ Invalid Claude response - missing content');
  const invalidResponse1 = {
    response: {
      usage: { input_tokens: 10, output_tokens: 5 }
      // Missing content array
    }
  };
  
  try {
    if (invalidResponse1.response?.content?.[0]?.text) {
      console.log('  ✅ Valid response');
    } else {
      console.log('  ❌ Invalid Anthropic response format - no content');
    }
  } catch (e) {
    console.log('  ❌ Parsing error:', e.message);
  }
  
  console.log('\nScenario 3: ❌ Claude 403 Error handling');
  const errorResponse = {
    error: {
      type: 'forbidden',
      message: 'Request not allowed'
    }
  };
  
  console.log('  📊 403 Error means:');
  console.log('    - API key invalid or expired');  
  console.log('    - Account suspended');
  console.log('    - Region restrictions');
  console.log('    - Billing issues');
  console.log('    - API quota exceeded at account level');
  
  console.log('\nScenario 4: 🔧 Edge Function error propagation test');
  
  // Test how Edge Function should handle 403
  function simulateEdgeFunctionError() {
    const anthropicError = 'Anthropic API error (403): {"error":{"type":"forbidden","message":"Request not allowed"}}';
    
    console.log('  Edge Function should return:', {
      error: anthropicError,
      details: 'Development mode details'
    });
    
    console.log('  Frontend should see: "Anthropic API error (403): Request not allowed"');
  }
  
  simulateEdgeFunctionError();
}

console.log('2. 🔍 AI Service Flow Analysis...\n');

function analyzeAIServiceFlow() {
  console.log('Step 1: aiService.callAIProxy()');
  console.log('  → POST to /functions/v1/ai-proxy');
  console.log('  → Body: { provider: "anthropic", model: "claude-sonnet-4-20250514", ... }');
  console.log('');
  
  console.log('Step 2: Edge Function callAnthropic()');
  console.log('  → POST to https://api.anthropic.com/v1/messages');
  console.log('  → Returns 403: Request not allowed');
  console.log('');
  
  console.log('Step 3: Edge Function error handling');
  console.log('  → Catches error in callAnthropic()'); 
  console.log('  → Throws: "Anthropic API error (403): Request not allowed"');
  console.log('');
  
  console.log('Step 4: Main catch block in Edge Function');
  console.log('  → Catches the thrown error');
  console.log('  → Returns 500 with error message');
  console.log('');
  
  console.log('Step 5: Frontend aiService.callAIProxy()');
  console.log('  → Receives 500 response');
  console.log('  → Parses error details');
  console.log('  → Shows: "Server error: Anthropic API error (403): Request not allowed"');
  console.log('');
}

analyzeAIServiceFlow();

console.log('3. 🎯 ROOT CAUSE ANALYSIS\n');

console.log('PRIMARY ISSUE: Claude API Key Problem');
console.log('  Status: 403 Forbidden - "Request not allowed"');
console.log('  Meaning: API key is invalid, expired, or account has issues');
console.log('');

console.log('SECONDARY ISSUE: Error Chain');
console.log('  1. Claude API returns 403');
console.log('  2. Edge Function catches and re-throws');
console.log('  3. Main catch returns 500 to frontend');
console.log('  4. Frontend shows "Server error" (confusing to user)');
console.log('');

console.log('SOLUTION STEPS:');
console.log('  1. ✅ Check Claude API key validity');
console.log('  2. ✅ Verify Supabase secrets configuration');
console.log('  3. ✅ Test with fresh API key if needed');
console.log('  4. ✅ Improve error messages to show specific API issues');
console.log('');

testResponseParsing(); 