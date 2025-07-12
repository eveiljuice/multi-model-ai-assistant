import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowUpRight, ArrowDownRight, Clock, Zap, CreditCard, Gift, Crown, User } from 'lucide-react';
import { useCredits } from '../../contexts/CreditContext';
import { CreditTransaction } from '../../services/creditService';

interface CreditTransactionListProps {
  limit?: number;
  className?: string;
}

const CreditTransactionList: React.FC<CreditTransactionListProps> = ({ 
  limit = 10, 
  className = '' 
}) => {
  const { transactions, loadingTransactions, refreshTransactions } = useCredits();

  useEffect(() => {
    refreshTransactions();
  }, [refreshTransactions]);

  const getTransactionIcon = (transaction: CreditTransaction) => {
    if (transaction.amount > 0) {
      switch (transaction.type) {
        case 'trial':
          return <Gift className="h-4 w-4 text-purple-500" />;
        case 'subscription':
          return <Crown className="h-4 w-4 text-blue-500" />;
        case 'topup':
          return <CreditCard className="h-4 w-4 text-green-500" />;
        case 'rollover':
          return <Clock className="h-4 w-4 text-orange-500" />;
        case 'admin_grant':
          return <User className="h-4 w-4 text-indigo-500" />;
        default:
          return <ArrowUpRight className="h-4 w-4 text-green-500" />;
      }
    } else {
      return <ArrowDownRight className="h-4 w-4 text-red-500" />;
    }
  };

  const getTransactionColor = (transaction: CreditTransaction) => {
    if (transaction.amount > 0) {
      switch (transaction.type) {
        case 'trial':
          return 'text-purple-700 bg-purple-50';
        case 'subscription':
          return 'text-blue-700 bg-blue-50';
        case 'topup':
          return 'text-green-700 bg-green-50';
        case 'rollover':
          return 'text-orange-700 bg-orange-50';
        case 'admin_grant':
          return 'text-indigo-700 bg-indigo-50';
        default:
          return 'text-green-700 bg-green-50';
      }
    } else {
      return 'text-red-700 bg-red-50';
    }
  };

  const formatTransactionType = (type: string) => {
    switch (type) {
      case 'trial':
        return 'Trial Credits';
      case 'subscription':
        return 'Monthly Subscription';
      case 'topup':
        return 'Credit Top-up';
      case 'usage':
        return 'Agent Usage';
      case 'rollover':
        return 'Monthly Rollover';
      case 'admin_grant':
        return 'Admin Grant';
      case 'admin_revoke':
        return 'Admin Revoke';
      default:
        return type.charAt(0).toUpperCase() + type.slice(1);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (loadingTransactions) {
    return (
      <div className={`space-y-4 ${className}`}>
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="bg-gray-100 rounded-lg p-4 animate-pulse">
            <div className="flex justify-between">
              <div className="w-32 h-4 bg-gray-200 rounded"></div>
              <div className="w-16 h-4 bg-gray-200 rounded"></div>
            </div>
            <div className="w-full h-4 bg-gray-200 rounded mt-2"></div>
          </div>
        ))}
      </div>
    );
  }

  if (!transactions || transactions.length === 0) {
    return (
      <div className={`text-center py-6 ${className}`}>
        <Zap className="h-8 w-8 text-gray-400 mx-auto mb-2" />
        <p className="text-gray-500">No transactions yet</p>
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {transactions.slice(0, limit).map((transaction, index) => (
        <motion.div
          key={transaction.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
          className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-sm transition-shadow"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={`p-2 rounded-full ${getTransactionColor(transaction)}`}>
                {getTransactionIcon(transaction)}
              </div>
              
              <div>
                <div className="font-medium text-gray-900">
                  {formatTransactionType(transaction.type)}
                </div>
                <div className="text-sm text-gray-500">
                  {transaction.description || 'No description'}
                </div>
              </div>
            </div>
            
            <div className="text-right">
              <div className={`font-bold ${transaction.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                {transaction.amount > 0 ? '+' : ''}{transaction.amount} credits
              </div>
              <div className="text-xs text-gray-500">
                {formatDate(transaction.createdAt)}
              </div>
            </div>
          </div>
          
          {/* Additional metadata if available */}
          {transaction.metadata && Object.keys(transaction.metadata).length > 0 && (
            <div className="mt-2 pt-2 border-t border-gray-100 text-xs text-gray-500">
              {transaction.type === 'usage' && transaction.metadata.agent_id && (
                <div>Agent: {transaction.metadata.agent_id}</div>
              )}
              {transaction.type === 'topup' && transaction.metadata.checkout_session_id && (
                <div>Order ID: {transaction.metadata.checkout_session_id.substring(0, 8)}...</div>
              )}
            </div>
          )}
        </motion.div>
      ))}
      
      {transactions.length > limit && (
        <div className="text-center">
          <button 
            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            onClick={() => {/* View all transactions */}}
          >
            View all transactions
          </button>
        </div>
      )}
    </div>
  );
};

export default CreditTransactionList;