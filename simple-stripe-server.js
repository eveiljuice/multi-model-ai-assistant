const express = require('express');
const cors = require('cors');
const Stripe = require('stripe');
require('dotenv').config();

const app = express();
const port = 3002;

// Инициализация Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:5174'],
  credentials: true
}));
app.use(express.json());

// Продукты Stripe
const STRIPE_PRODUCTS = {
  'price_1RiUt0AK7V4m73aluYckgD6P': { credits: 250, name: 'Monthly Subscription' },
  'price_1RiUvhAK7V4m73alSPDpllg2': { credits: 100, name: 'Small Credits' },
  'price_1RiUxdAK7V4m73alz8Oad0YH': { credits: 500, name: 'Medium Credits' },
  'price_1RiUyPAK7V4m73alBCuO8sYC': { credits: 1500, name: 'XXL Credits' }
};

// Health check
app.get('/health', (req, res) => {
  console.log('Health check called');
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    stripe_configured: !!process.env.STRIPE_SECRET_KEY
  });
});

// Создание checkout session
app.post('/api/stripe/create-checkout-session', async (req, res) => {
  console.log('🔥 Creating checkout session:', req.body);
  
  try {
    const { priceId, mode, successUrl, cancelUrl, customerEmail, userId } = req.body;
    
    if (!priceId || !customerEmail) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const product = STRIPE_PRODUCTS[priceId];
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Создаем checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price: priceId,
        quantity: 1,
      }],
      mode: mode || 'payment',
      success_url: successUrl || 'http://localhost:5173/success?session_id={CHECKOUT_SESSION_ID}',
      cancel_url: cancelUrl || 'http://localhost:5173/pricing',
      customer_email: customerEmail,
      metadata: {
        userId: userId || 'anonymous',
        credits: product.credits.toString(),
        priceId: priceId
      }
    });

    console.log('✅ Session created:', session.id);
    
    res.json({
      id: session.id,
      url: session.url
    });
  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Отмена подписки
app.post('/api/stripe/cancel-subscription', async (req, res) => {
  try {
    const { subscriptionId } = req.body;
    
    const subscription = await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true
    });
    
    res.json({ success: true, subscription });
  } catch (error) {
    console.error('❌ Error canceling subscription:', error);
    res.status(500).json({ error: error.message });
  }
});

// Запуск сервера
app.listen(port, () => {
  console.log(`🚀 Stripe server running on port ${port}`);
  console.log(`📊 Health check: http://localhost:${port}/health`);
  console.log(`🔑 Stripe key configured: ${!!process.env.STRIPE_SECRET_KEY}`);
}); 