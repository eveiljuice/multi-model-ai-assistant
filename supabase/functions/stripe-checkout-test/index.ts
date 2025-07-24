import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import Stripe from 'https://esm.sh/stripe@14.21.0';
import { corsHeaders } from '../_shared/cors.ts';

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
  // Get keys from environment variables
  const publicKey = Deno.env.get('STRIPE_PUBLIC_KEY');
  const secretKey = Deno.env.get('STRIPE_SECRET_KEY');
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
  
  if (!publicKey || !secretKey || !webhookSecret) {
    throw new Error('Missing Stripe environment variables. Please set STRIPE_PUBLIC_KEY, STRIPE_SECRET_KEY, and STRIPE_WEBHOOK_SECRET');
  }
  
  return {
    publicKey,
    secretKey,
    webhookSecret
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      headers: {
        ...corsHeaders,
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
  
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { 
        status: 405, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
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
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
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
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        }
      );
    }
    
    // Get Stripe keys
    const keys = await getStripeKeys();
    const stripe = new Stripe(keys.secretKey, {
      apiVersion: '2023-10-16'
    });
    
    // Create a test customer (for testing purposes)
    const customer = await stripe.customers.create({
      email: 'test@example.com',
      metadata: {
        user_id: 'test-user-id'
      }
    });
    
    // Create checkout session
    const sessionConfig: Stripe.Checkout.SessionCreateParams = {
      customer: customer.id,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1
        }
      ],
      mode: mode || productConfig.mode,
      success_url: successUrl || 'http://localhost:5173/success?session_id={CHECKOUT_SESSION_ID}',
      cancel_url: cancelUrl || 'http://localhost:5173/pricing',
      metadata: {
        user_id: 'test-user-id',
        credits: productConfig.credits.toString()
      }
    };
    
    const session = await stripe.checkout.sessions.create(sessionConfig);
    
    return new Response(
      JSON.stringify({
        sessionId: session.id,
        url: session.url,
        message: 'Test checkout session created successfully'
      }),
      { 
        status: 200, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }
    );
    
  } catch (error) {
    console.error('Stripe checkout error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        details: error instanceof Error ? error.stack : undefined
      }),
      { 
        status: 500, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }
    );
  }
});