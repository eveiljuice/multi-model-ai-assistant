import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { handleCorsOptions, createCorsResponse } from '../_shared/cors.ts'

interface APIKeyStatus {
  provider: string;
  configured: boolean;
  keyPrefix?: string;
  error?: string;
}

interface ProviderTestResult {
  provider: string;
  configured: boolean;
  testPassed: boolean;
  error?: string;
  responseTime?: number;
}

async function checkAPIKeys(): Promise<APIKeyStatus[]> {
  const providers = [
    { name: 'openai', envVar: 'OPENAI_API_KEY', expectedPrefix: 'sk-' },
    { name: 'anthropic', envVar: 'ANTHROPIC_API_KEY', expectedPrefix: 'sk-ant-' },
    { name: 'gemini', envVar: 'GEMINI_API_KEY', expectedPrefix: '' }
  ];

  const results: APIKeyStatus[] = [];

  for (const provider of providers) {
    const apiKey = Deno.env.get(provider.envVar);
    
    if (!apiKey) {
      results.push({
        provider: provider.name,
        configured: false,
        error: `${provider.envVar} not found in environment variables`
      });
      continue;
    }

    if (provider.expectedPrefix && !apiKey.startsWith(provider.expectedPrefix)) {
      results.push({
        provider: provider.name,
        configured: false,
        keyPrefix: apiKey.substring(0, 10) + '...',
        error: `Invalid key format for ${provider.name}, expected prefix: ${provider.expectedPrefix}`
      });
      continue;
    }

    results.push({
      provider: provider.name,
      configured: true,
      keyPrefix: apiKey.substring(0, 10) + '...'
    });
  }

  return results;
}

async function testProviderConnection(provider: string, apiKey: string): Promise<ProviderTestResult> {
  const startTime = Date.now();
  
  try {
    let response: Response;
    
    switch (provider) {
      case 'openai':
        response = await fetch('https://api.openai.com/v1/models', {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          }
        });
        break;
        
      case 'anthropic':
        response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'x-api-key': apiKey,
            'Content-Type': 'application/json',
            'anthropic-version': '2023-06-01'
          },
          body: JSON.stringify({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 10,
            messages: [{ role: 'user', content: 'Test' }]
          })
        });
        break;
        
      case 'gemini':
        response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`, {
          headers: {
            'Content-Type': 'application/json'
          }
        });
        break;
        
      default:
        throw new Error(`Unknown provider: ${provider}`);
    }
    
    const responseTime = Date.now() - startTime;
    
    if (response.ok) {
      return {
        provider,
        configured: true,
        testPassed: true,
        responseTime
      };
    } else {
      const errorText = await response.text();
      return {
        provider,
        configured: true,
        testPassed: false,
        error: `HTTP ${response.status}: ${errorText}`,
        responseTime
      };
    }
  } catch (error) {
    const responseTime = Date.now() - startTime;
    return {
      provider,
      configured: true,
      testPassed: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      responseTime
    };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return handleCorsOptions(req);
  }

  if (req.method !== 'GET') {
    return createCorsResponse({ error: 'Method not allowed' }, 405, req);
  }

  try {
    const url = new URL(req.url);
    const testConnections = url.searchParams.get('test') === 'true';
    
    console.log('Checking API keys configuration...');
    const keyStatuses = await checkAPIKeys();
    
    let testResults: ProviderTestResult[] = [];
    
    if (testConnections) {
      console.log('Testing provider connections...');
      
      for (const status of keyStatuses) {
        if (status.configured) {
          const apiKey = Deno.env.get(
            status.provider === 'openai' ? 'OPENAI_API_KEY' :
            status.provider === 'anthropic' ? 'ANTHROPIC_API_KEY' :
            'GEMINI_API_KEY'
          );
          
          if (apiKey) {
            const testResult = await testProviderConnection(status.provider, apiKey);
            testResults.push(testResult);
          }
        } else {
          testResults.push({
            provider: status.provider,
            configured: false,
            testPassed: false,
            error: status.error
          });
        }
      }
    }

    const response = {
      timestamp: new Date().toISOString(),
      api_keys: keyStatuses,
      connection_tests: testConnections ? testResults : undefined,
      summary: {
        total_providers: keyStatuses.length,
        configured_providers: keyStatuses.filter(k => k.configured).length,
        successful_tests: testResults.filter(t => t.testPassed).length,
        recommendations: []
      }
    };

    // Add recommendations
    const unconfigured = keyStatuses.filter(k => !k.configured);
    if (unconfigured.length > 0) {
      response.summary.recommendations.push(
        `Configure missing API keys: ${unconfigured.map(k => k.provider).join(', ')}`
      );
    }

    const failedTests = testResults.filter(t => t.configured && !t.testPassed);
    if (failedTests.length > 0) {
      response.summary.recommendations.push(
        `Check API keys for failing providers: ${failedTests.map(t => t.provider).join(', ')}`
      );
    }

    return createCorsResponse(response, 200, req);
  } catch (error) {
    console.error('API keys check error:', error);
    return createCorsResponse({
      error: 'Failed to check API keys',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500, req);
  }
}) 