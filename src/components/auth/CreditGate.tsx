import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CreditCard, ArrowRight, Gift, AlertTriangle } from 'lucide-react';
import { useCredits } from '../../contexts/CreditContext';
import { useAuth } from '../../contexts/AuthContext';
import LoadingSpinner from '../LoadingSpinner';
import CreditBalance from '../credits/CreditBalance';

interface CreditGateProps {
  children: React.ReactNode;
  requiredCredits?: number;
  allowZeroCredits?: boolean; // For viewing pricing/profile pages
  redirectTo?: string;
}

const CreditGate: React.FC<CreditGateProps> = ({
  children,
  requiredCredits = 1,
  allowZeroCredits = false,
  redirectTo = '/pricing'
}) => {
  const { user } = useAuth();
  const { balance, loading, hasCredits, creditCount } = useCredits();
  const navigate = useNavigate();
  const location = useLocation();

  // Auto-redirect when credits are insufficient
  useEffect(() => {
    if (!loading && user && balance) {
      const hasInsufficientCredits = creditCount < requiredCredits;
      const isOnAllowedPage = allowZeroCredits || 
                             location.pathname.includes('/pricing') ||
                             location.pathname.includes('/success') ||
                             location.pathname.includes('/profile');

      if (hasInsufficientCredits && !isOnAllowedPage) {
        // Save intended destination
        sessionStorage.setItem('creditGateRedirect', location.pathname + location.search);
        navigate(redirectTo, { replace: true });
      }
    }
  }, [balance, loading, user, creditCount, requiredCredits, allowZeroCredits, location, navigate, redirectTo]);

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    return <>{children}</>;
  }

  // Allow access to specific pages even with zero credits
  if (allowZeroCredits) {
    return <>{children}</>;
  }

  // Block access if insufficient credits
  if (creditCount < requiredCredits) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full"
        >
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
            {/* Alert Icon */}
            <div className="w-16 h-16 bg-gradient-to-r from-amber-500 to-orange-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="h-8 w-8 text-white" />
            </div>

            {/* Title */}
            <h2 className="text-2xl font-bold text-gray-900 mb-3">
              Credits Required
            </h2>

            {/* Description */}
            <p className="text-gray-600 mb-6">
              You need at least {requiredCredits} credit{requiredCredits !== 1 ? 's' : ''} to access AI agents. 
              {creditCount === 0 ? ' Your balance is empty.' : ` You have ${creditCount} credit${creditCount !== 1 ? 's' : ''}.`}
            </p>

            {/* Current Balance */}
            <div className="mb-6">
              <CreditBalance showDetails className="justify-center" />
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <button
                onClick={() => navigate('/pricing')}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-6 rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 transition-all duration-200 flex items-center justify-center space-x-2"
              >
                <CreditCard className="h-5 w-5" />
                <span>Get More Credits</span>
                <ArrowRight className="h-5 w-5" />
              </button>

              {creditCount === 0 && (
                <div className="text-sm text-gray-500 mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center justify-center space-x-2 text-blue-700">
                    <Gift className="h-4 w-4" />
                    <span className="font-medium">New users get 5 trial credits free!</span>
                  </div>
                </div>
              )}
            </div>

            {/* Help Text */}
            <p className="text-xs text-gray-400 mt-6">
              Credits ensure fair access and cover AI computational costs
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  return <>{children}</>;
};

export default CreditGate; 