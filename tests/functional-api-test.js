#!/usr/bin/env node

/**
 * Functional API Test Suite
 * Tests actual API functionality with real data and authentication
 */

const fetch = require('node-fetch');
const { createClient } = require('@supabase/supabase-js');

// Configuration
const CONFIG = {
  SUPABASE_URL: 'https://sgzlhcagtesjazvwskjw.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNnemxoY2FndGVzamF6dndza2p3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjAzNjkyMDAsImV4cCI6MjAzNTk0NTIwMH0.GX0vQJcXQ5H6xYhzMEoLNKgCJOSJNIJOAjOaKcCxLWg',
  TELEGRAM_BOT_TOKEN: '7788182965:AAEiUmRg4l_HvaV3honhiVZluu_gFadOcrA',
  TELEGRAM_CHAT_ID: '-1002604809855',
  
  // Stripe test price IDs from project
  STRIPE_PRICE_IDS: {
    'credit_100': 'price_1RiUvhAK7V4m73alSPDpllg2',
    'credit_500': 'price_1RiUxdAK7V4m73alz8Oad0YH',
    'credit_1500': 'price_1RiUyPAK7V4m73alBCuO8sYC',
    'subscription': 'price_1RiUt0AK7V4m73aluYckgD6P'
  }
};

class FunctionalAPITester {
  constructor() {
    this.supabase = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
    this.results = [];
    this.startTime = Date.now();
    this.authToken = null;
    this.testUser = null;
  }

  log(message, level = 'INFO') {
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
    const prefix = level === 'ERROR' ? '❌' : level === 'SUCCESS' ? '✅' : level === 'WARN' ? '⚠️' : 'ℹ️';
    console.log(`[${timestamp}] ${prefix} ${message}`);
  }

  addResult(testName, status, responseTime, details = {}) {
    this.results.push({
      testName,
      status,
      responseTime,
      timestamp: new Date().toISOString(),
      ...details
    });
  }

  async createTestUser() {
    this.log('Creating test user...');
    
    const testEmail = `test-${Date.now()}@example.com`;
    const testPassword = 'testpassword123';
    
    try {
      const { data, error } = await this.supabase.auth.signUp({
        email: testEmail,
        password: testPassword
      });
      
      if (error) {
        this.log(`User creation failed: ${error.message}`, 'ERROR');
        return false;
      }
      
      this.testUser = data.user;
      this.authToken = data.session?.access_token;
      
      this.log(`Test user created: ${testEmail}`, 'SUCCESS');
      return true;
      
    } catch (error) {
      this.log(`User creation error: ${error.message}`, 'ERROR');
      return false;
    }
  }

