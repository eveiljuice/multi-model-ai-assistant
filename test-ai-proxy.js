import fetch from 'node-fetch';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://sgzlhcagtesjazvwskjw.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNnemxoY2FndGVzamF6dndza2p3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEyMjY1NTAsImV4cCI6MjA2NjgwMjU1MH0.FyANbeHq6ju5rk6dpjqMHhrmIT2wGna7ixTLpUG_u90';

async function testAIProxy() {
  console.log('🧪 Testing AI Proxy Edge Function...');
  
  const proxyUrl = `${SUPABASE_URL}/functions/v1/ai-proxy`;
  
  try {
    const response = await fetch(proxyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        provider: 'anthropic',
        model: 'claude-sonnet-4-20250514',
        messages: [
          { role: 'user', content: 'Hello! This is a test message.' }
        ],
        temperature: 0.7,
        max_tokens: 100
      })
    });

    console.log('📊 Response Status:', response.status);
    console.log('📊 Response Headers:', Object.fromEntries(response.headers));
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Error Response:', errorText);
      return;
    }

    const data = await response.json();
    console.log('✅ Success! Response:', data);
    
  } catch (error) {
    console.error('❌ Network Error:', error.message);
  }
}

testAIProxy(); 