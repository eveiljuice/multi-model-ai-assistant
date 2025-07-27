-- Шаг 1: Создание функции для исправления пользователей без кредитов

-- Создаем безопасную функцию инициализации кредитов
CREATE OR REPLACE FUNCTION initialize_user_trial_credits_safe(user_uuid uuid)
RETURNS boolean AS $$
DECLARE
  user_exists boolean := false;
  credits_exist boolean := false;
BEGIN
  -- Проверяем существование пользователя в auth.users
  SELECT EXISTS(
    SELECT 1 FROM auth.users 
    WHERE id = user_uuid 
    AND deleted_at IS NULL
  ) INTO user_exists;
  
  IF NOT user_exists THEN
    RAISE NOTICE 'User % does not exist in auth.users', user_uuid;
    RETURN false;
  END IF;
  
  -- Проверяем существование записи в credits
  SELECT EXISTS(
    SELECT 1 FROM credits 
    WHERE user_id = user_uuid
  ) INTO credits_exist;
  
  IF credits_exist THEN
    RAISE NOTICE 'User % already has credits', user_uuid;
    RETURN false;
  END IF;
  
  -- Создаем запись в credits
  INSERT INTO credits (user_id, balance, created_at, updated_at)
  VALUES (user_uuid, 5, now(), now());
  
  -- Создаем транзакцию
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
    'Initial trial credits (manual fix)',
    now()
  );
  
  -- Создаем запись активности если её нет
  INSERT INTO user_activity (user_id, last_active, weekly_logins, created_at, updated_at)
  VALUES (user_uuid, now(), 1, now(), now())
  ON CONFLICT (user_id) DO UPDATE SET
    last_active = now(),
    updated_at = now();
  
  RAISE NOTICE 'Successfully initialized credits for user %', user_uuid;
  RETURN true;
  
EXCEPTION
  WHEN foreign_key_violation THEN
    RAISE NOTICE 'Foreign key violation for user %', user_uuid;
    RETURN false;
  WHEN unique_violation THEN
    RAISE NOTICE 'Credits already exist for user %', user_uuid;
    RETURN false;
  WHEN OTHERS THEN
    RAISE NOTICE 'Error initializing credits for user %: %', user_uuid, SQLERRM;
    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Создаем функцию для массового исправления
CREATE OR REPLACE FUNCTION fix_user_missing_credits()
RETURNS TABLE(
  user_id uuid,
  email text,
  fixed boolean,
  error_message text
) AS $$
DECLARE
  user_record record;
  fix_result boolean;
  error_msg text;
BEGIN
  FOR user_record IN 
    SELECT au.id, au.email::text
    FROM auth.users au
    WHERE au.deleted_at IS NULL
    AND NOT EXISTS (SELECT 1 FROM credits c WHERE c.user_id = au.id)
  LOOP
    BEGIN
      fix_result := initialize_user_trial_credits_safe(user_record.id);
      error_msg := NULL;
    EXCEPTION
      WHEN OTHERS THEN
        fix_result := false;
        error_msg := SQLERRM;
    END;
    
    RETURN QUERY SELECT 
      user_record.id,
      user_record.email::text,
      fix_result,
      COALESCE(error_msg, '')::text;
  END LOOP;
  
  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Предоставляем права
GRANT EXECUTE ON FUNCTION initialize_user_trial_credits_safe TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION fix_user_missing_credits TO service_role, authenticated;