-- Enhanced credit deduction system with idempotency protection and improved error handling

-- Create idempotency table to prevent duplicate transactions
CREATE TABLE IF NOT EXISTS credit_idempotency (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    idempotency_key TEXT UNIQUE NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    agent_id TEXT NOT NULL,
    credit_amount INTEGER NOT NULL,
    transaction_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + interval '24 hours')
);

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_credit_idempotency_key ON credit_idempotency(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_credit_idempotency_expires ON credit_idempotency(expires_at);
CREATE INDEX IF NOT EXISTS idx_credit_idempotency_user_agent ON credit_idempotency(user_id, agent_id);

-- Enable RLS
ALTER TABLE credit_idempotency ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can read their own idempotency records"
  ON credit_idempotency
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own idempotency records"
  ON credit_idempotency
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Function to clean up expired idempotency records
CREATE OR REPLACE FUNCTION cleanup_expired_idempotency_records()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM credit_idempotency 
    WHERE expires_at < now();
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enhanced deduct_credits function with idempotency protection
CREATE OR REPLACE FUNCTION deduct_credits_enhanced(
    user_uuid UUID,
    credit_amount INTEGER,
    agent_identifier TEXT,
    transaction_description TEXT,
    idempotency_key TEXT DEFAULT NULL
) RETURNS TABLE(
    success BOOLEAN,
    new_balance INTEGER,
    transaction_id UUID,
    error_message TEXT,
    is_duplicate BOOLEAN
) AS $$
DECLARE
    current_balance INTEGER;
    new_bal INTEGER;
    trans_id UUID;
    existing_record credit_idempotency%ROWTYPE;
BEGIN
    -- Input validation
    IF user_uuid IS NULL THEN
        RETURN QUERY SELECT false, 0, NULL::UUID, 'User ID cannot be null', false;
        RETURN;
    END IF;
    
    IF credit_amount <= 0 THEN
        RETURN QUERY SELECT false, 0, NULL::UUID, 'Credit amount must be positive', false;
        RETURN;
    END IF;
    
    IF agent_identifier IS NULL OR trim(agent_identifier) = '' THEN
        RETURN QUERY SELECT false, 0, NULL::UUID, 'Agent identifier cannot be empty', false;
        RETURN;
    END IF;

    -- Check for idempotency if key provided
    IF idempotency_key IS NOT NULL THEN
        SELECT * INTO existing_record 
        FROM credit_idempotency 
        WHERE credit_idempotency.idempotency_key = deduct_credits_enhanced.idempotency_key
        AND expires_at > now();
        
        IF FOUND THEN
            -- Return the previous result
            SELECT credits.balance INTO current_balance 
            FROM credits 
            WHERE credits.user_id = user_uuid;
            
            RETURN QUERY SELECT 
                true, 
                COALESCE(current_balance, 0), 
                existing_record.transaction_id,
                'Transaction already processed (idempotent)',
                true;
            RETURN;
        END IF;
    END IF;

    -- Get current balance with row lock
    SELECT credits.balance INTO current_balance 
    FROM credits 
    WHERE credits.user_id = user_uuid 
    FOR UPDATE;
    
    -- Check if user exists
    IF NOT FOUND THEN
        RETURN QUERY SELECT false, 0, NULL::UUID, 'User credit record not found', false;
        RETURN;
    END IF;
    
    -- Check sufficient balance
    IF current_balance < credit_amount THEN
        RETURN QUERY SELECT false, current_balance, NULL::UUID, 
            format('Insufficient credits: need %s, have %s', credit_amount, current_balance), false;
        RETURN;
    END IF;
    
    -- Calculate new balance
    new_bal := current_balance - credit_amount;
    
    -- Update balance
    UPDATE credits 
    SET balance = new_bal, 
        updated_at = now()
    WHERE credits.user_id = user_uuid;
    
    -- Create transaction record
    INSERT INTO credit_transactions (
        user_id,
        amount,
        type,
        description,
        agent_id,
        created_at
    ) VALUES (
        user_uuid,
        -credit_amount,
        'usage',
        COALESCE(transaction_description, format('Agent usage: %s', agent_identifier)),
        agent_identifier,
        now()
    ) RETURNING id INTO trans_id;
    
    -- Store idempotency record if key provided
    IF idempotency_key IS NOT NULL THEN
        INSERT INTO credit_idempotency (
            idempotency_key,
            user_id,
            agent_id,
            credit_amount,
            transaction_id
        ) VALUES (
            idempotency_key,
            user_uuid,
            agent_identifier,
            credit_amount,
            trans_id
        );
    END IF;
    
    -- Return success result
    RETURN QUERY SELECT true, new_bal, trans_id, 'Success'::TEXT, false;
    
EXCEPTION
    WHEN unique_violation THEN
        -- Handle race condition with idempotency key
        IF idempotency_key IS NOT NULL THEN
            -- Another transaction with same key succeeded
            SELECT credits.balance INTO current_balance 
            FROM credits 
            WHERE credits.user_id = user_uuid;
            
            SELECT credit_idempotency.transaction_id INTO trans_id
            FROM credit_idempotency 
            WHERE credit_idempotency.idempotency_key = deduct_credits_enhanced.idempotency_key;
            
            RETURN QUERY SELECT 
                true, 
                COALESCE(current_balance, 0), 
                trans_id,
                'Transaction completed by concurrent request',
                true;
        ELSE
            RETURN QUERY SELECT false, 0, NULL::UUID, 'Concurrent transaction conflict', false;
        END IF;
    WHEN OTHERS THEN
        -- Log the error (in real scenario, you might want more sophisticated error logging)
        RETURN QUERY SELECT false, 0, NULL::UUID, 
            format('Database error: %s', SQLERRM), false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop and recreate existing deduct_credits function to use the enhanced version
DROP FUNCTION IF EXISTS deduct_credits(UUID, INTEGER, TEXT, TEXT);

CREATE OR REPLACE FUNCTION deduct_credits(
    user_uuid UUID,
    credit_amount INTEGER,
    agent_identifier TEXT,
    transaction_description TEXT
) RETURNS BOOLEAN AS $$
DECLARE
    result_record RECORD;
BEGIN
    SELECT * INTO result_record 
    FROM deduct_credits_enhanced(
        user_uuid, 
        credit_amount, 
        agent_identifier, 
        transaction_description
    );
    
    RETURN result_record.success;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION deduct_credits_enhanced TO authenticated, anon;
GRANT EXECUTE ON FUNCTION cleanup_expired_idempotency_records TO authenticated, anon;
GRANT SELECT, INSERT ON credit_idempotency TO authenticated, anon;

-- Create a scheduled cleanup job (this would typically be set up as a cron job)
-- For now, just create the function - actual scheduling needs to be set up in Supabase dashboard
COMMENT ON FUNCTION cleanup_expired_idempotency_records() IS 
'Should be called periodically (e.g., daily) to clean up expired idempotency records'; 