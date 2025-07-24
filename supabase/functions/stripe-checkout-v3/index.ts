import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import Stripe from 'https://esm.sh/stripe@14.21.0';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

// Try to import CORS functions, fallback to local implementation
let corsHeaders: Record<string, string>;
let getCorsHeaders: (origin: string | null) => Record<string, string>;
let handleCorsOptions: (req: Request) => Response;
let createCorsResponse: (data: any, status: number, req: Request) => Response;

try {
    const corsModule = await import('../_shared/cors.ts');
    corsHeaders = corsModule.corsHeaders;
    getCorsHeaders = corsModule.getCorsHeaders;
    handleCorsOptions = corsModule.handleCorsOptions;
    createCorsResponse = corsModule.createCorsResponse;
} catch (error) {
    console.warn('Failed to import CORS module, using fallback:', error);

    // Fallback CORS implementation
    corsHeaders = {
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-requested-with',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Max-Age': '86400',
    };

    getCorsHeaders = (origin: string | null) => {
        const headers = { ...corsHeaders };
        // In development, allow localhost origins
        if (origin && (origin.includes('localhost') || origin.includes('127.0.0.1'))) {
            headers['Access-Control-Allow-Origin'] = origin;
        } else {
            headers['Access-Control-Allow-Origin'] = '*';
        }
        return headers;
    };

    handleCorsOptions = (req: Request) => {
        const origin = req.headers.get('Origin');
        const headers = getCorsHeaders(origin);
        return new Response(null, { status: 204, headers });
    };

    createCorsResponse = (data: any, status: number = 200, req: Request) => {
        const origin = req.headers.get('Origin');
        const headers = getCorsHeaders(origin);
        return new Response(JSON.stringify(data), {
            status,
            headers: { ...headers, 'Content-Type': 'application/json' }
        });
    };
}

interface StripeKeys {
    publicKey: string;
    secretKey: string;
    webhookSecret: string;
}

interface ProductConfig {
    priceId: string;
    productId: string;
    credits: number;
    mode: 'payment' | 'subscription';
}

const PRODUCTS: Record<string, ProductConfig> = {
    'price_1RiUt0AK7V4m73aluYckgD6P': {
        priceId: 'price_1RiUt0AK7V4m73aluYckgD6P',
        productId: 'prod_SdmRKnaMEM7FE7',
        credits: 250,
        mode: 'subscription'
    },
    'price_1RiUvhAK7V4m73alSPDpllg2': {
        priceId: 'price_1RiUvhAK7V4m73alSPDpllg2',
        productId: 'prod_SdmU9mybV0ZUhw',
        credits: 100,
        mode: 'payment'
    },
    'price_1RiUxdAK7V4m73alz8Oad0YH': {
        priceId: 'price_1RiUxdAK7V4m73alz8Oad0YH',
        productId: 'prod_SdmWCbIxv9eioK',
        credits: 500,
        mode: 'payment'
    },
    'price_1RiUyPAK7V4m73alBCuO8sYC': {
        priceId: 'price_1RiUyPAK7V4m73alBCuO8sYC',
        productId: 'prod_SdmXQUfirQZKGf',
        credits: 1500,
        mode: 'payment'
    }
};



async function getStripeKeys(): Promise<StripeKeys> {
    // Get keys from environment variables
    const publicKey = Deno.env.get('STRIPE_PUBLIC_KEY');
    const secretKey = Deno.env.get('STRIPE_SECRET_KEY');
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

    if (!publicKey || !secretKey || !webhookSecret) {
        throw new Error('Missing Stripe environment variables. Please set STRIPE_PUBLIC_KEY, STRIPE_SECRET_KEY, and STRIPE_WEBHOOK_SECRET');
    }

    return {
        publicKey,
        secretKey,
        webhookSecret
    };
}

async function getOrCreateCustomer(stripe: Stripe, userId: string, email: string): Promise<string> {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if customer exists
    const { data: existingCustomer, error: customerError } = await supabase
        .from('stripe_customers')
        .select('customer_id')
        .eq('user_id', userId)
        .single();

    if (existingCustomer && !customerError) {
        return existingCustomer.customer_id;
    }

    // Create new customer
    const customer = await stripe.customers.create({
        email,
        metadata: {
            user_id: userId
        }
    });

    // Save customer ID
    await supabase
        .from('stripe_customers')
        .insert({
            user_id: userId,
            customer_id: customer.id,
            email: customer.email
        });

    return customer.id;
}

serve(async (req) => {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        return handleCorsOptions(req);
    }

    if (req.method !== 'POST') {
        return createCorsResponse({ error: 'Method not allowed' }, 405, req);
    }

    try {
        // First, let's check if all required environment variables are set
        const envCheck = {
            STRIPE_PUBLIC_KEY: !!Deno.env.get('STRIPE_PUBLIC_KEY'),
            STRIPE_SECRET_KEY: !!Deno.env.get('STRIPE_SECRET_KEY'),
            STRIPE_WEBHOOK_SECRET: !!Deno.env.get('STRIPE_WEBHOOK_SECRET'),
            SUPABASE_URL: !!Deno.env.get('SUPABASE_URL'),
            SUPABASE_SERVICE_ROLE_KEY: !!Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
            SUPABASE_ANON_KEY: !!Deno.env.get('SUPABASE_ANON_KEY')
        };

        console.log('Environment variables check:', envCheck);

        const { priceId, mode, successUrl, cancelUrl } = await req.json();
        console.log('Request payload:', { priceId, mode, successUrl, cancelUrl });

        if (!priceId) {
            return createCorsResponse({ error: 'Price ID is required' }, 400, req);
        }

        // Get product config
        const productConfig = PRODUCTS[priceId];
        if (!productConfig) {
            return createCorsResponse({ error: 'Invalid price ID' }, 400, req);
        }

        // Get user from JWT
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
            return createCorsResponse({ error: 'Authorization header required' }, 401, req);
        }

        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

        const supabase = createClient(supabaseUrl, supabaseAnonKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        });

        const { data: { user }, error: userError } = await supabase.auth.getUser(
            authHeader.replace('Bearer ', '')
        );

        // For testing purposes, allow anon users
        let userId = 'anonymous-user';
        let userEmail = 'test@example.com';

        if (user && !userError) {
            userId = user.id;
            userEmail = user.email || 'test@example.com';
        }

        // Get Stripe keys
        const keys = await getStripeKeys();
        const stripe = new Stripe(keys.secretKey, {
            apiVersion: '2023-10-16'
        });

        // Get or create customer
        const customerId = await getOrCreateCustomer(stripe, userId, userEmail);

        // Create checkout session
        const sessionConfig: Stripe.Checkout.SessionCreateParams = {
            customer: customerId,
            payment_method_types: ['card'],
            line_items: [
                {
                    price: priceId,
                    quantity: 1
                }
            ],
            mode: mode || productConfig.mode,
            success_url: successUrl || 'http://localhost:5174/success?session_id={CHECKOUT_SESSION_ID}',
            cancel_url: cancelUrl || 'http://localhost:5174/pricing',
            metadata: {
                user_id: userId,
                credits: productConfig.credits.toString()
            }
        };

        const session = await stripe.checkout.sessions.create(sessionConfig);

        return createCorsResponse({
            sessionId: session.id,
            url: session.url
        }, 200, req);

    } catch (error) {
        console.error('Stripe checkout error:', error);

        return createCorsResponse({
            error: error instanceof Error ? error.message : 'Unknown error'
        }, 500, req);
    }
});