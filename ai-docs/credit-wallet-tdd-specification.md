# Credit Wallet TDD Specification

## 1. User Story Map

### Epic: Credit Wallet Monetization System

**As a** platform user  
**I want to** purchase and use credits to access AI agents  
**So that** I can get value from specialized AI assistance without complex billing

### Core User Stories

#### US-1: Trial Credits

**As a** new user  
**I want to** receive 5 trial credits upon signup  
**So that** I can explore the platform before committing to payment

**Acceptance Criteria:**

- User receives exactly 5 credits automatically on account creation
- Trial credits are clearly marked in transaction history
- Trial credits have same functionality as paid credits
- System prevents multiple trial grants per user

#### US-2: Credit Balance Visibility

**As a** platform user  
**I want to** see my current credit balance and usage progress  
**So that** I can manage my consumption and plan purchases

**Acceptance Criteria:**

- Credit balance visible in header/dashboard
- Progress bar shows usage within current period
- Low balance warning when credits < 20
- Transaction history accessible with filtering

#### US-3: Agent Usage with Credits

**As a** platform user  
**I want to** spend credits when using AI agents based on agent complexity  
**So that** I pay fairly for the computational resources used

**Acceptance Criteria:**

- Each agent has defined credit weight (0.5-5 credits)
- Credit deduction happens atomically with agent interaction
- Insufficient credits block agent usage with clear error message
- Demo mode bypasses credit requirements

#### US-4: Credit Purchase

**As a** platform user  
**I want to** buy credits via subscription or one-time packs  
**So that** I can continue using agents when trial/balance runs low

**Acceptance Criteria:**

- Subscription: $9.99/month → 250 credits
- Top-ups: 100 ($4.99), 500 ($19.99), 1500 ($49.99)
- Stripe integration with secure payment flow
- Instant credit delivery post-payment

#### US-5: Credit Rollover

**As a** subscriber  
**I want** unused credits to roll over partially each month  
**So that** I don't lose value from variable usage patterns

**Acceptance Criteria:**

- 30% of unused credits carry over (max 75)
- Rollover happens on 1st of each month
- "Smart Streaks": rollover only if active ≥3 weeks/month
- Clear communication of rollover rules

## 2. API Interface Specification

### CreditService Enhanced Interface

```typescript
interface CreditWalletAPI {
  // Core Operations
  getUserCredits(userId?: string): Promise<CreditBalance>;
  deductCreditsAtomic(
    userId: string,
    agentId: string,
    weight: number
  ): Promise<CreditDeductionResult>;
  addCredits(
    userId: string,
    amount: number,
    source: CreditSource,
    metadata?: any
  ): Promise<boolean>;

  // Pricing & Eligibility
  getAgentPricing(agentId: string): Promise<AgentPricing>;
  checkAgentEligibility(
    userId: string,
    agentId: string
  ): Promise<EligibilityCheck>;
  updateAgentPricing(
    agentId: string,
    weight: number,
    reason: string
  ): Promise<boolean>;

  // Transaction Management
  getCreditTransactions(
    userId: string,
    filters?: TransactionFilters
  ): Promise<CreditTransaction[]>;
  getCreditUsageStats(userId: string, period: TimePeriod): Promise<UsageStats>;

  // Rollover & Lifecycle
  processMonthlyRollover(userId: string): Promise<RolloverResult>;
  calculateRolloverEligibility(userId: string): Promise<boolean>;

  // Admin & Monitoring
  grantAdminCredits(
    userId: string,
    amount: number,
    reason: string
  ): Promise<boolean>;
  getCreditSystemHealth(): Promise<SystemHealthCheck>;
}
```

### Enhanced Type Definitions

```typescript
interface CreditBalance {
  balance: number;
  lastRollover: string;
  rolloverEligible: boolean;
  subscriptionCredits: number; // credits from current subscription
  topupCredits: number; // credits from purchases
  trialCredits: number; // remaining trial credits
}

interface CreditDeductionResult {
  success: boolean;
  newBalance: number;
  transactionId: string;
  error?: string;
}

interface AgentPricing {
  agentId: string;
  creditWeight: number;
  description: string;
  lastUpdated: string;
  costBasis: number; // underlying AI provider cost
}

interface EligibilityCheck {
  canUse: boolean;
  required: number;
  available: number;
  blockers?: string[];
  alternatives?: AlternativeOption[];
}

interface RolloverResult {
  rolledAmount: number;
  newBalance: number;
  eligibilityMet: boolean;
  streakWeeks: number;
}

interface UsageStats {
  totalUsed: number;
  totalAdded: number;
  netChange: number;
  avgDailyUsage: number;
  topAgents: Array<{ agentId: string; credits: number }>;
}

type CreditSource =
  | "trial"
  | "subscription"
  | "topup"
  | "rollover"
  | "admin_grant"
  | "referral_bonus";
```

