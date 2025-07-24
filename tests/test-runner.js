#!/usr/bin/env node

/**
 * API Test Runner
 * Executes comprehensive API tests for all platform services
 */

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// Test configuration
const CONFIG = {
  // Environment variables
  SUPABASE_URL: process.env.VITE_SUPABASE_URL || 'https://sgzlhcagtesjazvwskjw.supabase.co',
  SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY,
  
  // Test settings
  TEST_TIMEOUT: 30000, // 30 seconds per test
  MAX_RETRIES: 3,
  PARALLEL_TESTS: false,
  
  // Output options
  VERBOSE: process.argv.includes('--verbose'),
  SAVE_RESULTS: process.argv.includes('--save'),
  FORMAT: process.argv.includes('--json') ? 'json' : 'console'
};

class TestRunner {
  constructor() {
    this.results = [];
    this.startTime = Date.now();
    this.logFile = path.join(__dirname, `test-results-${new Date().toISOString().split('T')[0]}.json`);
  }

  log(message, level = 'INFO') {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level}] ${message}`;
    
    if (CONFIG.VERBOSE || level === 'ERROR') {
      console.log(logMessage);
    }
    
    // Save to log file if enabled
    if (CONFIG.SAVE_RESULTS) {
      fs.appendFileSync(this.logFile, logMessage + '\n');
    }
  }

  async runTest(testName, testFunction) {
    this.log(`Starting test: ${testName}`);
    
    let attempt = 0;
    let lastError = null;
    
    while (attempt < CONFIG.MAX_RETRIES) {
      try {
        const startTime = Date.now();
        
        // Run test with timeout
        const result = await Promise.race([
          testFunction(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Test timeout')), CONFIG.TEST_TIMEOUT)
          )
        ]);
        
        const duration = Date.now() - startTime;
        
        this.results.push({
          name: testName,
          status: 'PASS',
          duration,
          attempt: attempt + 1,
          result
        });
        
        this.log(`✅ Test passed: ${testName} (${duration}ms)`);
        return result;
        
      } catch (error) {
        lastError = error;
        attempt++;
        
        this.log(`❌ Test failed: ${testName} (attempt ${attempt}/${CONFIG.MAX_RETRIES}): ${error.message}`, 'ERROR');
        
        if (attempt < CONFIG.MAX_RETRIES) {
          this.log(`🔄 Retrying in 2 seconds...`);
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
    }
    
    // All attempts failed
    this.results.push({
      name: testName,
      status: 'FAIL',
      duration: CONFIG.TEST_TIMEOUT,
      attempt: CONFIG.MAX_RETRIES,
      error: lastError.message
    });
    
    return null;
  }

  async testSupabaseConnection() {
    const { createClient } = require('@supabase/supabase-js');
    
    if (!CONFIG.SUPABASE_URL || !CONFIG.SUPABASE_ANON_KEY) {
      throw new Error('Missing Supabase configuration');
    }
    
    const supabase = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
    
    // Test basic connection
    const { data, error } = await supabase.from('users').select('count', { count: 'exact' }).limit(1);
    
    if (error) {
      throw new Error(`Supabase connection failed: ${error.message}`);
    }
    
    return { connected: true, url: CONFIG.SUPABASE_URL };
  }

  async testAIProxyFunction() {
    const fetch = require('node-fetch');
    
    // First need to authenticate
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
    
    // Try to create a test user or sign in
    const testEmail = 'test@example.com';
    const testPassword = 'testpassword123';
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: testPassword
    });
    
    let authToken = null;
    if (error && error.message.includes('Invalid login credentials')) {
      // Try to sign up
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: testEmail,
        password: testPassword
      });
      
      if (signUpError) {
        throw new Error(`Authentication failed: ${signUpError.message}`);
      }
      
      authToken = signUpData.session?.access_token;
    } else if (error) {
      throw new Error(`Authentication failed: ${error.message}`);
    } else {
      authToken = data.session?.access_token;
    }
    
    if (!authToken) {
      throw new Error('No authentication token received');
    }
    
    // Test AI proxy with simple request
    const response = await fetch(`${CONFIG.SUPABASE_URL}/functions/v1/ai-proxy`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        provider: 'openai',
        model: 'gpt-4.1-turbo',
        messages: [{ role: 'user', content: 'Hello, this is a test message' }],
        temperature: 0.7,
        max_tokens: 100
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`AI Proxy failed: ${errorData.error || response.statusText}`);
    }
    
    const result = await response.json();
    
    if (!result.response || !result.tokens_used) {
      throw new Error('Invalid AI response structure');
    }
    
    return {
      success: true,
      tokensUsed: result.tokens_used,
      responseLength: JSON.stringify(result.response).length
    };
  }

  async testStripeCheckout() {
    const fetch = require('node-fetch');
    
    // Need authentication token
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'test@example.com',
      password: 'testpassword123'
    });
    
    if (error) {
      throw new Error(`Authentication failed: ${error.message}`);
    }
    
    const authToken = data.session?.access_token;
    
    // Test checkout session creation
    const response = await fetch(`${CONFIG.SUPABASE_URL}/functions/v1/stripe-checkout`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        price_id: 'price_1RiUvhAK7V4m73alSPDpllg2', // 100 Credits price ID
        mode: 'payment',
        success_url: 'https://example.com/success',
        cancel_url: 'https://example.com/cancel'
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Stripe Checkout failed: ${errorData.error || response.statusText}`);
    }
    
    const result = await response.json();
    
    if (!result.sessionId || !result.url) {
      throw new Error('Invalid Stripe checkout response');
    }
    
    return {
      success: true,
      sessionId: result.sessionId,
      hasValidUrl: result.url.includes('checkout.stripe.com')
    };
  }

  async testTelegramNotification() {
    const fetch = require('node-fetch');
    
    const testPayload = {
      record: {
        id: 'test-' + Date.now(),
        title: 'API Test Notification',
        description: 'This is a test notification from the API test suite',
        category: 'test',
        priority: 'low',
        created_at: new Date().toISOString()
      }
    };
    
    const response = await fetch(`${CONFIG.SUPABASE_URL}/functions/v1/telegram-notify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testPayload)
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Telegram notification failed: ${errorData.error || response.statusText}`);
    }
    
    const result = await response.json();
    
    if (!result.success) {
      throw new Error(`Telegram notification failed: ${result.error || 'Unknown error'}`);
    }
    
    return {
      success: true,
      messageLength: result.debug_info?.message_length,
      chatId: result.debug_info?.chat_id
    };
  }

  async testDatabaseOperations() {
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
    
    // Test authentication
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'test@example.com',
      password: 'testpassword123'
    });
    
    if (authError) {
      throw new Error(`Auth failed: ${authError.message}`);
    }
    
    // Test table access
    const { data: usersData, error: usersError } = await supabase
      .from('users')
      .select('id')
      .limit(1);
    
    if (usersError) {
      throw new Error(`Users table access failed: ${usersError.message}`);
    }
    
    // Test credits table
    const { data: creditsData, error: creditsError } = await supabase
      .from('credit_wallets')
      .select('user_id, total_credits')
      .limit(1);
    
    if (creditsError) {
      throw new Error(`Credits table access failed: ${creditsError.message}`);
    }
    
    return {
      tablesAccessible: ['users', 'credit_wallets'],
      userCount: usersData?.length || 0,
      authenticated: !!authData.session
    };
  }

  async runAllTests() {
    console.log('🚀 Starting comprehensive API testing...');
    console.log(`Environment: ${CONFIG.SUPABASE_URL}`);
    console.log(`Timeout: ${CONFIG.TEST_TIMEOUT}ms`);
    console.log(`Max retries: ${CONFIG.MAX_RETRIES}`);
    console.log('-'.repeat(50));
    
    const tests = [
      { name: 'Supabase Connection', fn: () => this.testSupabaseConnection() },
      { name: 'Database Operations', fn: () => this.testDatabaseOperations() },
      { name: 'AI Proxy Function', fn: () => this.testAIProxyFunction() },
      { name: 'Stripe Checkout', fn: () => this.testStripeCheckout() },
      { name: 'Telegram Notification', fn: () => this.testTelegramNotification() }
    ];
    
    for (const test of tests) {
      await this.runTest(test.name, test.fn);
    }
    
    // Generate final report
    this.generateReport();
  }

  generateReport() {
    const endTime = Date.now();
    const totalDuration = endTime - this.startTime;
    
    const passed = this.results.filter(r => r.status === 'PASS').length;
    const failed = this.results.filter(r => r.status === 'FAIL').length;
    const total = this.results.length;
    
    const report = {
      summary: {
        total,
        passed,
        failed,
        successRate: ((passed / total) * 100).toFixed(1) + '%',
        totalDuration: `${(totalDuration / 1000).toFixed(2)}s`
      },
      tests: this.results,
      timestamp: new Date().toISOString()
    };
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 API TEST REPORT');
    console.log('='.repeat(60));
    console.log(`Total Tests: ${total}`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📈 Success Rate: ${report.summary.successRate}`);
    console.log(`⏱️ Total Duration: ${report.summary.totalDuration}`);
    console.log('-'.repeat(60));
    
    // Detailed results
    this.results.forEach(result => {
      const status = result.status === 'PASS' ? '✅' : '❌';
      const duration = `${result.duration}ms`;
      const attempts = result.attempt > 1 ? ` (${result.attempt} attempts)` : '';
      
      console.log(`${status} ${result.name} - ${duration}${attempts}`);
      
      if (result.error && CONFIG.VERBOSE) {
        console.log(`   Error: ${result.error}`);
      }
    });
    
    // Save results if requested
    if (CONFIG.SAVE_RESULTS) {
      fs.writeFileSync(this.logFile, JSON.stringify(report, null, 2));
      console.log(`\n📄 Results saved to: ${this.logFile}`);
    }
    
    // Exit with appropriate code
    if (failed > 0) {
      console.log('\n❌ Some tests failed. Check the details above.');
      process.exit(1);
    } else {
      console.log('\n✅ All tests passed successfully!');
      process.exit(0);
    }
  }
}

// Check if required dependencies are installed
function checkDependencies() {
  const required = ['@supabase/supabase-js', 'node-fetch'];
  const missing = [];
  
  for (const dep of required) {
    try {
      require(dep);
    } catch (error) {
      missing.push(dep);
    }
  }
  
  if (missing.length > 0) {
    console.error('❌ Missing dependencies:', missing.join(', '));
    console.error('Please install them with: npm install ' + missing.join(' '));
    process.exit(1);
  }
}

// Main execution
if (require.main === module) {
  checkDependencies();
  
  const runner = new TestRunner();
  runner.runAllTests().catch(error => {
    console.error('❌ Test runner failed:', error);
    process.exit(1);
  });
}

module.exports = TestRunner; 