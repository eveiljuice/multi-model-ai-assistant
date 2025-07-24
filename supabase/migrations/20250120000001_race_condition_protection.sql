-- Race Condition Protection for Credit Deduction
-- This migration implements atomic credit deduction with proper locking

-- Enhanced credit deduction function with race condition protection
CREATE OR REPLACE FUNCTION atomic_deduct_credits(
  p_user_id UUID,
  p_amount INTEGER,
  p_agent_id TEXT DEFAULT NULL,
  p_description TEXT DEFAULT 'Credit deduction',
  p_session_id TEXT DEFAULT NULL
)
RETURNS TABLE(
  success BOOLEAN,
  remaining_credits INTEGER,
  transaction_id UUID,
  error_message TEXT
) AS $$
DECLARE
  v_current_balance INTEGER;
  v_new_balance INTEGER;
  v_transaction_id UUID;
  v_lock_acquired BOOLEAN := FALSE;
  v_lock_key TEXT;
BEGIN
  -- Generate unique lock key for this user
  v_lock_key := 'credit_deduction_' || p_user_id::TEXT;
  
  -- Validate input parameters
  IF p_user_id IS NULL THEN
    RETURN QUERY SELECT FALSE, 0, NULL::UUID, 'User ID is required';
    RETURN;
  END IF;
  
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RETURN QUERY SELECT FALSE, 0, NULL::UUID, 'Invalid amount';
    RETURN;
  END IF;
  
  -- Acquire advisory lock to prevent concurrent credit deductions
  SELECT pg_try_advisory_lock(hashtext(v_lock_key)) INTO v_lock_acquired;
  
  IF NOT v_lock_acquired THEN
    RETURN QUERY SELECT FALSE, 0, NULL::UUID, 'Another credit operation in progress';
    RETURN;
  END IF;
  
  BEGIN
    -- Get current balance with SELECT FOR UPDATE to prevent race conditions
    SELECT balance INTO v_current_balance
    FROM credit_wallets
    WHERE user_id = p_user_id
    FOR UPDATE;
    
    -- Check if user has credit wallet
    IF NOT FOUND THEN
      RETURN QUERY SELECT FALSE, 0, NULL::UUID, 'No credit wallet found';
      RETURN;
    END IF;
    
    -- Check if sufficient credits available
    IF v_current_balance < p_amount THEN
      RETURN QUERY SELECT FALSE, v_current_balance, NULL::UUID, 
        format('Insufficient credits: need %s, have %s', p_amount, v_current_balance);
      RETURN;
    END IF;
    
    -- Calculate new balance
    v_new_balance := v_current_balance - p_amount;
    
    -- Update credit wallet atomically
    UPDATE credit_wallets
    SET 
      balance = v_new_balance,
      updated_at = NOW()
    WHERE user_id = p_user_id;
    
    -- Generate transaction ID
    v_transaction_id := gen_random_uuid();
    
    -- Record transaction
    INSERT INTO credit_transactions (
      id,
      user_id,
      amount,
      transaction_type,
      description,
      agent_id,
      session_id,
      balance_before,
      balance_after,
      created_at
    ) VALUES (
      v_transaction_id,
      p_user_id,
      -p_amount,
      'deduction',
      p_description,
      p_agent_id,
      p_session_id,
      v_current_balance,
      v_new_balance,
      NOW()
    );
    
    -- Log the successful deduction
    INSERT INTO audit_logs (
      user_id,
      action,
      details,
      created_at
    ) VALUES (
      p_user_id,
      'credit_deduction_success',
      jsonb_build_object(
        'amount', p_amount,
        'balance_before', v_current_balance,
        'balance_after', v_new_balance,
        'agent_id', p_agent_id,
        'transaction_id', v_transaction_id
      ),
      NOW()
    );
    
    RETURN QUERY SELECT TRUE, v_new_balance, v_transaction_id, NULL::TEXT;
    
  EXCEPTION
    WHEN OTHERS THEN
      -- Log the error
      INSERT INTO audit_logs (
        user_id,
        action,
        details,
        created_at
      ) VALUES (
        p_user_id,
        'credit_deduction_error',
        jsonb_build_object(
          'error_message', SQLERRM,
          'error_code', SQLSTATE,
          'amount', p_amount,
          'agent_id', p_agent_id
        ),
        NOW()
      );
      
      RETURN QUERY SELECT FALSE, 0, NULL::UUID, 'Database error occurred';
  END;
  
  -- Always release the advisory lock
  IF v_lock_acquired THEN
    PERFORM pg_advisory_unlock(hashtext(v_lock_key));
  END IF;
  
  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check credit availability without deduction
CREATE OR REPLACE FUNCTION check_credit_availability(
  p_user_id UUID,
  p_amount INTEGER
)
RETURNS TABLE(
  available BOOLEAN,
  current_balance INTEGER,
  can_proceed BOOLEAN,
  message TEXT
) AS $$
DECLARE
  v_current_balance INTEGER;
BEGIN
  -- Validate input
  IF p_user_id IS NULL THEN
    RETURN QUERY SELECT FALSE, 0, FALSE, 'User ID is required';
    RETURN;
  END IF;
  
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RETURN QUERY SELECT FALSE, 0, FALSE, 'Invalid amount';
    RETURN;
  END IF;
  
  -- Get current balance (read-only, no locking needed)
  SELECT balance INTO v_current_balance
  FROM credit_wallets
  WHERE user_id = p_user_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 0, FALSE, 'No credit wallet found';
    RETURN;
  END IF;
  
  -- Check availability
  IF v_current_balance >= p_amount THEN
    RETURN QUERY SELECT TRUE, v_current_balance, TRUE, 'Credits available';
  ELSE
    RETURN QUERY SELECT FALSE, v_current_balance, FALSE, 
      format('Insufficient credits: need %s, have %s', p_amount, v_current_balance);
  END IF;
  
  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to handle credit rollback in case of errors
