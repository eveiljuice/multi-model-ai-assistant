import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { handleCorsOptions, createCorsResponse } from '../_shared/cors.ts'

interface AIRequest {
  provider: 'openai' | 'anthropic' | 'gemini'
  model: string
  messages: Array<{ role: string; content: string }>
  temperature?: number
  max_tokens?: number
  agent_id?: string
}

// Input validation and sanitization
function validateAIRequest(request: any): { valid: boolean; error?: string; data?: AIRequest } {
  if (!request || typeof request !== 'object') {
    return { valid: false, error: 'Invalid request format' };
  }

  const { provider, model, messages, temperature, max_tokens, agent_id } = request;

  // Validate provider
  const validProviders = ['openai', 'anthropic', 'gemini'];
  if (!provider || !validProviders.includes(provider)) {
    return { valid: false, error: 'Invalid or missing provider' };
  }

  // Validate model
  if (!model || typeof model !== 'string' || model.trim().length === 0) {
    return { valid: false, error: 'Invalid or missing model' };
  }

  // Validate messages
  if (!Array.isArray(messages) || messages.length === 0) {
    return { valid: false, error: 'Invalid or missing messages' };
  }

  // Validate each message
  for (const message of messages) {
    if (!message || typeof message !== 'object') {
      return { valid: false, error: 'Invalid message format' };
    }

    if (!message.role || typeof message.role !== 'string') {
      return { valid: false, error: 'Invalid message role' };
    }

    if (!message.content || typeof message.content !== 'string') {
      return { valid: false, error: 'Invalid message content' };
    }

    // Validate role
    const validRoles = ['user', 'assistant', 'system'];
    if (!validRoles.includes(message.role)) {
      return { valid: false, error: 'Invalid message role' };
    }

    // Sanitize content - remove potentially dangerous patterns
    const sanitizedContent = message.content
      .replace(/[<>]/g, '') // Remove HTML tags
      .replace(/javascript:/gi, '') // Remove JS protocols
      .replace(/on\w+=/gi, '') // Remove event handlers
      .trim();

    if (sanitizedContent.length === 0) {
      return { valid: false, error: 'Empty message content after sanitization' };
    }

    // Check for excessively long content
    if (sanitizedContent.length > 10000) {
      return { valid: false, error: 'Message content too long' };
    }

    message.content = sanitizedContent;
  }

  // Validate optional parameters
  if (temperature !== undefined) {
    if (typeof temperature !== 'number' || temperature < 0 || temperature > 2) {
      return { valid: false, error: 'Invalid temperature value' };
    }
  }

  if (max_tokens !== undefined) {
    if (typeof max_tokens !== 'number' || max_tokens < 1) {
      return { valid: false, error: 'Invalid max_tokens value: must be a positive number' };
    }
    
    // Provider-specific max_tokens limits
    const maxTokensLimits = {
      'openai': 4096,
      'anthropic': 4096,
      'gemini': 8192
    };
    
    const limit = maxTokensLimits[provider] || 4000;
    if (max_tokens > limit) {
      return { valid: false, error: `Invalid max_tokens value: maximum ${limit} for ${provider}` };
    }
  }

  if (agent_id !== undefined) {
    if (typeof agent_id !== 'string' || agent_id.trim().length === 0) {
      return { valid: false, error: 'Invalid agent_id' };
    }
  }

  return { 
    valid: true, 
    data: {
      provider,
      model: model.trim(),
      messages,
      temperature,
      max_tokens,
      agent_id: agent_id?.trim()
    }
  };
}

// Rate limiting check
async function checkRateLimit(userId: string, supabase: any): Promise<{ exceeded: boolean; remaining: number }> {
  const now = new Date();
  const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);
  
  const { data: recentRequests, error } = await supabase
    .from('ai_requests')
    .select('created_at')
    .eq('user_id', userId)
    .gte('created_at', oneMinuteAgo.toISOString());

  if (error) {
    console.error('Rate limit check error:', error);
    return { exceeded: false, remaining: 10 }; // Fallback to allowing request
  }

  const requestCount = recentRequests?.length || 0;
  const rateLimit = 10; // 10 requests per minute
  
  return {
    exceeded: requestCount >= rateLimit,
    remaining: Math.max(0, rateLimit - requestCount)
  };
}

