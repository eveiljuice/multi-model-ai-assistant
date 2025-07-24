// Test script to check Stripe environment variables
const SUPABASE_URL = 'https://sgzlhcagtesjazvwskjw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNnemxoY2FndGVzamF6dndza2p3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEyMjY1NTAsImV4cCI6MjA2NjgwMjU1MH0.FyANbeHq6ju5rk6dpjqMHhrmIT2wGna7ixTLpUG_u90';

async function testEnvironmentVariables() {
    try {
        console.log('Testing environment variables...');
        
        const response = await fetch(`${SUPABASE_URL}/functions/v1/test-env`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();
        console.log('Environment check response:', data);
        
        if (data.variables) {
            console.log('\n=== Environment Variables Status ===');
            Object.entries(data.variables).forEach(([key, value]) => {
                console.log(`${key}: ${value}`);
            });
        }
        
    } catch (error) {
        console.error('Error testing environment:', error);
    }
}

async function testStripeCheckout() {
    try {
        console.log('\nTesting Stripe checkout...');
        
        const response = await fetch(`${SUPABASE_URL}/functions/v1/stripe-checkout-v3`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                priceId: 'price_1RiUvhAK7V4m73alSPDpllg2', // 100 credits
                mode: 'payment',
                successUrl: 'http://localhost:5174/success',
                cancelUrl: 'http://localhost:5174/pricing'
            })
        });

        console.log('Response status:', response.status);
        console.log('Response headers:', Object.fromEntries(response.headers.entries()));
        
        const data = await response.json();
        console.log('Stripe checkout response:', data);
        
    } catch (error) {
        console.error('Error testing Stripe checkout:', error);
    }
}

// Run tests
testEnvironmentVariables().then(() => {
    return testStripeCheckout();
});