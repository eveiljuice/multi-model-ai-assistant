import { loadStripe, Stripe } from '@stripe/stripe-js';
import { supabase } from './supabaseClient';
import { getProductByPriceId, StripeProduct } from '../config/stripe-products';

export interface StripeCheckoutResponse {
  success: boolean;
  sessionId?: string;
  url?: string;
  error?: string;
}

export interface StripeSubscriptionData {
  customerId: string;
  subscriptionId: string;
  status: string;
  priceId: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
}

export interface StripeOrderData {
  orderId: string;
  customerId: string;
  priceId: string;
  amount: number;
  currency: string;
  status: string;
  credits: number;
  checkoutSessionId?: string;
}

export interface StripeConfig {
  publicKey: string;
  secretKey: string;
  webhookSecret: string;
}

class StripeService {
  private stripePromise: Promise<Stripe | null> | null = null;
  private publicKey: string | null = null;

  /**
   * Получает публичный ключ Stripe из переменных окружения
   */
  private getPublicKey(): string {
    if (this.publicKey) {
      return this.publicKey;
    }

    const publicKey = import.meta.env.VITE_STRIPE_PUBLIC_KEY;
    
    if (!publicKey) {
      throw new Error('Stripe public key not configured in environment variables');
    }

    this.publicKey = publicKey;
    return this.publicKey;
  }

  /**
   * Получает Stripe клиент для фронтенда
   */
  private async getStripeClient(): Promise<Stripe | null> {
    if (!this.stripePromise) {
      const publicKey = this.getPublicKey();
      this.stripePromise = loadStripe(publicKey);
    }
    return this.stripePromise;
  }

  /**
   * Создает checkout сессию напрямую через Stripe API
   */
  async createCheckoutSession(
    priceId: string,
    mode: 'payment' | 'subscription' = 'payment',
    successUrl?: string,
    cancelUrl?: string
  ): Promise<StripeCheckoutResponse> {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session) {
        throw new Error('User not authenticated');
      }

      const user = session.user;
      const baseUrl = window.location.origin;
      const defaultSuccessUrl = successUrl || `${baseUrl}/success?session_id={CHECKOUT_SESSION_ID}`;
      const defaultCancelUrl = cancelUrl || `${baseUrl}/pricing`;

      const product = getProductByPriceId(priceId);
      if (!product) {
        throw new Error('Product not found');
      }

      console.log('🔄 Creating checkout session for product:', product);

      // Создаем checkout session через API
      const checkoutSession = await this.createStripeCheckoutSession({
        priceId,
        mode,
        successUrl: defaultSuccessUrl,
        cancelUrl: defaultCancelUrl,
        customerEmail: user.email!,
        userId: user.id,
        credits: product.credits
      });

