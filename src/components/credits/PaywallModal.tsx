import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CreditCard, Zap, Star, Gift } from 'lucide-react';
import { Link } from 'react-router-dom';
import { creditService } from '../../services/creditService';
import { stripeService } from '../../services/stripe.service';
import { STRIPE_PRODUCTS, getSubscriptionProducts } from '../../config/stripe-products';
import { useAuth } from '../../contexts/AuthContext';

interface PaywallModalProps {
  isOpen: boolean;
  onClose: () => void;
  requiredCredits?: number;
  agentName?: string;
}

const PaywallModal: React.FC<PaywallModalProps> = ({
  isOpen,
  onClose,
  requiredCredits = 1,
  agentName = 'this agent'
}) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleSubscribe = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Get subscription product
      const subscriptionProducts = getSubscriptionProducts();
      const subscriptionProduct = subscriptionProducts[0];
      if (!subscriptionProduct) {
        throw new Error('Subscription product not found');
      }
      
      // Redirect to Stripe Checkout
      await stripeService.redirectToCheckout(
        subscriptionProduct.priceId,
        'subscription'
      );
    } catch (error) {
      console.error('Failed to start subscription:', error);
      setLoading(false);
    }
  };

  const handleTopUp = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Redirect to pricing page
      window.location.href = '/pricing';
    } catch (error) {
      console.error('Failed to navigate to pricing:', error);
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            onClose();
          }
        }}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-6 text-white relative">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-full transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Zap className="h-8 w-8" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Out of Credits!</h2>
              <p className="text-blue-100">
                You need {requiredCredits} credit{requiredCredits !== 1 ? 's' : ''} to use {agentName}
              </p>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-4">
            {/* Subscription Option */}
            <div className="border-2 border-blue-200 rounded-xl p-4 bg-blue-50">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <Star className="h-5 w-5 text-blue-600" />
                  <span className="font-semibold text-blue-900">Monthly Subscription</span>
                </div>
                <div className="bg-blue-600 text-white px-2 py-1 rounded-full text-xs font-medium">
                  RECOMMENDED
                </div>
              </div>
              
              <div className="space-y-2 mb-4">
                <div className="text-2xl font-bold text-blue-900">$9.99<span className="text-sm font-normal">/month</span></div>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• 250 credits every month</li>
                  <li>• 30% credit rollover</li>
                  <li>• Priority support</li>
                  <li>• Cancel anytime</li>
                </ul>
              </div>
              
              <button
                onClick={handleSubscribe}
                disabled={loading || !user}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center space-x-2"
              >
                <CreditCard className="h-4 w-4" />
                <span>Subscribe Now</span>
              </button>
            </div>

            {/* Top-up Option */}
            <div className="border border-gray-200 rounded-xl p-4">
              <div className="flex items-center space-x-2 mb-3">
                <Gift className="h-5 w-5 text-gray-600" />
                <span className="font-semibold text-gray-900">One-time Top-up</span>
              </div>
              
              <div className="space-y-2 mb-4">
                <div className="text-lg font-bold text-gray-900">Starting at $4.99</div>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• 100, 500, or 1500 credits</li>
                  <li>• Instant delivery</li>
                  <li>• No recurring charges</li>
                  <li>• Credits never expire</li>
                </ul>
              </div>
              
              <button
                onClick={handleTopUp}
                disabled={loading || !user}
                className="w-full bg-gray-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-gray-700 disabled:opacity-50 transition-colors flex items-center justify-center space-x-2"
              >
                <Zap className="h-4 w-4" />
                <span>Buy Credits</span>
              </button>
            </div>

            {/* Value Proposition */}
            <div className="text-center text-xs text-gray-500 pt-2 border-t border-gray-100">
              <p>All the AI power you need for less than two coffees a month</p>
              <p className="mt-1">
                Credits cost approximately {creditService.calculateCreditValue(1)} each
              </p>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default PaywallModal;