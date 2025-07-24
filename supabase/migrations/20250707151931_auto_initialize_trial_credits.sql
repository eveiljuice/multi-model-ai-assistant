-- Auto-initialize trial credits for users without credit records
-- This ensures all authenticated users have credits to use the system

-- Function to initialize trial credits for a user
CREATE OR REPLACE FUNCTION initialize_user_trial_credits(user_uuid uuid)
RETURNS boolean AS $$
BEGIN
  -- Check if user exists in auth.users and doesn't have credits record
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = user_uuid) THEN
    RETURN false; -- User doesn't exist
  END IF;
  
  IF EXISTS (SELECT 1 FROM credits WHERE user_id = user_uuid) THEN
    RETURN false; -- User already has credits
  END IF;
  
  -- Create credits record with trial credits
  INSERT INTO credits (user_id, balance, created_at, updated_at)
  VALUES (user_uuid, 5, now(), now());
  
  -- Log the trial credit transaction
  INSERT INTO credit_transactions (
    user_id,
    amount,
    type,
    description,
    created_at
  ) VALUES (
    user_uuid,
    5,
    'trial',
    'Initial trial credits',
    now()
  );
  
  RETURN true;
EXCEPTION
  WHEN foreign_key_violation THEN
    RETURN false; -- User doesn't exist in auth.users
  WHEN OTHERS THEN
    RETURN false; -- Other errors
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger function to auto-initialize credits on first login
CREATE OR REPLACE FUNCTION trigger_initialize_user_credits()
RETURNS trigger AS $$
BEGIN
  -- Initialize trial credits if user doesn't have any
  PERFORM initialize_user_trial_credits(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on auth.users to auto-initialize credits
DROP TRIGGER IF EXISTS on_auth_user_created_initialize_credits ON auth.users;
CREATE TRIGGER on_auth_user_created_initialize_credits
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION trigger_initialize_user_credits();

-- Grant permissions
GRANT EXECUTE ON FUNCTION initialize_user_trial_credits TO authenticated, anon;
GRANT EXECUTE ON FUNCTION trigger_initialize_user_credits TO authenticated, anon;

-- Safely initialize credits for existing valid users who don't have any
DO $$
DECLARE
  user_record RECORD;
  success_count INTEGER := 0;
  error_count INTEGER := 0;
BEGIN
  FOR user_record IN 
    SELECT au.id 
    FROM auth.users au
    WHERE au.id IS NOT NULL
    AND au.deleted_at IS NULL  -- Only active users
    AND NOT EXISTS (SELECT 1 FROM credits c WHERE c.user_id = au.id)
  LOOP
    BEGIN
      -- Try to initialize credits for this user
      IF initialize_user_trial_credits(user_record.id) THEN
        success_count := success_count + 1;
      END IF;
    EXCEPTION
      WHEN OTHERS THEN
        error_count := error_count + 1;
        -- Continue with next user
    END;
  END LOOP;
  
  RAISE NOTICE 'Trial credits initialized for % users, % errors occurred', success_count, error_count;
END $$;
