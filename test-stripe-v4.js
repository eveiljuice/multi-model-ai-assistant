// Test script for new stripe-checkout-v4 function
const SUPABASE_URL = 'https://sgzlhcagtesjazvwskjw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNnemxoY2FndGVzamF6dndza2p3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEyMjY1NTAsImV4cCI6MjA2NjgwMjU1MH0.FyANbeHq6ju5rk6dpjqMHhrmIT2wGna7ixTLpUG_u90';

async function testStripeV4() {
    try {
        console.log('Testing stripe-checkout-v4...');
        
        const response = await fetch(`${SUPABASE_URL}/functions/v1/stripe-checkout-v4`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json',
                'Origin': 'http://localhost:5174'
            },
            body: JSON.stringify({
                priceId: 'price_1RiUvhAK7V4m73alSPDpllg2',
                mode: 'payment',
                successUrl: 'http://localhost:5174/success?session_id={CHECKOUT_SESSION_ID}',
                cancelUrl: 'http://localhost:5174/pricing'
            })
        });

        console.log('Response status:', response.status);
        console.log('Response headers:');
        response.headers.forEach((value, key) => {
            console.log(`  ${key}: ${value}`);
        });
        
        const data = await response.json();
        console.log('Response data:', data);
        
        if (response.status === 200) {
            console.log('✅ stripe-checkout-v4 works correctly!');
            console.log('Session ID:', data.sessionId);
            console.log('Checkout URL:', data.url?.substring(0, 100) + '...');
        } else {
            console.log('❌ stripe-checkout-v4 failed with status:', response.status);
        }
        
    } catch (error) {
        console.error('❌ Test error:', error);
    }
}

// Run test
testStripeV4();