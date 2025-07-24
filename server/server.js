const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const Stripe = require('stripe');
const fetch = require('node-fetch');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3002;

// Инициализация Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Telegram Bot Configuration
const TELEGRAM_BOT_TOKEN = '7788182965:AAEiUmRg4l_HvaV3honhiVZluu_gFadOcrA';
const TELEGRAM_CHAT_ID = '-1002604809855';

// Telegram helper function
async function sendTelegramMessage(text) {
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

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Отдельный middleware для webhook (сырые данные)
app.use('/api/stripe/webhook', bodyParser.raw({ type: 'application/json' }));

// JSON parser для остальных endpoints
app.use(express.json());

// Продукты Stripe
const STRIPE_PRODUCTS = [
  {
    id: 'monthly-subscription',
    name: 'Monthly Subscription',
    priceId: 'price_1RiUt0AK7V4m73aluYckgD6P',
    productId: 'prod_SdmRKnaMEM7FE7',
    credits: 250,
    mode: 'subscription'
  },
  {
    id: 'small-topup',
    name: 'Small Credits',
    priceId: 'price_1RiUvhAK7V4m73alSPDpllg2',
    productId: 'prod_SdmU9mybV0ZUhw',
    credits: 100,
    mode: 'payment'
  },
  {
    id: 'medium-topup',
    name: 'Medium Credits',
    priceId: 'price_1RiUxdAK7V4m73alz8Oad0YH',
    productId: 'prod_SdmWCbIxv9eioK',
    credits: 500,
    mode: 'payment'
  },
  {
    id: 'xxl-topup',
    name: 'XXL Credits',
    priceId: 'price_1RiUyPAK7V4m73alBCuO8sYC',
    productId: 'prod_SdmXQUfirQZKGf',
    credits: 1500,
    mode: 'payment'
  }
];

// Функция для поиска продукта по price ID
function getProductByPriceId(priceId) {
  return STRIPE_PRODUCTS.find(product => product.priceId === priceId);
}

// API endpoint для создания checkout session
app.post('/api/stripe/create-checkout-session', async (req, res) => {
  try {
    console.log('📝 Received checkout session request:', req.body);
    
    const { priceId, mode, successUrl, cancelUrl, customerEmail, userId, credits } = req.body;
    
    // Валидация входных данных
    if (!priceId || !mode || !successUrl || !cancelUrl || !customerEmail || !userId) {
      return res.status(400).json({ 
        error: 'Missing required fields', 
        required: ['priceId', 'mode', 'successUrl', 'cancelUrl', 'customerEmail', 'userId'] 
      });
    }
    
    const product = getProductByPriceId(priceId);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    console.log('🔍 Found product:', product);

    // Находим или создаем customer
    let customer;
    const existingCustomers = await stripe.customers.list({
      email: customerEmail,
      limit: 1
    });

    if (existingCustomers.data.length > 0) {
      customer = existingCustomers.data[0];
      console.log('👤 Found existing customer:', customer.id);
    } else {
      customer = await stripe.customers.create({
        email: customerEmail,
        metadata: {
          userId: userId
        }
      });
      console.log('🆕 Created new customer:', customer.id);
    }

    // Создаем checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customer.id,
      payment_method_types: ['card'],
      line_items: [{
        price: priceId,
        quantity: 1,
      }],
      mode: mode,
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        userId: userId,
        credits: credits ? credits.toString() : product.credits.toString(),
        priceId: priceId
      }
    });

    console.log('✅ Created checkout session:', session.id);

    res.json({
      id: session.id,
      url: session.url
    });
  } catch (error) {
    console.error('❌ Error creating checkout session:', error);
    res.status(500).json({ error: error.message });
  }
});

// API endpoint для отмены подписки
app.post('/api/stripe/cancel-subscription', async (req, res) => {
  try {
    const { subscriptionId } = req.body;
    
    if (!subscriptionId) {
      return res.status(400).json({ error: 'Missing subscriptionId' });
    }
    
    const subscription = await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true
    });

    console.log('🚫 Subscription cancelled:', subscriptionId);
    
    res.json({ success: true, subscription });
  } catch (error) {
    console.error('❌ Error canceling subscription:', error);
    res.status(500).json({ error: error.message });
  }
});

