/*
  # Create Credits System

  1. New Tables
    - `credits`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to users)
      - `balance` (integer, current credit balance)
      - `last_rollover` (timestamptz, last rollover date)
      - `rollover_eligible` (boolean, eligible for rollover this month)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `credit_transactions`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to users)
      - `type` (text, transaction type)
      - `amount` (integer, credit amount)
      - `description` (text, transaction description)
      - `metadata` (jsonb, additional data)
      - `created_at` (timestamptz)

    - `agent_pricing`
      - `id` (uuid, primary key)
      - `agent_id` (text, agent identifier)
      - `credit_weight` (numeric, credit cost per use)
      - `description` (text, pricing description)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Add policies for user access control
    - Add admin policies for management

  3. Functions
    - Credit balance management
    - Transaction logging
    - Rollover calculations
*/

-- Credits table
CREATE TABLE IF NOT EXISTS credits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  balance integer DEFAULT 0 CHECK (balance >= 0),
  last_rollover timestamptz DEFAULT now(),
  rollover_eligible boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

-- Credit transactions table for audit trail
CREATE TABLE IF NOT EXISTS credit_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  type text NOT NULL CHECK (type IN ('trial', 'subscription', 'topup', 'usage', 'rollover', 'admin_grant', 'admin_revoke')),
  amount integer NOT NULL,
  description text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Agent pricing table
