import { supabase } from './supabaseClient';
import { loggingService } from './loggingService';
import { STRIPE_PRODUCTS, StripeProduct } from '../stripe-config';

export interface StripeCheckoutResponse {
  sessionId: string;
  url: string;
}

export interface UserSubscription {
  customerId: string;
  subscriptionId: string | null;
  subscriptionStatus: string;
  priceId: string | null;
  currentPeriodStart: number | null;
  currentPeriodEnd: number | null;
  cancelAtPeriodEnd: boolean;
  paymentMethodBrand: string | null;
  paymentMethodLast4: string | null;
}

export interface UserOrder {
  orderId: number;
  checkoutSessionId: string;
  paymentIntentId: string;
  amountSubtotal: number;
  amountTotal: number;
  currency: string;
  paymentStatus: string;
  orderStatus: string;
  orderDate: string;
}

class StripeService {
  private getSupabaseUrl(): string {
    return import.meta.env.VITE_SUPABASE_URL || '';
  }

  async createCheckoutSession(
    priceId: string,
    mode: 'payment' | 'subscription' = 'payment',
    successUrl?: string,
    cancelUrl?: string
  ): Promise<StripeCheckoutResponse> {
    try {
      // Get current user session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        throw new Error('User not authenticated');
      }

      // Default URLs
      const baseUrl = window.location.origin;
      const defaultSuccessUrl = successUrl || `${baseUrl}/success?session_id={CHECKOUT_SESSION_ID}`;
      const defaultCancelUrl = cancelUrl || `${baseUrl}/pricing`;

      // Call the edge function
      const { data, error } = await supabase.functions.invoke('stripe-checkout', {
        body: {
          price_id: priceId,
          mode,
          success_url: defaultSuccessUrl,
          cancel_url: defaultCancelUrl
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (error) {
        throw new Error(error.message || 'Failed to create checkout session');
      }

      if (!data.sessionId || !data.url) {
        throw new Error('Invalid response from checkout service');
      }

      // Log successful checkout session creation
      loggingService.logActivity({
        eventType: 'stripe_checkout_created',
        eventCategory: 'payment',
        eventData: {
          priceId,
          mode,
          sessionId: data.sessionId
        }
      });

      return {
        sessionId: data.sessionId,
        url: data.url
      };
    } catch (error) {
      console.error('Failed to create checkout session:', error);
      
      loggingService.logError({
        errorType: 'stripe_checkout_error',
        errorMessage: error instanceof Error ? error.message : 'Failed to create checkout session',
        component: 'StripeService.createCheckoutSession',
        additionalData: { priceId, mode },
        severity: 'high'
      });

      throw error;
    }
  }

  async getUserSubscription(): Promise<UserSubscription | null> {
    try {
      const { data, error } = await supabase
        .from('stripe_user_subscriptions')
        .select('*')
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (!data) {
        return null;
      }

      return {
        customerId: data.customer_id,
        subscriptionId: data.subscription_id,
        subscriptionStatus: data.subscription_status,
        priceId: data.price_id,
        currentPeriodStart: data.current_period_start,
        currentPeriodEnd: data.current_period_end,
        cancelAtPeriodEnd: data.cancel_at_period_end,
        paymentMethodBrand: data.payment_method_brand,
        paymentMethodLast4: data.payment_method_last4
      };
    } catch (error) {
      console.error('Failed to get user subscription:', error);
      
      loggingService.logError({
        errorType: 'subscription_fetch_error',
        errorMessage: error instanceof Error ? error.message : 'Failed to fetch subscription',
        component: 'StripeService.getUserSubscription',
        severity: 'medium'
      });

      return null;
    }
  }

  async getUserOrders(): Promise<UserOrder[]> {
    try {
      const { data, error } = await supabase
        .from('stripe_user_orders')
        .select('*')
        .order('order_date', { ascending: false });

      if (error) {
        throw error;
      }

      return data.map(order => ({
        orderId: order.order_id,
        checkoutSessionId: order.checkout_session_id,
        paymentIntentId: order.payment_intent_id,
        amountSubtotal: order.amount_subtotal,
        amountTotal: order.amount_total,
        currency: order.currency,
        paymentStatus: order.payment_status,
        orderStatus: order.order_status,
        orderDate: order.order_date
      }));
    } catch (error) {
      console.error('Failed to get user orders:', error);
      
      loggingService.logError({
        errorType: 'orders_fetch_error',
        errorMessage: error instanceof Error ? error.message : 'Failed to fetch orders',
        component: 'StripeService.getUserOrders',
        severity: 'medium'
      });

      return [];
    }
  }

  getProductByPriceId(priceId: string): StripeProduct | undefined {
    return STRIPE_PRODUCTS.find(product => product.priceId === priceId);
  }

  getSubscriptionProductName(priceId: string | null): string {
    if (!priceId) return 'Free Plan';
    
    const product = this.getProductByPriceId(priceId);
    return product?.name || 'Unknown Plan';
  }

  isSubscriptionActive(subscription: UserSubscription | null): boolean {
    if (!subscription) return false;
    
    return ['active', 'trialing'].includes(subscription.subscriptionStatus);
  }

  formatAmount(amount: number, currency: string = 'usd'): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount / 100); // Stripe amounts are in cents
  }

  async redirectToCheckout(priceId: string, mode: 'payment' | 'subscription' = 'payment'): Promise<void> {
    try {
      const { url } = await this.createCheckoutSession(priceId, mode);
      window.location.href = url;
    } catch (error) {
      console.error('Failed to redirect to checkout:', error);
      throw error;
    }
  }

  // Helper method to get all available products
  getAvailableProducts(): StripeProduct[] {
    return STRIPE_PRODUCTS;
  }

  // Helper method to get products by type
  getProductsByMode(mode: 'payment' | 'subscription'): StripeProduct[] {
    return STRIPE_PRODUCTS.filter(product => product.mode === mode);
  }
}

export const stripeService = new StripeService();