import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import Stripe from 'npm:stripe@17.7.0';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY')!;
const stripeWebhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')!;
const stripe = new Stripe(stripeSecret, {
  appInfo: {
    name: 'Agent Core',
    version: '1.0.0',
  },
});

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

Deno.serve(async (req) => {
  try {
    // Handle OPTIONS request for CORS preflight
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': '*',
        },
      });
    }

    if (req.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    // Get the signature from the header
    const signature = req.headers.get('stripe-signature');

    if (!signature) {
      return new Response('No signature found', { status: 400 });
    }

    // Get the raw body
    const body = await req.text();

    // Verify the webhook signature
    let event: Stripe.Event;

    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, stripeWebhookSecret);
    } catch (error: any) {
      console.error(`Webhook signature verification failed: ${error.message}`);
      return new Response(`Webhook signature verification failed: ${error.message}`, { status: 400 });
    }

    // Process the event
    await handleWebhookEvent(event);

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Error processing webhook:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});

async function handleWebhookEvent(event: Stripe.Event) {
  console.log(`Processing webhook event: ${event.type}`);

  switch (event.type) {
    case 'checkout.session.completed':
      await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
      break;
    case 'invoice.payment_succeeded':
      await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice);
      break;
    case 'invoice.payment_failed':
      await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
      break;
    case 'customer.subscription.updated':
      await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
      break;
    case 'customer.subscription.deleted':
      await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
      break;
    default:
      console.log(`Unhandled event type: ${event.type}`);
  }
}

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  console.log(`Processing checkout session: ${session.id}`);

  try {
    // Get customer ID
    const customerId = session.customer as string;
    if (!customerId) {
      throw new Error('No customer ID found in session');
    }

    // Get user ID from customer
    const { data: customerData, error: customerError } = await supabase
      .from('stripe_customers')
      .select('user_id')
      .eq('customer_id', customerId)
      .single();

    if (customerError || !customerData) {
      throw new Error(`Failed to find user for customer ${customerId}: ${customerError?.message}`);
    }

    const userId = customerData.user_id;

    // Handle one-time payment (top-up)
    if (session.mode === 'payment') {
      // Get line items to determine product
      const lineItems = await stripe.checkout.sessions.listLineItems(session.id);
      const priceId = lineItems.data[0]?.price?.id;

      if (!priceId) {
        throw new Error('No price ID found in session line items');
      }

      // Determine credit amount based on price ID
      let creditAmount = 0;
      
      // CRITICAL: Match price IDs with credit amounts
      switch (priceId) {
        case 'price_1RiUvhAK7V4m73alSPDpllg2': // 100 Credits
          creditAmount = 100;
          break;
        case 'price_1RiUxdAK7V4m73alz8Oad0YH': // 500 Credits
          creditAmount = 500;
          break;
        case 'price_1RiUyPAK7V4m73alBCuO8sYC': // 1500 Credits
          creditAmount = 1500;
          break;
        case 'price_1RiUt0AK7V4m73aluYckgD6P': // Subscription Credits (should not reach here for subscriptions)
          console.warn(`Subscription price ID ${priceId} in one-time payment handler`);
          creditAmount = 250;
          break;
        default:
          console.warn(`Unknown price ID: ${priceId}, defaulting to 100 credits`);
          creditAmount = 100;
      }

      // Add credits to user
      const { data: addCreditsResult, error: addCreditsError } = await supabase.rpc(
        'add_credits',
        {
          user_uuid: userId,
          credit_amount: creditAmount,
          transaction_type: 'topup',
          transaction_description: `Top-up purchase: ${creditAmount} credits`,
          transaction_metadata: {
            checkout_session_id: session.id,
            price_id: priceId,
            amount_total: session.amount_total,
            currency: session.currency
          }
        }
      );

      if (addCreditsError) {
        throw new Error(`Failed to add credits: ${addCreditsError.message}`);
      }

      console.log(`Added ${creditAmount} credits to user ${userId} for top-up purchase`);

      // Create order record
      const { error: orderError } = await supabase.from('stripe_orders').insert({
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
    }
    // Handle subscription
    else if (session.mode === 'subscription') {
      // Sync subscription data
      await syncSubscriptionData(customerId);
      
      // For new subscriptions, add initial credits
      const { data: subscription, error: subscriptionError } = await supabase
        .from('stripe_subscriptions')
        .select('subscription_id, status')
        .eq('customer_id', customerId)
        .single();

      if (subscriptionError) {
        throw new Error(`Failed to get subscription: ${subscriptionError.message}`);
      }

      // If this is a new subscription (first payment), add initial credits
      if (subscription.status === 'active' || subscription.status === 'trialing') {
        const { data: addCreditsResult, error: addCreditsError } = await supabase.rpc(
          'add_subscription_credits',
          { user_uuid: userId }
        );

        if (addCreditsError) {
          throw new Error(`Failed to add subscription credits: ${addCreditsError.message}`);
        }

        console.log(`Added initial subscription credits to user ${userId}`);
      }
    }
  } catch (error) {
    console.error('Error handling checkout session completed:', error);
    throw error;
  }
}

async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  console.log(`Processing invoice payment: ${invoice.id}`);

  try {
    // Only process subscription invoices
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
      throw new Error(`Failed to find user for customer ${customerId}: ${customerError?.message}`);
    }

    const userId = customerData.user_id;

    // Check if this is a renewal (not the first invoice)
    if (invoice.billing_reason === 'subscription_cycle') {
      // Add monthly subscription credits
      const { data: addCreditsResult, error: addCreditsError } = await supabase.rpc(
        'add_subscription_credits',
        { user_uuid: userId }
      );

      if (addCreditsError) {
        throw new Error(`Failed to add subscription credits: ${addCreditsError.message}`);
      }

      console.log(`Added monthly subscription credits to user ${userId}`);

      // Process credit rollover
      const { data: rolloverResult, error: rolloverError } = await supabase.rpc(
        'process_credit_rollover',
        { user_uuid: userId }
      );

      if (rolloverError) {
        console.error(`Failed to process credit rollover: ${rolloverError.message}`);
      } else if (rolloverResult) {
        console.log(`Rolled over ${rolloverResult} credits for user ${userId}`);
      }
    }

    // Update subscription data
    await syncSubscriptionData(customerId);
  } catch (error) {
    console.error('Error handling invoice payment succeeded:', error);
    throw error;
  }
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  console.log(`Processing failed invoice payment: ${invoice.id}`);

  try {
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
      throw new Error(`Failed to update subscription status: ${updateError.message}`);
    }

    // Get user ID from customer
    const { data: customerData, error: customerError } = await supabase
      .from('stripe_customers')
      .select('user_id')
      .eq('customer_id', customerId)
      .single();

    if (customerError || !customerData) {
      throw new Error(`Failed to find user for customer ${customerId}: ${customerError?.message}`);
    }

    // Log payment failure in activity logs
    const { error: logError } = await supabase
      .from('activity_logs')
      .insert({
        user_id: customerData.user_id,
        session_id: 'system',
        event_type: 'subscription_payment_failed',
        event_category: 'payment',
        event_data: {
          invoice_id: invoice.id,
          amount_due: invoice.amount_due,
          currency: invoice.currency,
          attempt_count: invoice.attempt_count
        }
      });

    if (logError) {
      console.error(`Failed to log payment failure: ${logError.message}`);
    }
  } catch (error) {
    console.error('Error handling invoice payment failed:', error);
    throw error;
  }
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  console.log(`Processing subscription update: ${subscription.id}`);

  try {
    const customerId = subscription.customer as string;
    
    // Update subscription data
    await syncSubscriptionData(customerId);
  } catch (error) {
    console.error('Error handling subscription updated:', error);
    throw error;
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  console.log(`Processing subscription deletion: ${subscription.id}`);

  try {
    const customerId = subscription.customer as string;
    
    // Update subscription status
    const { error: updateError } = await supabase
      .from('stripe_subscriptions')
      .update({
        status: 'canceled',
        updated_at: new Date().toISOString()
      })
      .eq('customer_id', customerId);

    if (updateError) {
      throw new Error(`Failed to update subscription status: ${updateError.message}`);
    }

    // Get user ID from customer
    const { data: customerData, error: customerError } = await supabase
      .from('stripe_customers')
      .select('user_id')
      .eq('customer_id', customerId)
      .single();

    if (customerError || !customerData) {
      throw new Error(`Failed to find user for customer ${customerId}: ${customerError?.message}`);
    }

    // Log subscription cancellation
    const { error: logError } = await supabase
      .from('activity_logs')
      .insert({
        user_id: customerData.user_id,
        session_id: 'system',
        event_type: 'subscription_canceled',
        event_category: 'subscription',
        event_data: {
          subscription_id: subscription.id,
          canceled_at: subscription.canceled_at,
          cancel_at_period_end: subscription.cancel_at_period_end
        }
      });

    if (logError) {
      console.error(`Failed to log subscription cancellation: ${logError.message}`);
    }
  } catch (error) {
    console.error('Error handling subscription deleted:', error);
    throw error;
  }
}

