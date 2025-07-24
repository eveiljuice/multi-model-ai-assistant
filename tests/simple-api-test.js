#!/usr/bin/env node

/**
 * Simple API Test - Basic connectivity check
 * Tests API endpoints without requiring full authentication
 */

const fetch = require('node-fetch');

// Configuration from project inspection
const CONFIG = {
  SUPABASE_URL: 'https://sgzlhcagtesjazvwskjw.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNnemxoY2FndGVzamF6dndza2p3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjAzNjkyMDAsImV4cCI6MjAzNTk0NTIwMH0.GX0vQJcXQ5H6xYhzMEoLNKgCJOSJNIJOAjOaKcCxLWg',
  
  // API endpoints to test
  ENDPOINTS: {
    'Supabase Health': '/rest/v1/',
    'AI Proxy': '/functions/v1/ai-proxy',
    'Stripe Checkout': '/functions/v1/stripe-checkout',
    'Telegram Notify': '/functions/v1/telegram-notify',
    'Credit Meter': '/functions/v1/credit-meter',
    'Rollover Cron': '/functions/v1/rollover-cron',
    'Webhook Handler': '/functions/v1/webhook-handler'
  }
};

class SimpleAPITester {
  constructor() {
    this.results = [];
    this.startTime = Date.now();
  }

  log(message, level = 'INFO') {
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
    const prefix = level === 'ERROR' ? '❌' : level === 'SUCCESS' ? '✅' : level === 'WARN' ? '⚠️' : 'ℹ️';
    console.log(`[${timestamp}] ${prefix} ${message}`);
  }

  async testEndpoint(name, endpoint, method = 'OPTIONS') {
    this.log(`Testing ${name}...`);
    
    const startTime = Date.now();
    const url = `${CONFIG.SUPABASE_URL}${endpoint}`;
    
    try {
      const headers = {
        'Content-Type': 'application/json'
      };
      
      // Add auth header for REST API
      if (endpoint.includes('/rest/')) {
        headers['Authorization'] = `Bearer ${CONFIG.SUPABASE_ANON_KEY}`;
        headers['apikey'] = CONFIG.SUPABASE_ANON_KEY;
      }
      
      const response = await fetch(url, {
        method,
        headers,
        timeout: 10000
      });
      
      const responseTime = Date.now() - startTime;
      
      const result = {
        name,
        url,
        method,
        status: response.status,
        statusText: response.statusText,
        responseTime,
        headers: Object.fromEntries(response.headers.entries()),
        success: response.status < 500, // 4xx is expected for unauthorized, 5xx is server error
        available: response.status !== 404
      };
      
      this.results.push(result);
      
      if (result.available) {
        this.log(`${name} - Available (${response.status}) - ${responseTime}ms`, 'SUCCESS');
      } else {
        this.log(`${name} - Not Found (${response.status}) - ${responseTime}ms`, 'ERROR');
      }
      
      return result;
      
    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      const result = {
        name,
        url,
        method,
        status: 0,
        statusText: 'Network Error',
        responseTime,
        error: error.message,
        success: false,
        available: false
      };
      
      this.results.push(result);
      this.log(`${name} - Error: ${error.message} - ${responseTime}ms`, 'ERROR');
      
      return result;
    }
  }

