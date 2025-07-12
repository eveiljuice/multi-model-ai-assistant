import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import Stripe from 'npm:stripe@17.7.0';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY')!;
const stripeWebhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')!;
const stripe = new Stripe(stripeSecret, {
  appInfo: {
    name: 'Bolt Integration',
    version: '1.0.0',
  },
});

const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://sgzlhcagtesjazvwskjw.supabase.co', // Production domain only
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Credit amount mapping based on price
function getCreditAmountFromPrice(amountTotal: number): number {
  // Convert from cents to dollars
  const dollarAmount = amountTotal / 100;
  
  switch (dollarAmount) {
    case 4.99: return 100;
    case 19.99: return 500;
    case 49.99: return 1500;
    case 9.99: return 250; // subscription
    default: 
      // Fallback calculation: roughly 25 credits per dollar
      return Math.floor(dollarAmount * 25);
  }
}

Deno.serve(async (req) => {
  try {
    // Handle OPTIONS request for CORS preflight
    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    if (req.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    // get the signature from the header
    const signature = req.headers.get('stripe-signature');

    if (!signature) {
      return new Response('No signature found', { status: 400 });
    }

    // get the raw body
    const body = await req.text();

    // verify the webhook signature
    let event: Stripe.Event;

    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, stripeWebhookSecret);
    } catch (error: any) {
      console.error(`Webhook signature verification failed: ${error.message}`);
      return new Response(`Webhook signature verification failed: ${error.message}`, { status: 400 });
    }

    EdgeRuntime.waitUntil(handleEvent(event));

    return Response.json({ received: true });
  } catch (error: any) {
    console.error('Error processing webhook:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function handleEvent(event: Stripe.Event) {
  const stripeData = event?.data?.object ?? {};

  if (!stripeData) {
    return;
  }

  if (!('customer' in stripeData)) {
    return;
  }

  // for one time payments, we only listen for the checkout.session.completed event
  if (event.type === 'payment_intent.succeeded' && event.data.object.invoice === null) {
    return;
  }

  const { customer: customerId } = stripeData;

  if (!customerId || typeof customerId !== 'string') {
    console.error('No customer ID received on webhook event'); // Don't log full event
  } else {
    let isSubscription = true;

    if (event.type === 'checkout.session.completed') {
      const { mode } = stripeData as Stripe.Checkout.Session;

      isSubscription = mode === 'subscription';

      console.info(`Processing ${isSubscription ? 'subscription' : 'one-time payment'} checkout session`);
    }

    const { mode, payment_status } = stripeData as Stripe.Checkout.Session;

    if (isSubscription) {
      console.info(`Starting subscription sync for customer: ${customerId}`);
      await syncCustomerFromStripe(customerId);
    } else if (mode === 'payment' && payment_status === 'paid') {
      try {
        // Extract the necessary information from the session
        const {
          id: checkout_session_id,
          payment_intent,
          amount_subtotal,
          amount_total,
          currency,
        } = stripeData as Stripe.Checkout.Session;

        // Get line items to determine credit amount
        const { line_items } = await stripe.checkout.sessions.retrieve(checkout_session_id, {
          expand: ['line_items']
        });

        // Calculate total credits from line items
        let totalCredits = 0;
        if (line_items && line_items.data) {
          for (const item of line_items.data) {
            if (item.price?.metadata?.credits) {
              totalCredits += parseInt(item.price.metadata.credits) * item.quantity;
            } else {
              // Fallback to product lookup based on amount
              const creditAmount = getCreditAmountFromPrice(amount_total);
              totalCredits += creditAmount;
            }
          }
        }

        // Insert the order into the stripe_orders table
        const { error: orderError } = await supabase.from('stripe_orders').insert({
          checkout_session_id,
          payment_intent_id: payment_intent,
          customer_id: customerId,
          amount_subtotal,
          amount_total,
          currency,
          payment_status,
          status: 'completed',
        });

        if (orderError) {
          console.error('Error inserting order:', orderError);
          return;
        }

        // Get user ID from customer ID
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .single();

        if (userError || !userData) {
          console.error('Error finding user for customer:', userError);
          return;
        }

        // Add credits to user account
        if (totalCredits > 0) {
          const { error: creditError } = await supabase.rpc('add_credits', {
            user_uuid: userData.id,
            credit_amount: totalCredits,
            transaction_type: 'topup',
            transaction_description: `Credit top-up purchase (${totalCredits} credits)`,
            transaction_metadata: {}
          });

          if (creditError) {
            console.error('Error adding credits:', creditError);
          } else {
            console.info(`Successfully added ${totalCredits} credits to user`); // Don't log user ID
          }
        }

        console.info('Successfully processed one-time payment for session'); // Don't log session ID
      } catch (error) {
        console.error('Error processing one-time payment:', error);
      }
    }
  }
}

// based on the excellent https://github.com/t3dotgg/stripe-recommendations
async function syncCustomerFromStripe(customerId: string) {
  try {
    // fetch latest subscription data from Stripe
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      limit: 1,
      status: 'all',
      expand: ['data.default_payment_method'],
    });

    if (subscriptions.data.length === 0) {
      console.info(`No active subscriptions found for customer: ${customerId}`);
      const { error: noSubError } = await supabase.from('stripe_subscriptions').upsert(
        {
          customer_id: customerId,
          subscription_status: 'not_started',
        },
        {
          onConflict: 'customer_id',
        },
      );

      if (noSubError) {
        console.error('Error updating subscription status:', noSubError);
        throw new Error('Failed to update subscription status in database');
      }
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
      console.error('Error syncing subscription:', subError);
      throw new Error('Failed to sync subscription in database');
    }

    // Add subscription credits if subscription is active
    if (subscription.status === 'active' || subscription.status === 'trialing') {
      // Get user ID from customer ID
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('stripe_customer_id', customerId)
        .single();

      if (userError || !userData) {
        console.error('Error finding user for subscription credits:', userError);
      } else {
        // Check if we need to add subscription credits (new subscription or renewal)
        const currentPeriodStart = new Date(subscription.current_period_start * 1000);
        const now = new Date();
        const timeDiff = now.getTime() - currentPeriodStart.getTime();
        const isNewPeriod = timeDiff < 24 * 60 * 60 * 1000; // Within 24 hours of period start

        if (isNewPeriod) {
          const { error: creditError } = await supabase.rpc('add_credits_typed', {
            user_uuid: userData.id,
            credit_amount: 250,
            credit_source: 'subscription',
            transaction_description: 'Monthly subscription credits',
            transaction_metadata: {
              stripe_subscription_id: subscription.id,
              stripe_customer_id: customerId,
              period_start: subscription.current_period_start,
              period_end: subscription.current_period_end
            }
          });

          if (creditError) {
            console.error('Error adding subscription credits:', creditError);
          } else {
            console.info(`Successfully added 250 subscription credits to user ${userData.id}`);
          }
        }
      }
    }

    console.info(`Successfully synced subscription for customer: ${customerId}`);
  } catch (error) {
    console.error(`Failed to sync subscription for customer ${customerId}:`, error);
    throw error;
  }
}