// Audit logging
async function auditLog(userId: string, action: string, details: any, supabase: any) {
  try {
    await supabase
      .from('audit_logs')
      .insert({
        user_id: userId,
        action,
        details: JSON.stringify(details),
        ip_address: null, // Would need to extract from request
        user_agent: null, // Would need to extract from request
        created_at: new Date().toISOString()
      });
  } catch (error) {
    console.error('Audit log failed:', error);
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return handleCorsOptions(req);
  }

  if (req.method !== 'POST') {
    return createCorsResponse({ error: 'Method not allowed' }, 405, req);
  }

  // Log environment variables for debugging (without exposing actual keys)
  console.log('Environment check:', {
    supabaseUrl: !!Deno.env.get('SUPABASE_URL'),
    supabaseServiceKey: !!Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
    openaiKey: !!Deno.env.get('OPENAI_API_KEY'),
    anthropicKey: !!(Deno.env.get('ANTHROPIC_API_KEY') || Deno.env.get('VITE_CLAUDE_API_KEY')),
    geminiKey: !!(Deno.env.get('GEMINI_API_KEY') || Deno.env.get('VITE_GEMINI_API_KEY'))
  });

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          persistSession: false,
        },
      }
    )

    // Validate authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return createCorsResponse({ error: 'Missing or invalid authorization header' }, 401, req);
    }

    const token = authHeader.replace('Bearer ', '')
    
    // Validate JWT token and get user
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token)
    
    if (authError || !user) {
      await auditLog(null, 'auth_failed', { error: authError?.message }, supabaseClient);
      return createCorsResponse({ error: 'Invalid or expired token' }, 401, req);
    }

    // Rate limiting check
    const rateLimit = await checkRateLimit(user.id, supabaseClient);
    if (rateLimit.exceeded) {
      await auditLog(user.id, 'rate_limit_exceeded', { remaining: rateLimit.remaining }, supabaseClient);
      return createCorsResponse({ error: 'Rate limit exceeded', remaining: rateLimit.remaining }, 429, req);
    }

    // Parse and validate request body
    const body = await req.text()
    if (!body) {
      return createCorsResponse({ error: 'Request body is required' }, 400, req);
    }

    let requestData;
    try {
      requestData = JSON.parse(body);
    } catch (error) {
      return createCorsResponse({ error: 'Invalid JSON in request body' }, 400, req);
    }

    // Validate input
    const validation = validateAIRequest(requestData);
    if (!validation.valid) {
      console.error('AI request validation failed:', {
        error: validation.error,
        requestData: {
          provider: requestData.provider,
          model: requestData.model,
          messagesCount: requestData.messages?.length,
          temperature: requestData.temperature,
          max_tokens: requestData.max_tokens,
          agent_id: requestData.agent_id
        }
      });
      await auditLog(user.id, 'invalid_request', { error: validation.error }, supabaseClient);
      return createCorsResponse({ error: validation.error }, 400, req);
    }

    const aiRequest = validation.data!;
    
    console.log('Processing AI request:', {
      provider: aiRequest.provider,
      model: aiRequest.model,
      messagesCount: aiRequest.messages.length,
      temperature: aiRequest.temperature,
      max_tokens: aiRequest.max_tokens,
      agent_id: aiRequest.agent_id,
      user_id: user.id
    });

    // Get API key from secrets
    let apiKey: string | undefined
    switch (aiRequest.provider) {
      case 'openai':
        apiKey = Deno.env.get('OPENAI_API_KEY')
        break
      case 'anthropic':
        apiKey = Deno.env.get('ANTHROPIC_API_KEY') || Deno.env.get('VITE_CLAUDE_API_KEY')
        break
      case 'gemini':
        apiKey = Deno.env.get('GEMINI_API_KEY') || Deno.env.get('VITE_GEMINI_API_KEY')
        break
      default:
        return createCorsResponse({ error: 'Unsupported provider' }, 400, req);
    }

    if (!apiKey) {
      await auditLog(user.id, 'api_key_missing', { provider: aiRequest.provider }, supabaseClient);
      return createCorsResponse({ error: 'API key not configured for this provider' }, 500, req);
    }

    let aiResponse: any
    let tokensUsed = 0

    // Make request to AI provider
    switch (aiRequest.provider) {
      case 'openai':
        aiResponse = await callOpenAI(apiKey, aiRequest)
        tokensUsed = aiResponse.usage?.total_tokens || 0
        break
      case 'anthropic':
        aiResponse = await callAnthropic(apiKey, aiRequest)
        tokensUsed = aiResponse.usage?.input_tokens + aiResponse.usage?.output_tokens || 0
        break
      case 'gemini':
        aiResponse = await callGemini(apiKey, aiRequest)
        tokensUsed = 1 // Gemini doesn't return token count easily
        break
    }

    // If agent_id is provided, deduct credits
    if (aiRequest.agent_id) {
      try {
        const { error: creditError } = await supabaseClient.rpc('deduct_credits', {
          user_uuid: user.id,
          credit_amount: 1, // Default cost, should be based on agent pricing
          agent_identifier: aiRequest.agent_id,
          transaction_description: `AI query to ${aiRequest.provider}`,
        })

        if (creditError) {
          console.error('Failed to deduct credits:', creditError)
          // Don't fail the request if credit deduction fails, just log it
          await auditLog(user.id, 'credit_deduction_failed', { error: creditError.message }, supabaseClient);
        }
      } catch (error) {
        console.error('Credit deduction error:', error)
        await auditLog(user.id, 'credit_deduction_error', { error: error.message }, supabaseClient);
      }
    }

    // Log successful request
    await auditLog(user.id, 'ai_request_success', {
      provider: aiRequest.provider,
      model: aiRequest.model,
      tokens_used: tokensUsed,
      agent_id: aiRequest.agent_id
    }, supabaseClient);

    return createCorsResponse({
      response: aiResponse,
      tokens_used: tokensUsed,
      provider: aiRequest.provider,
      model: aiRequest.model,
    }, 200, req);
  } catch (error) {
    console.error('AI proxy error:', {
      message: error.message,
      stack: error.stack,
      provider: req.headers.get('content-type') ? 'Unknown' : 'None'
    });
    
    // Enhanced error handling with proper status codes
    let errorMessage = 'Internal server error';
    let statusCode = 500;
    
    // Handle Anthropic API specific errors
    if (error.message?.includes('Anthropic API error')) {
      errorMessage = error.message;
      
      // Extract status code from Anthropic error
      if (error.message.includes('(403)')) {
        statusCode = 403; // Pass through 403 Forbidden
      } else if (error.message.includes('(401)')) {
        statusCode = 401; // Pass through 401 Unauthorized  
      } else if (error.message.includes('(429)')) {
        statusCode = 429; // Pass through 429 Rate Limited
      } else if (error.message.includes('(400)')) {
        statusCode = 400; // Pass through 400 Bad Request
      } else {
        statusCode = 500; // Other Anthropic errors as 500
      }
    } else if (error.message?.includes('OpenAI API error')) {
      errorMessage = error.message;
      
      // Extract status code from OpenAI error
      if (error.message.includes('(401)')) {
        statusCode = 401;
      } else if (error.message.includes('(429)')) {
        statusCode = 429;
      } else if (error.message.includes('(400)')) {
        statusCode = 400;
      } else {
        statusCode = 500;
      }
    } else if (error.message?.includes('Gemini API error')) {
      errorMessage = error.message;
      
      // Extract status code from Gemini error
      if (error.message.includes('(401)')) {
        statusCode = 401;
      } else if (error.message.includes('(429)')) {
        statusCode = 429;
      } else if (error.message.includes('(400)')) {
        statusCode = 400;
      } else {
        statusCode = 500;
      }
    } else if (error.message?.includes('API key not configured')) {
      errorMessage = error.message;
      statusCode = 503; // Service Unavailable for configuration issues
    }
    
    return createCorsResponse({ 
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, statusCode, req);
  }
})