  async testSupabaseHealth() {
    this.log('\n🔍 Testing Supabase Database Health...');
    
    try {
      const response = await fetch(`${CONFIG.SUPABASE_URL}/rest/v1/`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${CONFIG.SUPABASE_ANON_KEY}`,
          'apikey': CONFIG.SUPABASE_ANON_KEY,
          'Content-Type': 'application/json'
        }
      });
      
      const result = {
        name: 'Supabase Database',
        status: response.status,
        available: response.status !== 404,
        authenticated: response.status !== 401,
        responseTime: Date.now() - this.startTime
      };
      
      this.results.push(result);
      
      if (result.available) {
        this.log('Supabase Database - Available', 'SUCCESS');
      } else {
        this.log('Supabase Database - Not Available', 'ERROR');
      }
      
      return result;
      
    } catch (error) {
      this.log(`Supabase Database - Error: ${error.message}`, 'ERROR');
      return { name: 'Supabase Database', available: false, error: error.message };
    }
  }

  async testTelegramBot() {
    this.log('\n📱 Testing Telegram Bot...');
    
    // Test Telegram Bot API directly (public endpoint)
    const BOT_TOKEN = '7788182965:AAEiUmRg4l_HvaV3honhiVZluu_gFadOcrA';
    
    try {
      const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getMe`, {
        method: 'GET',
        timeout: 5000
      });
      
      const data = await response.json();
      
      const result = {
        name: 'Telegram Bot',
        status: response.status,
        available: response.ok,
        botInfo: data.result,
        responseTime: Date.now() - this.startTime
      };
      
      this.results.push(result);
      
      if (result.available) {
        this.log(`Telegram Bot - Available (${data.result?.username || 'Unknown'})`, 'SUCCESS');
      } else {
        this.log('Telegram Bot - Not Available', 'ERROR');
      }
      
      return result;
      
    } catch (error) {
      this.log(`Telegram Bot - Error: ${error.message}`, 'ERROR');
      return { name: 'Telegram Bot', available: false, error: error.message };
    }
  }

  async testStripeWebhook() {
    this.log('\n💳 Testing Stripe Webhook Endpoint...');
    
    // Test webhook endpoint with invalid signature (should fail with 400, not 404)
    try {
      const response = await fetch(`${CONFIG.SUPABASE_URL}/functions/v1/stripe-webhook`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'stripe-signature': 'invalid_signature'
        },
        body: JSON.stringify({ test: 'data' })
      });
      
      const result = {
        name: 'Stripe Webhook',
        status: response.status,
        available: response.status !== 404,
        correctBehavior: response.status === 400, // Should reject invalid signature
        responseTime: Date.now() - this.startTime
      };
      
      this.results.push(result);
      
      if (result.available) {
        if (result.correctBehavior) {
          this.log('Stripe Webhook - Available and working correctly (rejects invalid signature)', 'SUCCESS');
        } else {
          this.log(`Stripe Webhook - Available but unexpected response (${response.status})`, 'WARN');
        }
      } else {
        this.log('Stripe Webhook - Not Available', 'ERROR');
      }
      