      return {
        success: true,
        sessionId: checkoutSession.id,
        url: checkoutSession.url
      };
    } catch (error) {
      console.error('Stripe checkout error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Создает checkout session через собственный API
   */
  private async createStripeCheckoutSession(options: {
    priceId: string;
    mode: 'payment' | 'subscription';
    successUrl: string;
    cancelUrl: string;
    customerEmail: string;
    userId: string;
    credits: number;
  }): Promise<any> {
    console.log('📤 Sending request to create checkout session:', options);
    
    // Используем только Express server для надежности
    console.log('🎯 Using Express server as primary method');
    return await this.createCheckoutViaExpressServer(options);
  }

  private async createCheckoutViaEdgeFunction(options: any): Promise<any> {
    // Получаем и обновляем токен аутентификации
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session?.access_token) {
      console.error('❌ Session error:', sessionError);
      throw new Error('User not authenticated or session expired');
    }

    // Логируем для отладки
    console.log('🔑 Using session token length:', session.access_token.length);
    console.log('👤 User ID:', session.user.id);

    try {
      const response = await supabase.functions.invoke('stripe-checkout-v4', {
        body: options,
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.error) {
        console.error('❌ Edge Function error details:', response.error);
        // Если ошибка связана с токеном, пробуем обновить сессию
        if (response.error.message?.includes('invalid session token') || 
            response.error.message?.includes('JWT')) {
          console.log('🔄 Trying to refresh session...');
          const { error: refreshError } = await supabase.auth.refreshSession();
          if (refreshError) {
            throw new Error('Session expired, please login again');
          }
          // После обновления сессии пробросим ошибку для fallback
          throw new Error('Token refresh needed, falling back to Express server');
        }
        throw new Error(response.error.message || 'Edge Function failed');
      }

      console.log('✅ Checkout session created via Edge Function:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Edge Function request failed:', error);
      throw error;
    }
  }

  private async createCheckoutViaExpressServer(options: any): Promise<any> {
    // Express server URLs для разных окружений
    let apiUrl: string;
    
    // Определяем URL сервера в зависимости от окружения
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      // Development mode - локальный Express сервер
      apiUrl = 'http://localhost:3002/api/stripe/create-checkout-session';
      
      // Проверяем доступность сервера
      try {
        const healthCheck = await fetch('http://localhost:3002/health', { 
          method: 'GET',
          signal: AbortSignal.timeout(3000) // 3 секунды таймаут
        });
        if (!healthCheck.ok) {
          throw new Error('Express server health check failed');
        }
        console.log('✅ Express server is healthy');
      } catch (error) {
        console.error('🚫 Express server not available:', error);
        throw new Error('Express server not running. Please run: npm run server');
      }
    } else {
      // Production mode - используем Netlify Functions (встроенные в тот же домен)
      apiUrl = '/.netlify/functions/stripe-checkout';
      console.log('🌐 Using Netlify Functions for Stripe');
    }
    
    console.log('🎯 Express server URL:', apiUrl);
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(options)
    });

    if (!response.ok) {
      let errorMessage = 'Failed to create checkout session';
      console.error('❌ Express server response error:', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries())
      });
      
      try {
        // Клонируем response чтобы можно было прочитать несколько раз
        const responseClone = response.clone();
        const errorData = await responseClone.json();
        errorMessage = errorData.error || errorMessage;
      } catch (jsonError) {
        try {
          const errorText = await response.text();
          errorMessage = errorText || errorMessage;
        } catch (textError) {
          console.error('❌ Failed to read response:', textError);
          errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        }
      }
      throw new Error(errorMessage);
    }

    const result = await response.json();
    console.log('✅ Checkout session created via Express server:', result);
    return result;
  }

  /**
   * Перенаправляет пользователя на Stripe Checkout
   */
  async redirectToCheckout(
    priceId: string,
    mode: 'payment' | 'subscription' = 'payment',
    successUrl?: string,
    cancelUrl?: string
  ): Promise<void> {
    const response = await this.createCheckoutSession(priceId, mode, successUrl, cancelUrl);

    if (response.success && response.url) {
      window.location.href = response.url;
    } else {
      throw new Error(response.error || 'Failed to create checkout session');
    }
  }

  /**
   * Получает данные подписки пользователя
   */
  async getSubscriptionData(userId?: string): Promise<StripeSubscriptionData | null> {
    try {
      const { data, error } = await supabase
        .from('stripe_subscriptions')
        .select(`
          subscription_id,
          status,
          price_id,
          current_period_start,
          current_period_end,
          stripe_customers!inner(customer_id, user_id)
        `)
        .eq('stripe_customers.user_id', userId || (await supabase.auth.getUser()).data.user?.id)
        .eq('status', 'active')
        .single();

      if (error || !data) {
        return null;
      }

      return {
        customerId: data.stripe_customers.customer_id,
        subscriptionId: data.subscription_id,
        status: data.status,
        priceId: data.price_id,
        currentPeriodStart: data.current_period_start,
        currentPeriodEnd: data.current_period_end
      };
    } catch (error) {
      console.error('Error fetching subscription data:', error);
      return null;
    }
  }

  /**
   * Получает историю заказов пользователя
   */
  async getUserOrders(userId?: string): Promise<StripeOrderData[]> {
    try {
      const { data, error } = await supabase
        .from('stripe_orders')
        .select(`
          checkout_session_id,
          amount_total,
          currency,
          payment_status,
          status,
          credits_amount,
          created_at,
          stripe_customers!inner(customer_id, user_id)
        `)
        .eq('stripe_customers.user_id', userId || (await supabase.auth.getUser()).data.user?.id)
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(error.message);
      }

      return data.map(order => ({
        orderId: order.checkout_session_id,
        customerId: order.stripe_customers.customer_id,
        priceId: '', // Не сохраняем price_id в заказах
        amount: order.amount_total,
        currency: order.currency,
        status: order.payment_status,
        credits: order.credits_amount,
        checkoutSessionId: order.checkout_session_id
      }));
    } catch (error) {
      console.error('Error fetching user orders:', error);
      return [];
    }
  }

  /**
   * Отменяет подписку
   */
  async cancelSubscription(subscriptionId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        throw new Error('User not authenticated');
      }

      const response = await supabase.functions.invoke('stripe-cancel-subscription', {
        body: { subscriptionId },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to cancel subscription');
      }

      return { success: true };
    } catch (error) {
      console.error('Error canceling subscription:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Получает публичный ключ Stripe (публичный метод)
   */
  getStripePublicKey(): string {
    return this.getPublicKey();
  }

  /**
   * Обрабатывает успешный платеж (вызывается со страницы success)
   */
  async handlePaymentSuccess(sessionId: string): Promise<void> {
    try {
      const { error } = await supabase.rpc('handle_stripe_payment_success', {
        session_id: sessionId
      });

      if (error) {
        throw new Error(error.message);
      }
    } catch (error) {
      console.error('Error handling payment success:', error);
      throw error;
    }
  }

  // Utility methods
  getProductByPriceId(priceId: string): StripeProduct | undefined {
    return getProductByPriceId(priceId);
  }

  formatAmount(amount: number, currency: string = 'usd'): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase()
    }).format(amount / 100);
  }

  getCreditAmountFromPriceId(priceId: string): number {
    const product = getProductByPriceId(priceId);
    return product?.credits || 0;
  }
}

export const stripeService = new StripeService(); 