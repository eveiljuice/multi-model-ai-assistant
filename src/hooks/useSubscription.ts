import { useState, useEffect, useCallback } from 'react';
import { stripeService, StripeSubscriptionData } from '../services/stripe.service';
import { useAuth } from '../contexts/AuthContext';
import { loggingService } from '../services/loggingService';

export const useSubscription = () => {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<StripeSubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSubscription = useCallback(async () => {
    if (!user) {
      setSubscription(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const subscriptionData = await stripeService.getSubscriptionData();
      setSubscription(subscriptionData);
      
      // Log successful subscription fetch
      loggingService.logActivity({
        eventType: 'subscription_fetched',
        eventCategory: 'subscription',
        eventData: {
          hasSubscription: !!subscriptionData,
          status: subscriptionData?.status
        }
      });
    } catch (error) {
      console.error('Failed to load subscription:', error);
      setError('Failed to load subscription');
      
      // Log error
      loggingService.logError({
        errorType: 'subscription_fetch_error',
        errorMessage: error instanceof Error ? error.message : 'Failed to load subscription',
        component: 'useSubscription.loadSubscription',
        severity: 'medium'
      });
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadSubscription();
  }, [loadSubscription]);

  const refreshSubscription = useCallback(() => {
    loadSubscription();
  }, [loadSubscription]);

  const isActive = subscription ? subscription.status === 'active' : false;
  const planName = subscription?.priceId ? stripeService.getProductByPriceId(subscription.priceId)?.name || 'Unknown Plan' : null;

  return {
    subscription,
    loading,
    error,
    refreshSubscription,
    isActive,
    planName,
    hasSubscription: subscription !== null
  };
};