      return result;
      
    } catch (error) {
      this.log(`Stripe Webhook - Error: ${error.message}`, 'ERROR');
      return { name: 'Stripe Webhook', available: false, error: error.message };
    }
  }

  async testAIProviderStatus() {
    this.log('\n🤖 Testing AI Provider Status...');
    
    // Test public API status endpoints
    const aiProviders = [
      { name: 'OpenAI', url: 'https://status.openai.com/api/v2/summary.json' },
      { name: 'Anthropic', url: 'https://status.anthropic.com/api/v2/summary.json' },
      { name: 'Google AI', url: 'https://status.cloud.google.com/incidents.json' }
    ];
    
    for (const provider of aiProviders) {
      try {
        const response = await fetch(provider.url, {
          method: 'GET',
          timeout: 5000
        });
        
        const result = {
          name: `${provider.name} Status`,
          status: response.status,
          available: response.ok,
          responseTime: Date.now() - this.startTime
        };
        
        this.results.push(result);
        
        if (result.available) {
          this.log(`${provider.name} - Service Status Available`, 'SUCCESS');
        } else {
          this.log(`${provider.name} - Service Status Not Available`, 'WARN');
        }
        
      } catch (error) {
        this.log(`${provider.name} - Status Check Error: ${error.message}`, 'WARN');
      }
    }
  }

  async runAllTests() {
    console.log('🚀 Starting Simple API Connectivity Test');
    console.log(`Target: ${CONFIG.SUPABASE_URL}`);
    console.log(`Testing ${Object.keys(CONFIG.ENDPOINTS).length} endpoints`);
    console.log('-'.repeat(60));
    
    // Test Supabase health
    await this.testSupabaseHealth();
    
    // Test all endpoints
    this.log('\n🔧 Testing Edge Function Endpoints...');
    for (const [name, endpoint] of Object.entries(CONFIG.ENDPOINTS)) {
      if (name !== 'Supabase Health') {
        await this.testEndpoint(name, endpoint);
      }
    }
    
    // Test external services
    await this.testTelegramBot();
    await this.testStripeWebhook();
    await this.testAIProviderStatus();
    
    // Generate report
    this.generateReport();
  }

  generateReport() {
    const endTime = Date.now();
    const totalDuration = endTime - this.startTime;
    
    const available = this.results.filter(r => r.available).length;
    const total = this.results.length;
    const availability = ((available / total) * 100).toFixed(1);
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 API CONNECTIVITY TEST REPORT');
    console.log('='.repeat(60));
    console.log(`Total Endpoints: ${total}`);
    console.log(`✅ Available: ${available}`);
    console.log(`❌ Unavailable: ${total - available}`);
    console.log(`📈 Availability: ${availability}%`);
    console.log(`⏱️ Total Duration: ${(totalDuration / 1000).toFixed(2)}s`);
    console.log('-'.repeat(60));
    
    // Categorize results
    const categories = {
      'Edge Functions': [],
      'External APIs': [],
      'Database': []
    };
    
    this.results.forEach(result => {
      if (result.name.includes('Supabase') && result.name.includes('Database')) {
        categories['Database'].push(result);
      } else if (result.name.includes('Telegram') || result.name.includes('Status')) {
        categories['External APIs'].push(result);
      } else {
        categories['Edge Functions'].push(result);
      }
    });
    
    // Print categorized results
    Object.entries(categories).forEach(([category, results]) => {
      if (results.length > 0) {
        console.log(`\n📋 ${category}:`);
        results.forEach(result => {
          const statusIcon = result.available ? '✅' : '❌';
          const responseTime = result.responseTime ? `${result.responseTime}ms` : 'N/A';
          const status = result.status ? `HTTP ${result.status}` : 'No Response';
          
          console.log(`  ${statusIcon} ${result.name} - ${status} - ${responseTime}`);
          
          if (result.error) {
            console.log(`    Error: ${result.error}`);
          }
        });
      }
    });
    
    // Recommendations
    console.log('\n💡 CONNECTIVITY ANALYSIS:');
    
    const edgeFunctions = this.results.filter(r => r.name.includes('Proxy') || r.name.includes('Checkout') || r.name.includes('Notify'));
    const availableEdgeFunctions = edgeFunctions.filter(r => r.available).length;
    
    console.log(`Edge Functions: ${availableEdgeFunctions}/${edgeFunctions.length} available`);
    
    const telegramResult = this.results.find(r => r.name.includes('Telegram Bot'));
    if (telegramResult?.available) {
      console.log('✅ Telegram Bot is operational');
    } else {
      console.log('❌ Telegram Bot may have issues');
    }
    
    const supabaseResult = this.results.find(r => r.name.includes('Supabase Database'));
    if (supabaseResult?.available) {
      console.log('✅ Supabase Database is accessible');
    } else {
      console.log('❌ Supabase Database connection issues');
    }
    
    if (availability >= 80) {
      console.log('\n🎉 Overall system connectivity is good!');
    } else {
      console.log('\n⚠️  Some services may be experiencing issues');
    }
    
    console.log('\n📝 Next Steps:');
    console.log('1. For detailed testing, set up authentication and run comprehensive tests');
    console.log('2. Check Supabase dashboard for Edge Function deployment status');
    console.log('3. Verify API keys are properly configured in Supabase secrets');
    console.log('4. Test actual API functionality with proper authentication');
  }
}

// Run tests
const tester = new SimpleAPITester();
tester.runAllTests().catch(error => {
  console.error('❌ Test suite failed:', error);
  process.exit(1);
});

module.exports = SimpleAPITester; 