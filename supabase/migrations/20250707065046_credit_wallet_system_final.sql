-- Create credits table
CREATE TABLE IF NOT EXISTS credits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    balance INTEGER NOT NULL DEFAULT 0,
    last_rollover TIMESTAMP WITH TIME ZONE,
    rollover_eligible BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create credit_transactions table
CREATE TABLE IF NOT EXISTS credit_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('subscription', 'topup', 'usage', 'trial', 'rollover', 'referral')),
    description TEXT,
    agent_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create agent_pricing table
CREATE TABLE IF NOT EXISTS agent_pricing (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID NOT NULL,
    credit_weight INTEGER NOT NULL DEFAULT 1,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create user_activity table for Smart Streaks
CREATE TABLE IF NOT EXISTS user_activity (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    last_active TIMESTAMP WITH TIME ZONE DEFAULT now(),
    weekly_logins INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create referral_codes table
CREATE TABLE IF NOT EXISTS referral_codes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    code TEXT UNIQUE NOT NULL,
    used_by UUID REFERENCES auth.users(id),
    used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS credits_user_id_idx ON credits(user_id);
CREATE INDEX IF NOT EXISTS credit_transactions_user_id_idx ON credit_transactions(user_id);
CREATE INDEX IF NOT EXISTS credit_transactions_created_at_idx ON credit_transactions(created_at);
CREATE INDEX IF NOT EXISTS user_activity_user_id_idx ON user_activity(user_id);
CREATE INDEX IF NOT EXISTS referral_codes_code_idx ON referral_codes(code);

-- Create function for atomic credit deduction
CREATE OR REPLACE FUNCTION deduct_credits(
    p_user_id UUID,
    p_amount INTEGER,
    p_agent_id UUID,
    p_description TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
    v_current_balance INTEGER;
BEGIN
    -- Get current balance with row lock
    SELECT balance INTO v_current_balance
    FROM credits
    WHERE user_id = p_user_id
    FOR UPDATE;

    -- Check if enough credits
    IF v_current_balance >= p_amount THEN
        -- Update balance
        UPDATE credits
        SET 
            balance = balance - p_amount,
            updated_at = now()
        WHERE user_id = p_user_id;

        -- Record transaction
        INSERT INTO credit_transactions (
            user_id,
            amount,
            type,
            description,
            agent_id
        ) VALUES (
            p_user_id,
            -p_amount,
            'usage',
            p_description,
            p_agent_id
        );

        RETURN true;
    END IF;

    RETURN false;
END;
$$ LANGUAGE plpgsql;

-- Create function for credit addition
CREATE OR REPLACE FUNCTION add_credits(
    p_user_id UUID,
    p_amount INTEGER,
    p_type TEXT,
    p_description TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
BEGIN
    -- Update balance
    UPDATE credits
    SET 
        balance = balance + p_amount,
        updated_at = now()
    WHERE user_id = p_user_id;

    -- Record transaction
    INSERT INTO credit_transactions (
        user_id,
        amount,
        type,
        description
    ) VALUES (
        p_user_id,
        p_amount,
        p_type,
        p_description
    );

    RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Drop existing function first
DROP FUNCTION IF EXISTS process_credit_rollover(UUID);

-- Create function for monthly credit rollover
CREATE OR REPLACE FUNCTION process_credit_rollover(
    user_uuid UUID
) RETURNS INTEGER AS $$
DECLARE
    v_current_balance INTEGER;
    v_rollover_amount INTEGER;
    v_weekly_logins INTEGER;
BEGIN
    -- Get current balance and weekly logins
    SELECT c.balance, ua.weekly_logins 
    INTO v_current_balance, v_weekly_logins
    FROM credits c
    LEFT JOIN user_activity ua ON ua.user_id = c.user_id
    WHERE c.user_id = user_uuid;

    -- Calculate rollover amount (30% if eligible, max 75)
    IF v_weekly_logins >= 3 THEN
        v_rollover_amount := LEAST(v_current_balance * 0.3, 75);
    ELSE
        v_rollover_amount := 0;
    END IF;

    -- Update credits
    UPDATE credits
    SET 
        balance = v_rollover_amount + 250, -- New month allocation + rollover
        last_rollover = now(),
        rollover_eligible = false,
        updated_at = now()
    WHERE user_id = user_uuid;

    -- Record rollover transaction if any
    IF v_rollover_amount > 0 THEN
        INSERT INTO credit_transactions (
            user_id,
            amount,
            type,
            description
        ) VALUES (
            user_uuid,
            v_rollover_amount,
            'rollover',
            'Monthly credit rollover'
        );
    END IF;

    -- Reset weekly logins
    UPDATE user_activity
    SET 
        weekly_logins = 0,
        updated_at = now()
    WHERE user_id = user_uuid;

    RETURN v_rollover_amount;
END;
$$ LANGUAGE plpgsql;

-- Create RLS policies
ALTER TABLE credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_codes ENABLE ROW LEVEL SECURITY;

-- Credits policies
CREATE POLICY "Users can view their own credits"
ON credits FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "System can manage all credits"
ON credits FOR ALL
TO service_role
USING (true);

-- Credit transactions policies
CREATE POLICY "Users can view their own transactions"
ON credit_transactions FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "System can manage all transactions"
ON credit_transactions FOR ALL
TO service_role
USING (true);

-- Agent pricing policies
CREATE POLICY "Everyone can view agent pricing"
ON agent_pricing FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Only system can manage agent pricing"
ON agent_pricing FOR ALL
TO service_role
USING (true);

-- User activity policies
CREATE POLICY "Users can view their own activity"
ON user_activity FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "System can manage all activity"
ON user_activity FOR ALL
TO service_role
USING (true);

-- Referral codes policies
CREATE POLICY "Users can view their own referral codes"
ON referral_codes FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "System can manage all referral codes"
ON referral_codes FOR ALL
TO service_role
USING (true);
