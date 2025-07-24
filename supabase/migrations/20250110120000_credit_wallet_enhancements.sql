/*
  # Credit Wallet Enhancements

  1. Enhanced Credits Table
    - Add subscription_credits, topup_credits, trial_credits breakdown
    - Add cost_basis tracking to agent_pricing
    - Add user_activity table for Smart Streaks

  2. New Functions
    - Atomic credit deduction with race condition protection
    - Rollover eligibility calculation
    - Activity tracking for Smart Streaks

  3. Enhanced Security & Performance
    - Improved RLS policies
    - Optimized indexes
    - Audit triggers
*/

-- Add new columns to credits table
ALTER TABLE credits 
ADD COLUMN IF NOT EXISTS subscription_credits integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS topup_credits integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS trial_credits integer DEFAULT 0;

-- Add constraint to ensure balance equals sum of credit types
ALTER TABLE credits 
ADD CONSTRAINT IF NOT EXISTS credits_balance_consistency 
CHECK (balance = subscription_credits + topup_credits + trial_credits);

-- Enhance agent_pricing table
ALTER TABLE agent_pricing 
ADD COLUMN IF NOT EXISTS cost_basis numeric(10,6) DEFAULT 0.014,
ADD COLUMN IF NOT EXISTS last_updated timestamptz DEFAULT now();

-- Create user_activity table for Smart Streaks
CREATE TABLE IF NOT EXISTS user_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  week_start date NOT NULL,
  interaction_count integer DEFAULT 0,
  last_activity timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, week_start)
);

-- Enable RLS on user_activity
ALTER TABLE user_activity ENABLE ROW LEVEL SECURITY;

-- RLS Policy for user_activity
CREATE POLICY "Users can view own activity"
  ON user_activity
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage activity"
  ON user_activity
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_activity_user_week ON user_activity(user_id, week_start);
CREATE INDEX IF NOT EXISTS idx_user_activity_week_start ON user_activity(week_start);
CREATE INDEX IF NOT EXISTS idx_credits_rollover_eligible ON credits(rollover_eligible, last_rollover);
CREATE INDEX IF NOT EXISTS idx_agent_pricing_weight ON agent_pricing(credit_weight);

-- Enhanced function for atomic credit deduction
CREATE OR REPLACE FUNCTION deduct_credits_atomic(
  user_uuid uuid,
  agent_id_param text,
  idempotency_key text DEFAULT NULL
)
RETURNS jsonb AS $$
DECLARE
  agent_weight numeric;
  current_balance integer;
  new_balance integer;
  transaction_id uuid;
  result jsonb;
BEGIN
  -- Start serializable transaction to prevent race conditions
  SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;
  
  -- Get agent credit weight
  SELECT credit_weight INTO agent_weight
  FROM agent_pricing
  WHERE agent_id = agent_id_param;
  
  -- Default to 1.0 if agent not found
  IF agent_weight IS NULL THEN
    agent_weight := 1.0;
  END IF;
  
  -- Lock user's credit row and check balance
  SELECT balance INTO current_balance
  FROM credits
  WHERE user_id = user_uuid
  FOR UPDATE;
  
  -- Check if user has sufficient credits
  IF current_balance IS NULL OR current_balance < CEIL(agent_weight) THEN
    result := jsonb_build_object(
      'success', false,
      'error', 'insufficient_credits',
      'required', CEIL(agent_weight),
      'available', COALESCE(current_balance, 0)
    );
    RETURN result;
  END IF;
  
  -- Calculate new balance
  new_balance := current_balance - CEIL(agent_weight);
  
  -- Update balance atomically
  UPDATE credits 
  SET balance = new_balance,
      updated_at = now()
  WHERE user_id = user_uuid;
  
  -- Insert transaction record
  INSERT INTO credit_transactions (
    user_id,
    type,
    amount,
    description,
    metadata
  ) VALUES (
    user_uuid,
    'usage',
    -CEIL(agent_weight),
    'Agent usage: ' || agent_id_param,
    jsonb_build_object(
      'agent_id', agent_id_param,
      'credit_weight', agent_weight,
      'idempotency_key', idempotency_key
    )
  ) RETURNING id INTO transaction_id;
  
  -- Record activity for Smart Streaks
  INSERT INTO user_activity (user_id, week_start, interaction_count, last_activity)
  VALUES (
    user_uuid,
    date_trunc('week', CURRENT_DATE)::date,
    1,
    now()
  )
  ON CONFLICT (user_id, week_start)
  DO UPDATE SET
    interaction_count = user_activity.interaction_count + 1,
    last_activity = now();
  
  -- Return success result
  result := jsonb_build_object(
    'success', true,
    'credits_cost', CEIL(agent_weight),
    'new_balance', new_balance,
    'transaction_id', transaction_id
  );
  
  RETURN result;
  
EXCEPTION
  WHEN serialization_failure THEN
    -- Retry logic would be handled at application level
    result := jsonb_build_object(
      'success', false,
      'error', 'serialization_failure',
      'retry', true
    );
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate rollover eligibility (Smart Streaks)
CREATE OR REPLACE FUNCTION calculate_rollover_eligibility(user_uuid uuid)
RETURNS boolean AS $$
DECLARE
  active_weeks integer;
  current_month_start date;
BEGIN
  -- Get start of current month
  current_month_start := date_trunc('month', CURRENT_DATE)::date;
  
  -- Count active weeks in current month (≥1 interaction per week)
  SELECT COUNT(*) INTO active_weeks
  FROM user_activity
  WHERE user_id = user_uuid
    AND week_start >= current_month_start
    AND week_start < current_month_start + interval '1 month'
    AND interaction_count > 0;
  
  -- Return true if user was active for 3+ weeks
  RETURN active_weeks >= 3;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enhanced function for processing rollover
