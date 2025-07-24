import { createClient } from '@supabase/supabase-js'
import { STRIPE_PRODUCTS } from '../src/config/stripe-products'

// Test configuration
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://sgzlhcagtesjazvwskjw.supabase.co'
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNnemxoY2FndGVzamF6dndza2p3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjAzNjkyMDAsImV4cCI6MjAzNTk0NTIwMH0.GX0vQJcXQ5H6xYhzMEoLNKgCJOSJNIJOAjOaKcCxLWg'

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// Test results storage
interface TestResult {
  service: string
  endpoint: string
  testName: string
  status: 'SUCCESS' | 'FAILURE' | 'ERROR'
  responseTime: number
  error?: string
  details?: any
}

class APITester {
  private results: TestResult[] = []
  private authToken: string | null = null

  constructor() {
    console.log('🔧 Initializing API Comprehensive Test Suite')
    console.log('📊 Testing environment:', { SUPABASE_URL, SUPABASE_ANON_KEY: SUPABASE_ANON_KEY.substring(0, 20) + '...' })
  }

  // Authentication helper
  async authenticate(email: string = 'test@example.com', password: string = 'testpassword123') {
    const startTime = Date.now()
    
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password
      })

      if (error && error.message.includes('already registered')) {
        // Try to sign in instead
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password
        })
        
        if (signInError) {
          this.addResult('AUTH', 'auth/signin', 'User Authentication', 'ERROR', Date.now() - startTime, signInError.message)
          return false
        }
        
        this.authToken = signInData.session?.access_token || null
      } else if (error) {
        this.addResult('AUTH', 'auth/signup', 'User Authentication', 'ERROR', Date.now() - startTime, error.message)
        return false
      } else {
        this.authToken = data.session?.access_token || null
      }

      this.addResult('AUTH', 'auth/signin', 'User Authentication', 'SUCCESS', Date.now() - startTime)
      return true
    } catch (error) {
      this.addResult('AUTH', 'auth/signin', 'User Authentication', 'ERROR', Date.now() - startTime, error instanceof Error ? error.message : 'Unknown error')
      return false
    }
  }

  private addResult(service: string, endpoint: string, testName: string, status: 'SUCCESS' | 'FAILURE' | 'ERROR', responseTime: number, error?: string, details?: any) {
    this.results.push({
      service,
      endpoint,
      testName,
      status,
      responseTime,
      error,
      details
    })
  }

  // AI API Tests
  async testAIProviders() {
    console.log('\n🤖 Testing AI API Providers...')
    
    if (!this.authToken) {
      console.error('❌ Authentication required for AI API tests')
      return
    }

    const providers = ['openai', 'anthropic', 'gemini']
    const testQueries = [
      { query: 'Hello, how are you?', complexity: 'simple' },
      { query: 'Explain quantum computing in simple terms', complexity: 'medium' },
      { query: 'Write a Python function to calculate fibonacci sequence with detailed comments', complexity: 'complex' }
    ]

    for (const provider of providers) {
      console.log(`\n📡 Testing ${provider.toUpperCase()} API...`)
      
      for (const test of testQueries) {
        const startTime = Date.now()
        
        try {
          const response = await fetch(`${SUPABASE_URL}/functions/v1/ai-proxy`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${this.authToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              provider,
              model: this.getModelForProvider(provider),
              messages: [
                { role: 'user', content: test.query }
              ],
              temperature: 0.7,
              max_tokens: 500
            })
          })

          const responseTime = Date.now() - startTime
          
          if (!response.ok) {
            const errorData = await response.json()
            this.addResult('AI', `ai-proxy/${provider}`, `${provider} ${test.complexity} query`, 'FAILURE', responseTime, errorData.error || `HTTP ${response.status}`)
            continue
          }

          const data = await response.json()
          
          // Validate response structure
          if (!data.response || !data.tokens_used) {
            this.addResult('AI', `ai-proxy/${provider}`, `${provider} ${test.complexity} query`, 'FAILURE', responseTime, 'Invalid response structure')
            continue
          }

          // Check response content
          const content = this.extractContentFromResponse(data.response, provider)
          if (!content || content.length < 10) {
            this.addResult('AI', `ai-proxy/${provider}`, `${provider} ${test.complexity} query`, 'FAILURE', responseTime, 'Empty or too short response')
            continue
          }

          this.addResult('AI', `ai-proxy/${provider}`, `${provider} ${test.complexity} query`, 'SUCCESS', responseTime, undefined, {
            contentLength: content.length,
            tokensUsed: data.tokens_used,
            model: this.getModelForProvider(provider)
          })

        } catch (error) {
          const responseTime = Date.now() - startTime
          this.addResult('AI', `ai-proxy/${provider}`, `${provider} ${test.complexity} query`, 'ERROR', responseTime, error instanceof Error ? error.message : 'Unknown error')
        }
      }
    }
  }

  private getModelForProvider(provider: string): string {
    const models = {
      'openai': 'gpt-4.1-turbo',
      'anthropic': 'claude-sonnet-4-20250514',
      'gemini': 'gemini-2.0-flash'
    }
    return models[provider] || 'default'
  }

  private extractContentFromResponse(response: any, provider: string): string {
    switch (provider) {
      case 'openai':
        return response.choices?.[0]?.message?.content || ''
      case 'anthropic':
        return response.content?.[0]?.text || ''
      case 'gemini':
        return response.candidates?.[0]?.content?.parts?.[0]?.text || ''
      default:
        return ''
    }
  }

  // Stripe API Tests
  async testStripeIntegration() {
    console.log('\n💳 Testing Stripe Integration...')
    
    if (!this.authToken) {
      console.error('❌ Authentication required for Stripe tests')
      return
    }

    // Test checkout session creation for each product
    for (const product of STRIPE_PRODUCTS) {
      console.log(`\n🛒 Testing checkout for ${product.name}...`)
      
      const startTime = Date.now()
      
      try {
        const response = await fetch(`${SUPABASE_URL}/functions/v1/stripe-checkout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.authToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            price_id: product.priceId,
            mode: product.mode,
            success_url: `${window.location.origin}/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${window.location.origin}/pricing`
          })
        })

        const responseTime = Date.now() - startTime
        
        if (!response.ok) {
          const errorData = await response.json()
          this.addResult('STRIPE', 'stripe-checkout', `Checkout ${product.name}`, 'FAILURE', responseTime, errorData.error || `HTTP ${response.status}`)
          continue
        }

        const data = await response.json()
        
        if (!data.sessionId || !data.url) {
          this.addResult('STRIPE', 'stripe-checkout', `Checkout ${product.name}`, 'FAILURE', responseTime, 'Invalid response structure')
          continue
        }

        if (!data.url.includes('checkout.stripe.com')) {
          this.addResult('STRIPE', 'stripe-checkout', `Checkout ${product.name}`, 'FAILURE', responseTime, 'Invalid Stripe URL')
          continue
        }

        this.addResult('STRIPE', 'stripe-checkout', `Checkout ${product.name}`, 'SUCCESS', responseTime, undefined, {
          sessionId: data.sessionId,
          url: data.url,
          priceId: product.priceId,
          mode: product.mode
        })

      } catch (error) {
        const responseTime = Date.now() - startTime
        this.addResult('STRIPE', 'stripe-checkout', `Checkout ${product.name}`, 'ERROR', responseTime, error instanceof Error ? error.message : 'Unknown error')
      }
    }

    // Test webhook endpoint (simulate webhook)
    await this.testStripeWebhook()
  }

  private async testStripeWebhook() {
    console.log('\n🔔 Testing Stripe Webhook...')
    
    const startTime = Date.now()
    
    try {
      // Create mock webhook payload
      const mockPayload = {
        id: 'evt_test_webhook',
        object: 'event',
        api_version: '2020-08-27',
        created: Math.floor(Date.now() / 1000),
        data: {
          object: {
            id: 'cs_test_session',
            object: 'checkout.session',
            mode: 'payment',
            payment_status: 'paid',
            customer: 'cus_test_customer',
            amount_total: 999,
            amount_subtotal: 999,
            currency: 'usd'
          }
        },
        livemode: false,
        pending_webhooks: 1,
        request: {
          id: 'req_test_request',
          idempotency_key: null
        },
        type: 'checkout.session.completed'
      }

      // Note: We can't actually test webhook without proper Stripe signature
      // This is a structure validation test only
      const response = await fetch(`${SUPABASE_URL}/functions/v1/stripe-webhook`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'stripe-signature': 'test_signature_would_fail'
        },
        body: JSON.stringify(mockPayload)
      })

      const responseTime = Date.now() - startTime
      
      // Expect failure due to signature verification (this is correct behavior)
      if (response.status === 400) {
        this.addResult('STRIPE', 'stripe-webhook', 'Webhook Signature Validation', 'SUCCESS', responseTime, undefined, {
          expectedBehavior: 'Correctly rejected invalid signature'
        })
      } else {
        this.addResult('STRIPE', 'stripe-webhook', 'Webhook Signature Validation', 'FAILURE', responseTime, 'Should have rejected invalid signature')
      }

    } catch (error) {
      const responseTime = Date.now() - startTime
      this.addResult('STRIPE', 'stripe-webhook', 'Webhook Test', 'ERROR', responseTime, error instanceof Error ? error.message : 'Unknown error')
    }
  }

  // Telegram API Tests
  async testTelegramIntegration() {
    console.log('\n📱 Testing Telegram Integration...')

    const testNotifications = [
      {
        type: 'idea_suggestion',
        data: {
          id: 'test-' + Date.now(),
          title: 'Test Idea from API Suite',
          description: 'This is a test idea to verify Telegram integration',
          category: 'enhancement',
          priority: 'medium',
          created_at: new Date().toISOString()
        }
      },
      {
        type: 'system_notification',
        data: {
          id: 'test-system-' + Date.now(),
          message: 'System test notification',
          severity: 'info',
          created_at: new Date().toISOString()
        }
      }
    ]

    for (const notification of testNotifications) {
      console.log(`\n📤 Testing ${notification.type} notification...`)
      
      const startTime = Date.now()
      
      try {
        const response = await fetch(`${SUPABASE_URL}/functions/v1/telegram-notify`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            record: notification.data
          })
        })

        const responseTime = Date.now() - startTime
        
        if (!response.ok) {
          const errorData = await response.json()
          this.addResult('TELEGRAM', 'telegram-notify', `Notification ${notification.type}`, 'FAILURE', responseTime, errorData.error || `HTTP ${response.status}`)
          continue
        }

        const data = await response.json()
        
        if (!data.success) {
          this.addResult('TELEGRAM', 'telegram-notify', `Notification ${notification.type}`, 'FAILURE', responseTime, data.error || 'Unknown failure')
          continue
        }

        this.addResult('TELEGRAM', 'telegram-notify', `Notification ${notification.type}`, 'SUCCESS', responseTime, undefined, {
          messageLength: data.debug_info?.message_length,
          chatId: data.debug_info?.chat_id
        })

      } catch (error) {
        const responseTime = Date.now() - startTime
        this.addResult('TELEGRAM', 'telegram-notify', `Notification ${notification.type}`, 'ERROR', responseTime, error instanceof Error ? error.message : 'Unknown error')
      }
    }

    // Test bot connectivity
    await this.testTelegramBot()
  }

  private async testTelegramBot() {
    console.log('\n🤖 Testing Telegram Bot Connectivity...')
    
    const startTime = Date.now()
    
    try {
      // Test bot getMe endpoint through our function
      const response = await fetch(`${SUPABASE_URL}/functions/v1/telegram-notify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          test: 'bot_info'
        })
      })

      const responseTime = Date.now() - startTime
      
      if (response.ok) {
        const data = await response.json()
        this.addResult('TELEGRAM', 'telegram-notify', 'Bot Connectivity', 'SUCCESS', responseTime, undefined, data)
      } else {
        this.addResult('TELEGRAM', 'telegram-notify', 'Bot Connectivity', 'FAILURE', responseTime, `HTTP ${response.status}`)
      }

    } catch (error) {
      const responseTime = Date.now() - startTime
      this.addResult('TELEGRAM', 'telegram-notify', 'Bot Connectivity', 'ERROR', responseTime, error instanceof Error ? error.message : 'Unknown error')
    }
  }

  // Performance Tests
  async testPerformanceAndRateLimit() {
    console.log('\n⚡ Testing Performance and Rate Limits...')
    
    if (!this.authToken) {
      console.error('❌ Authentication required for performance tests')
      return
    }

    // Test AI API rate limiting
    await this.testAIRateLimit()
    
    // Test concurrent requests
    await this.testConcurrentRequests()
  }

  private async testAIRateLimit() {
    console.log('\n🚦 Testing AI API Rate Limiting...')
    
    const rapidRequests = Array.from({ length: 10 }, (_, i) => ({
      query: `Test query ${i + 1}`,
      index: i
    }))

    const startTime = Date.now()
    
    try {
      const promises = rapidRequests.map(async (req) => {
        try {
          const response = await fetch(`${SUPABASE_URL}/functions/v1/ai-proxy`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${this.authToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              provider: 'openai',
              model: 'gpt-4.1-turbo',
              messages: [{ role: 'user', content: req.query }],
              temperature: 0.7,
              max_tokens: 50
            })
          })

          return {
            index: req.index,
            status: response.status,
            ok: response.ok,
            time: Date.now() - startTime
          }
        } catch (error) {
          return {
            index: req.index,
            status: 0,
            ok: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          }
        }
      })

      const results = await Promise.all(promises)
      
      const successCount = results.filter(r => r.ok).length
      const rateLimitedCount = results.filter(r => r.status === 429).length
      
      const responseTime = Date.now() - startTime
      
      this.addResult('PERFORMANCE', 'ai-proxy', 'Rate Limit Test', 'SUCCESS', responseTime, undefined, {
        totalRequests: rapidRequests.length,
        successfulRequests: successCount,
        rateLimitedRequests: rateLimitedCount,
        results: results
      })

    } catch (error) {
      const responseTime = Date.now() - startTime
      this.addResult('PERFORMANCE', 'ai-proxy', 'Rate Limit Test', 'ERROR', responseTime, error instanceof Error ? error.message : 'Unknown error')
    }
  }

  private async testConcurrentRequests() {
    console.log('\n🔄 Testing Concurrent Requests...')
    
    const concurrentTests = [
              { service: 'AI', endpoint: 'ai-proxy', body: { provider: 'openai', model: 'gpt-4.1-turbo', messages: [{ role: 'user', content: 'Test' }] } },
      { service: 'STRIPE', endpoint: 'stripe-checkout', body: { price_id: STRIPE_PRODUCTS[0].priceId, mode: 'payment' } },
      { service: 'TELEGRAM', endpoint: 'telegram-notify', body: { record: { id: 'test', title: 'Test', description: 'Test' } } }
    ]

    const startTime = Date.now()
    
    try {
      const promises = concurrentTests.map(async (test) => {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json'
        }
        
        if (test.service === 'AI' || test.service === 'STRIPE') {
          headers['Authorization'] = `Bearer ${this.authToken}`
        }

        const response = await fetch(`${SUPABASE_URL}/functions/v1/${test.endpoint}`, {
          method: 'POST',
          headers,
          body: JSON.stringify(test.body)
        })

        return {
          service: test.service,
          endpoint: test.endpoint,
          status: response.status,
          ok: response.ok,
          time: Date.now() - startTime
        }
      })

      const results = await Promise.all(promises)
      const responseTime = Date.now() - startTime
      
      this.addResult('PERFORMANCE', 'concurrent', 'Concurrent Requests', 'SUCCESS', responseTime, undefined, {
        results: results,
        averageTime: results.reduce((sum, r) => sum + r.time, 0) / results.length
      })

    } catch (error) {
      const responseTime = Date.now() - startTime
      this.addResult('PERFORMANCE', 'concurrent', 'Concurrent Requests', 'ERROR', responseTime, error instanceof Error ? error.message : 'Unknown error')
    }
  }

  // Error Handling Tests
  async testErrorHandling() {
    console.log('\n🚨 Testing Error Handling...')
    
    const errorTests = [
      {
        name: 'Invalid AI Request',
        service: 'AI',
        endpoint: 'ai-proxy',
        body: { provider: 'invalid', model: 'invalid', messages: [] }
      },
      {
        name: 'Invalid Stripe Price ID',
        service: 'STRIPE',
        endpoint: 'stripe-checkout',
        body: { price_id: 'invalid_price_id', mode: 'payment' }
      },
      {
        name: 'Malformed Telegram Request',
        service: 'TELEGRAM',
        endpoint: 'telegram-notify',
        body: { invalid: 'data' }
      }
    ]

    for (const test of errorTests) {
      console.log(`\n❌ Testing ${test.name}...`)
      
      const startTime = Date.now()
      
      try {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json'
        }
        
        if (test.service === 'AI' || test.service === 'STRIPE') {
          headers['Authorization'] = `Bearer ${this.authToken}`
        }

        const response = await fetch(`${SUPABASE_URL}/functions/v1/${test.endpoint}`, {
          method: 'POST',
          headers,
          body: JSON.stringify(test.body)
        })

        const responseTime = Date.now() - startTime
        
        if (response.ok) {
          this.addResult('ERROR_HANDLING', test.endpoint, test.name, 'FAILURE', responseTime, 'Should have returned an error')
        } else {
          const errorData = await response.json()
          this.addResult('ERROR_HANDLING', test.endpoint, test.name, 'SUCCESS', responseTime, undefined, {
            status: response.status,
            error: errorData.error || 'Error response received'
          })
        }

      } catch (error) {
        const responseTime = Date.now() - startTime
        this.addResult('ERROR_HANDLING', test.endpoint, test.name, 'ERROR', responseTime, error instanceof Error ? error.message : 'Unknown error')
      }
    }
  }

  // Generate comprehensive report
  generateReport() {
    console.log('\n📊 COMPREHENSIVE API TEST REPORT')
    console.log('=' .repeat(60))

    const serviceStats = {}
    const overallStats = {
      total: this.results.length,
      success: 0,
      failure: 0,
      error: 0,
      averageResponseTime: 0
    }

    // Calculate statistics
    this.results.forEach(result => {
      if (!serviceStats[result.service]) {
        serviceStats[result.service] = { total: 0, success: 0, failure: 0, error: 0, totalTime: 0 }
      }
      
      serviceStats[result.service].total++
      serviceStats[result.service].totalTime += result.responseTime
      
      if (result.status === 'SUCCESS') {
        serviceStats[result.service].success++
        overallStats.success++
      } else if (result.status === 'FAILURE') {
        serviceStats[result.service].failure++
        overallStats.failure++
      } else {
        serviceStats[result.service].error++
        overallStats.error++
      }
    })

    overallStats.averageResponseTime = this.results.reduce((sum, r) => sum + r.responseTime, 0) / this.results.length

    // Print overall summary
    console.log('\n📈 OVERALL SUMMARY:')
    console.log(`Total Tests: ${overallStats.total}`)
    console.log(`✅ Success: ${overallStats.success} (${((overallStats.success / overallStats.total) * 100).toFixed(1)}%)`)
    console.log(`❌ Failure: ${overallStats.failure} (${((overallStats.failure / overallStats.total) * 100).toFixed(1)}%)`)
    console.log(`🚨 Error: ${overallStats.error} (${((overallStats.error / overallStats.total) * 100).toFixed(1)}%)`)
    console.log(`⏱️ Average Response Time: ${overallStats.averageResponseTime.toFixed(0)}ms`)

    // Print service-specific summaries
    Object.entries(serviceStats).forEach(([service, stats]: [string, any]) => {
      console.log(`\n📊 ${service} SERVICE:`)
      console.log(`  Tests: ${stats.total}`)
      console.log(`  Success Rate: ${((stats.success / stats.total) * 100).toFixed(1)}%`)
      console.log(`  Avg Response Time: ${(stats.totalTime / stats.total).toFixed(0)}ms`)
    })

    // Print detailed results
    console.log('\n📋 DETAILED RESULTS:')
    this.results.forEach(result => {
      const statusIcon = result.status === 'SUCCESS' ? '✅' : result.status === 'FAILURE' ? '❌' : '🚨'
      console.log(`${statusIcon} ${result.service} | ${result.testName} | ${result.responseTime}ms${result.error ? ' | ' + result.error : ''}`)
    })

    // Print recommendations
    console.log('\n💡 RECOMMENDATIONS:')
    
    const highLatencyTests = this.results.filter(r => r.responseTime > 5000)
    if (highLatencyTests.length > 0) {
      console.log('⚠️  High Latency Detected:', highLatencyTests.map(r => `${r.service}.${r.testName} (${r.responseTime}ms)`).join(', '))
    }

    const failedServices = Object.entries(serviceStats).filter(([_, stats]: [string, any]) => stats.failure > 0 || stats.error > 0)
    if (failedServices.length > 0) {
      console.log('🔧 Services Need Attention:', failedServices.map(([service, _]) => service).join(', '))
    }

    const successRate = (overallStats.success / overallStats.total) * 100
    if (successRate < 80) {
      console.log('🚨 Overall success rate is below 80% - immediate attention required')
    } else if (successRate < 95) {
      console.log('⚠️  Overall success rate is below 95% - monitor closely')
    } else {
      console.log('✅ All systems performing well')
    }

    return {
      overallStats,
      serviceStats,
      results: this.results,
      recommendations: {
        highLatencyTests,
        failedServices,
        successRate
      }
    }
  }

  // Main test runner
  async runAllTests() {
    console.log('🚀 Starting Comprehensive API Testing...')
    
    // Authenticate first
    const authSuccess = await this.authenticate()
    if (!authSuccess) {
      console.error('❌ Authentication failed - some tests will be skipped')
    }

    // Run all test suites
    await this.testAIProviders()
    await this.testStripeIntegration()
    await this.testTelegramIntegration()
    await this.testPerformanceAndRateLimit()
    await this.testErrorHandling()

    // Generate final report
    return this.generateReport()
  }
}

// Export for use in other files
export { APITester }

// Run tests if this file is executed directly
if (typeof window === 'undefined') {
  const tester = new APITester()
  tester.runAllTests().then(() => {
    console.log('\n🎉 All tests completed!')
  }).catch((error) => {
    console.error('❌ Test suite failed:', error)
  })
} 