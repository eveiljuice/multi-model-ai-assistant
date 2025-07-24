import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Coins, TrendingUp, TrendingDown, Info, Gift, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useCredits } from '../../contexts/CreditContext';
import { creditService } from '../../services/creditService';
import { Tooltip } from '../Tooltip';

interface CreditBalanceProps {
  showDetails?: boolean;
  className?: string;
}

const CreditBalance: React.FC<CreditBalanceProps> = ({ 
  showDetails = false, 
  className = '' 
}) => {
  const { balance, loading, error, refreshBalance } = useCredits();

  useEffect(() => {
    // Refresh balance when component mounts
    refreshBalance();
  }, [refreshBalance]);

  const getBalanceColor = (balance: number) => {
    if (balance >= 100) return 'text-green-600';
    if (balance >= 20) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getBalanceIcon = (balance: number) => {
    if (balance >= 100) return <TrendingUp className="h-4 w-4" />;
    if (balance >= 20) return <Coins className="h-4 w-4" />;
    return <TrendingDown className="h-4 w-4" />;
  };

  if (loading) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <div className="w-6 h-6 bg-gray-200 rounded-full animate-pulse" />
        <div className="w-12 h-4 bg-gray-200 rounded animate-pulse" />
      </div>
    );
  }

  if (error || !balance) {
    return (
      <div className={`flex items-center space-x-2 text-red-600 ${className}`}>
        <Coins className="h-4 w-4" />
        <span className="text-sm">Error</span>
      </div>
    );
  }

  const creditValue = creditService.calculateCreditValue(balance.balance);
  
  // Credit breakdown tooltip content
  const getTooltipContent = () => {
    const breakdown = [
      `Total Balance: ${balance.balance} credits`,
      `Subscription: ${balance.subscriptionCredits || 0} credits`,
      `Top-ups: ${balance.topupCredits || 0} credits`,
      `Trial: ${balance.trialCredits || 0} credits`,
      '',
      `Approximate value: ${creditValue}`,
      balance.rolloverEligible ? '✓ Eligible for rollover' : '✗ Not eligible for rollover'
    ].join('\n');
    
    return breakdown;
  };

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <Tooltip content={getTooltipContent()}>
        <Link to="/pricing">
          <motion.div
            className={`flex items-center gap-3 px-4 py-2 rounded-xl transition-all duration-200 cursor-pointer ${
              balance.balance < 20 
                ? 'bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 shadow-sm hover:shadow-lg' 
                : 'bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 shadow-sm hover:shadow-md'
            }`}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
          {/* Icon container with improved design */}
          <div className={`relative flex items-center justify-center w-10 h-10 rounded-xl shadow-sm ${
            balance.balance >= 100 
              ? 'bg-gradient-to-br from-green-500 to-emerald-600' 
              : balance.balance >= 20 
                ? 'bg-gradient-to-br from-blue-500 to-blue-600'
                : 'bg-gradient-to-br from-amber-500 to-orange-600'
          }`}>
            <div className="text-white">
              {getBalanceIcon(balance.balance)}
            </div>
            
            {/* Warning indicator for low balance */}
            {balance.balance <= 10 && (
              <div className="absolute -top-1 -right-1 h-3 w-3 bg-amber-400 border-2 border-white rounded-full flex items-center justify-center">
                <span className="text-[8px] font-bold text-amber-900">!</span>
              </div>
            )}
          </div>
          
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className={`font-semibold text-lg ${
                balance.balance >= 100 
                  ? 'text-green-700' 
                  : balance.balance >= 20 
                    ? 'text-blue-700'
                    : 'text-amber-700'
              }`}>
                {creditService.formatCredits(balance.balance)}
              </span>
              <span className="text-sm text-gray-500 font-medium">credits</span>
            </div>

            {/* Status indicators */}
            <div className="flex items-center gap-2 mt-1">
              {balance.trialCredits > 0 && (
                <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 bg-blue-100 text-blue-700 border border-blue-200 rounded-full font-medium">
                  <Gift className="h-3 w-3" />
                  Trial
                </span>
              )}
              
              {balance.subscriptionCredits > 0 && (
                <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 bg-green-100 text-green-700 border border-green-200 rounded-full font-medium">
                  <Calendar className="h-3 w-3" />
                  Pro
                </span>
              )}
              
              {balance.rolloverEligible && (
                <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 bg-purple-100 text-purple-700 border border-purple-200 rounded-full font-medium">
                  <TrendingUp className="h-3 w-3" />
                  Rollover
                </span>
              )}
            </div>
          </div>

          {showDetails && (
            <Tooltip content="View detailed credit breakdown">
              <div className="ml-2 p-1 rounded-lg hover:bg-white/50 transition-colors">
                <Info className="h-4 w-4 text-gray-500" />
              </div>
            </Tooltip>
          )}
          </motion.div>
        </Link>
      </Tooltip>

      {balance.balance < 20 && (
        <motion.div
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-1 text-xs px-2.5 py-1.5 bg-gradient-to-r from-amber-100 to-orange-100 text-amber-700 border border-amber-300 rounded-lg font-medium"
        >
          <TrendingDown className="h-3 w-3" />
          Low balance
        </motion.div>
      )}
    </div>
  );
};

export default CreditBalance;