import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@14.21.0';

// Telegram configuration
const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN') || '7788182965:AAEiUmRg4l_HvaV3honhiVZluu_gFadOcrA';
const TELEGRAM_CHAT_ID = Deno.env.get('TELEGRAM_CHAT_ID') || '-1002604809855';

// Telegram helper function
async function sendTelegramMessage(text: string): Promise<boolean> {
  try {
    const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: text,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('❌ Telegram API error:', errorData);
      return false;
    }

    const result = await response.json();
    console.log('✅ Telegram message sent:', result.result.message_id);
    return true;
  } catch (error) {
    console.error('❌ Failed to send Telegram message:', error);
    return false;
  }
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

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

    // Инициализируем Supabase клиент
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Получаем Stripe секреты
    const { data: secrets, error: secretsError } = await supabase.rpc('get_stripe_secrets_admin');
    
    if (secretsError || !secrets?.secret_key || !secrets?.webhook_secret) {
      return new Response(
        JSON.stringify({ error: 'Stripe configuration not found' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Инициализируем Stripe
    const stripe = new Stripe(secrets.secret_key, {
      apiVersion: '2023-10-16'
    });

    // Проверяем подпись webhook'а
    let event: Stripe.Event;
    
    try {
      event = stripe.webhooks.constructEvent(body, signature, secrets.webhook_secret);
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

    // Проверяем идемпотентность
    const { data: existingEvent } = await supabase
      .from('stripe_events')
      .select('stripe_event_id')
      .eq('stripe_event_id', event.id)
      .single();

    if (existingEvent) {
      return new Response(
        JSON.stringify({ status: 'already_processed' }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Записываем событие
    await supabase
      .from('stripe_events')
      .insert({
        stripe_event_id: event.id,
        event_type: event.type,
        processed_at: new Date().toISOString()
      });

    // Обрабатываем разные типы событий
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session, supabase);
        break;
      
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription, supabase);
        break;
      
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription, supabase);
        break;
      
      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice, supabase);
        break;
      
      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice, supabase);
        break;
      
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return new Response(
      JSON.stringify({ status: 'processed' }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Webhook processing error:', error);

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

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session, supabase: any) {
  const customerId = session.customer as string;
  const userId = session.metadata?.user_id;
  const credits = parseInt(session.metadata?.credits || '0');

  if (!userId) {
    console.error('No user_id in session metadata');
    return;
  }

  // Создаем или обновляем customer
  await supabase
    .from('stripe_customers')
    .upsert({
      user_id: userId,
      customer_id: customerId,
      email: session.customer_email,
      updated_at: new Date().toISOString()
    });

  // Обновляем заказ
  await supabase
    .from('stripe_orders')
    .upsert({
      checkout_session_id: session.id,
      payment_intent_id: session.payment_intent as string,
      customer_id: customerId,
      amount_total: session.amount_total,
      currency: session.currency,
      payment_status: session.payment_status,
      status: 'completed',
      credits_amount: credits,
      updated_at: new Date().toISOString()
    });

  // Добавляем кредиты пользователю
  if (credits > 0) {
    await supabase
      .from('credit_transactions')
      .insert({
        user_id: userId,
        amount: credits,
        transaction_type: 'purchase',
        description: `Stripe payment: ${session.id}`,
        reference_id: session.id,
        created_at: new Date().toISOString()
      });
  }

  // Отправляем Telegram уведомление
  try {
    const customerEmail = session.customer_email || 'Unknown';
    const isSubscription = session.mode === 'subscription';
    const amountFormatted = ((session.amount_total || 0) / 100).toFixed(2);
    
    let message = `💰 <b>Новая оплата в Donein5!</b>\n\n`;
    
    if (isSubscription) {
      message += `🔄 <b>Тип:</b> Подписка\n`;
      message += `💵 <b>Сумма:</b> $${amountFormatted}/месяц\n`;
      if (credits > 0) {
        message += `⚡ <b>Кредиты:</b> ${credits} в месяц\n`;
      }
    } else {
      message += `🛒 <b>Тип:</b> Разовая покупка\n`;
      message += `💵 <b>Сумма:</b> $${amountFormatted}\n`;
      if (credits > 0) {
        message += `⚡ <b>Кредиты:</b> ${credits}\n`;
        const creditPrice = ((session.amount_total || 0) / 100 / credits).toFixed(3);
        message += `💎 <b>Цена за кредит:</b> $${creditPrice}\n`;
      }
    }
    
    message += `\n👤 <b>Пользователь:</b>\n`;
    message += `   📧 ${customerEmail}\n`;
    message += `   🆔 ${userId}\n`;
    
    message += `\n🧾 <b>Stripe Session:</b> <code>${session.id}</code>\n`;
    message += `🕐 <b>Время:</b> ${new Date().toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })}\n`;
    
    message += `\n---\n`;
    message += `<i>💫 Отправлено из Donein5 Payment System</i>`;
    
    await sendTelegramMessage(message);
    console.log('✅ Telegram notification sent for checkout session:', session.id);
    
  } catch (telegramError) {
    console.error('❌ Failed to send Telegram notification for checkout session:', telegramError);
    // Не прерываем выполнение если Telegram не работает
  }
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription, supabase: any) {
  const customerId = subscription.customer as string;
  const priceId = subscription.items.data[0]?.price?.id;

  // Создаем или обновляем подписку
  await supabase
    .from('stripe_subscriptions')
    .upsert({
      subscription_id: subscription.id,
      customer_id: customerId,
      status: subscription.status,
      price_id: priceId,
      current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      updated_at: new Date().toISOString()
    });
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription, supabase: any) {
  // Обновляем статус подписки
  await supabase
    .from('stripe_subscriptions')
    .update({
      status: 'canceled',
      updated_at: new Date().toISOString()
    })
    .eq('subscription_id', subscription.id);

  // Отправляем Telegram уведомление об отмене подписки
  try {
    const customerId = subscription.customer as string;

    // Находим пользователя по customer_id
    const { data: customer } = await supabase
      .from('stripe_customers')
      .select('user_id, email')
      .eq('customer_id', customerId)
      .single();

    if (customer) {
      const message = `🚫 <b>Подписка отменена</b>\n\n` +
        `👤 <b>Пользователь:</b>\n` +
        `   📧 ${customer.email || 'Unknown'}\n` +
        `   🆔 ${customer.user_id}\n\n` +
        `🔄 <b>Subscription ID:</b> <code>${subscription.id}</code>\n` +
        `🕐 <b>Время:</b> ${new Date().toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })}\n\n` +
        `---\n` +
        `<i>💫 Отправлено из Donein5 Payment System</i>`;

      await sendTelegramMessage(message);
      console.log('✅ Telegram notification sent for subscription cancellation:', subscription.id);
    }
    
  } catch (telegramError) {
    console.error('❌ Failed to send Telegram notification for subscription cancellation:', telegramError);
    // Не прерываем выполнение если Telegram не работает
  }
}

async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice, supabase: any) {
  const subscriptionId = invoice.subscription as string;
  const customerId = invoice.customer as string;

  if (!subscriptionId) return;

  // Находим пользователя по customer_id
  const { data: customer } = await supabase
    .from('stripe_customers')
    .select('user_id, email')
    .eq('customer_id', customerId)
    .single();

  if (!customer) return;

  // Добавляем кредиты за подписку (250 кредитов в месяц)
  await supabase
    .from('credit_transactions')
    .insert({
      user_id: customer.user_id,
      amount: 250,
      transaction_type: 'subscription',
      description: `Monthly subscription credits: ${invoice.id}`,
      reference_id: invoice.id,
      created_at: new Date().toISOString()
    });

  // Отправляем Telegram уведомление о рекуррентном платеже
  try {
    const amountFormatted = ((invoice.amount_paid || 0) / 100).toFixed(2);
    
    const message = `🔄 <b>Рекуррентный платеж подписки</b>\n\n` +
      `💰 <b>Сумма:</b> $${amountFormatted}\n` +
      `⚡ <b>Кредиты добавлены:</b> 250\n\n` +
      `👤 <b>Пользователь:</b>\n` +
      `   📧 ${customer.email || 'Unknown'}\n` +
      `   🆔 ${customer.user_id}\n\n` +
      `🧾 <b>Invoice ID:</b> <code>${invoice.id}</code>\n` +
      `🔄 <b>Subscription ID:</b> <code>${subscriptionId}</code>\n` +
      `🕐 <b>Время:</b> ${new Date().toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })}\n\n` +
      `---\n` +
      `<i>💫 Отправлено из Donein5 Payment System</i>`;

    await sendTelegramMessage(message);
    console.log('✅ Telegram notification sent for recurring payment:', invoice.id);
    
  } catch (telegramError) {
    console.error('❌ Failed to send Telegram notification for recurring payment:', telegramError);
    // Не прерываем выполнение если Telegram не работает
  }
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice, supabase: any) {
  // Логируем неудачную оплату
  console.error(`Payment failed for invoice: ${invoice.id}`);
  
  const customerId = invoice.customer as string;

  // Находим пользователя по customer_id
  const { data: customer } = await supabase
    .from('stripe_customers')
    .select('user_id, email')
    .eq('customer_id', customerId)
    .single();

  if (!customer) return;

  // Отправляем Telegram уведомление о неудачном платеже
  try {
    const amountFormatted = ((invoice.amount_due || 0) / 100).toFixed(2);
    
    const message = `❌ <b>Ошибка оплаты счета</b>\n\n` +
      `👤 <b>Пользователь:</b>\n` +
      `   📧 ${customer.email || 'Unknown'}\n` +
      `   🆔 ${customer.user_id}\n\n` +
      `🧾 <b>Invoice ID:</b> <code>${invoice.id}</code>\n` +
      `💵 <b>Сумма:</b> $${amountFormatted}\n` +
      `🕐 <b>Время:</b> ${new Date().toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })}\n\n` +
      `---\n` +
      `<i>💫 Отправлено из Donein5 Payment System</i>`;

    await sendTelegramMessage(message);
    console.log('✅ Telegram notification sent for failed payment:', invoice.id);
    
  } catch (telegramError) {
    console.error('❌ Failed to send Telegram notification for failed payment:', telegramError);
    // Не прерываем выполнение если Telegram не работает
  }
} 