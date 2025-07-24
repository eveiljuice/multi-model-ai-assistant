// Test script to simulate exact browser request
const SUPABASE_URL = 'https://sgzlhcagtesjazvwskjw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNnemxoY2FndGVzamF6dndza2p3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEyMjY1NTAsImV4cCI6MjA2NjgwMjU1MH0.FyANbeHq6ju5rk6dpjqMHhrmIT2wGna7ixTLpUG_u90';

async function simulateBrowserRequest() {
    try {
        console.log('Simulating browser request...');
        
        // This simulates the exact request that would be made by the browser
        const response = await fetch(`${SUPABASE_URL}/functions/v1/stripe-checkout-v3`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json',
                'Origin': 'http://localhost:5174', // This is the key difference!
                'Referer': 'http://localhost:5174/',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            body: JSON.stringify({
                priceId: 'price_1RiUvhAK7V4m73alSPDpllg2',
                mode: 'payment',
                successUrl: 'http://localhost:5174/success?session_id={CHECKOUT_SESSION_ID}',
                cancelUrl: 'http://localhost:5174/pricing'
            })
        });

        console.log('Response status:', response.status);
        console.log('Response headers:', Object.fromEntries(response.headers.entries()));
        
        const data = await response.json();
        console.log('Response data:', data);
        
        if (response.status !== 200) {
            console.error('❌ Request failed with status:', response.status);
        } else {
            console.log('✅ Request successful!');
        }
        
    } catch (error) {
        console.error('❌ Request error:', error);
    }
}

// Run test
simulateBrowserRequest();