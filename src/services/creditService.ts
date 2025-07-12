import { supabase } from './supabaseClient';
import { loggingService } from './loggingService';

export interface CreditBalance {
  balance: number;
  lastRollover: string;
  rolloverEligible: boolean;
  subscriptionCredits: number;
  topupCredits: number;
  trialCredits: number;
}

export interface CreditTransaction {
  id: string;
  type: 'trial' | 'subscription' | 'topup' | 'usage' | 'rollover' | 'admin_grant' | 'admin_revoke' | 'referral_bonus';
  amount: number;
  description: string;
  metadata: Record<string, any>;
  createdAt: string;
}

export interface AgentPricing {
  agentId: string;
  creditWeight: number;
  description: string;
  lastUpdated: string;
  costBasis: number;
}

export interface CreditDeductionResult {
  success: boolean;
  newBalance: number;
  transactionId: string;
  creditsCost: number;
  error?: string;
}

export interface EligibilityCheck {
  canUse: boolean;
  required: number;
  available: number;
  blockers?: string[];
  alternatives?: string[];
}

export interface RolloverResult {
  rolledAmount: number;
  newBalance: number;
  eligibilityMet: boolean;
  streakWeeks?: number;
}

export interface UsageStats {
  totalUsed: number;
  totalAdded: number;
  netChange: number;
  avgDailyUsage: number;
  topAgents: Array<{agentId: string, credits: number}>;
}

export type CreditSource = 'trial' | 'subscription' | 'topup' | 'rollover' | 'admin_grant' | 'referral_bonus';

export interface TransactionFilters {
  type?: CreditTransaction['type'];
  fromDate?: string;
  toDate?: string;
  limit?: number;
}

export type TimePeriod = '7d' | '30d' | '90d' | '1y';

class CreditService {
  // Get user's current credit balance
  async getUserCredits(userId?: string): Promise<CreditBalance | null> {
    try {
      if (!userId) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return null;
        userId = user.id;
      }

      const { data, error } = await supabase
        .from('credits')
        .select('balance, last_rollover, rollover_eligible')
        .eq('user_id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No credits record found, initialize with trial credits
          await this.initializeTrialCredits(userId);
          return { 
            balance: 5, // Trial credits
            lastRollover: new Date().toISOString(), 
            rolloverEligible: false,
            subscriptionCredits: 0,
            topupCredits: 0,
            trialCredits: 5
          };
        }
        throw error;
      }