  async testTelegramNotification() {
    this.log('\n📱 Testing Telegram Notification Functionality...');
    
    const testData = {
      record: {
        id: 'functional-test-' + Date.now(),
        title: 'Functional Test Notification',
        description: 'This is a test notification from the functional API test suite',
        category: 'test',
        priority: 'medium',
        created_at: new Date().toISOString(),
        user_id: this.testUser?.id || 'test-user'
      }
    };
    
    const startTime = Date.now();
    
    try {
      const response = await fetch(`${CONFIG.SUPABASE_URL}/functions/v1/telegram-notify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testData)
      });
      
      const responseTime = Date.now() - startTime;
      const result = await response.json();
      
      if (response.ok && result.success) {
        this.log(`Telegram notification sent successfully - ${responseTime}ms`, 'SUCCESS');
        this.addResult('Telegram Notification', 'SUCCESS', responseTime, {
          messageLength: result.debug_info?.message_length,
          chatId: result.debug_info?.chat_id
        });
        return true;
      } else {
        this.log(`Telegram notification failed: ${result.error || 'Unknown error'}`, 'ERROR');
        this.addResult('Telegram Notification', 'FAILURE', responseTime, { error: result.error });
        return false;
      }
      
    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.log(`Telegram notification error: ${error.message}`, 'ERROR');
      this.addResult('Telegram Notification', 'ERROR', responseTime, { error: error.message });
      return false;
    }
  }

  async testStripeCheckout() {
    this.log('\n💳 Testing Stripe Checkout Functionality...');
    
    if (!this.authToken) {
      this.log('Skipping Stripe test - authentication required', 'WARN');
      return false;
    }
    
    const results = {};
    
    for (const [productName, priceId] of Object.entries(CONFIG.STRIPE_PRICE_IDS)) {
      this.log(`Testing Stripe checkout for ${productName}...`);
      
      const mode = productName === 'subscription' ? 'subscription' : 'payment';
      const startTime = Date.now();
      
      try {
        const response = await fetch(`${CONFIG.SUPABASE_URL}/functions/v1/stripe-checkout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.authToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            price_id: priceId,
            mode: mode,
            success_url: 'https://example.com/success',
            cancel_url: 'https://example.com/cancel'
          })
        });
        
        const responseTime = Date.now() - startTime;
        const result = await response.json();
        
        if (response.ok && result.sessionId && result.url) {
          this.log(`Stripe checkout for ${productName} - SUCCESS - ${responseTime}ms`, 'SUCCESS');
          this.addResult(`Stripe Checkout (${productName})`, 'SUCCESS', responseTime, {
            sessionId: result.sessionId,
            url: result.url,
            priceId: priceId,
            mode: mode
          });
          results[productName] = true;
        } else {
          this.log(`Stripe checkout for ${productName} - FAILURE: ${result.error || 'Invalid response'}`, 'ERROR');
          this.addResult(`Stripe Checkout (${productName})`, 'FAILURE', responseTime, { error: result.error });
          results[productName] = false;
        }
        
      } catch (error) {
        const responseTime = Date.now() - startTime;
        this.log(`Stripe checkout for ${productName} - ERROR: ${error.message}`, 'ERROR');
        this.addResult(`Stripe Checkout (${productName})`, 'ERROR', responseTime, { error: error.message });
        results[productName] = false;
      }
    }
    
    return results;
  }

  async testAIProxy() {
    this.log('\n🤖 Testing AI Proxy Functionality...');
    
    if (!this.authToken) {
      this.log('Skipping AI test - authentication required', 'WARN');
      return false;
    }
    
    const aiProviders = [
      { name: 'OpenAI', provider: 'openai', model: 'gpt-4.1-turbo' },
      { name: 'Anthropic', provider: 'anthropic', model: 'claude-sonnet-4-20250514' },
      { name: 'Google Gemini', provider: 'gemini', model: 'gemini-2.0-flash' }
    ];
    
    const results = {};
    
    for (const aiProvider of aiProviders) {
      this.log(`Testing AI provider: ${aiProvider.name}...`);
      
      const startTime = Date.now();
      
      try {
        const response = await fetch(`${CONFIG.SUPABASE_URL}/functions/v1/ai-proxy`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.authToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            provider: aiProvider.provider,
            model: aiProvider.model,
            messages: [
              { role: 'user', content: 'Respond with exactly "API_TEST_SUCCESS" and nothing else.' }
            ],
            temperature: 0.1,
            max_tokens: 50
          })
        });
        
        const responseTime = Date.now() - startTime;
        
        if (response.ok) {
          const result = await response.json();
          
          if (result.response && result.tokens_used) {
            this.log(`AI provider ${aiProvider.name} - SUCCESS - ${responseTime}ms`, 'SUCCESS');
            this.addResult(`AI Proxy (${aiProvider.name})`, 'SUCCESS', responseTime, {
              tokensUsed: result.tokens_used,
              provider: aiProvider.provider,
              model: aiProvider.model
            });
            results[aiProvider.name] = true;
          } else {
            this.log(`AI provider ${aiProvider.name} - FAILURE: Invalid response structure`, 'ERROR');
            this.addResult(`AI Proxy (${aiProvider.name})`, 'FAILURE', responseTime, { error: 'Invalid response structure' });
            results[aiProvider.name] = false;
          }
        } else {
          const errorResult = await response.json();
          this.log(`AI provider ${aiProvider.name} - FAILURE: ${errorResult.error || response.statusText}`, 'ERROR');
          this.addResult(`AI Proxy (${aiProvider.name})`, 'FAILURE', responseTime, { error: errorResult.error });
          results[aiProvider.name] = false;
        }
        
      } catch (error) {
        const responseTime = Date.now() - startTime;
        this.log(`AI provider ${aiProvider.name} - ERROR: ${error.message}`, 'ERROR');
        this.addResult(`AI Proxy (${aiProvider.name})`, 'ERROR', responseTime, { error: error.message });
        results[aiProvider.name] = false;
      }
    }
    
    return results;
  }

  async testCreditSystem() {
    this.log('\n💰 Testing Credit System Functionality...');
    
    if (!this.authToken) {
      this.log('Skipping Credit test - authentication required', 'WARN');
      return false;
    }
    
    const startTime = Date.now();
    
    try {
      const response = await fetch(`${CONFIG.SUPABASE_URL}/functions/v1/credit-meter`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'check_balance'
        })
      });
      
      const responseTime = Date.now() - startTime;
      const result = await response.json();
      
      if (response.ok) {
        this.log(`Credit system check - SUCCESS - ${responseTime}ms`, 'SUCCESS');
        this.addResult('Credit System', 'SUCCESS', responseTime, {
          balanceData: result
        });
        return true;
      } else {
        this.log(`Credit system check - FAILURE: ${result.error || 'Unknown error'}`, 'ERROR');
        this.addResult('Credit System', 'FAILURE', responseTime, { error: result.error });
        return false;
      }
      
    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.log(`Credit system check - ERROR: ${error.message}`, 'ERROR');
      this.addResult('Credit System', 'ERROR', responseTime, { error: error.message });
      return false;
    }
  }

  async testDatabaseOperations() {
    this.log('\n💾 Testing Database Operations...');
    
    const tests = [
      { name: 'Users Table', table: 'users', operation: 'count' },
      { name: 'Credit Wallets', table: 'credit_wallets', operation: 'count' },
      { name: 'Agent Pricing', table: 'agent_pricing', operation: 'count' }
    ];
    
    const results = {};
    
    for (const test of tests) {
      this.log(`Testing ${test.name}...`);
      
      const startTime = Date.now();
      
      try {
        const { data, error, count } = await this.supabase
          .from(test.table)
          .select('*', { count: 'exact', head: true });
        
        const responseTime = Date.now() - startTime;
        
        if (error) {
          this.log(`Database ${test.name} - FAILURE: ${error.message}`, 'ERROR');
          this.addResult(`Database (${test.name})`, 'FAILURE', responseTime, { error: error.message });
          results[test.name] = false;
        } else {
          this.log(`Database ${test.name} - SUCCESS (${count} records) - ${responseTime}ms`, 'SUCCESS');
          this.addResult(`Database (${test.name})`, 'SUCCESS', responseTime, { recordCount: count });
          results[test.name] = true;
        }
        
      } catch (error) {
        const responseTime = Date.now() - startTime;
        this.log(`Database ${test.name} - ERROR: ${error.message}`, 'ERROR');
        this.addResult(`Database (${test.name})`, 'ERROR', responseTime, { error: error.message });
        results[test.name] = false;
      }
    }
    
    return results;
  }

  async testPerformance() {
    this.log('\n⚡ Testing Performance Metrics...');
    
    const performanceTests = [
      { name: 'Telegram Notify', endpoint: '/functions/v1/telegram-notify', method: 'POST' },
      { name: 'Stripe Checkout', endpoint: '/functions/v1/stripe-checkout', method: 'POST' },
      { name: 'Database Query', endpoint: '/rest/v1/users', method: 'GET' }
    ];
    
    const results = {};
    
    for (const test of performanceTests) {
      this.log(`Performance test: ${test.name}...`);
      
      const times = [];
      const iterations = 3;
      
      for (let i = 0; i < iterations; i++) {
        const startTime = Date.now();
        
        try {
          const headers = {
            'Content-Type': 'application/json'
          };
          
          if (test.name === 'Database Query') {
            headers['Authorization'] = `Bearer ${CONFIG.SUPABASE_ANON_KEY}`;
            headers['apikey'] = CONFIG.SUPABASE_ANON_KEY;
          } else if (this.authToken) {
            headers['Authorization'] = `Bearer ${this.authToken}`;
          }
          
          const body = test.method === 'POST' ? JSON.stringify({
            test: true,
            iteration: i + 1
          }) : undefined;
          
          const response = await fetch(`${CONFIG.SUPABASE_URL}${test.endpoint}`, {
            method: test.method,
            headers,
            body
          });
          
          const responseTime = Date.now() - startTime;
          times.push(responseTime);
          
        } catch (error) {
          times.push(10000); // Timeout value
        }
      }
      
      const avgTime = times.reduce((sum, time) => sum + time, 0) / times.length;
      const minTime = Math.min(...times);
      const maxTime = Math.max(...times);
      
      this.log(`${test.name} - Avg: ${avgTime.toFixed(0)}ms, Min: ${minTime}ms, Max: ${maxTime}ms`, 'SUCCESS');
      this.addResult(`Performance (${test.name})`, 'SUCCESS', avgTime, {
        avgTime: avgTime.toFixed(0),
        minTime,
        maxTime,
        iterations
      });
      
      results[test.name] = { avgTime, minTime, maxTime };
    }
    
    return results;
  }

  async runAllTests() {
    console.log('🚀 Starting Functional API Test Suite');
    console.log(`Environment: ${CONFIG.SUPABASE_URL}`);
    console.log(`Test User: Will be created dynamically`);
    console.log('-'.repeat(60));
    
    // Create test user
    const userCreated = await this.createTestUser();
    
    // Run all tests
    const testResults = {
      telegram: await this.testTelegramNotification(),
      stripe: await this.testStripeCheckout(),
      ai: await this.testAIProxy(),
      credits: await this.testCreditSystem(),
      database: await this.testDatabaseOperations(),
      performance: await this.testPerformance()
    };
    
    // Generate final report
    this.generateReport(testResults);
  }

  generateReport(testResults) {
    const endTime = Date.now();
    const totalDuration = endTime - this.startTime;
    
    const successful = this.results.filter(r => r.status === 'SUCCESS').length;
    const failed = this.results.filter(r => r.status === 'FAILURE').length;
    const errors = this.results.filter(r => r.status === 'ERROR').length;
    const total = this.results.length;
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 FUNCTIONAL API TEST REPORT');
    console.log('='.repeat(60));
    console.log(`Total Tests: ${total}`);
    console.log(`✅ Successful: ${successful}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`🚨 Errors: ${errors}`);
    console.log(`📈 Success Rate: ${((successful / total) * 100).toFixed(1)}%`);
    console.log(`⏱️ Total Duration: ${(totalDuration / 1000).toFixed(2)}s`);
    console.log('-'.repeat(60));
    
    // Service summary
    console.log('\n📋 SERVICE SUMMARY:');
    
    const services = {
      'Telegram': this.results.filter(r => r.testName.includes('Telegram')),
      'Stripe': this.results.filter(r => r.testName.includes('Stripe')),
      'AI Providers': this.results.filter(r => r.testName.includes('AI Proxy')),
      'Credit System': this.results.filter(r => r.testName.includes('Credit')),
      'Database': this.results.filter(r => r.testName.includes('Database')),
      'Performance': this.results.filter(r => r.testName.includes('Performance'))
    };
    
    Object.entries(services).forEach(([service, results]) => {
      if (results.length > 0) {
        const serviceSuccess = results.filter(r => r.status === 'SUCCESS').length;
        const serviceTotal = results.length;
        const serviceRate = ((serviceSuccess / serviceTotal) * 100).toFixed(1);
        
        console.log(`\n🔧 ${service}:`);
        console.log(`  Success Rate: ${serviceRate}% (${serviceSuccess}/${serviceTotal})`);
        
        results.forEach(result => {
          const statusIcon = result.status === 'SUCCESS' ? '✅' : result.status === 'FAILURE' ? '❌' : '🚨';
          console.log(`  ${statusIcon} ${result.testName} - ${result.responseTime.toFixed(0)}ms`);
        });
      }
    });
    
    // Performance analysis
    console.log('\n⚡ PERFORMANCE ANALYSIS:');
    const performanceResults = this.results.filter(r => r.testName.includes('Performance'));
    
    if (performanceResults.length > 0) {
      const avgResponseTime = performanceResults.reduce((sum, r) => sum + r.responseTime, 0) / performanceResults.length;
      console.log(`Average Response Time: ${avgResponseTime.toFixed(0)}ms`);
      
      const slowTests = performanceResults.filter(r => r.responseTime > 2000);
      if (slowTests.length > 0) {
        console.log('⚠️  Slow endpoints (>2s):');
        slowTests.forEach(test => {
          console.log(`  - ${test.testName}: ${test.responseTime.toFixed(0)}ms`);
        });
      }
    }
    
    // Recommendations
    console.log('\n💡 RECOMMENDATIONS:');
    
    const overallSuccessRate = (successful / total) * 100;
    
    if (overallSuccessRate >= 90) {
      console.log('✅ Excellent! All major systems are functioning properly');
    } else if (overallSuccessRate >= 70) {
      console.log('⚠️  Good performance with some minor issues to address');
    } else {
      console.log('🚨 Multiple systems need attention - investigate immediately');
    }
    
    // Specific recommendations
    const failedServices = [];
    Object.entries(services).forEach(([service, results]) => {
      const serviceSuccess = results.filter(r => r.status === 'SUCCESS').length;
      if (serviceSuccess < results.length) {
        failedServices.push(service);
      }
    });
    
    if (failedServices.length > 0) {
      console.log(`\n🔧 Services needing attention: ${failedServices.join(', ')}`);
    }
    
    console.log('\n📋 NEXT STEPS:');
    console.log('1. Review failed tests and check API configurations');
    console.log('2. Verify all API keys are properly set in Supabase secrets');
    console.log('3. Check Edge Function logs for detailed error information');
    console.log('4. Run production tests with real user scenarios');
    
    console.log('\n🎉 Functional API testing completed!');
  }
}

// Run the tests
const tester = new FunctionalAPITester();
tester.runAllTests().catch(error => {
  console.error('❌ Test suite failed:', error);
  process.exit(1);
});

module.exports = FunctionalAPITester; 