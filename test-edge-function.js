// Простой тест Edge Function
const SUPABASE_URL = 'https://sgzlhcagtesjazvwskjw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNnemxoY2FndGVzamF6dndza2p3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEyMjY1NTAsImV4cCI6MjA2NjgwMjU1MH0.FyANbeHq6ju5rk6dpjqMHhrmIT2wGna7ixTLpUG_u90';

async function testEdgeFunction() {
  console.log('🧪 Testing Edge Function...');
  
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/test-stripe`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        test: 'hello from test script',
        product_id: 'test-product',
        user_id: 'test-user'
      })
    });
    
    console.log('📊 Response Status:', response.status);
    console.log('📊 Response Headers:', Object.fromEntries(response.headers));
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Success! Function Response:', JSON.stringify(data, null, 2));
    } else {
      const errorText = await response.text();
      console.log('❌ Error Response:', errorText);
    }
    
  } catch (error) {
    console.error('💥 Request Failed:', error.message);
  }
}

async function testStripeCheckout() {
  console.log('🛒 Testing Stripe Checkout...');
  
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/stripe-checkout`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        price_id: 'price_1RiUt0AK7V4m73aluYckgD6P',
        mode: 'subscription',
        success_url: 'http://localhost:5174/success?session_id={CHECKOUT_SESSION_ID}',
        cancel_url: 'http://localhost:5174/pricing'
      })
    });
    
    console.log('📊 Stripe Response Status:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Stripe Success! Response:', JSON.stringify(data, null, 2));
    } else {
      const errorText = await response.text();
      console.log('❌ Stripe Error Response:', errorText);
    }
    
  } catch (error) {
    console.error('💥 Stripe Request Failed:', error.message);
  }
}

// Запуск тестов
console.log('🚀 Starting Edge Function Tests...');
testEdgeFunction().then(() => {
  console.log('\n' + '='.repeat(50) + '\n');
  return testStripeCheckout();
}).then(() => {
  console.log('\n✨ All tests completed!');
}).catch(error => {
  console.error('💥 Test suite failed:', error);
}); 