import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://sgzlhcagtesjazvwskjw.supabase.co', // Production domain only
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CreditMeterRequest {
  agent_id: string
  description?: string
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', // Use SERVICE_ROLE_KEY for security
      {
        auth: {
          persistSession: false,
        },
      }
    )

    // Get and validate authorization header
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

    // Get the request body - user_id is now from JWT, not request
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

    const { agent_id, description } = JSON.parse(body) as CreditMeterRequest

    if (!agent_id) {
      return new Response(
        JSON.stringify({ error: 'agent_id is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Get the agent's credit weight
    const { data: agentData, error: agentError } = await supabaseClient
      .from('agent_pricing')
      .select('credit_weight')
      .eq('agent_id', agent_id)
      .single()

    if (agentError || !agentData) {
      return new Response(
        JSON.stringify({ error: 'Agent not found or error fetching agent data' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Deduct credits using the database function - use authenticated user's ID
    const { data, error } = await supabaseClient.rpc('deduct_credits', {
      user_uuid: user.id, // Use authenticated user's ID, not from request
      credit_amount: agentData.credit_weight,
      agent_identifier: agent_id,
      transaction_description: description || `Used ${agent_id} agent`,
    })

    if (error) {
      return new Response(
        JSON.stringify({ error: 'Error deducting credits', details: error.message }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Return success response
    return new Response(
      JSON.stringify({ 
        success: true, 
        deducted: agentData.credit_weight,
        user_id: user.id // Safe to return as it's the authenticated user
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('Credit meter error:', error.message) // Log only error message, not full error
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
}) 