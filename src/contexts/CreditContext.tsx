import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { creditService, CreditBalance } from '../services/creditService';
import { useAuth } from './AuthContext';
import { loggingService } from '../services/loggingService';

interface CreditContextType {
  balance: CreditBalance | null;
  loading: boolean;
  error: string | null;
  refreshBalance: () => Promise<void>;
  checkCanUseAgent: (agentId: string) => Promise<{
    canUse: boolean;
    required: number;
    available: number;
  }>;
  deductCredits: (agentId: string) => Promise<boolean>;
  addCredits: (
    amount: number,
    type: 'trial' | 'subscription' | 'topup' | 'rollover' | 'admin_grant',
    description?: string,
    metadata?: Record<string, any>
  ) => Promise<boolean>;
  isLowBalance: boolean;
  hasCredits: boolean;
  creditCount: number;
  transactions: any[];
  loadingTransactions: boolean;
  refreshTransactions: () => Promise<void>;
}

const CreditContext = createContext<CreditContextType | undefined>(undefined);

export const useCredits = () => {
  const context = useContext(CreditContext);
  if (context === undefined) {
    throw new Error('useCredits must be used within a CreditProvider');
  }
  return context;
};

interface CreditProviderProps {
  children: React.ReactNode;
}

export const CreditProvider: React.FC<CreditProviderProps> = ({ children }) => {
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
        component: 'CreditContext.loadBalance',
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
        component: 'CreditContext.loadTransactions',
        severity: 'medium'
      });
    } finally {
      setLoadingTransactions(false);
    }
  }, [user]);

  // Load initial data
  useEffect(() => {
    if (user) {
      loadBalance();
      loadTransactions();
    } else {
      setBalance(null);
      setTransactions([]);
    }
  }, [user, loadBalance, loadTransactions]);

  const refreshBalance = useCallback(async () => {
    await loadBalance();
  }, [loadBalance]);

  const refreshTransactions = useCallback(async () => {
    await loadTransactions();
  }, [loadTransactions]);

  const checkCanUseAgent = useCallback(async (agentId: string) => {
    try {
      if (!user) {
        return { canUse: false, required: 1, available: 0 };
      }
      
      const result = await creditService.canUseAgent(agentId);
      
      // Log credit check
      loggingService.logActivity({
        eventType: 'credit_check',
        eventCategory: 'credits',
        eventData: {
          agentId,
          canUse: result.canUse,
          required: result.required,
          available: result.available
        }
      });
      
      return result;
    } catch (error) {
      console.error('Failed to check agent usage:', error);
      
      // Log error
      loggingService.logError({
        errorType: 'credit_check_error',
        errorMessage: error instanceof Error ? error.message : 'Failed to check agent usage',
        component: 'CreditContext.checkCanUseAgent',
        additionalData: { agentId },
        severity: 'medium'
      });
      
      return { canUse: false, required: 1, available: 0 };
    }
  }, [user]);

  const deductCredits = useCallback(async (agentId: string) => {
    if (!user) return false;
    
    try {
      // Generate unique idempotency key to prevent double deduction
      const sessionTimestamp = Date.now();
      const randomId = Math.random().toString(36).substr(2, 9);
      const idempotencyKey = `ui-deduct-${agentId}-${user.id}-${sessionTimestamp}-${randomId}`;

      // Get agent pricing for optimistic update
      const agentPricing = await creditService.getAgentPricing(agentId);
      const creditsToDeduct = agentPricing?.creditWeight || 1;

      // OPTIMISTIC UPDATE: Immediately update UI balance
      const previousBalance = balance;
      if (balance) {
        setBalance(prev => prev ? {
          ...prev,
          balance: Math.max(0, prev.balance - creditsToDeduct)
        } : null);
      }

      // Use atomic deduction with idempotency protection
      const result = await creditService.deductCreditsAtomic(agentId, user.id, idempotencyKey);
      
      if (result.success) {
        // Update UI with actual balance from server
        setBalance(prev => prev ? {
          ...prev,
          balance: result.newBalance
        } : null);
        
        // Log successful deduction with detailed info
        loggingService.logActivity({
          eventType: 'credits_deducted_ui_atomic',
          eventCategory: 'credits',
          eventData: {
            agentId,
            creditsDeducted: result.creditsCost,
            newBalance: result.newBalance,
            transactionId: result.transactionId,
            idempotencyKey,
            success: true,
            method: 'ui_atomic'
          }
        });
      } else {
        // ROLLBACK: Restore previous balance if deduction failed
        setBalance(previousBalance);
        
        // Log failed deduction with detailed error
        loggingService.logError({
          errorType: 'atomic_credit_deduction_failed_ui',
          errorMessage: `Atomic credit deduction failed: ${result.error}`,
          component: 'CreditContext.deductCredits',
          additionalData: { 
            agentId, 
            creditsToDeduct: result.creditsCost,
            availableBalance: result.newBalance,
            error: result.error,
            idempotencyKey
          },
          severity: 'medium'
        });
      }
      
      return result.success;
    } catch (error) {
      console.error('Failed to deduct credits atomically:', error);
      
      // ROLLBACK: Refresh balance from server to get correct state
      await loadBalance();
      
      // Log error with full context
      loggingService.logError({
        errorType: 'atomic_credit_deduction_error_ui',
        errorMessage: error instanceof Error ? error.message : 'Failed to deduct credits atomically',
        component: 'CreditContext.deductCredits',
        additionalData: { 
          agentId,
          userId: user.id,
          timestamp: new Date().toISOString()
        },
        severity: 'high'
      });
      
      return false;
    }
  }, [user, loadBalance, balance, creditService]);

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
        await loadTransactions();
        
        // Log successful addition
        loggingService.logActivity({
          eventType: 'credits_added',
          eventCategory: 'credits',
          eventData: {
            amount,
            type,
            description,
            success: true
          }
        });
      } else {
        // Log failed addition
        loggingService.logError({
          errorType: 'credit_addition_failed',
          errorMessage: 'Failed to add credits',
          component: 'CreditContext.addCredits',
          additionalData: { amount, type },
          severity: 'medium'
        });
      }
      
      return success;
    } catch (error) {
      console.error('Failed to add credits:', error);
      
      // Log error
      loggingService.logError({
        errorType: 'credit_addition_error',
        errorMessage: error instanceof Error ? error.message : 'Failed to add credits',
        component: 'CreditContext.addCredits',
        additionalData: { amount, type },
        severity: 'high'
      });
      
      return false;
    }
  }, [user, loadBalance, loadTransactions]);

  const value = {
    balance,
    loading,
    error,
    refreshBalance,
    checkCanUseAgent,
    deductCredits,
    addCredits,
    isLowBalance: balance ? balance.balance < 20 : false,
    hasCredits: balance ? balance.balance > 0 : false,
    creditCount: balance?.balance || 0,
    transactions,
    loadingTransactions,
    refreshTransactions
  };

  return (
    <CreditContext.Provider value={value}>
      {children}
    </CreditContext.Provider>
  );
};