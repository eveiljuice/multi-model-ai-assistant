import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Star, Zap, CreditCard } from 'lucide-react';
import { StripeProduct } from '../../stripe-config';
import { stripeService } from '../../services/stripeService';
import { useAuth } from '../../contexts/AuthContext';
import { Link } from 'react-router-dom';

interface PricingCardProps {
  product: StripeProduct;
  className?: string;
}

const PricingCard: React.FC<PricingCardProps> = ({ product, className = '' }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const handlePurchase = async () => {
    if (!user) {
      // Redirect to login or show auth modal
      return;
    }

    try {
      setLoading(true);
      await stripeService.redirectToCheckout(product.priceId, product.mode);
    } catch (error) {
      console.error('Failed to start checkout:', error);
      // Show error message to user
      setLoading(false);
    }
  };

  const isSubscription = product.mode === 'subscription';
  const isPopular = product.popular;

  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -5 }}
      className={`relative bg-white rounded-2xl shadow-lg border-2 transition-all duration-300 ${
        isPopular 
          ? 'border-blue-500 shadow-blue-200' 
          : 'border-gray-200 hover:border-blue-300 hover:shadow-xl'
      } ${className}`}
    >
      {/* Popular Badge */}
      {isPopular && (
        <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-1 rounded-full text-sm font-medium flex items-center space-x-1">
            <Star className="h-3 w-3 fill-current" />
            <span>Most Popular</span>
          </div>
        </div>
      )}

      <div className="p-6">
        {/* Header */}
        <div className="text-center mb-6">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 ${
            isSubscription ? 'bg-blue-100' : 'bg-green-100'
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
                ${product.price}
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
                ${(product.price / product.credits).toFixed(3)} per credit
              </div>
            )}
          </div>
        </div>

        {/* Features */}
        {product.features && (
          <div className="mb-6">
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

        {/* CTA Button */}
        <button
          onClick={handlePurchase}
          disabled={loading || !user}
          className={`w-full py-3 px-4 rounded-lg font-medium transition-all duration-200 flex items-center justify-center space-x-2 ${
            isPopular
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
                {!user ? 'Sign in to Purchase' : isSubscription ? 'Subscribe Now' : 'Buy Now'}
              </span>
            </>
          )}
        </button>

        {!user && (
          <p className="text-xs text-gray-500 text-center mt-2">
            Sign in required to make purchases
          </p>
        )}
      </div>
    </motion.div>
  );
};

export default PricingCard;