#!/usr/bin/env node

/**
 * Edge Functions Specialized Test Suite
 * Tests all Supabase Edge Functions with detailed diagnostics
 */

const fetch = require('node-fetch');
const { createClient } = require('@supabase/supabase-js');

// Configuration
const CONFIG = {
  SUPABASE_URL: process.env.VITE_SUPABASE_URL || 'https://sgzlhcagtesjazvwskjw.supabase.co',
  SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY,
  TEST_TIMEOUT: 30000,
  VERBOSE: process.argv.includes('--verbose'),
  
  // Edge Function endpoints
  FUNCTIONS: {
    'ai-proxy': '/functions/v1/ai-proxy',
    'stripe-checkout': '/functions/v1/stripe-checkout',
    'stripe-webhook': '/functions/v1/stripe-webhook',
    'telegram-notify': '/functions/v1/telegram-notify',
    'credit-meter': '/functions/v1/credit-meter',
    'rollover-cron': '/functions/v1/rollover-cron',
    'webhook-handler': '/functions/v1/webhook-handler'
  }
};

class EdgeFunctionTester {
  constructor() {
    this.supabase = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
    this.authToken = null;
    this.results = [];
    this.startTime = Date.now();
  }

  log(message, level = 'INFO') {
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
    const prefix = level === 'ERROR' ? '❌' : level === 'WARN' ? '⚠️' : level === 'SUCCESS' ? '✅' : 'ℹ️';
    
    if (CONFIG.VERBOSE || level === 'ERROR' || level === 'SUCCESS') {
      console.log(`[${timestamp}] ${prefix} ${message}`);
    }
  }

  async authenticate() {
    this.log('Authenticating test user...');
    
    const testEmail = `test-${Date.now()}@example.com`;
    const testPassword = 'testpassword123';
    
    try {
      // Try to sign up first
      const { data: signUpData, error: signUpError } = await this.supabase.auth.signUp({
        email: testEmail,
        password: testPassword
      });
      
      if (signUpError && !signUpError.message.includes('already registered')) {
        throw signUpError;
      }
      
      // If signup succeeded, use that token
      if (signUpData.session?.access_token) {
        this.authToken = signUpData.session.access_token;
        this.log('Authentication successful (new user)', 'SUCCESS');
        return true;
      }
      
      // Otherwise try to sign in
      const { data: signInData, error: signInError } = await this.supabase.auth.signInWithPassword({
        email: 'test@example.com', // Use existing test user
        password: testPassword
      });
      
      if (signInError) {
        throw signInError;
      }
      
      this.authToken = signInData.session?.access_token;
      this.log('Authentication successful (existing user)', 'SUCCESS');
      return true;
      
    } catch (error) {
      this.log(`Authentication failed: ${error.message}`, 'ERROR');
      return false;
    }
  }

