import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Zap, CreditCard, Star, ArrowRight } from 'lucide-react';
import { STRIPE_PRODUCTS } from '../../stripe-config';
import PricingCard from './PricingCard';
import CreditBalance from '../credits/CreditBalance';
import CreditProgressBar from '../credits/CreditProgressBar';
import CreditRedirectHandler from '../credits/CreditRedirectHandler';
import { useAuth } from '../../contexts/AuthContext';

const PricingPage: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'subscription' | 'topup'>('subscription');

  const subscriptionProducts = STRIPE_PRODUCTS.filter(p => p.mode === 'subscription');
  const topupProducts = STRIPE_PRODUCTS.filter(p => p.mode === 'payment');

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      {/* Handle credit-based redirects */}
      <CreditRedirectHandler />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Choose Your Plan
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Get unlimited access to our AI agents with flexible pricing options. 
              Start with a subscription or buy credits as needed.
            </p>
          </motion.div>

          {/* Credit Balance for authenticated users */}
          {user && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-md mx-auto mb-8 space-y-4"
            >
              <CreditBalance showDetails className="justify-center" />
              <CreditProgressBar />
            </motion.div>
          )}
        </div>

        {/* Tab Navigation */}
        <div className="flex justify-center mb-12">
          <div className="bg-white rounded-lg p-1 shadow-sm border border-gray-200">
            <button
              onClick={() => setActiveTab('subscription')}
              className={`px-6 py-3 rounded-md font-medium transition-all duration-200 flex items-center space-x-2 ${
                activeTab === 'subscription'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Zap className="h-4 w-4" />
              <span>Monthly Subscription</span>
            </button>
            <button
              onClick={() => setActiveTab('topup')}
              className={`px-6 py-3 rounded-md font-medium transition-all duration-200 flex items-center space-x-2 ${
                activeTab === 'topup'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <CreditCard className="h-4 w-4" />
              <span>Credit Top-ups</span>
            </button>
          </div>
        </div>

        {/* Subscription Plans */}
        {activeTab === 'subscription' && (
          <motion.div
            key="subscription"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-16"
          >
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Monthly Subscription
              </h2>
              <p className="text-gray-600">
                Get recurring credits every month with additional benefits
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-4xl mx-auto">
              {subscriptionProducts.map((product, index) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <PricingCard product={product} />
                </motion.div>
              ))}
            </div>

            {/* Subscription Benefits */}
            <div className="mt-12 bg-white rounded-2xl p-8 shadow-sm border border-gray-200">
              <h3 className="text-xl font-bold text-gray-900 mb-6 text-center">
                Subscription Benefits
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <ArrowRight className="h-6 w-6 text-green-600 transform rotate-90" />
                  </div>
                  <h4 className="font-semibold text-gray-900 mb-2">30% Credit Rollover</h4>
                  <p className="text-sm text-gray-600">
                    Unused credits roll over to next month (up to 75 credits)
                  </p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Star className="h-6 w-6 text-blue-600" />
                  </div>
                  <h4 className="font-semibold text-gray-900 mb-2">Priority Support</h4>
                  <p className="text-sm text-gray-600">
                    Get faster response times and dedicated support
                  </p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Zap className="h-6 w-6 text-purple-600" />
                  </div>
                  <h4 className="font-semibold text-gray-900 mb-2">Best Value</h4>
                  <p className="text-sm text-gray-600">
                    Lowest cost per credit with consistent monthly allocation
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Credit Top-ups */}
        {activeTab === 'topup' && (
          <motion.div
            key="topup"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-16"
          >
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Credit Top-ups
              </h2>
              <p className="text-gray-600">
                Buy credits as needed with no recurring charges
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              {topupProducts.map((product, index) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <PricingCard product={product} />
                </motion.div>
              ))}
            </div>

            {/* Top-up Benefits */}
            <div className="mt-12 bg-white rounded-2xl p-8 shadow-sm border border-gray-200">
              <h3 className="text-xl font-bold text-gray-900 mb-6 text-center">
                Top-up Benefits
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Zap className="h-6 w-6 text-green-600" />
                  </div>
                  <h4 className="font-semibold text-gray-900 mb-2">Instant Delivery</h4>
                  <p className="text-sm text-gray-600">
                    Credits are added to your account immediately after purchase
                  </p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Star className="h-6 w-6 text-blue-600" />
                  </div>
                  <h4 className="font-semibold text-gray-900 mb-2">Never Expire</h4>
                  <p className="text-sm text-gray-600">
                    Your purchased credits never expire and can be used anytime
                  </p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <CreditCard className="h-6 w-6 text-purple-600" />
                  </div>
                  <h4 className="font-semibold text-gray-900 mb-2">No Commitment</h4>
                  <p className="text-sm text-gray-600">
                    Pay only for what you need with no recurring charges
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* FAQ Section */}
        <div className="mt-16 bg-white rounded-2xl p-8 shadow-sm border border-gray-200">
          <h3 className="text-2xl font-bold text-gray-900 mb-8 text-center">
            Frequently Asked Questions
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">How do credits work?</h4>
              <p className="text-sm text-gray-600">
                Each AI agent interaction costs a certain number of credits based on complexity. 
                Simple agents cost 1 credit, while advanced agents may cost 2-5 credits per use.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Can I cancel my subscription?</h4>
              <p className="text-sm text-gray-600">
                Yes, you can cancel your subscription at any time. You'll continue to have access 
                until the end of your current billing period.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Do credits expire?</h4>
              <p className="text-sm text-gray-600">
                Top-up credits never expire. Subscription credits expire at the end of each month, 
                but 30% can roll over (up to 75 credits).
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">What payment methods do you accept?</h4>
              <p className="text-sm text-gray-600">
                We accept all major credit cards (Visa, MasterCard, American Express) 
                and other payment methods through Stripe.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">How is credit rollover calculated?</h4>
              <p className="text-sm text-gray-600">
                At the end of each billing period, 30% of your unused credits (up to a maximum of 75) 
                will automatically roll over to the next month.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">What happens if I run out of credits?</h4>
              <p className="text-sm text-gray-600">
                When you run out of credits, you'll be prompted to purchase more or subscribe. 
                You can continue using the platform after topping up your account.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PricingPage;