// Webhook endpoint для обработки событий Stripe
app.post('/api/stripe/webhook', (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    console.log('🔔 Received webhook:', event.type);
  } catch (err) {
    console.error('❌ Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Обрабатываем событие
  handleStripeEvent(event);

  res.json({ received: true });
});

// Функция для обработки событий Stripe
async function handleStripeEvent(event) {
  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object);
        break;
      
      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object);
        break;
      
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object);
        break;
      
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object);
        break;
      
      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event.data.object);
        break;
      
      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object);
        break;
      
      default:
        console.log(`⚠️  Unhandled event type: ${event.type}`);
    }
  } catch (error) {
    console.error('❌ Error handling stripe event:', error);
  }
}

// Обработчики событий
async function handleCheckoutSessionCompleted(session) {
  console.log('✅ Checkout session completed:', session.id);
  
  try {
    // Get session details
    const userId = session.metadata?.userId || 'Unknown';
    const credits = session.metadata?.credits || 'N/A';
    const priceId = session.metadata?.priceId;
    
    // Find product info
    const product = getProductByPriceId(priceId);
    const productName = product ? product.name : 'Unknown Product';
    
    // Get customer info
    const customer = await stripe.customers.retrieve(session.customer);
    const customerEmail = customer.email || 'Unknown';
    
    const isSubscription = session.mode === 'subscription';
    const amountFormatted = (session.amount_total / 100).toFixed(2);
    
    // Format Telegram message
    let message = `💰 <b>Новая оплата в Donein5!</b>\n\n`;
    
    if (isSubscription) {
      message += `🔄 <b>Тип:</b> Подписка\n`;
      message += `📦 <b>Продукт:</b> ${productName}\n`;
      message += `💵 <b>Сумма:</b> $${amountFormatted}/месяц\n`;
      if (credits && credits !== 'N/A') {
        message += `⚡ <b>Кредиты:</b> ${credits} в месяц\n`;
      }
    } else {
      message += `🛒 <b>Тип:</b> Разовая покупка\n`;
      message += `📦 <b>Продукт:</b> ${productName}\n`;
      message += `💵 <b>Сумма:</b> $${amountFormatted}\n`;
      if (credits && credits !== 'N/A') {
        message += `⚡ <b>Кредиты:</b> ${credits}\n`;
        const creditPrice = (session.amount_total / 100 / parseInt(credits)).toFixed(3);
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
    
    // Send Telegram notification
    await sendTelegramMessage(message);
    
  } catch (error) {
    console.error('❌ Error processing checkout session completion:', error);
  }
}

async function handleSubscriptionCreated(subscription) {
  console.log('🔄 Subscription created:', subscription.id);
  // Логика для создания записи о подписке
}

async function handleSubscriptionUpdated(subscription) {
  console.log('🔄 Subscription updated:', subscription.id);
  // Логика для обновления подписки
}

async function handleSubscriptionDeleted(subscription) {
  console.log('🗑️  Subscription deleted:', subscription.id);
  
  try {
    // Get customer info
    const customer = await stripe.customers.retrieve(subscription.customer);
    const customerEmail = customer.email || 'Unknown';
    const userId = customer.metadata?.userId || 'Unknown';
    
    const message = `🚫 <b>Подписка отменена</b>\n\n` +
      `👤 <b>Пользователь:</b>\n` +
      `   📧 ${customerEmail}\n` +
      `   🆔 ${userId}\n\n` +
      `🔄 <b>Subscription ID:</b> <code>${subscription.id}</code>\n` +
      `🕐 <b>Время:</b> ${new Date().toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })}\n\n` +
      `---\n` +
      `<i>💫 Отправлено из Donein5 Payment System</i>`;

    await sendTelegramMessage(message);
  } catch (error) {
    console.error('❌ Error processing subscription deletion:', error);
  }
}

async function handleInvoicePaymentSucceeded(invoice) {
  console.log('💰 Invoice payment succeeded:', invoice.id);
  // Логика для успешного платежа
}

async function handleInvoicePaymentFailed(invoice) {
  console.log('❌ Invoice payment failed:', invoice.id);
  
  try {
    // Get customer info
    const customer = await stripe.customers.retrieve(invoice.customer);
    const customerEmail = customer.email || 'Unknown';
    const userId = customer.metadata?.userId || 'Unknown';
    
    const message = `❌ <b>Ошибка оплаты счета</b>\n\n` +
      `👤 <b>Пользователь:</b>\n` +
      `   📧 ${customerEmail}\n` +
      `   🆔 ${userId}\n\n` +
      `🧾 <b>Invoice ID:</b> <code>${invoice.id}</code>\n` +
      `💵 <b>Сумма:</b> $${(invoice.amount_due / 100).toFixed(2)}\n` +
      `🕐 <b>Время:</b> ${new Date().toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })}\n\n` +
      `---\n` +
      `<i>💫 Отправлено из Donein5 Payment System</i>`;

    await sendTelegramMessage(message);
  } catch (error) {
    console.error('❌ Error processing invoice payment failure:', error);
  }
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    stripe_configured: !!process.env.STRIPE_SECRET_KEY,
    telegram_configured: !!(TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID)
  });
});