  async testFunction(functionName, testData) {
    this.log(`Testing ${functionName}...`);
    
    const endpoint = CONFIG.FUNCTIONS[functionName];
    if (!endpoint) {
      throw new Error(`Unknown function: ${functionName}`);
    }
    
    const startTime = Date.now();
    
    try {
      const headers = {
        'Content-Type': 'application/json'
      };
      
      // Add authorization for functions that need it
      if (['ai-proxy', 'stripe-checkout', 'credit-meter'].includes(functionName)) {
        if (!this.authToken) {
          throw new Error('Authentication required but not available');
        }
        headers['Authorization'] = `Bearer ${this.authToken}`;
      }
      
      const response = await fetch(`${CONFIG.SUPABASE_URL}${endpoint}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(testData)
      });
      
      const responseTime = Date.now() - startTime;
      const responseText = await response.text();
      
      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch (error) {
        responseData = { raw: responseText };
      }
      
      const result = {
        functionName,
        status: response.ok ? 'SUCCESS' : 'FAILURE',
        httpStatus: response.status,
        responseTime,
        responseSize: responseText.length,
        responseData,
        headers: Object.fromEntries(response.headers.entries())
      };
      
      this.results.push(result);
      
      if (response.ok) {
        this.log(`${functionName} - SUCCESS (${responseTime}ms)`, 'SUCCESS');
      } else {
        this.log(`${functionName} - FAILURE ${response.status} (${responseTime}ms)`, 'ERROR');
      }
      
      return result;
      
    } catch (error) {
      const responseTime = Date.now() - startTime;
      const result = {
        functionName,
        status: 'ERROR',
        httpStatus: 0,
        responseTime,
        error: error.message,
        responseData: null
      };
      
      this.results.push(result);
      this.log(`${functionName} - ERROR: ${error.message}`, 'ERROR');
      
      return result;
    }
  }

  async testAIProxy() {
    const testCases = [
      {
        name: 'OpenAI GPT-4',
        data: {
          provider: 'openai',
          model: 'gpt-4.1-turbo',
          messages: [{ role: 'user', content: 'Hello, respond with exactly "TEST_SUCCESS"' }],
          temperature: 0.1,
          max_tokens: 50
        }
      },
      {
        name: 'Anthropic Claude',
        data: {
          provider: 'anthropic',
          model: 'claude-sonnet-4-20250514',
          messages: [{ role: 'user', content: 'Hello, respond with exactly "TEST_SUCCESS"' }],
          temperature: 0.1,
          max_tokens: 50
        }
      },
      {
        name: 'Google Gemini',
        data: {
          provider: 'gemini',
          model: 'gemini-2.0-flash',
          messages: [{ role: 'user', content: 'Hello, respond with exactly "TEST_SUCCESS"' }],
          temperature: 0.1,
          max_tokens: 50
        }
      }
    ];
    
    for (const testCase of testCases) {
      this.log(`Testing AI Proxy - ${testCase.name}...`);
      await this.testFunction('ai-proxy', testCase.data);
    }
  }

  async testStripeCheckout() {
    const testCases = [
      {
        name: 'Credit Top-up 100',
        data: {
          price_id: 'price_1RiUvhAK7V4m73alSPDpllg2',
          mode: 'payment',
          success_url: 'https://example.com/success',
          cancel_url: 'https://example.com/cancel'
        }
      },
      {
        name: 'Credit Top-up 500',
        data: {
          price_id: 'price_1RiUxdAK7V4m73alz8Oad0YH',
          mode: 'payment',
          success_url: 'https://example.com/success',
          cancel_url: 'https://example.com/cancel'
        }
      },
      {
        name: 'Monthly Subscription',
        data: {
          price_id: 'price_1RiUt0AK7V4m73aluYckgD6P',
          mode: 'subscription',
          success_url: 'https://example.com/success',
          cancel_url: 'https://example.com/cancel'
        }
      }
    ];
    
    for (const testCase of testCases) {
      this.log(`Testing Stripe Checkout - ${testCase.name}...`);
      await this.testFunction('stripe-checkout', testCase.data);
    }
  }

  async testStripeWebhook() {
    const testCases = [
      {
        name: 'Checkout Session Completed',
        data: {
          id: 'evt_test_webhook',
          object: 'event',
          type: 'checkout.session.completed',
          data: {
            object: {
              id: 'cs_test_session',
              mode: 'payment',
              payment_status: 'paid',
              customer: 'cus_test_customer',
              amount_total: 999
            }
          }
        }
      },
      {
        name: 'Invoice Payment Succeeded',
        data: {
          id: 'evt_test_invoice',
          object: 'event',
          type: 'invoice.payment_succeeded',
          data: {
            object: {
              id: 'in_test_invoice',
              customer: 'cus_test_customer',
              subscription: 'sub_test_subscription',
              billing_reason: 'subscription_cycle'
            }
          }
        }
      }
    ];
    
    for (const testCase of testCases) {
      this.log(`Testing Stripe Webhook - ${testCase.name}...`);
      // Note: These will fail signature verification (expected)
      await this.testFunction('stripe-webhook', testCase.data);
    }
  }

  async testTelegramNotify() {
    const testCases = [
      {
        name: 'Idea Suggestion',
        data: {
          record: {
            id: 'test-' + Date.now(),
            title: 'Test Idea from Edge Function Test',
            description: 'This is a test idea notification',
            category: 'enhancement',
            priority: 'medium',
            created_at: new Date().toISOString()
          }
        }
      },
      {
        name: 'System Alert',
        data: {
          record: {
            id: 'alert-' + Date.now(),
            title: 'System Test Alert',
            description: 'Edge function test alert',
            category: 'system',
            priority: 'high',
            created_at: new Date().toISOString()
          }
        }
      }
    ];
    
    for (const testCase of testCases) {
      this.log(`Testing Telegram Notify - ${testCase.name}...`);
      await this.testFunction('telegram-notify', testCase.data);
    }
  }

  async testCreditMeter() {
    const testCases = [
      {
        name: 'Credit Deduction',
        data: {
          agent_id: 'test-agent',
          session_id: 'test-session-' + Date.now(),
          user_message: 'Test message for credit deduction',
          credits_to_deduct: 1
        }
      },
      {
        name: 'Credit Check',
        data: {
          agent_id: 'test-agent',
          action: 'check_credits'
        }
      }
    ];
    
    for (const testCase of testCases) {
      this.log(`Testing Credit Meter - ${testCase.name}...`);
      await this.testFunction('credit-meter', testCase.data);
    }
  }

  async testRolloverCron() {
    const testData = {
      type: 'manual_trigger',
      timestamp: new Date().toISOString()
    };
    
    this.log('Testing Rollover Cron...');
    await this.testFunction('rollover-cron', testData);
  }

  async testWebhookHandler() {
    const testCases = [
      {
        name: 'Generic Webhook',
        data: {
          event: 'test.event',
          data: {
            id: 'test-' + Date.now(),
            message: 'Test webhook event'
          }
        }
      }
    ];
    
    for (const testCase of testCases) {
      this.log(`Testing Webhook Handler - ${testCase.name}...`);
      await this.testFunction('webhook-handler', testCase.data);
    }
  }

  async testFunctionAvailability() {
    this.log('Testing Edge Function availability...');
    
    const availabilityTests = [];
    
    for (const [functionName, endpoint] of Object.entries(CONFIG.FUNCTIONS)) {
      const startTime = Date.now();
      
      try {
        const response = await fetch(`${CONFIG.SUPABASE_URL}${endpoint}`, {
          method: 'OPTIONS'
        });
        
        const responseTime = Date.now() - startTime;
        
        availabilityTests.push({
          functionName,
          available: response.status !== 404,
          responseTime,
          cors: response.headers.get('Access-Control-Allow-Origin') !== null
        });
        
        if (response.status !== 404) {
          this.log(`${functionName} - Available (${responseTime}ms)`, 'SUCCESS');
        } else {
          this.log(`${functionName} - Not Found (${responseTime}ms)`, 'ERROR');
        }
        
      } catch (error) {
        availabilityTests.push({
          functionName,
          available: false,
          error: error.message,
          responseTime: Date.now() - startTime
        });
        
        this.log(`${functionName} - Error: ${error.message}`, 'ERROR');
      }
    }
    
    this.results.push({
      functionName: 'availability-test',
      status: 'INFO',
      data: availabilityTests
    });
  }

  async runAllTests() {
    console.log('🚀 Starting Edge Functions Test Suite');
    console.log(`Environment: ${CONFIG.SUPABASE_URL}`);
    console.log(`Functions to test: ${Object.keys(CONFIG.FUNCTIONS).length}`);
    console.log('-'.repeat(60));
    
    // Test function availability first
    await this.testFunctionAvailability();
    
    // Authenticate for tests that need it
    const authSuccess = await this.authenticate();
    if (!authSuccess) {
      this.log('Some tests will be skipped due to authentication failure', 'WARN');
    }
    
    // Run all function tests
    await this.testAIProxy();
    await this.testStripeCheckout();
    await this.testStripeWebhook();
    await this.testTelegramNotify();
    await this.testCreditMeter();
    await this.testRolloverCron();
    await this.testWebhookHandler();
    
    // Generate report
    this.generateReport();
  }

  generateReport() {
    const endTime = Date.now();
    const totalDuration = endTime - this.startTime;
    
    const successful = this.results.filter(r => r.status === 'SUCCESS').length;
    const failed = this.results.filter(r => r.status === 'FAILURE').length;
    const errors = this.results.filter(r => r.status === 'ERROR').length;
    const total = this.results.length;
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 EDGE FUNCTIONS TEST REPORT');
    console.log('='.repeat(60));
    console.log(`Total Tests: ${total}`);
    console.log(`✅ Successful: ${successful}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`🚨 Errors: ${errors}`);
    console.log(`📈 Success Rate: ${((successful / total) * 100).toFixed(1)}%`);
    console.log(`⏱️ Total Duration: ${(totalDuration / 1000).toFixed(2)}s`);
    console.log('-'.repeat(60));
    
    // Group results by function
    const functionResults = {};
    this.results.forEach(result => {
      if (!functionResults[result.functionName]) {
        functionResults[result.functionName] = [];
      }
      functionResults[result.functionName].push(result);
    });
    
    // Print detailed results
    console.log('\n📋 DETAILED RESULTS BY FUNCTION:');
    Object.entries(functionResults).forEach(([functionName, results]) => {
      console.log(`\n🔧 ${functionName.toUpperCase()}:`);
      
      results.forEach(result => {
        const statusIcon = result.status === 'SUCCESS' ? '✅' : 
                          result.status === 'FAILURE' ? '❌' : 
                          result.status === 'ERROR' ? '🚨' : 'ℹ️';
        
        const responseTime = result.responseTime ? `${result.responseTime}ms` : 'N/A';
        const httpStatus = result.httpStatus ? `HTTP ${result.httpStatus}` : '';
        
        console.log(`  ${statusIcon} ${httpStatus} ${responseTime}`);
        
        if (result.error) {
          console.log(`    Error: ${result.error}`);
        }
        
        if (CONFIG.VERBOSE && result.responseData) {
          console.log(`    Response:`, JSON.stringify(result.responseData, null, 2));
        }
      });
    });
    
    // Performance analysis
    console.log('\n⚡ PERFORMANCE ANALYSIS:');
    const responseTimes = this.results
      .filter(r => r.responseTime && r.status === 'SUCCESS')
      .map(r => r.responseTime);
    
    if (responseTimes.length > 0) {
      const avgTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
      const maxTime = Math.max(...responseTimes);
      const minTime = Math.min(...responseTimes);
      
      console.log(`Average Response Time: ${avgTime.toFixed(0)}ms`);
      console.log(`Fastest Response: ${minTime}ms`);
      console.log(`Slowest Response: ${maxTime}ms`);
      
      const slowFunctions = this.results.filter(r => r.responseTime > 3000);
      if (slowFunctions.length > 0) {
        console.log(`\n⚠️  Slow Functions (>3s):`);
        slowFunctions.forEach(f => {
          console.log(`  - ${f.functionName}: ${f.responseTime}ms`);
        });
      }
    }
    
    // Recommendations
    console.log('\n💡 RECOMMENDATIONS:');
    const failureRate = ((failed + errors) / total) * 100;
    
    if (failureRate === 0) {
      console.log('✅ All edge functions are working correctly');
    } else if (failureRate < 20) {
      console.log('⚠️  Some functions have issues - monitor closely');
    } else {
      console.log('🚨 High failure rate - immediate attention required');
    }
    
    const avgResponseTime = responseTimes.length > 0 ? 
      responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length : 0;
    
    if (avgResponseTime > 2000) {
      console.log('🐌 Average response time is high - check function performance');
    }
    
    console.log('\n🎉 Edge Functions test completed!');
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  const tester = new EdgeFunctionTester();
  tester.runAllTests().catch(error => {
    console.error('❌ Test suite failed:', error);
    process.exit(1);
  });
}

module.exports = EdgeFunctionTester; 