import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import Stripe from 'https://esm.sh/stripe@14.21.0';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
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

async function checkIdempotency(eventId: string, supabase: any): Promise<boolean> {
  const { data, error } = await supabase
    .from('stripe_events')
    .select('id')
    .eq('stripe_event_id', eventId)
    .single();
  
  return !error && data;
}

async function recordWebhookEvent(eventId: string, eventType: string, supabase: any): Promise<void> {
  await supabase
    .from('stripe_events')
    .insert({
      stripe_event_id: eventId,
      event_type: eventType,
      processed_at: new Date().toISOString()
    });
}

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session, supabase: any): Promise<void> {
  console.log(`Processing checkout session: ${session.id}`);
  
  const customerId = session.customer as string;
  const userId = session.metadata?.user_id;
  
  if (!customerId || !userId) {
    throw new Error('Missing customer ID or user ID');
  }
  
  // Handle one-time payment
  if (session.mode === 'payment') {
    const priceId = session.line_items?.data[0]?.price?.id || 
                   (session as any).display_items?.[0]?.price?.id;
    
    if (!priceId) {
      throw new Error('No price ID found in session');
    }
    
    const productConfig = PRODUCTS[priceId];
    if (!productConfig) {
      throw new Error(`Unknown price ID: ${priceId}`);
    }
    
    // Add credits to user
    const { error: addCreditsError } = await supabase.rpc('add_credits', {
      user_uuid: userId,
      credit_amount: productConfig.credits,
      transaction_type: 'topup',
      transaction_description: `Top-up purchase: ${productConfig.credits} credits`,
      transaction_metadata: {
        checkout_session_id: session.id,
        price_id: priceId,
        amount_total: session.amount_total,
        currency: session.currency
      }
    });
    
    if (addCreditsError) {
      throw new Error(`Failed to add credits: ${addCreditsError.message}`);
    }
    
    // Create order record
    const { error: orderError } = await supabase
      .from('stripe_orders')
      .insert({
        checkout_session_id: session.id,
        payment_intent_id: session.payment_intent as string,
        customer_id: customerId,
        amount_subtotal: session.amount_subtotal,
        amount_total: session.amount_total,
        currency: session.currency,
        payment_status: session.payment_status,
        status: 'completed'
      });
    
    if (orderError) {
      console.error(`Failed to create order record: ${orderError.message}`);
    }
    
    console.log(`Added ${productConfig.credits} credits to user ${userId}`);
  }
  
  // Handle subscription
  if (session.mode === 'subscription') {
    const subscriptionId = session.subscription as string;
    
    const { error: subscriptionError } = await supabase
      .from('stripe_subscriptions')
      .insert({
        subscription_id: subscriptionId,
        customer_id: customerId,
        status: 'active',
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      });
    
    if (subscriptionError) {
      console.error(`Failed to create subscription record: ${subscriptionError.message}`);
    }
    
    // Add initial subscription credits
    const { error: addCreditsError } = await supabase.rpc('add_subscription_credits', {
      user_uuid: userId
    });
    
    if (addCreditsError) {
      console.error(`Failed to add subscription credits: ${addCreditsError.message}`);
    }
    
    console.log(`Created subscription for user ${userId}`);
  }
}

async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice, supabase: any): Promise<void> {
  console.log(`Processing invoice payment: ${invoice.id}`);
  
  if (!invoice.subscription) {
    return;
  }
  
  const customerId = invoice.customer as string;
  
  // Get user ID from customer
  const { data: customerData, error: customerError } = await supabase
    .from('stripe_customers')
    .select('user_id')
    .eq('customer_id', customerId)
    .single();
  
  if (customerError || !customerData) {
    throw new Error(`Failed to find user for customer ${customerId}`);
  }
  
  const userId = customerData.user_id;
  
  // Add monthly subscription credits for renewals
  if (invoice.billing_reason === 'subscription_cycle') {
    const { error: addCreditsError } = await supabase.rpc('add_subscription_credits', {
      user_uuid: userId
    });
    
    if (addCreditsError) {
      throw new Error(`Failed to add subscription credits: ${addCreditsError.message}`);
    }
    
    console.log(`Added monthly subscription credits to user ${userId}`);
  }
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice, supabase: any): Promise<void> {
  console.log(`Processing failed invoice payment: ${invoice.id}`);
  
  const customerId = invoice.customer as string;
  
  // Update subscription status
  const { error: updateError } = await supabase
    .from('stripe_subscriptions')
    .update({
      status: 'past_due',
      updated_at: new Date().toISOString()
    })
    .eq('customer_id', customerId);
  
  if (updateError) {
    console.error(`Failed to update subscription status: ${updateError.message}`);
  }
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription, supabase: any): Promise<void> {
  console.log(`Processing subscription update: ${subscription.id}`);
  
  const { error: updateError } = await supabase
    .from('stripe_subscriptions')
    .update({
      status: subscription.status,
      current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('subscription_id', subscription.id);
  
  if (updateError) {
    console.error(`Failed to update subscription: ${updateError.message}`);
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription, supabase: any): Promise<void> {
  console.log(`Processing subscription deletion: ${subscription.id}`);
  
  const { error: updateError } = await supabase
    .from('stripe_subscriptions')
    .update({
      status: 'canceled',
      updated_at: new Date().toISOString()
    })
    .eq('subscription_id', subscription.id);
  
  if (updateError) {
    console.error(`Failed to update subscription: ${updateError.message}`);
  }
}

async function handleWebhookEvent(event: Stripe.Event, supabase: any): Promise<void> {
  console.log(`Processing webhook event: ${event.type}`);
  
  switch (event.type) {
    case 'checkout.session.completed':
      await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session, supabase);
      break;
    case 'invoice.payment_succeeded':
      await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice, supabase);
      break;
    case 'invoice.payment_failed':
      await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice, supabase);
      break;
    case 'customer.subscription.updated':
      await handleSubscriptionUpdated(event.data.object as Stripe.Subscription, supabase);
      break;
    case 'customer.subscription.deleted':
      await handleSubscriptionDeleted(event.data.object as Stripe.Subscription, supabase);
      break;
    default:
      console.log(`Unhandled event type: ${event.type}`);
  }
}

serve(async (req) => {
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
    const signature = req.headers.get('stripe-signature');
    
    if (!signature) {
      return new Response(
        JSON.stringify({ error: 'No signature found' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    
    const body = await req.text();
    
    // Get Stripe keys
    const keys = await getStripeKeys();
    const stripe = new Stripe(keys.secretKey, {
      apiVersion: '2023-10-16'
    });
    
    // Verify webhook signature
    let event: Stripe.Event;
    
    try {
      event = stripe.webhooks.constructEvent(body, signature, keys.webhookSecret);
    } catch (error) {
      console.error(`Webhook signature verification failed: ${error.message}`);
      return new Response(
        JSON.stringify({ error: `Webhook signature verification failed: ${error.message}` }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Check idempotency
    const isProcessed = await checkIdempotency(event.id, supabase);
    if (isProcessed) {
      console.log(`Event ${event.id} already processed, skipping`);
      return new Response(
        JSON.stringify({ received: true, status: 'already_processed' }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    
    // Record this event as being processed
    await recordWebhookEvent(event.id, event.type, supabase);
    
    // Handle the event
    await handleWebhookEvent(event, supabase);
    
    return new Response(
      JSON.stringify({ received: true }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
    
  } catch (error) {
    console.error('Error processing webhook:', error);
    
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