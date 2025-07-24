// Enhanced CORS utility with origin validation
const ALLOWED_ORIGINS = [
  'https://sgzlhcagtesjazvwskjw.supabase.co', // Production
  'https://donein5.com', // Live domain
  'https://www.donein5.com', // Live domain with www
  'http://donein5.com', // Live domain HTTP (fallback)
  'http://www.donein5.com', // Live domain HTTP with www (fallback)
  'http://localhost:5173', // Local development (Vite default)
  'http://localhost:5174', // Local development (alternative port)  
  'http://localhost:5175', // Local development (another port)
  'http://localhost:3000', // Alternative local
  'http://localhost:4173', // Vite preview mode
  'http://localhost:8080', // Alternative dev port
  'https://localhost:5173', // Local HTTPS
  'https://localhost:5174', // Local HTTPS (alternative port)
  'https://localhost:5175', // Local HTTPS (another port)
  'https://localhost:4173', // HTTPS preview mode
  'http://127.0.0.1:5173', // Local IP variant
  'http://127.0.0.1:5174', // Local IP variant
  'http://127.0.0.1:5175', // Local IP variant
  'http://127.0.0.1:4173', // Local IP preview
  'http://127.0.0.1:3000', // Local IP alternative
];

export const corsHeaders = {
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-requested-with',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Max-Age': '86400', // 24 hours
};

export function validateOrigin(origin: string | null): boolean {
  if (!origin) {
    return false;
  }

  // Check if origin is in allowed list
  if (ALLOWED_ORIGINS.includes(origin)) {
    return true;
  }

  // Enhanced development mode detection
  const isDevelopment = 
    Deno.env.get('NODE_ENV') === 'development' ||
    Deno.env.get('DENO_DEPLOYMENT_ID') === undefined || // Not deployed
    Deno.env.get('SUPABASE_URL')?.includes('localhost') ||
    !Deno.env.get('VERCEL_URL'); // Not on Vercel = likely local

  if (isDevelopment) {
    // More permissive localhost pattern for development
    const localhostPattern = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;
    if (localhostPattern.test(origin)) {
      console.log('Development mode: allowing localhost origin:', origin);
      return true;
    }
    
    // Allow file:// protocol for local HTML tests
    if (origin === 'null' || origin?.startsWith('file://')) {
      console.log('Development mode: allowing file protocol origin:', origin);
      return true;
    }
  }

  console.warn('Origin validation failed:', { origin, isDevelopment });
  return false;
}

export function getCorsHeaders(origin: string | null): Record<string, string> {
  const headers = { ...corsHeaders };

  if (validateOrigin(origin)) {
    headers['Access-Control-Allow-Origin'] = origin!;
  } else {
    // In development, be more permissive
    const isDevelopment = 
      Deno.env.get('NODE_ENV') === 'development' ||
      Deno.env.get('DENO_DEPLOYMENT_ID') === undefined;
      
    if (isDevelopment && origin?.includes('localhost')) {
      console.log('Development fallback: allowing localhost origin:', origin);
      headers['Access-Control-Allow-Origin'] = origin;
    } else {
      console.warn('Invalid origin blocked:', origin);
      // For debugging in development, still set CORS header
      if (isDevelopment) {
        headers['Access-Control-Allow-Origin'] = '*';
      }
    }
  }

  return headers;
}

export function handleCorsOptions(req: Request): Response {
  const origin = req.headers.get('Origin');
  const headers = getCorsHeaders(origin);
  
  console.log('CORS preflight request:', { 
    origin, 
    method: req.method,
    allowedOrigin: headers['Access-Control-Allow-Origin']
  });

  return new Response(null, {
    status: 200, // Changed from 204 to 200
    headers
  });
}

export function createCorsResponse(data: any, status: number = 200, req: Request): Response {
  const origin = req.headers.get('Origin');
  const headers = getCorsHeaders(origin);

  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...headers,
      'Content-Type': 'application/json',
    },
  });
} 