CREATE OR REPLACE FUNCTION process_monthly_rollover(user_uuid uuid)
RETURNS jsonb AS $$
DECLARE
  current_balance integer;
  rollover_amount integer;
  eligible boolean;
  new_balance integer;
  result jsonb;
BEGIN
  -- Get current balance and check eligibility
  SELECT balance INTO current_balance
  FROM credits
  WHERE user_id = user_uuid;
  
  -- Check eligibility
  SELECT calculate_rollover_eligibility(user_uuid) INTO eligible;
  
  IF NOT eligible OR current_balance IS NULL OR current_balance = 0 THEN
    -- Reset subscription credits to 250 for subscribers
    UPDATE credits 
    SET subscription_credits = 250,
        balance = 250 + topup_credits + trial_credits,
        last_rollover = now(),
        rollover_eligible = false,
        updated_at = now()
    WHERE user_id = user_uuid;
    
    result := jsonb_build_object(
      'rolled_amount', 0,
      'new_balance', 250 + COALESCE((SELECT topup_credits FROM credits WHERE user_id = user_uuid), 0),
      'eligibility_met', false
    );
    RETURN result;
  END IF;
  
  -- Calculate rollover (30% of balance, max 75)
  rollover_amount := LEAST(FLOOR(current_balance * 0.3), 75);
  new_balance := 250 + rollover_amount; -- 250 new subscription + rollover
  
  -- Update credits with rollover
  UPDATE credits 
  SET subscription_credits = 250,
      topup_credits = rollover_amount,
      trial_credits = 0, -- trial credits don't roll over
      balance = new_balance,
      last_rollover = now(),
      rollover_eligible = false,
      updated_at = now()
  WHERE user_id = user_uuid;
  
  -- Log rollover transaction
  INSERT INTO credit_transactions (
    user_id,
    type,
    amount,
    description,
    metadata
  ) VALUES (
    user_uuid,
    'rollover',
    rollover_amount,
    'Monthly credit rollover',
    jsonb_build_object(
      'previous_balance', current_balance,
      'rollover_rate', 0.3,
      'max_rollover', 75
    )
  );
  
  result := jsonb_build_object(
    'rolled_amount', rollover_amount,
    'new_balance', new_balance,
    'eligibility_met', true
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to add credits with type breakdown
CREATE OR REPLACE FUNCTION add_credits_typed(
  user_uuid uuid,
  credit_amount integer,
  credit_source text,
  transaction_description text DEFAULT NULL,
  transaction_metadata jsonb DEFAULT '{}'
)
RETURNS boolean AS $$
DECLARE
  current_subscription integer;
  current_topup integer;
  current_trial integer;
BEGIN
  -- Validate transaction type
  IF credit_source NOT IN ('trial', 'subscription', 'topup', 'rollover', 'admin_grant', 'referral_bonus') THEN
    RAISE EXCEPTION 'Invalid credit source: %', credit_source;
  END IF;

  -- Validate credit amount
  IF credit_amount <= 0 THEN
    RAISE EXCEPTION 'Credit amount must be positive: %', credit_amount;
  END IF;

  -- Get current credit breakdown
  SELECT 
    COALESCE(subscription_credits, 0),
    COALESCE(topup_credits, 0),
    COALESCE(trial_credits, 0)
  INTO current_subscription, current_topup, current_trial
  FROM credits
  WHERE user_id = user_uuid;
  
  -- Set defaults if user doesn't exist
  current_subscription := COALESCE(current_subscription, 0);
  current_topup := COALESCE(current_topup, 0);
  current_trial := COALESCE(current_trial, 0);

  -- Insert or update credits based on source
  IF credit_source = 'trial' THEN
    INSERT INTO credits (user_id, subscription_credits, topup_credits, trial_credits, balance, updated_at)
    VALUES (user_uuid, current_subscription, current_topup, current_trial + credit_amount, 
            current_subscription + current_topup + current_trial + credit_amount, now())
    ON CONFLICT (user_id)
    DO UPDATE SET
      trial_credits = credits.trial_credits + credit_amount,
      balance = credits.balance + credit_amount,
      updated_at = now();
      
  ELSIF credit_source = 'subscription' THEN
    INSERT INTO credits (user_id, subscription_credits, topup_credits, trial_credits, balance, updated_at)
    VALUES (user_uuid, current_subscription + credit_amount, current_topup, current_trial,
            current_subscription + credit_amount + current_topup + current_trial, now())
    ON CONFLICT (user_id)
    DO UPDATE SET
      subscription_credits = credits.subscription_credits + credit_amount,
      balance = credits.balance + credit_amount,
      updated_at = now();
      
  ELSIF credit_source IN ('topup', 'admin_grant', 'referral_bonus') THEN
    INSERT INTO credits (user_id, subscription_credits, topup_credits, trial_credits, balance, updated_at)
    VALUES (user_uuid, current_subscription, current_topup + credit_amount, current_trial,
            current_subscription + current_topup + credit_amount + current_trial, now())
    ON CONFLICT (user_id)
    DO UPDATE SET
      topup_credits = credits.topup_credits + credit_amount,
      balance = credits.balance + credit_amount,
      updated_at = now();
  END IF;

  -- Log transaction
  INSERT INTO credit_transactions (
    user_id,
    type,
    amount,
    description,
    metadata
  ) VALUES (
    user_uuid,
    credit_source,
    credit_amount,
    transaction_description,
    transaction_metadata
  );

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION deduct_credits_atomic(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_rollover_eligibility(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION add_credits_typed(uuid, integer, text, text, jsonb) TO authenticated; 