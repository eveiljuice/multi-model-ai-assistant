import { useState, useEffect, useCallback } from 'react';
import { creditService, CreditBalance } from '../services/creditService';
import { useAuth } from '../contexts/AuthContext';
import { loggingService } from '../services/loggingService';

export const useCredits = () => {
  const { user } = useAuth();
  const [balance, setBalance] = useState<CreditBalance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);

  const loadBalance = useCallback(async () => {
    if (!user) {
      setBalance(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const balanceData = await creditService.getUserCredits();
      setBalance(balanceData);
      
      // Log successful balance fetch
      loggingService.logActivity({
        eventType: 'credit_balance_fetched',
        eventCategory: 'credits',
        eventData: {
          balance: balanceData?.balance,
          lastRollover: balanceData?.lastRollover
        }
      });
    } catch (error) {
      console.error('Failed to load credit balance:', error);
      setError('Failed to load balance');
      
      // Log error
      loggingService.logError({
        errorType: 'credit_balance_fetch_error',
        errorMessage: error instanceof Error ? error.message : 'Failed to load credit balance',
        component: 'useCredits.loadBalance',
        severity: 'medium'
      });
    } finally {
      setLoading(false);
    }
  }, [user]);

  const loadTransactions = useCallback(async () => {
    if (!user) {
      setTransactions([]);
      return;
    }

    try {
      setLoadingTransactions(true);
      const transactionData = await creditService.getCreditTransactions();
      setTransactions(transactionData);
    } catch (error) {
      console.error('Failed to load credit transactions:', error);
      
      // Log error
      loggingService.logError({
        errorType: 'credit_transactions_fetch_error',
        errorMessage: error instanceof Error ? error.message : 'Failed to load credit transactions',
        component: 'useCredits.loadTransactions',
        severity: 'medium'
      });
    } finally {
      setLoadingTransactions(false);
    }
  }, [user]);

  useEffect(() => {
    loadBalance();
    loadTransactions();
  }, [loadBalance, loadTransactions]);

  const checkCanUseAgent = useCallback(async (agentId: string) => {
    if (!user) return { canUse: false, required: 1, available: 0 };
    
    try {
      return await creditService.canUseAgent(agentId);
    } catch (error) {
      console.error('Failed to check agent usage:', error);
      return { canUse: false, required: 1, available: 0 };
    }
  }, [user]);

  const deductCredits = useCallback(async (agentId: string) => {
    if (!user) return false;
    
    try {
      // Generate idempotency key for deduplication
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substr(2, 9);
      const idempotencyKey = `hook-deduct-${agentId}-${user.id}-${timestamp}-${randomId}`;
      
      const result = await creditService.deductCreditsAtomic(agentId, user.id, idempotencyKey);
      
      if (result.success) {
        // Refresh balance after successful deduction
        await loadBalance();
        
        // Log successful deduction
        loggingService.logActivity({
          eventType: 'credits_deducted_hook_atomic',
          eventCategory: 'credits',
          eventData: {
            agentId,
            creditsCost: result.creditsCost,
            newBalance: result.newBalance,
            idempotencyKey,
            success: true
          }
        });
      } else {
        // Log failed deduction
        loggingService.logError({
          errorType: 'hook_credit_deduction_failed',
          errorMessage: `Hook credit deduction failed: ${result.error}`,
          component: 'useCredits.deductCredits',
          additionalData: { 
            agentId,
            error: result.error,
            idempotencyKey
          },
          severity: 'medium'
        });
      }
      
      return result.success;
    } catch (error) {
      console.error('Failed to deduct credits atomically:', error);
      
      loggingService.logError({
        errorType: 'hook_credit_deduction_error',
        errorMessage: error instanceof Error ? error.message : 'Failed to deduct credits atomically',
        component: 'useCredits.deductCredits',
        additionalData: { agentId },
        severity: 'high'
      });
      
      return false;
    }
  }, [user, loadBalance]);

  const addCredits = useCallback(async (
    amount: number,
    type: 'trial' | 'subscription' | 'topup' | 'rollover' | 'admin_grant',
    description?: string,
    metadata?: Record<string, any>
  ) => {
    if (!user) return false;
    
    try {
      const success = await creditService.addCredits(amount, type, description, metadata);
      if (success) {
        // Refresh balance after successful addition
        await loadBalance();
      }
      return success;
    } catch (error) {
      console.error('Failed to add credits:', error);
      return false;
    }
  }, [user, loadBalance]);

  const refreshBalance = useCallback(() => {
    loadBalance();
  }, [loadBalance]);

  const refreshTransactions = useCallback(() => {
    loadTransactions();
  }, [loadTransactions]);

  return {
    balance,
    loading,
    error,
    checkCanUseAgent,
    deductCredits,
    addCredits,
    refreshBalance,
    hasCredits: balance ? balance.balance > 0 : false,
    isLowBalance: balance ? balance.balance < 20 : false,
    creditCount: balance?.balance || 0,
    transactions,
    loadingTransactions,
    refreshTransactions
  };
};