CREATE OR REPLACE FUNCTION rollback_credit_deduction(
  p_transaction_id UUID,
  p_user_id UUID,
  p_reason TEXT DEFAULT 'System error'
)
RETURNS TABLE(
  success BOOLEAN,
  new_balance INTEGER,
  message TEXT
) AS $$
DECLARE
  v_transaction_record RECORD;
  v_lock_key TEXT;
  v_lock_acquired BOOLEAN := FALSE;
  v_current_balance INTEGER;
  v_new_balance INTEGER;
BEGIN
  -- Generate lock key
  v_lock_key := 'credit_rollback_' || p_user_id::TEXT;
  
  -- Acquire advisory lock
  SELECT pg_try_advisory_lock(hashtext(v_lock_key)) INTO v_lock_acquired;
  
  IF NOT v_lock_acquired THEN
    RETURN QUERY SELECT FALSE, 0, 'Another credit operation in progress';
    RETURN;
  END IF;
  
  BEGIN
    -- Get transaction details
    SELECT * INTO v_transaction_record
    FROM credit_transactions
    WHERE id = p_transaction_id
    AND user_id = p_user_id
    AND transaction_type = 'deduction'
    AND rolled_back = FALSE;
    
    IF NOT FOUND THEN
      RETURN QUERY SELECT FALSE, 0, 'Transaction not found or already rolled back';
      RETURN;
    END IF;
    
    -- Get current balance
    SELECT balance INTO v_current_balance
    FROM credit_wallets
    WHERE user_id = p_user_id
    FOR UPDATE;
    
    -- Calculate new balance (add back the deducted amount)
    v_new_balance := v_current_balance + ABS(v_transaction_record.amount);
    
    -- Update credit wallet
    UPDATE credit_wallets
    SET 
      balance = v_new_balance,
      updated_at = NOW()
    WHERE user_id = p_user_id;
    
    -- Mark transaction as rolled back
    UPDATE credit_transactions
    SET 
      rolled_back = TRUE,
      rollback_reason = p_reason,
      rollback_at = NOW()
    WHERE id = p_transaction_id;
    
    -- Create rollback transaction record
    INSERT INTO credit_transactions (
      id,
      user_id,
      amount,
      transaction_type,
      description,
      balance_before,
      balance_after,
      related_transaction_id,
      created_at
    ) VALUES (
      gen_random_uuid(),
      p_user_id,
      ABS(v_transaction_record.amount),
      'rollback',
      format('Rollback: %s', p_reason),
      v_current_balance,
      v_new_balance,
      p_transaction_id,
      NOW()
    );
    
    -- Log the rollback
    INSERT INTO audit_logs (
      user_id,
      action,
      details,
      created_at
    ) VALUES (
      p_user_id,
      'credit_rollback_success',
      jsonb_build_object(
        'transaction_id', p_transaction_id,
        'amount_restored', ABS(v_transaction_record.amount),
        'reason', p_reason,
        'balance_before', v_current_balance,
        'balance_after', v_new_balance
      ),
      NOW()
    );
    
    RETURN QUERY SELECT TRUE, v_new_balance, 'Credit successfully rolled back';
    
  EXCEPTION
    WHEN OTHERS THEN
      -- Log the error
      INSERT INTO audit_logs (
        user_id,
        action,
        details,
        created_at
      ) VALUES (
        p_user_id,
        'credit_rollback_error',
        jsonb_build_object(
          'transaction_id', p_transaction_id,
          'error_message', SQLERRM,
          'error_code', SQLSTATE,
          'reason', p_reason
        ),
        NOW()
      );
      
      RETURN QUERY SELECT FALSE, 0, 'Rollback failed due to database error';
  END;
  
  -- Always release the advisory lock
  IF v_lock_acquired THEN
    PERFORM pg_advisory_unlock(hashtext(v_lock_key));
  END IF;
  
  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_id_created_at 
ON credit_transactions(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_credit_transactions_rolled_back 
ON credit_transactions(rolled_back, user_id);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id_created_at 
ON audit_logs(user_id, created_at DESC);

-- Add constraint to prevent negative balances
ALTER TABLE credit_wallets 
ADD CONSTRAINT chk_positive_balance 
CHECK (balance >= 0);

-- Add rolled_back column to credit_transactions if it doesn't exist
ALTER TABLE credit_transactions 
ADD COLUMN IF NOT EXISTS rolled_back BOOLEAN DEFAULT FALSE;

ALTER TABLE credit_transactions 
ADD COLUMN IF NOT EXISTS rollback_reason TEXT;

ALTER TABLE credit_transactions 
ADD COLUMN IF NOT EXISTS rollback_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE credit_transactions 
ADD COLUMN IF NOT EXISTS related_transaction_id UUID;

-- Update existing deduct_credits function to use the new atomic function
CREATE OR REPLACE FUNCTION deduct_credits(
  user_uuid UUID,
  credit_amount INTEGER,
  agent_identifier TEXT DEFAULT NULL,
  transaction_description TEXT DEFAULT 'Credit deduction'
)
RETURNS TABLE(success BOOLEAN, remaining_credits INTEGER) AS $$
DECLARE
  result RECORD;
BEGIN
  -- Call the atomic deduction function
  SELECT * INTO result
  FROM atomic_deduct_credits(
    user_uuid,
    credit_amount,
    agent_identifier,
    transaction_description
  );
  
  RETURN QUERY SELECT result.success, result.remaining_credits;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 