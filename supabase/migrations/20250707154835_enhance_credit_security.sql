-- Enhanced Credit Security Migration
-- Adds server-side protection against zero credit usage and improves security

-- Function to check if user has sufficient credits before any operation
CREATE OR REPLACE FUNCTION check_user_credit_access(
  user_uuid uuid,
  required_credits integer DEFAULT 1
)
RETURNS TABLE(
  has_access BOOLEAN,
  current_balance INTEGER,
  required_amount INTEGER,
  message TEXT
) AS $$
DECLARE
  balance_record credits%ROWTYPE;
BEGIN
  -- Input validation
  IF user_uuid IS NULL THEN
    RETURN QUERY SELECT false, 0, required_credits, 'User ID is required';
    RETURN;
  END IF;
  
  IF required_credits <= 0 THEN
    RETURN QUERY SELECT false, 0, required_credits, 'Invalid credit requirement';
    RETURN;
  END IF;
  
  -- Get user's current credits
  SELECT * INTO balance_record 
  FROM credits 
  WHERE user_id = user_uuid;
  
  -- Check if user has credit record
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 0, required_credits, 'No credit account found';
    RETURN;
  END IF;
  
  -- Check if sufficient credits
  IF balance_record.balance >= required_credits THEN
    RETURN QUERY SELECT true, balance_record.balance, required_credits, 'Access granted';
  ELSE
    RETURN QUERY SELECT false, balance_record.balance, required_credits, 
      format('Insufficient credits: need %s, have %s', required_credits, balance_record.balance);
  END IF;
  
  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to enforce credit gate at database level
CREATE OR REPLACE FUNCTION enforce_credit_gate(
  user_uuid uuid,
  agent_identifier text,
  required_credits integer DEFAULT NULL
)
RETURNS TABLE(
  access_granted BOOLEAN,
  balance INTEGER,
  required INTEGER,
  can_proceed BOOLEAN,
  error_message TEXT
) AS $$
DECLARE
  credit_requirement integer;
  agent_cost record;
  credit_check record;
BEGIN
  -- Get agent pricing if not provided
  IF required_credits IS NULL THEN
    SELECT credit_weight INTO credit_requirement
    FROM agent_pricing 
    WHERE agent_id = agent_identifier;
    
    IF NOT FOUND THEN
      credit_requirement := 1; -- Default cost
    END IF;
  ELSE
    credit_requirement := required_credits;
  END IF;
  
  -- Check credit access
  SELECT * INTO credit_check
  FROM check_user_credit_access(user_uuid, credit_requirement);
  
  RETURN QUERY SELECT 
    credit_check.has_access,
    credit_check.current_balance,
    credit_check.required_amount,
    credit_check.has_access,
    credit_check.message;
    
  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Row Level Security policy to prevent unauthorized credit access
CREATE POLICY credit_access_policy ON credits
  FOR SELECT
  USING (
    auth.uid() = user_id OR
    auth.jwt() ->> 'role' = 'service_role'
  );

-- Row Level Security policy for credit transactions
CREATE POLICY credit_transaction_access_policy ON credit_transactions
  FOR SELECT
  USING (
    auth.uid() = user_id OR
    auth.jwt() ->> 'role' = 'service_role'
  );

-- Enable RLS on credits table
ALTER TABLE credits ENABLE ROW LEVEL SECURITY;

-- Enable RLS on credit_transactions table  
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;

-- Create audit log for credit gate violations
CREATE TABLE IF NOT EXISTS credit_security_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id),
  agent_id text,
  violation_type text NOT NULL,
  attempted_action text,
  credit_balance integer,
  required_credits integer,
  ip_address inet,
  user_agent text,
  created_at timestamptz DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Function to log credit security violations
CREATE OR REPLACE FUNCTION log_credit_violation(
  user_uuid uuid,
  agent_identifier text,
  violation_description text,
  current_balance integer DEFAULT 0,
  required_amount integer DEFAULT 1,
  additional_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS boolean AS $$
BEGIN
  INSERT INTO credit_security_log (
    user_id,
    agent_id,
    violation_type,
    attempted_action,
    credit_balance,
    required_credits,
    metadata
  ) VALUES (
    user_uuid,
    agent_identifier,
    violation_description,
    'unauthorized_access_attempt',
    current_balance,
    required_amount,
    additional_metadata
  );
  
  RETURN true;
EXCEPTION
  WHEN OTHERS THEN
    -- Don't fail the main operation if logging fails
    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION check_user_credit_access TO authenticated;
GRANT EXECUTE ON FUNCTION enforce_credit_gate TO authenticated;
GRANT EXECUTE ON FUNCTION log_credit_violation TO authenticated;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_credit_security_log_user_created 
ON credit_security_log(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_credit_security_log_violation_type 
ON credit_security_log(violation_type, created_at DESC);
