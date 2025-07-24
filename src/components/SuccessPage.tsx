import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, ArrowRight, Home, CreditCard } from 'lucide-react';
import { useSearchParams, Link } from 'react-router-dom';
import { stripeService } from '../services/stripe.service';
import { creditService } from '../services/creditService';
import { useAuth } from '../contexts/AuthContext';
import { useCredits } from '../contexts/CreditContext';
import CreditBalance from './credits/CreditBalance';
import CreditTransactionList from './credits/CreditTransactionList';

const SuccessPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { refreshBalance } = useCredits();
  const [loading, setLoading] = useState(true);
  const [orderDetails, setOrderDetails] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    if (sessionId && user) {
      loadOrderDetails();
    } else {
      setLoading(false);
    }
  }, [sessionId, user]);

  const loadOrderDetails = async () => {
    try {
      setLoading(true);
      
      // Fetch recent orders to find the one matching this session
      const orders = await stripeService.getUserOrders();
      const order = orders.find(o => o.checkoutSessionId === sessionId);
      
      if (order) {
        setOrderDetails(order);
      }
      
      // Also refresh credit balance
      await refreshBalance();
      
    } catch (error) {
      console.error('Failed to load order details:', error);
      setError('Failed to load order details');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Processing your purchase...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-red-600 text-2xl">⚠️</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Something went wrong</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <Link
            to="/"
            className="inline-flex items-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Home className="h-4 w-4" />
            <span>Go Home</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-lg overflow-hidden"
        >
          {/* Success Header */}
          <div className="bg-gradient-to-r from-green-500 to-emerald-600 px-8 py-12 text-center text-white">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-6"
            >
              <CheckCircle className="h-12 w-12" />
            </motion.div>
            
            <h1 className="text-3xl font-bold mb-2">Payment Successful!</h1>
            <p className="text-green-100 text-lg">
              Thank you for your purchase. Your credits have been added to your account.
            </p>
          </div>

          {/* Order Details */}
          <div className="p-8">
            {orderDetails && (
              <div className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Order Details</h2>
                <div className="bg-gray-50 rounded-lg p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <span className="text-sm text-gray-600">Order ID</span>
                      <p className="font-medium text-gray-900">#{orderDetails.orderId}</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">Amount Paid</span>
                      <p className="font-medium text-gray-900">
                        {stripeService.formatAmount(orderDetails.amountTotal, orderDetails.currency)}
                      </p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">Payment Status</span>
                      <p className="font-medium text-green-600 capitalize">
                        {orderDetails.paymentStatus}
                      </p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">Order Date</span>
                      <p className="font-medium text-gray-900">
                        {new Date(orderDetails.orderDate).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Current Credit Balance */}
            {user && (
              <div className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Your Credit Balance</h2>
                <div className="bg-blue-50 rounded-lg p-6 text-center">
                  <CreditBalance showDetails className="justify-center text-xl" />
                  <p className="text-sm text-blue-600 mt-2">
                    Your credits are ready to use with any AI agent!
                  </p>
                </div>
              </div>
            )}

            {/* Recent Transactions */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Transactions</h2>
              <CreditTransactionList limit={3} />
            </div>

            {/* Next Steps */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">What's Next?</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="font-semibold text-gray-900 mb-2">Start Using AI Agents</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Explore our marketplace and start chatting with specialized AI agents.
                  </p>
                  <Link
                    to="/"
                    className="inline-flex items-center space-x-2 text-blue-600 hover:text-blue-700 font-medium"
                  >
                    <span>Browse Agents</span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="font-semibold text-gray-900 mb-2">Manage Your Account</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    View your purchase history and manage your subscription.
                  </p>
                  <Link
                    to="/profile"
                    className="inline-flex items-center space-x-2 text-blue-600 hover:text-blue-700 font-medium"
                  >
                    <span>View Profile</span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/"
                className="inline-flex items-center justify-center space-x-2 bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                <Home className="h-4 w-4" />
                <span>Go to Marketplace</span>
              </Link>
              
              <Link
                to="/pricing"
                className="inline-flex items-center justify-center space-x-2 bg-gray-100 text-gray-700 px-8 py-3 rounded-lg hover:bg-gray-200 transition-colors font-medium"
              >
                <CreditCard className="h-4 w-4" />
                <span>Buy More Credits</span>
              </Link>
            </div>
          </div>
        </motion.div>

        {/* Receipt Notice */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center mt-8"
        >
          <p className="text-sm text-gray-500">
            A receipt has been sent to your email address. 
            If you have any questions, please contact our support team.
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default SuccessPage;