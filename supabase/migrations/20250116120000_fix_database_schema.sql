-- Fix agent_pricing table - add missing columns
ALTER TABLE agent_pricing 
ADD COLUMN IF NOT EXISTS last_updated TIMESTAMP WITH TIME ZONE DEFAULT now(),
ADD COLUMN IF NOT EXISTS cost_basis DECIMAL(10,6) DEFAULT 0.014;

-- Update existing records to have proper values
UPDATE agent_pricing 
SET 
  last_updated = updated_at,
  cost_basis = 0.014
WHERE last_updated IS NULL;

-- Ensure agent_id is properly typed as TEXT (not UUID)
-- Update agent_pricing table structure if needed
DO $$
BEGIN
    -- Check if agent_id column exists and alter its type if needed
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'agent_pricing' 
        AND column_name = 'agent_id'
        AND data_type = 'uuid'
    ) THEN
        -- Convert UUID values to TEXT and change column type
        ALTER TABLE agent_pricing ALTER COLUMN agent_id TYPE TEXT USING agent_id::TEXT;
    END IF;
END $$;

-- Add RLS policies for agent_pricing
ALTER TABLE agent_pricing ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read agent_pricing for all users"
  ON agent_pricing
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow insert agent_pricing for authenticated users"
  ON agent_pricing
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow update agent_pricing for authenticated users"
  ON agent_pricing
  FOR UPDATE
  TO authenticated
  USING (true);

-- Fix credits table RLS policies
DROP POLICY IF EXISTS "Users can view own credits" ON credits;
DROP POLICY IF EXISTS "Users can insert own credits" ON credits;
DROP POLICY IF EXISTS "Users can update own credits" ON credits;

CREATE POLICY "Allow read credits for authenticated users"
  ON credits
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR auth.role() = 'service_role');

CREATE POLICY "Allow insert credits for authenticated users"
  ON credits
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id OR auth.role() = 'service_role');

CREATE POLICY "Allow update credits for authenticated users"
  ON credits
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id OR auth.role() = 'service_role');

-- Fix credit_transactions table RLS policies
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read credit_transactions for authenticated users"
  ON credit_transactions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR auth.role() = 'service_role');

CREATE POLICY "Allow insert credit_transactions for authenticated users"
  ON credit_transactions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id OR auth.role() = 'service_role');

-- Update the deduct_credits function to use proper parameter names
CREATE OR REPLACE FUNCTION deduct_credits(
    user_uuid UUID,
    credit_amount INTEGER,
    agent_identifier TEXT,
    transaction_description TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
    v_current_balance INTEGER;
BEGIN
    -- Get current balance with row lock
    SELECT balance INTO v_current_balance
    FROM credits
    WHERE user_id = user_uuid
    FOR UPDATE;

    -- If user doesn't exist, return false
    IF v_current_balance IS NULL THEN
        RETURN false;
    END IF;

    -- Check if enough credits
    IF v_current_balance >= credit_amount THEN
        -- Update balance
        UPDATE credits
        SET 
            balance = balance - credit_amount,
            updated_at = now()
        WHERE user_id = user_uuid;

        -- Record transaction
        INSERT INTO credit_transactions (
            user_id,
            amount,
            type,
            description,
            agent_id
        ) VALUES (
            user_uuid,
            -credit_amount,
            'usage',
            transaction_description,
            agent_identifier
        );

        RETURN true;
    END IF;

    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the add_credits function to use proper parameter names  
CREATE OR REPLACE FUNCTION add_credits(
    user_uuid UUID,
    credit_amount INTEGER,
    transaction_type TEXT,
    transaction_description TEXT DEFAULT NULL,
    transaction_metadata JSONB DEFAULT '{}'::jsonb
) RETURNS BOOLEAN AS $$
BEGIN
    -- Create credits record if it doesn't exist
    INSERT INTO credits (user_id, balance, created_at, updated_at)
    VALUES (user_uuid, 0, now(), now())
    ON CONFLICT (user_id) DO NOTHING;

    -- Update balance
    UPDATE credits
    SET 
        balance = balance + credit_amount,
        updated_at = now()
    WHERE user_id = user_uuid;

    -- Record transaction
    INSERT INTO credit_transactions (
        user_id,
        amount,
        type,
        description
    ) VALUES (
        user_uuid,
        credit_amount,
        transaction_type,
        transaction_description
    );

    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create unique constraint on credits.user_id to prevent duplicates
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'credits_user_id_unique' 
        AND table_name = 'credits'
    ) THEN
        ALTER TABLE credits ADD CONSTRAINT credits_user_id_unique UNIQUE (user_id);
    END IF;
END $$;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- Disable RLS for logging tables to allow anonymous logging
ALTER TABLE activity_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE error_logs DISABLE ROW LEVEL SECURITY; 
ALTER TABLE performance_logs DISABLE ROW LEVEL SECURITY;

-- Grant insert permissions for logging
GRANT INSERT ON activity_logs TO anon, authenticated;
GRANT INSERT ON error_logs TO anon, authenticated;
GRANT INSERT ON performance_logs TO anon, authenticated;

-- Ensure agent_id in credit_transactions is TEXT not UUID  
DO $$
BEGIN
    -- Check if agent_id column exists and alter its type if needed
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'credit_transactions' 
        AND column_name = 'agent_id'
        AND data_type = 'uuid'
    ) THEN
        -- Convert UUID values to TEXT and change column type
        ALTER TABLE credit_transactions ALTER COLUMN agent_id TYPE TEXT USING agent_id::TEXT;
    ELSIF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'credit_transactions' 
        AND column_name = 'agent_id'
    ) THEN
        -- Add agent_id column if it doesn't exist
        ALTER TABLE credit_transactions ADD COLUMN agent_id TEXT;
    END IF;
END $$;

-- Create add_credits_typed function for enhanced credit management
CREATE OR REPLACE FUNCTION add_credits_typed(
    user_uuid UUID,
    credit_amount INTEGER,
    credit_source TEXT,
    transaction_description TEXT DEFAULT NULL,
    transaction_metadata JSONB DEFAULT '{}'::jsonb
) RETURNS BOOLEAN AS $$
BEGIN
    -- Create credits record if it doesn't exist
    INSERT INTO credits (user_id, balance, created_at, updated_at)
    VALUES (user_uuid, 0, now(), now())
    ON CONFLICT (user_id) DO NOTHING;

    -- Update balance
    UPDATE credits
    SET 
        balance = balance + credit_amount,
        updated_at = now()
    WHERE user_id = user_uuid;

    -- Record transaction
    INSERT INTO credit_transactions (
        user_id,
        amount,
        type,
        description
    ) VALUES (
        user_uuid,
        credit_amount,
        credit_source,
        transaction_description
    );

    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 