// Test Telegram notification endpoint
app.post('/api/telegram/test', async (req, res) => {
  try {
    const message = `🧪 <b>Test от Donein5</b>\n\n` +
      `✅ Telegram интеграция работает!\n` +
      `🕐 ${new Date().toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })}`;

    const success = await sendTelegramMessage(message);
    
    if (success) {
      res.json({ success: true, message: 'Test message sent successfully' });
    } else {
      res.status(500).json({ success: false, error: 'Failed to send test message' });
    }
  } catch (error) {
    console.error('❌ Telegram test failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});


// Handle preflight requests for Telegram endpoint
app.options('/api/telegram/notify-idea', (req, res) => {
  const origin = req.headers.origin;
  const allowedOrigins = ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000'];
  
  if (allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  }
  res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.status(200).end();
});

// Notify about new idea suggestion
app.post('/api/telegram/notify-idea', async (req, res) => {
  // Добавляем CORS заголовки для POST запроса
  const origin = req.headers.origin;
  const allowedOrigins = ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000'];
  
  if (allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  }
  res.header('Access-Control-Allow-Credentials', 'true');
  
  try {
    console.log('📝 Получено уведомление о новой идее:', req.body);
    
    const { idea } = req.body;
    
    if (!idea) {
      return res.status(400).json({ error: 'Missing idea data' });
    }

    // Форматируем сообщение для идеи
    const categoryEmojis = {
      'new_agent': '🤖',
      'feature_improvement': '⚡',
      'ui_enhancement': '🎨',
      'integration': '🔗',
      'other': '💡'
    };

    const priorityEmojis = {
      'low': '🟢',
      'medium': '🟡',
      'high': '🟠',
      'urgent': '🔴'
    };

    const categoryNames = {
      'new_agent': 'Новый агент',
      'feature_improvement': 'Улучшение функций',
      'ui_enhancement': 'Улучшение UI',
      'integration': 'Интеграция',
      'other': 'Другое'
    };

    const priorityNames = {
      'low': 'Низкий',
      'medium': 'Средний', 
      'high': 'Высокий',
      'urgent': 'Срочный'
    };

    const categoryEmoji = categoryEmojis[idea.category] || '💡';
    const priorityEmoji = priorityEmojis[idea.priority] || '🟡';
    const categoryName = categoryNames[idea.category] || idea.category;
    const priorityName = priorityNames[idea.priority] || idea.priority;

    const formattedDate = new Date(idea.created_at).toLocaleString('ru-RU', {
      timeZone: 'Europe/Moscow',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });

    const message = `🚀 <b>Новая идея для Donein5!</b>\n\n` +
      `${categoryEmoji} <b>Категория:</b> ${categoryName}\n` +
      `${priorityEmoji} <b>Приоритет:</b> ${priorityName}\n\n` +
      `📝 <b>Заголовок:</b>\n${idea.title}\n\n` +
      `📋 <b>Описание:</b>\n${idea.description}\n\n` +
      `👤 <b>Пользователь:</b> ${idea.user_id ? `ID: ${idea.user_id}` : 'Анонимный'}\n` +
      `🕐 <b>Время:</b> ${formattedDate}\n` +
      `🆔 <b>ID идеи:</b> <code>${idea.id}</code>\n\n` +
      `---\n` +
      `<i>Отправлено из Donein5</i>`;

    const success = await sendTelegramMessage(message);
    
    if (success) {
      console.log('✅ Уведомление об идее отправлено в Telegram');
      res.json({ success: true, message: 'Idea notification sent to Telegram' });
    } else {
      console.log('❌ Не удалось отправить уведомление об идее');
      res.status(500).json({ success: false, error: 'Failed to send idea notification' });
    }
  } catch (error) {
    console.error('❌ Error sending idea notification:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Запуск сервера
app.listen(port, () => {
  console.log(`🚀 Stripe server running on port ${port}`);
  console.log(`📊 Health check: http://localhost:${port}/health`);
  console.log(`🔑 Stripe configured: ${!!process.env.STRIPE_SECRET_KEY}`);
}); 