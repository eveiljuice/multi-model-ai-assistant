import { useState, useEffect, useCallback } from 'react';
import { stripeService, UserSubscription } from '../services/stripeService';
import { useAuth } from '../contexts/AuthContext';
import { loggingService } from '../services/loggingService';

export const useSubscription = () => {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
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
      const subscriptionData = await stripeService.getUserSubscription();
      setSubscription(subscriptionData);
      
      // Log successful subscription fetch
      loggingService.logActivity({
        eventType: 'subscription_fetched',
        eventCategory: 'subscription',
        eventData: {
          hasSubscription: !!subscriptionData,
          status: subscriptionData?.subscriptionStatus
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

  const isActive = subscription ? stripeService.isSubscriptionActive(subscription) : false;
  const planName = stripeService.getSubscriptionProductName(subscription?.priceId || null);

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