      // Get breakdown by transaction type for subscriptionCredits, topupCredits, trialCredits
      const { data: transactions } = await supabase
        .from('credit_transactions')
        .select('type, amount')
        .eq('user_id', userId)
        .gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString());

      let subscriptionCredits = 0;
      let topupCredits = 0; 
      let trialCredits = 0;

      transactions?.forEach(tx => {
        if (tx.amount > 0) {
          switch (tx.type) {
            case 'subscription':
            case 'rollover':
              subscriptionCredits += tx.amount;
              break;
            case 'topup':
              topupCredits += tx.amount;
              break;
            case 'trial':
              trialCredits += tx.amount;
              break;
          }
        }
      });

      return {
        balance: data.balance,
        lastRollover: data.last_rollover,
        rolloverEligible: data.rollover_eligible,
        subscriptionCredits,
        topupCredits,
        trialCredits
      };
    } catch (error) {
      console.error('Failed to get user credits:', error);
      loggingService.logError({
        errorType: 'credit_balance_fetch_error',
        errorMessage: error instanceof Error ? error.message : 'Failed to fetch credit balance',
        component: 'CreditService.getUserCredits',
        severity: 'medium'
      });
      return null;
    }
  }

  // Get user's credit transaction history
  async getCreditTransactions(userId?: string, limit: number = 50): Promise<CreditTransaction[]> {
    try {
      if (!userId) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return [];
        userId = user.id;
      }

      const { data, error } = await supabase
        .from('credit_transactions')
        .select('id, type, amount, description, metadata, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return data.map(transaction => ({
        id: transaction.id,
        type: transaction.type,
        amount: transaction.amount,
        description: transaction.description || '',
        metadata: transaction.metadata || {},
        createdAt: transaction.created_at
      }));
    } catch (error) {
      console.error('Failed to get credit transactions:', error);
      loggingService.logError({
        errorType: 'credit_transactions_fetch_error',
        errorMessage: error instanceof Error ? error.message : 'Failed to fetch credit transactions',
        component: 'CreditService.getCreditTransactions',
        severity: 'medium'
      });
      return [];
    }
  }

  // Get agent pricing information
  async getAgentPricing(agentId: string): Promise<AgentPricing | null> {
    try {
      const { data, error } = await supabase
        .from('agent_pricing')
        .select('agent_id, credit_weight, description, last_updated, cost_basis')
        .eq('agent_id', agentId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No pricing found, return default
          return { 
            agentId, 
            creditWeight: 1.0, 
            description: 'Standard agent usage',
            lastUpdated: new Date().toISOString(),
            costBasis: 0.014
          };
        }
        throw error;
      }

      return {
        agentId: data.agent_id,
        creditWeight: data.credit_weight,
        description: data.description || '',
        lastUpdated: data.last_updated || new Date().toISOString(),
        costBasis: data.cost_basis || 0.014
      };
    } catch (error) {
      console.error('Failed to get agent pricing:', error);
      loggingService.logError({
        errorType: 'agent_pricing_fetch_error',
        errorMessage: error instanceof Error ? error.message : 'Failed to fetch agent pricing',
        component: 'CreditService.getAgentPricing',
        additionalData: { agentId },
        severity: 'medium'
      });
      return null;
    }
  }

  // Get all agent pricing
  async getAllAgentPricing(): Promise<AgentPricing[]> {
    try {
      const { data, error } = await supabase
        .from('agent_pricing')
        .select('agent_id, credit_weight, description')
        .order('agent_id');

      if (error) throw error;

      return data.map(pricing => ({
        agentId: pricing.agent_id,
        creditWeight: pricing.credit_weight,
        description: pricing.description || ''
      }));
    } catch (error) {
      console.error('Failed to get all agent pricing:', error);
      loggingService.logError({
        errorType: 'all_agent_pricing_fetch_error',
        errorMessage: error instanceof Error ? error.message : 'Failed to fetch all agent pricing',
        component: 'CreditService.getAllAgentPricing',
        severity: 'medium'
      });
      return [];
    }
  }

  // Check if user has enough credits for an agent
  async canUseAgent(agentId: string, userId?: string): Promise<{ canUse: boolean; required: number; available: number }> {
    try {
      const [credits, pricing] = await Promise.all([
        this.getUserCredits(userId),
        this.getAgentPricing(agentId)
      ]);

      const available = credits?.balance || 0;
      const required = Math.ceil(pricing?.creditWeight || 1.0);

      return {
        canUse: available >= required,
        required,
        available
      };
    } catch (error) {
      console.error('Failed to check agent usage eligibility:', error);
      loggingService.logError({
        errorType: 'agent_usage_check_error',
        errorMessage: error instanceof Error ? error.message : 'Failed to check agent usage eligibility',
        component: 'CreditService.canUseAgent',
        additionalData: { agentId },
        severity: 'medium'
      });
      return { canUse: false, required: 1, available: 0 };
    }
  }

  // DEPRECATED: Use deductCreditsAtomic instead
  // This method has been removed to prevent inconsistencies in credit deduction logic

  // Add credits (for admin or webhook use)
  async addCredits(
    amount: number,
    type: 'trial' | 'subscription' | 'topup' | 'rollover' | 'admin_grant',
    description?: string,
    metadata?: Record<string, any>,
    userId?: string
  ): Promise<boolean> {
    try {
      if (!userId) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return false;
        userId = user.id;
      }

      const { data, error } = await supabase.rpc('add_credits', {
        user_uuid: userId,
        credit_amount: amount,
        transaction_type: type,
        transaction_description: description,
        transaction_metadata: metadata || {}
      });

      if (error) throw error;

      // Log successful credit addition
      loggingService.logActivity({
        eventType: 'credits_added',
        eventCategory: 'credits',
        eventData: {
          amount,
          type,
          description,
          success: data
        }
      });

      return data;
    } catch (error) {
      console.error('Failed to add credits:', error);
      loggingService.logError({
        errorType: 'credit_addition_error',
        errorMessage: error instanceof Error ? error.message : 'Failed to add credits',
        component: 'CreditService.addCredits',
        additionalData: { amount, type },
        severity: 'high'
      });
      return false;
    }
  }

  // Format credit amount for display
  formatCredits(amount: number): string {
    return amount.toLocaleString();
  }

  // Calculate credit cost in USD (approximate)
  calculateCreditValue(credits: number): string {
    const costPerCredit = 0.04; // $9.99 / 250 credits ≈ $0.04 per credit
    const value = credits * costPerCredit;
    return `$${value.toFixed(2)}`;
  }

  // Get credit usage statistics
  async getCreditUsageStats(userId?: string, days: number = 30): Promise<{
    totalUsed: number;
    totalAdded: number;
    netChange: number;
    transactionCount: number;
  }> {
    try {
      if (!userId) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { totalUsed: 0, totalAdded: 0, netChange: 0, transactionCount: 0 };
        userId = user.id;
      }

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data, error } = await supabase
        .from('credit_transactions')
        .select('type, amount')
        .eq('user_id', userId)
        .gte('created_at', startDate.toISOString());

      if (error) throw error;

      const stats = data.reduce((acc, transaction) => {
        if (transaction.amount > 0) {
          acc.totalAdded += transaction.amount;
        } else {
          acc.totalUsed += Math.abs(transaction.amount);
        }
        acc.transactionCount++;
        return acc;
      }, { totalUsed: 0, totalAdded: 0, transactionCount: 0 });

      return {
        ...stats,
        netChange: stats.totalAdded - stats.totalUsed
      };
    } catch (error) {
      console.error('Failed to get credit usage stats:', error);
      return { totalUsed: 0, totalAdded: 0, netChange: 0, transactionCount: 0 };
    }
  }

  // Process monthly credit rollover
  async processRollover(userId?: string): Promise<number> {
    try {
      if (!userId) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return 0;
        userId = user.id;
      }

      const { data, error } = await supabase.rpc('process_credit_rollover', {
        user_uuid: userId
      });

      if (error) throw error;

      return data || 0;
    } catch (error) {
      console.error('Failed to process credit rollover:', error);
      loggingService.logError({
        errorType: 'credit_rollover_error',
        errorMessage: error instanceof Error ? error.message : 'Failed to process credit rollover',
        component: 'CreditService.processRollover',
        severity: 'medium'
      });
      return 0;
    }
  }

  // Initialize trial credits for new user
  async initializeTrialCredits(userId?: string): Promise<boolean> {
    try {
      if (!userId) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return false;
        userId = user.id;
      }

      // Create credits record first
      const { error: insertError } = await supabase
        .from('credits')
        .insert({
          user_id: userId,
          balance: 0,
          rollover_eligible: false
        });

      if (insertError && insertError.code !== '23505') { // Ignore unique constraint violations
        throw insertError;
      }

      // Add trial credits using the add_credits function
      const result = await this.addCredits(5, 'trial', 'Welcome trial credits', {}, userId);
      
      return result;
    } catch (error) {
      console.error('Failed to initialize trial credits:', error);
      loggingService.logError({
        errorType: 'trial_credits_init_error',
        errorMessage: error instanceof Error ? error.message : 'Failed to initialize trial credits',
        component: 'CreditService.initializeTrialCredits',
        severity: 'medium'
      });
      return false;
    }
  }

  // Enhanced atomic credit deduction using enhanced DB function with idempotency protection
  async deductCreditsAtomic(agentId: string, userId?: string, idempotencyKey?: string): Promise<CreditDeductionResult> {
    try {
      if (!userId) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          return {
            success: false,
            newBalance: 0,
            transactionId: '',
            creditsCost: 0,
            error: 'User not authenticated'
          };
        }
        userId = user.id;
      }

      // Get agent pricing first
      const pricing = await this.getAgentPricing(agentId);
      if (!pricing) {
        return {
          success: false,
          newBalance: 0,
          transactionId: '',
          creditsCost: 0,
          error: 'Agent pricing not found'
        };
      }

      // Use the enhanced deduct_credits_enhanced function with idempotency protection
      const { data, error } = await supabase.rpc('deduct_credits_enhanced', {
        user_uuid: userId,
        credit_amount: pricing.creditWeight,
        agent_identifier: agentId,
        transaction_description: `Agent usage: ${agentId}`,
        idempotency_key: idempotencyKey || null
      });

      if (error) throw error;

      // data is an array of records from the function
      const result = data && data.length > 0 ? data[0] : null;
      
      if (!result) {
        return {
          success: false,
          newBalance: 0,
          transactionId: '',
          creditsCost: pricing.creditWeight,
          error: 'No result from deduction function'
        };
      }

      // Log result with detailed information
      if (result.success) {
        loggingService.logActivity({
          eventType: 'credits_deducted_atomic_enhanced',
          eventCategory: 'credits',
          eventData: {
            agentId,
            userId,
            creditsCost: pricing.creditWeight,
            newBalance: result.new_balance,
            transactionId: result.transaction_id,
            idempotencyKey: idempotencyKey || 'none',
            isDuplicate: result.is_duplicate,
            errorMessage: result.error_message,
            component: 'CreditService'
          }
        });
      } else {
        loggingService.logError({
          errorType: 'enhanced_credit_deduction_failed',
          errorMessage: `Enhanced credit deduction failed: ${result.error_message}`,
          component: 'CreditService.deductCreditsAtomic',
          additionalData: {
            agentId,
            userId,
            creditsCost: pricing.creditWeight,
            availableBalance: result.new_balance,
            idempotencyKey: idempotencyKey || 'none',
            errorMessage: result.error_message
          },
          severity: 'medium'
        });
      }

      return {
        success: result.success,
        newBalance: result.new_balance,
        transactionId: result.transaction_id || '',
        creditsCost: pricing.creditWeight,
        error: result.error_message
      };
    } catch (error) {
      console.error('Failed to deduct credits with enhanced function:', error);
      loggingService.logError({
        errorType: 'enhanced_atomic_credit_deduction_exception',
        errorMessage: error instanceof Error ? error.message : 'Exception in enhanced atomic credit deduction',
        component: 'CreditService.deductCreditsAtomic',
        additionalData: { 
          agentId, 
          userId,
          idempotencyKey: idempotencyKey || 'none',
          stackTrace: error instanceof Error ? error.stack : undefined
        },
        severity: 'critical'
      });
      
      return {
        success: false,
        newBalance: 0,
        transactionId: '',
        creditsCost: 0,
        error: 'System error during credit deduction'
      };
    }
  }

  // Enhanced eligibility check with detailed info
  async checkAgentEligibility(agentId: string, userId?: string): Promise<EligibilityCheck> {
    try {
      const [credits, pricing] = await Promise.all([
        this.getUserCredits(userId),
        this.getAgentPricing(agentId)
      ]);

      const available = credits?.balance || 0;
      const required = Math.ceil(pricing?.creditWeight || 1.0);
      const canUse = available >= required;

      const result: EligibilityCheck = {
        canUse,
        required,
        available
      };

      if (!canUse) {
        result.blockers = ['insufficient_credits'];
        result.alternatives = [
          'Purchase credits',
          'Choose a different agent'
        ];
      }

      return result;
    } catch (error) {
      console.error('Failed to check agent eligibility:', error);
      return {
        canUse: false,
        required: 1,
        available: 0,
        blockers: ['system_error'],
        alternatives: ['Try again later']
      };
    }
  }

  // Add credits with source tracking
  async addCreditsTyped(
    amount: number,
    source: CreditSource,
    description?: string,
    metadata?: Record<string, any>,
    userId?: string
  ): Promise<boolean> {
    try {
      if (!userId) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return false;
        userId = user.id;
      }

      const { data, error } = await supabase.rpc('add_credits_typed', {
        user_uuid: userId,
        credit_amount: amount,
        credit_source: source,
        transaction_description: description,
        transaction_metadata: metadata || {}
      });

      if (error) throw error;

      // Log successful credit addition
      loggingService.logActivity({
        eventType: 'credits_added_typed',
        eventCategory: 'credits',
        eventData: {
          amount,
          source,
          description,
          success: data
        }
      });

      return data;
    } catch (error) {
      console.error('Failed to add typed credits:', error);
      loggingService.logError({
        errorType: 'typed_credit_addition_error',
        errorMessage: error instanceof Error ? error.message : 'Failed to add typed credits',
        component: 'CreditService.addCreditsTyped',
        additionalData: { amount, source },
        severity: 'high'
      });
      return false;
    }
  }

  // Enhanced transaction history with filters
  async getCreditTransactionsFiltered(filters?: TransactionFilters, userId?: string): Promise<CreditTransaction[]> {
    try {
      if (!userId) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return [];
        userId = user.id;
      }

      let query = supabase
        .from('credit_transactions')
        .select('id, type, amount, description, metadata, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (filters?.type) {
        query = query.eq('type', filters.type);
      }

      if (filters?.fromDate) {
        query = query.gte('created_at', filters.fromDate);
      }

      if (filters?.toDate) {
        query = query.lte('created_at', filters.toDate);
      }

      query = query.limit(filters?.limit || 50);

      const { data, error } = await query;
      if (error) throw error;

      return data.map(transaction => ({
        id: transaction.id,
        type: transaction.type,
        amount: transaction.amount,
        description: transaction.description || '',
        metadata: transaction.metadata || {},
        createdAt: transaction.created_at
      }));
    } catch (error) {
      console.error('Failed to get filtered credit transactions:', error);
      return [];
    }
  }

  // Enhanced usage statistics
  async getCreditUsageStatsEnhanced(period: TimePeriod = '30d', userId?: string): Promise<UsageStats> {
    try {
      if (!userId) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          return {
            totalUsed: 0,
            totalAdded: 0,
            netChange: 0,
            avgDailyUsage: 0,
            topAgents: []
          };
        }
        userId = user.id;
      }

      const days = {
        '7d': 7,
        '30d': 30,
        '90d': 90,
        '1y': 365
      }[period];

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data, error } = await supabase
        .from('credit_transactions')
        .select('type, amount, metadata')
        .eq('user_id', userId)
        .gte('created_at', startDate.toISOString());

      if (error) throw error;

      const stats = data.reduce((acc, transaction) => {
        if (transaction.amount > 0) {
          acc.totalAdded += transaction.amount;
        } else {
          acc.totalUsed += Math.abs(transaction.amount);
          
          // Track agent usage
          if (transaction.metadata?.agent_id) {
            const agentId = transaction.metadata.agent_id;
            const existing = acc.agentUsage.find(a => a.agentId === agentId);
            if (existing) {
              existing.credits += Math.abs(transaction.amount);
            } else {
              acc.agentUsage.push({ agentId, credits: Math.abs(transaction.amount) });
            }
          }
        }
        return acc;
      }, { 
        totalUsed: 0, 
        totalAdded: 0, 
        agentUsage: [] as Array<{agentId: string, credits: number}>
      });

      return {
        totalUsed: stats.totalUsed,
        totalAdded: stats.totalAdded,
        netChange: stats.totalAdded - stats.totalUsed,
        avgDailyUsage: stats.totalUsed / days,
        topAgents: stats.agentUsage
          .sort((a, b) => b.credits - a.credits)
          .slice(0, 5)
      };
    } catch (error) {
      console.error('Failed to get enhanced credit usage stats:', error);
      return {
        totalUsed: 0,
        totalAdded: 0,
        netChange: 0,
        avgDailyUsage: 0,
        topAgents: []
      };
    }
  }

  // Process monthly rollover with detailed result
  async processMonthlyRollover(userId?: string): Promise<RolloverResult> {
    try {
      if (!userId) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          return {
            rolledAmount: 0,
            newBalance: 0,
            eligibilityMet: false
          };
        }
        userId = user.id;
      }

      const { data, error } = await supabase.rpc('process_monthly_rollover', {
        user_uuid: userId
      });

      if (error) throw error;

      const result = data as any;
      
      loggingService.logActivity({
        eventType: 'monthly_rollover_processed',
        eventCategory: 'credits',
        eventData: result
      });

      return {
        rolledAmount: result.rolled_amount || 0,
        newBalance: result.new_balance || 0,
        eligibilityMet: result.eligibility_met || false,
        streakWeeks: result.streak_weeks
      };
    } catch (error) {
      console.error('Failed to process monthly rollover:', error);
      loggingService.logError({
        errorType: 'monthly_rollover_error',
        errorMessage: error instanceof Error ? error.message : 'Failed to process monthly rollover',
        component: 'CreditService.processMonthlyRollover',
        severity: 'medium'
      });
      
      return {
        rolledAmount: 0,
        newBalance: 0,
        eligibilityMet: false
      };
    }
  }

  // Calculate rollover eligibility
  async calculateRolloverEligibility(userId?: string): Promise<boolean> {
    try {
      if (!userId) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return false;
        userId = user.id;
      }

      const { data, error } = await supabase.rpc('calculate_rollover_eligibility', {
        user_uuid: userId
      });

      if (error) throw error;
      return data || false;
    } catch (error) {
      console.error('Failed to calculate rollover eligibility:', error);
      return false;
    }
  }

  // Update agent pricing
  async updateAgentPricing(agentId: string, weight: number, reason: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('agent_pricing')
        .upsert({
          agent_id: agentId,
          credit_weight: weight,
          description: reason,
          last_updated: new Date().toISOString()
        });

      if (error) throw error;

      loggingService.logActivity({
        eventType: 'agent_pricing_updated',
        eventCategory: 'admin',
        eventData: { agentId, weight, reason }
      });

      return true;
    } catch (error) {
      console.error('Failed to update agent pricing:', error);
      return false;
    }
  }

  // Admin: Grant credits
  async grantAdminCredits(amount: number, reason: string, targetUserId: string): Promise<boolean> {
    return this.addCreditsTyped(
      amount,
      'admin_grant',
      `Admin grant: ${reason}`,
      { admin_reason: reason },
      targetUserId
    );
  }

  // System health check
  async getCreditSystemHealth(): Promise<{
    totalCreditsInSystem: number;
    activeUsers: number;
    avgDailyBurn: number;
    systemStatus: 'healthy' | 'warning' | 'critical';
  }> {
    try {
      // Get total credits in system
      const { data: creditData, error: creditError } = await supabase
        .from('credits')
        .select('balance');

      if (creditError) throw creditError;

      const totalCredits = creditData.reduce((sum, row) => sum + row.balance, 0);
      
      // Get active users (users with balance > 0)
      const activeUsers = creditData.filter(row => row.balance > 0).length;

      // Calculate system status
      let systemStatus: 'healthy' | 'warning' | 'critical' = 'healthy';
      if (totalCredits < 10000) systemStatus = 'critical';
      else if (totalCredits < 50000) systemStatus = 'warning';

      return {
        totalCreditsInSystem: totalCredits,
        activeUsers,
        avgDailyBurn: 0, // Would need more complex calculation
        systemStatus
      };
    } catch (error) {
      console.error('Failed to get system health:', error);
      return {
        totalCreditsInSystem: 0,
        activeUsers: 0,
        avgDailyBurn: 0,
        systemStatus: 'critical'
      };
    }
  }
}

export const creditService = new CreditService();