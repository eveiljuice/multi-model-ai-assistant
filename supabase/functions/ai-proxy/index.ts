import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://sgzlhcagtesjazvwskjw.supabase.co',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface AIRequest {
  provider: 'openai' | 'anthropic' | 'gemini'
  model: string
  messages: Array<{ role: string; content: string }>
  temperature?: number
  max_tokens?: number
  agent_id?: string
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }

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
      return new Response(
        JSON.stringify({ error: 'Missing or invalid authorization header' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    
    // Validate JWT token and get user
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token)
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Parse request body
    const body = await req.text()
    if (!body) {
      return new Response(
        JSON.stringify({ error: 'Request body is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    const aiRequest = JSON.parse(body) as AIRequest

    if (!aiRequest.provider || !aiRequest.model || !aiRequest.messages) {
      return new Response(
        JSON.stringify({ error: 'provider, model, and messages are required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Get API key from secrets
    let apiKey: string | undefined
    switch (aiRequest.provider) {
      case 'openai':
        apiKey = Deno.env.get('OPENAI_API_KEY')
        break
      case 'anthropic':
        apiKey = Deno.env.get('ANTHROPIC_API_KEY')
        break
      case 'gemini':
        apiKey = Deno.env.get('GEMINI_API_KEY')
        break
      default:
        return new Response(
          JSON.stringify({ error: 'Unsupported provider' }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        )
    }

    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'API key not configured for this provider' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
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
        }
      } catch (error) {
        console.error('Credit deduction error:', error)
      }
    }

    return new Response(
      JSON.stringify({
        response: aiResponse,
        tokens_used: tokensUsed,
        provider: aiRequest.provider,
        model: aiRequest.model,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('AI proxy error:', error.message)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
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
  const messages = request.messages.filter(msg => msg.role !== 'system')
  const systemMessage = request.messages.find(msg => msg.role === 'system')

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'Content-Type': 'application/json',
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: request.model,
      max_tokens: request.max_tokens || 2000,
      temperature: request.temperature || 0.7,
      system: systemMessage?.content || '',
      messages: messages,
    }),
  })

  if (!response.ok) {
    throw new Error(`Anthropic API error: ${response.status}`)
  }

  return await response.json()
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