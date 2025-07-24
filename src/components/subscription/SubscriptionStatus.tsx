import React from 'react';
import { motion } from 'framer-motion';
import { Crown, Calendar, CreditCard, AlertTriangle, CheckCircle } from 'lucide-react';
import { useSubscription } from '../../hooks/useSubscription';
import { stripeService } from '../../services/stripe.service';
import { Tooltip } from '../Tooltip';

interface SubscriptionStatusProps {
  className?: string;
  showDetails?: boolean;
}

const SubscriptionStatus: React.FC<SubscriptionStatusProps> = ({ 
  className = '', 
  showDetails = false 
}) => {
  const { subscription, loading, isActive, planName } = useSubscription();

  if (loading) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <div className="w-6 h-6 bg-gray-200 rounded-full animate-pulse" />
        <div className="w-20 h-4 bg-gray-200 rounded animate-pulse" />
      </div>
    );
  }

  const getStatusColor = () => {
    if (!subscription) return 'text-gray-600';
    if (isActive) return 'text-green-600';
    if (subscription.subscriptionStatus === 'past_due') return 'text-yellow-600';
    return 'text-red-600';
  };

  const getStatusIcon = () => {
    if (!subscription) return <Crown className="h-4 w-4" />;
    if (isActive) return <CheckCircle className="h-4 w-4" />;
    if (subscription.subscriptionStatus === 'past_due') return <AlertTriangle className="h-4 w-4" />;
    return <AlertTriangle className="h-4 w-4" />;
  };

  const getStatusText = () => {
    if (!subscription) return 'Free Plan';
    if (isActive) return planName;
    if (subscription.subscriptionStatus === 'past_due') return 'Payment Due';
    if (subscription.subscriptionStatus === 'canceled') return 'Canceled';
    return 'Inactive';
  };

  const formatDate = (timestamp: number | null) => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp * 1000).toLocaleDateString();
  };

  const tooltipContent = subscription 
    ? `Status: ${subscription.subscriptionStatus}\nRenews: ${formatDate(subscription.currentPeriodEnd)}`
    : 'Free Plan - No active subscription';

  return (
    <div className={`${className}`}>
      <Tooltip content={tooltipContent}>
        <motion.div
          className={`flex items-center space-x-2 px-3 py-1 rounded-full bg-white border-2 transition-colors ${
            isActive ? 'border-green-200 bg-green-50' : 'border-gray-200'
          }`}
          whileHover={{ scale: 1.05 }}
        >
          <div className={getStatusColor()}>
            {getStatusIcon()}
          </div>
          
          <span className={`font-medium text-sm ${getStatusColor()}`}>
            {getStatusText()}
          </span>
        </motion.div>
      </Tooltip>

      {showDetails && subscription && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 bg-white rounded-lg border border-gray-200 p-4"
        >
          <h3 className="font-semibold text-gray-900 mb-3">Subscription Details</h3>
          
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Status:</span>
              <span className={`font-medium capitalize ${getStatusColor()}`}>
                {subscription.subscriptionStatus.replace('_', ' ')}
              </span>
            </div>
            
            {subscription.currentPeriodStart && (
              <div className="flex justify-between">
                <span className="text-gray-600">Current Period:</span>
                <span className="text-gray-900">
                  {formatDate(subscription.currentPeriodStart)} - {formatDate(subscription.currentPeriodEnd)}
                </span>
              </div>
            )}
            
            {subscription.cancelAtPeriodEnd && (
              <div className="flex justify-between">
                <span className="text-gray-600">Cancels:</span>
                <span className="text-red-600">
                  {formatDate(subscription.currentPeriodEnd)}
                </span>
              </div>
            )}
            
            {subscription.paymentMethodLast4 && (
              <div className="flex justify-between">
                <span className="text-gray-600">Payment Method:</span>
                <span className="text-gray-900 capitalize">
                  {subscription.paymentMethodBrand} •••• {subscription.paymentMethodLast4}
                </span>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default SubscriptionStatus;