const Stripe = require('stripe');

if (!process.env.STRIPE_SECRET_KEY) {
  console.error('❌ STRIPE_SECRET_KEY environment variable is not set');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

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

function getProductByPriceId(priceId) {
  return STRIPE_PRODUCTS.find(product => product.priceId === priceId);
}

exports.handler = async (event, context) => {
  console.log('🚀 Netlify Function started');
  console.log('📝 HTTP Method:', event.httpMethod);
  console.log('🔑 Has Stripe Key:', !!process.env.STRIPE_SECRET_KEY);

  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    console.log('✅ Handling CORS preflight');
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    console.log('❌ Method not allowed:', event.httpMethod);
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  // Check if Stripe is configured
  if (!process.env.STRIPE_SECRET_KEY) {
    console.error('❌ STRIPE_SECRET_KEY not configured');
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Stripe not configured on server' })
    };
  }

  try {
    const { priceId, mode, successUrl, cancelUrl, customerEmail, userId, credits } = JSON.parse(event.body);
    
    console.log('📝 Received checkout session request:', { priceId, mode, customerEmail, userId });
    
    // Валидация входных данных
    if (!priceId || !mode || !successUrl || !cancelUrl || !customerEmail || !userId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Missing required fields', 
          required: ['priceId', 'mode', 'successUrl', 'cancelUrl', 'customerEmail', 'userId'] 
        })
      };
    }
    
    const product = getProductByPriceId(priceId);
    if (!product) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Product not found' })
      };
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

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        id: session.id,
        url: session.url
      })
    };
  } catch (error) {
    console.error('❌ Error creating checkout session:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};