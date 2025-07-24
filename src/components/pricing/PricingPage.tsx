import React from 'react';
import { motion } from 'framer-motion';
import { Star, Zap, CreditCard, Shield, Clock, Award } from 'lucide-react';
import { STRIPE_PRODUCTS, getSubscriptionProducts, getTopupProducts } from '../../config/stripe-products';
import PricingCard from './PricingCard';
import CreditBalance from '../credits/CreditBalance';
import CreditProgressBar from '../credits/CreditProgressBar';
import CreditRedirectHandler from '../credits/CreditRedirectHandler';
import { useAuth } from '../../contexts/AuthContext';

const PricingPage: React.FC = () => {
  const { user } = useAuth();

  // Разделяем продукты на подписки и разовые покупки
  const subscriptionProducts = getSubscriptionProducts();
  const topupProducts = getTopupProducts();

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
              Choose the Right Plan
            </h1>
            <p className="text-xl text-gray-600 max-w-4xl mx-auto">
              Get access to our AI agents with flexible pricing plans. 
              Choose a monthly subscription for regular use or buy credits as needed.
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

        {/* Pricing Cards Grid */}
        <div className="mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto"
          >
            {/* Subscription Card - Featured */}
            {subscriptionProducts.map((product, index) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="md:col-span-2 lg:col-span-1"
              >
                <PricingCard product={product} className="h-full" />
              </motion.div>
            ))}

            {/* Top-up Cards */}
            {topupProducts.map((product, index) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: (subscriptionProducts.length + index) * 0.1 }}
                className="lg:col-span-1"
              >
                <PricingCard product={product} className="h-full" />
              </motion.div>
            ))}
          </motion.div>
        </div>

        {/* Comparison Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white rounded-2xl p-8 shadow-sm border border-gray-200 mb-12"
        >
          <h3 className="text-2xl font-bold text-gray-900 mb-8 text-center">
            Plan Comparison
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Subscription Benefits */}
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Zap className="h-8 w-8 text-blue-600" />
              </div>
              <h4 className="text-lg font-semibold text-gray-900 mb-3">
                Subscription
              </h4>
              <ul className="text-sm text-gray-600 space-y-2">
                <li className="flex items-center justify-center space-x-2">
                  <Star className="h-4 w-4 text-yellow-500" />
                  <span>Best value for money</span>
                </li>
                <li className="flex items-center justify-center space-x-2">
                  <Shield className="h-4 w-4 text-green-500" />
                  <span>30% credits roll over to next month</span>
                </li>
                <li className="flex items-center justify-center space-x-2">
                  <Award className="h-4 w-4 text-purple-500" />
                  <span>Priority support</span>
                </li>
              </ul>
            </div>

            {/* Top-up Benefits */}
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CreditCard className="h-8 w-8 text-green-600" />
              </div>
              <h4 className="text-lg font-semibold text-gray-900 mb-3">
                One-time Purchase
              </h4>
              <ul className="text-sm text-gray-600 space-y-2">
                <li className="flex items-center justify-center space-x-2">
                  <Zap className="h-4 w-4 text-blue-500" />
                  <span>Instant top-up</span>
                </li>
                <li className="flex items-center justify-center space-x-2">
                  <Clock className="h-4 w-4 text-red-500" />
                  <span>Credits never expire</span>
                </li>
                <li className="flex items-center justify-center space-x-2">
                  <Shield className="h-4 w-4 text-green-500" />
                  <span>No commitments</span>
                </li>
              </ul>
            </div>

            {/* Which to Choose */}
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Star className="h-8 w-8 text-purple-600 fill-current" />
              </div>
              <h4 className="text-lg font-semibold text-gray-900 mb-3">
                Which to Choose?
              </h4>
              <ul className="text-sm text-gray-600 space-y-2">
                <li><strong>Subscription:</strong> for regular usage</li>
                <li><strong>Small packages:</strong> for testing</li>
                <li><strong>Large packages:</strong> for intensive usage</li>
              </ul>
            </div>
          </div>
        </motion.div>

        {/* FAQ Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-white rounded-2xl p-8 shadow-sm border border-gray-200"
        >
          <h3 className="text-2xl font-bold text-gray-900 mb-8 text-center">
            Frequently Asked Questions
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">How do credits work?</h4>
              <p className="text-sm text-gray-600">
                Each interaction with an AI agent costs a certain amount of credits depending on complexity. 
                Simple agents cost 1 credit, more complex ones cost 2-5 credits.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Can I cancel my subscription?</h4>
              <p className="text-sm text-gray-600">
                Yes, you can cancel your subscription at any time. Access will remain 
                until the end of the current billing period.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Do credits expire?</h4>
              <p className="text-sm text-gray-600">
                Credits from one-time purchases never expire. Subscription credits expire at the end of the month, 
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
                At the end of each billing period, 30% of unused credits (maximum 75) 
                are automatically rolled over to the next month.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">What happens when I run out of credits?</h4>
              <p className="text-sm text-gray-600">
                When you run out of credits, you'll be prompted to buy more or subscribe. 
                After topping up your account, you can continue using the platform.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default PricingPage;