async function syncSubscriptionData(customerId: string) {
  try {
    // Fetch latest subscription data from Stripe
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      limit: 1,
      status: 'all',
      expand: ['data.default_payment_method'],
    });

    if (subscriptions.data.length === 0) {
      console.log(`No active subscriptions found for customer: ${customerId}`);
      const { error: noSubError } = await supabase.from('stripe_subscriptions').upsert(
        {
          customer_id: customerId,
          status: 'not_started',
        },
        {
          onConflict: 'customer_id',
        },
      );

      if (noSubError) {
        throw new Error(`Failed to update subscription status: ${noSubError.message}`);
      }
      
      return;
    }

    // assumes that a customer can only have a single subscription
    const subscription = subscriptions.data[0];

    // store subscription state
    const { error: subError } = await supabase.from('stripe_subscriptions').upsert(
      {
        customer_id: customerId,
        subscription_id: subscription.id,
        price_id: subscription.items.data[0].price.id,
        current_period_start: subscription.current_period_start,
        current_period_end: subscription.current_period_end,
        cancel_at_period_end: subscription.cancel_at_period_end,
        ...(subscription.default_payment_method && typeof subscription.default_payment_method !== 'string'
          ? {
              payment_method_brand: subscription.default_payment_method.card?.brand ?? null,
              payment_method_last4: subscription.default_payment_method.card?.last4 ?? null,
            }
          : {}),
        status: subscription.status,
      },
      {
        onConflict: 'customer_id',
      },
    );

    if (subError) {
      throw new Error(`Failed to sync subscription: ${subError.message}`);
    }
    
    console.log(`Successfully synced subscription for customer: ${customerId}`);
  } catch (error) {
    console.error(`Failed to sync subscription for customer ${customerId}:`, error);
    throw error;
  }
}