async function callOpenAI(apiKey: string, request: AIRequest) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: request.model,
      messages: request.messages,
      temperature: request.temperature || 0.7,
      max_tokens: request.max_tokens || 2000,
    }),
  })

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`)
  }

  return await response.json()
}

async function callAnthropic(apiKey: string, request: AIRequest) {
  console.log('Calling Anthropic API with model:', request.model);
  
  const messages = request.messages.filter(msg => msg.role !== 'system')
  const systemMessage = request.messages.find(msg => msg.role === 'system')

  const requestBody = {
    model: request.model,
    max_tokens: request.max_tokens || 2000,
    temperature: request.temperature || 0.7,
    system: systemMessage?.content || '',
    messages: messages,
  };

  console.log('Anthropic request body:', {
    model: requestBody.model,
    max_tokens: requestBody.max_tokens,
    temperature: requestBody.temperature,
    systemLength: requestBody.system.length,
    messagesCount: requestBody.messages.length
  });

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(requestBody),
    });

    console.log('Anthropic response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Anthropic API error details:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
        headers: Object.fromEntries(response.headers.entries())
      });
      
      // Try to parse error response for more details
      let errorDetails = errorText;
      try {
        const errorJson = JSON.parse(errorText);
        errorDetails = errorJson.error?.message || errorJson.message || errorText;
      } catch (e) {
        // Keep original error text if not JSON
      }
      
      throw new Error(`Anthropic API error (${response.status}): ${errorDetails}`);
    }

    const result = await response.json();
    console.log('Anthropic response received successfully');
    return result;
  } catch (fetchError) {
    console.error('Anthropic fetch error:', fetchError);
    throw fetchError; // Re-throw to preserve the error details
  }
}

async function callGemini(apiKey: string, request: AIRequest) {
  // Convert messages to Gemini format
  const contents = request.messages
    .filter(msg => msg.role !== 'system')
    .map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }))

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${request.model}:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents,
      generationConfig: {
        temperature: request.temperature || 0.7,
        maxOutputTokens: request.max_tokens || 2000,
      },
    }),
  })

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.status}`)
  }

  return await response.json()
} 