## 3. Edge Function Specifications

### credit-meter Edge Function

**Purpose:** Atomic credit deduction with race condition protection

```typescript
interface MeterRequest {
  agentId: string;
  userId: string;
  sessionId: string;
  idempotencyKey: string;
}

interface MeterResponse {
  success: boolean;
  creditsCost: number;
  newBalance: number;
  transactionId: string;
  error?: string;
}
```

**Algorithm:**

1. Validate request & extract user context
2. Begin SERIALIZABLE transaction
3. Get current balance with row lock
4. Fetch agent credit weight
5. Check sufficient balance
6. Deduct credits atomically
7. Insert transaction record
8. Commit or rollback

### rollover-cron Edge Function

**Purpose:** Monthly credit rollover with Smart Streaks logic

**Schedule:** 1st of each month, 00:00 UTC
**Logic:**

1. Query users with balance > 0 and last_rollover < current month
2. Check activity streak (≥3 active weeks)
3. Calculate rollover: min(balance \* 0.3, 75)
4. Update balance and reset subscription credits to 250
5. Log rollover transaction

## 4. Database Schema Extensions

```sql
-- Enhanced credits table
CREATE TABLE credits (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  balance INTEGER NOT NULL DEFAULT 0,
  subscription_credits INTEGER DEFAULT 0,
  topup_credits INTEGER DEFAULT 0,
  trial_credits INTEGER DEFAULT 0,
  last_rollover TIMESTAMPTZ DEFAULT NOW(),
  rollover_eligible BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT positive_balance CHECK (balance >= 0)
);

-- Activity tracking for Smart Streaks
CREATE TABLE user_activity (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  week_start DATE NOT NULL,
  interaction_count INTEGER DEFAULT 0,
  last_activity TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, week_start)
);

-- Agent pricing with cost basis tracking
ALTER TABLE agent_pricing ADD COLUMN cost_basis DECIMAL(10,6) DEFAULT 0.014;
ALTER TABLE agent_pricing ADD COLUMN last_updated TIMESTAMPTZ DEFAULT NOW();
```

## 5. Test Scenarios

### Unit Tests

- CreditService.deductCreditsAtomic() handles concurrent requests
- Rollover calculation respects 30% and 75 credit limits
- Agent pricing updates trigger weight recalculation
- Negative balance prevention under race conditions

### Integration Tests

- Stripe webhook → credit addition → balance update flow
- Agent usage → credit deduction → transaction logging
- Monthly rollover cron execution
- Demo mode bypass of credit requirements

### E2E Tests (Playwright)

- New user signup → 5 trial credits granted
- Credit exhaustion → paywall modal → Stripe checkout → credits added
- Agent usage flow with insufficient credits
- Subscription purchase → monthly credit refresh

## 6. Performance & Security Requirements

### Performance Targets

- Credit deduction API: <100ms P95
- Balance check: <50ms P95
- Concurrent deductions: 100 req/sec without data races
- Database queries: <5ms explain analyze

### Security Controls

- Row-level security on all credit tables
- API rate limiting: 10 req/min per user for credit operations
- Idempotency keys for all mutations
- Audit trail for admin credit grants
- Webhook signature validation (Stripe)

## 7. Monitoring & Alerting

### Key Metrics

- Credit pool balance across all users
- Average daily burn rate vs. top-up rate
- Failed deduction attempts (insufficient funds)
- Rollover execution success rate
- Negative balance incidents (should be 0)

### Alerts

- Credit pool below 10,000 credits (business risk)
- Deduction error rate > 1%
- Rollover cron failure
- Suspicious admin credit grants

## 8. Migration & Rollout Strategy

### Phase 1: Infrastructure (Days 1-3)

- Deploy database schema
- Implement core CreditService methods
- Basic UI components for balance display

### Phase 2: Payment Integration (Days 4-6)

- Stripe product setup
- Webhook handlers
- Credit purchase flow

### Phase 3: Metering Integration (Days 7-8)

- credit-meter Edge Function
- Agent usage integration
- Demo mode preservation

### Phase 4: Advanced Features (Days 9-10)

- Rollover cron implementation
- Smart Streaks logic
- Admin controls

This specification serves as the blueprint for implementing a robust, scalable credit wallet system that balances user experience with business sustainability.
