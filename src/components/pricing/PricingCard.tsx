import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Star, Zap, CreditCard, AlertCircle, X } from 'lucide-react';
import { StripeProduct } from '../../config/stripe-products';
import { stripeService } from '../../services/stripe.service';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../services/supabaseClient';
import AuthModal from '../auth/AuthModal';

interface PricingCardProps {
  product: StripeProduct;
  className?: string;
}

const PricingCard: React.FC<PricingCardProps> = ({ product, className = '' }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const handlePurchase = async () => {
    console.log('🛒 Purchase initiated:', {
      user: !!user,
      userId: user?.id,
      productId: product.id,
      priceId: product.priceId,
      mode: product.mode,
      timestamp: new Date().toISOString()
    });

    // Clear any previous errors
    setError('');

    if (!user) {
      console.log('👤 No user found, showing auth modal');
      // Show auth modal for unauthenticated users
      setIsAuthModalOpen(true);
      return;
    }

    try {
      setLoading(true);
      console.log('🚀 Starting checkout process...');
      await stripeService.redirectToCheckout(product.priceId, product.mode);
      // Note: If redirect is successful, user will be redirected to Stripe
      // and this component will unmount, so we don't need to set loading to false
    } catch (error) {
      console.error('❌ Failed to start checkout:', error);

      // Show user-friendly error message
      const errorMessage = error instanceof Error ? error.message : 'Failed to start checkout';
      setError(errorMessage);

      // Only set loading to false if we stay on the page (error occurred)
      setLoading(false);
    }
  };

  const handleAuthSuccess = () => {
    // Close auth modal
    setIsAuthModalOpen(false);

    // Automatically trigger purchase after successful authentication
    if (user) {
      handlePurchase();
    }
  };


  const isSubscription = product.mode === 'subscription';
  const isPopular = product.popular;

  return (
    <>
      <motion.div
        whileHover={{ scale: 1.02, y: -5 }}
        className={`relative bg-white rounded-2xl shadow-lg border-2 transition-all duration-300 flex flex-col ${isPopular
          ? 'border-blue-500 shadow-blue-200'
          : 'border-gray-200 hover:border-blue-300 hover:shadow-xl'
          } ${className}`}
      >
        {/* Popular Badge */}
        {isPopular && (
          <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-10">
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-1 rounded-full text-sm font-medium flex items-center space-x-1">
              <Star className="h-3 w-3 fill-current" />
              <span>Most Popular</span>
            </div>
          </div>
        )}

        <div className="p-6 flex flex-col h-full">
          {/* Header */}
          <div className="text-center mb-6">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 ${isSubscription ? 'bg-blue-100' : 'bg-green-100'
              }`}>
              {isSubscription ? (
                <Zap className={`h-6 w-6 ${isPopular ? 'text-blue-600' : 'text-blue-500'}`} />
              ) : (
                <CreditCard className="h-6 w-6 text-green-500" />
              )}
            </div>

            <h3 className="text-xl font-bold text-gray-900 mb-2">
              {product.name}
            </h3>

            <p className="text-gray-600 text-sm mb-4">
              {product.description}
            </p>

            {/* Price */}
            <div className="mb-4">
              <div className="flex items-baseline justify-center">
                <span className="text-4xl font-bold text-gray-900">
                  ${(product.amount / 100).toFixed(0)}
                </span>
                {isSubscription && (
                  <span className="text-gray-500 ml-1">/month</span>
                )}
              </div>

              {product.credits && (
                <div className="text-sm text-gray-600 mt-1">
                  {product.credits} credits {isSubscription ? 'per month' : 'total'}
                </div>
              )}

              {!isSubscription && product.credits && (
                <div className="text-xs text-green-600 mt-1">
                  ${((product.amount / 100) / product.credits).toFixed(3)} per credit
                </div>
              )}
            </div>
          </div>

          {/* Features */}
          {product.features && (
            <div className="mb-6 flex-grow">
              <ul className="space-y-3">
                {product.features.map((feature, index) => (
                  <li key={index} className="flex items-start space-x-3">
                    <Check className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                <span className="text-sm text-red-700">{error}</span>
                <button
                  onClick={() => setError('')}
                  className="ml-auto text-red-500 hover:text-red-700"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* CTA Button */}
          <div className="mt-auto space-y-2">
            <button
              onClick={handlePurchase}
              disabled={loading}
              className={`w-full py-3 px-4 rounded-lg font-medium transition-all duration-200 flex items-center justify-center space-x-2 ${isPopular
                ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 shadow-lg hover:shadow-xl'
                : 'bg-gray-900 text-white hover:bg-gray-800'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <CreditCard className="h-4 w-4" />
                  <span>
                    {!user ? 'Sign In & Buy' : isSubscription ? 'Subscribe' : 'Buy Credits'}
                  </span>
                </>
              )}
            </button>


            {!user && (
              <p className="text-xs text-gray-500 text-center mt-2">
                Secure payment powered by Stripe
              </p>
            )}
          </div>
        </div>
      </motion.div>

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={handleAuthSuccess}
        initialMode="signin"
      />
    </>
  );
};

export default PricingCard;