import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import Stripe from 'https://esm.sh/stripe@14.21.0';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

// Simple CORS headers that work with localhost
const getCorsHeaders = (origin: string | null) => {
  const headers: Record<string, string> = {
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-requested-with',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400',
  };

  // Allow localhost origins and production
  if (origin) {
    if (origin.includes('localhost') ||
      origin.includes('127.0.0.1') ||
      origin.includes('sgzlhcagtesjazvwskjw.supabase.co')) {
      headers['Access-Control-Allow-Origin'] = origin;
    } else {
      headers['Access-Control-Allow-Origin'] = '*';
    }
  } else {
    headers['Access-Control-Allow-Origin'] = '*';
  }

  return headers;
};

interface StripeKeys {
  publicKey: string;
  secretKey: string;
  webhookSecret: string;
}

interface ProductConfig {
  priceId: string;
  productId: string;
  credits: number;
  mode: 'payment' | 'subscription';
}

const PRODUCTS: Record<string, ProductConfig> = {
  'price_1RiUt0AK7V4m73aluYckgD6P': {
    priceId: 'price_1RiUt0AK7V4m73aluYckgD6P',
    productId: 'prod_SdmRKnaMEM7FE7',
    credits: 250,
    mode: 'subscription'
  },
  'price_1RiUvhAK7V4m73alSPDpllg2': {
    priceId: 'price_1RiUvhAK7V4m73alSPDpllg2',
    productId: 'prod_SdmU9mybV0ZUhw',
    credits: 100,
    mode: 'payment'
  },
  'price_1RiUxdAK7V4m73alz8Oad0YH': {
    priceId: 'price_1RiUxdAK7V4m73alz8Oad0YH',
    productId: 'prod_SdmWCbIxv9eioK',
    credits: 500,
    mode: 'payment'
  },
  'price_1RiUyPAK7V4m73alBCuO8sYC': {
    priceId: 'price_1RiUyPAK7V4m73alBCuO8sYC',
    productId: 'prod_SdmXQUfirQZKGf',
    credits: 1500,
    mode: 'payment'
  }
};

async function getStripeKeys(): Promise<StripeKeys> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const { data: secrets, error } = await supabase
    .from('vault')
    .select('name, secret')
    .in('name', ['stripe_public_key', 'stripe_secret_key', 'stripe_webhook_secret']);

  if (error) {
    throw new Error(`Failed to fetch Stripe keys: ${error.message}`);
  }

  const keyMap = secrets.reduce((acc, item) => {
    acc[item.name] = item.secret;
    return acc;
  }, {} as Record<string, string>);

  return {
    publicKey: keyMap.stripe_public_key,
    secretKey: keyMap.stripe_secret_key,
    webhookSecret: keyMap.stripe_webhook_secret
  };
}

async function getOrCreateCustomer(stripe: Stripe, userId: string, email: string): Promise<string> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Check if customer exists
  const { data: existingCustomer, error: customerError } = await supabase
    .from('stripe_customers')
    .select('customer_id')
    .eq('user_id', userId)
    .single();

  if (existingCustomer && !customerError) {
    return existingCustomer.customer_id;
  }

  // Create new customer
  const customer = await stripe.customers.create({
    email,
    metadata: {
      user_id: userId
    }
  });

  // Save customer ID
  await supabase
    .from('stripe_customers')
    .insert({
      user_id: userId,
      customer_id: customer.id,
      email: customer.email
    });

  return customer.id;
}

serve(async (req) => {
  const origin = req.headers.get('Origin');
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }

  try {
    const { priceId, mode, successUrl, cancelUrl } = await req.json();

    if (!priceId) {
      return new Response(
        JSON.stringify({ error: 'Price ID is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Get product config
    const productConfig = PRODUCTS[priceId];
    if (!productConfig) {
      return new Response(
        JSON.stringify({ error: 'Invalid price ID' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Get user from JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid user token' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Get Stripe keys
    const keys = await getStripeKeys();
    const stripe = new Stripe(keys.secretKey, {
      apiVersion: '2023-10-16'
    });

    // Get or create customer
    const customerId = await getOrCreateCustomer(stripe, user.id, user.email!);

    // Create checkout session
    const sessionConfig: Stripe.Checkout.SessionCreateParams = {
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1
        }
      ],
      mode: mode || productConfig.mode,
      success_url: successUrl || 'https://your-app.com/success?session_id={CHECKOUT_SESSION_ID}',
      cancel_url: cancelUrl || 'https://your-app.com/pricing',
      metadata: {
        user_id: user.id,
        credits: productConfig.credits.toString()
      }
    };

    const session = await stripe.checkout.sessions.create(sessionConfig);

    return new Response(
      JSON.stringify({
        sessionId: session.id,
        url: session.url
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Stripe checkout error:', error);

    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
}); 