CREATE TABLE IF NOT EXISTS agent_pricing (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id text UNIQUE NOT NULL,
  credit_weight numeric DEFAULT 1.0 CHECK (credit_weight > 0),
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_pricing ENABLE ROW LEVEL SECURITY;

-- RLS Policies for credits
CREATE POLICY "Users can view own credits"
  ON credits
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage credits"
  ON credits
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- RLS Policies for credit_transactions
CREATE POLICY "Users can view own transactions"
  ON credit_transactions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage transactions"
  ON credit_transactions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- RLS Policies for agent_pricing
CREATE POLICY "Anyone can view agent pricing"
  ON agent_pricing
  FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Service role can manage agent pricing"
  ON agent_pricing
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_credits_user_id ON credits(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_id ON credit_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_type ON credit_transactions(type);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_created_at ON credit_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_agent_pricing_agent_id ON agent_pricing(agent_id);

-- Create trigger for updated_at on credits
CREATE TRIGGER update_credits_updated_at
  BEFORE UPDATE ON credits
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create trigger for updated_at on agent_pricing
CREATE TRIGGER update_agent_pricing_updated_at
  BEFORE UPDATE ON agent_pricing
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to get user credit balance
CREATE OR REPLACE FUNCTION get_user_credits(user_uuid uuid)
RETURNS integer AS $$
DECLARE
  user_balance integer;
BEGIN
  SELECT balance INTO user_balance
  FROM credits
  WHERE user_id = user_uuid;
  
  RETURN COALESCE(user_balance, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to add credits to user
CREATE OR REPLACE FUNCTION add_credits(
  user_uuid uuid,
  credit_amount integer,
  transaction_type text,
  transaction_description text DEFAULT NULL,
  transaction_metadata jsonb DEFAULT '{}'
)
RETURNS boolean AS $$
DECLARE
  current_balance integer;
BEGIN
  -- Validate transaction type
  IF transaction_type NOT IN ('trial', 'subscription', 'topup', 'rollover', 'admin_grant') THEN
    RAISE EXCEPTION 'Invalid transaction type: %', transaction_type;
  END IF;

  -- Validate credit amount
  IF credit_amount <= 0 THEN
    RAISE EXCEPTION 'Credit amount must be positive: %', credit_amount;
  END IF;

  -- Insert or update credits
  INSERT INTO credits (user_id, balance, updated_at)
  VALUES (user_uuid, credit_amount, now())
  ON CONFLICT (user_id)
  DO UPDATE SET
    balance = credits.balance + credit_amount,
    updated_at = now();

  -- Log transaction
  INSERT INTO credit_transactions (
    user_id,
    type,
    amount,
    description,
    metadata
  ) VALUES (
    user_uuid,
    transaction_type,
    credit_amount,
    transaction_description,
    transaction_metadata
  );

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to deduct credits from user
CREATE OR REPLACE FUNCTION deduct_credits(
  user_uuid uuid,
  credit_amount numeric,
  agent_identifier text,
  transaction_description text DEFAULT NULL
)
RETURNS boolean AS $$
DECLARE
  current_balance integer;
  credit_cost integer;
BEGIN
  -- Convert numeric to integer (round up)
  credit_cost := CEIL(credit_amount);

  -- Validate credit amount
  IF credit_cost <= 0 THEN
    RAISE EXCEPTION 'Credit amount must be positive: %', credit_cost;
  END IF;

  -- Get current balance
  SELECT balance INTO current_balance
  FROM credits
  WHERE user_id = user_uuid;

  -- Check if user has enough credits
  IF current_balance IS NULL OR current_balance < credit_cost THEN
    RETURN false;
  END IF;

  -- Deduct credits
  UPDATE credits
  SET balance = balance - credit_cost,
      updated_at = now()
  WHERE user_id = user_uuid;

  -- Log transaction
  INSERT INTO credit_transactions (
    user_id,
    type,
    amount,
    description,
    metadata
  ) VALUES (
    user_uuid,
    'usage',
    -credit_cost,
    COALESCE(transaction_description, 'Agent usage: ' || agent_identifier),
    jsonb_build_object('agent_id', agent_identifier, 'credit_weight', credit_amount)
  );

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to initialize trial credits for new user
CREATE OR REPLACE FUNCTION initialize_trial_credits(user_uuid uuid)
RETURNS boolean AS $$
BEGIN
  -- Check if user already has credits
  IF EXISTS (SELECT 1 FROM credits WHERE user_id = user_uuid) THEN
    RETURN false;
  END IF;

  -- Add trial credits
  RETURN add_credits(
    user_uuid,
    5,
    'trial',
    'Welcome trial credits',
    '{"trial": true}'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to handle monthly subscription credits
CREATE OR REPLACE FUNCTION add_subscription_credits(user_uuid uuid)
RETURNS boolean AS $$
BEGIN
  RETURN add_credits(
    user_uuid,
    250,
    'subscription',
    'Monthly subscription credits',
    jsonb_build_object('subscription_date', now())
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to handle credit rollover
CREATE OR REPLACE FUNCTION process_credit_rollover(user_uuid uuid)
RETURNS integer AS $$
DECLARE
  current_balance integer;
  rollover_amount integer;
  max_rollover integer := 75;
  rollover_percentage numeric := 0.30;
BEGIN
  -- Get current balance
  SELECT balance INTO current_balance
  FROM credits
  WHERE user_id = user_uuid AND rollover_eligible = true;

  -- If user is not eligible or has no credits, return 0
  IF current_balance IS NULL OR current_balance = 0 THEN
    RETURN 0;
  END IF;

  -- Calculate rollover amount (30% of unused credits, max 75)
  rollover_amount := LEAST(FLOOR(current_balance * rollover_percentage), max_rollover);

  -- If no rollover amount, return 0
  IF rollover_amount = 0 THEN
    RETURN 0;
  END IF;

  -- Add rollover credits
  PERFORM add_credits(
    user_uuid,
    rollover_amount,
    'rollover',
    'Monthly credit rollover',
    jsonb_build_object('rollover_percentage', rollover_percentage, 'original_balance', current_balance)
  );

  -- Update rollover status
  UPDATE credits
  SET rollover_eligible = false,
      last_rollover = now()
  WHERE user_id = user_uuid;

  RETURN rollover_amount;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_user_credits(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION add_credits(uuid, integer, text, text, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION deduct_credits(uuid, numeric, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION initialize_trial_credits(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION add_subscription_credits(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION process_credit_rollover(uuid) TO service_role;