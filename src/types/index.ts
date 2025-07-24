export interface Agent {
  id: string;
  name: string;
  role: string;
  specialty: string;
  description: string;
  avatar: string;
  rating: number;
  totalInteractions: number;
  skills: string[];
  category: AgentCategory;
  experienceLevel: ExperienceLevel;
  isOnline: boolean;
  responseTime: string;
  languages: string[];
  pricing: {
    perMessage: number;
    perHour: number;
  };
}

export type AgentCategory = 'Development' | 'Writing' | 'Analysis' | 'Creative' | 'Business' | 'Research';

export type ExperienceLevel = 'Beginner' | 'Intermediate' | 'Expert';

export type AIModel = 'gpt-4.1-turbo' | 'claude-sonnet-4-20250514' | 'gemini-2.0-flash';

export interface ChatMessage {
  id: string;
  content: string;
  timestamp: Date;
  sender: 'user' | 'agent';
  agentId?: string;
  model?: AIModel;
  rating?: number;
  feedback?: string;
}

export interface ChatSession {
  id: string;
  agentId: string;
  messages: ChatMessage[];
  model: AIModel;
  startedAt: Date;
  lastActivity: Date;
}

export interface SearchFilters {
  query: string;
  category: AgentCategory | 'All';
  experienceLevel: ExperienceLevel | 'All';
  minRating: number;
  sortBy: 'relevance' | 'rating' | 'popularity' | 'recent';
}

export interface ExportOptions {
  format: 'pdf' | 'txt' | 'md';
  includeMetadata: boolean;
  includeRatings: boolean;
}



// Enhanced Credit System Types
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