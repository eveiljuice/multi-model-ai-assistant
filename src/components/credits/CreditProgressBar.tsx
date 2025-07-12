import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useCredits } from '../../contexts/CreditContext';

interface CreditProgressBarProps {
  monthlyLimit?: number;
  className?: string;
}

const CreditProgressBar: React.FC<CreditProgressBarProps> = ({ 
  monthlyLimit = 250, 
  className = '' 
}) => {
  const { creditCount, refreshBalance } = useCredits();

  // Calculate usage percentage based on monthly limit
  const usagePercentage = Math.min((creditCount / monthlyLimit) * 100, 100);
  const isHighUsage = usagePercentage > 80;
  const isMediumUsage = usagePercentage > 60;

  const getProgressColor = () => {
    if (isHighUsage) return 'bg-red-500';
    if (isMediumUsage) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getBackgroundColor = () => {
    if (isHighUsage) return 'bg-red-100';
    if (isMediumUsage) return 'bg-yellow-100';
    return 'bg-green-100';
  };

  return (
    <Link to="/pricing" className="block">
      <div className={`w-full space-y-2 cursor-pointer hover:opacity-80 transition-opacity ${className}`}>
        {/* Progress Bar */}
        <div className={`w-full h-2 rounded-full ${getBackgroundColor()}`}>
          <motion.div
            className={`h-2 rounded-full ${getProgressColor()}`}
            initial={{ width: 0 }}
            animate={{ width: `${usagePercentage}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
        </div>

        {/* Usage Text */}
        <div className="flex items-center justify-between text-xs text-gray-600">
          <span>
            You've used <span className="font-semibold">{monthlyLimit - creditCount}</span> / {monthlyLimit} credits this month
          </span>
          <span className={`font-semibold ${
            isHighUsage ? 'text-red-600' : isMediumUsage ? 'text-yellow-600' : 'text-green-600'
          }`}>
            {usagePercentage.toFixed(1)}%
          </span>
        </div>

        {/* Warning Message */}
        {isHighUsage && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg p-2"
          >
            <strong>High usage detected!</strong> Consider upgrading or purchasing a top-up pack.
          </motion.div>
        )}
      </div>
    </Link>
  );
};

export default CreditProgressBar;