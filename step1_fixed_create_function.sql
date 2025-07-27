-- Fixed version of functions

-- Create safe credit initialization function
CREATE OR REPLACE FUNCTION initialize_user_trial_credits_safe(user_uuid uuid)
RETURNS boolean AS $$
DECLARE
  user_exists boolean := false;
  credits_exist boolean := false;
BEGIN
  -- Check if user exists in auth.users
  SELECT EXISTS(
    SELECT 1 FROM auth.users 
    WHERE id = user_uuid 
    AND deleted_at IS NULL
  ) INTO user_exists;
  
  IF NOT user_exists THEN
    RAISE NOTICE 'User % does not exist in auth.users', user_uuid;
    RETURN false;
  END IF;
  
  -- Check if credits record exists
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

-- Упрощенная функция для массового исправления без возврата таблицы
CREATE OR REPLACE FUNCTION fix_all_users_missing_credits()
RETURNS integer AS $$
DECLARE
  user_record record;
  fix_result boolean;
  fixed_count integer := 0;
BEGIN
  FOR user_record IN 
    SELECT au.id, au.email
    FROM auth.users au
    WHERE au.deleted_at IS NULL
    AND NOT EXISTS (SELECT 1 FROM credits c WHERE c.user_id = au.id)
  LOOP
    BEGIN
      fix_result := initialize_user_trial_credits_safe(user_record.id);
      IF fix_result THEN
        fixed_count := fixed_count + 1;
        RAISE NOTICE 'Fixed user: % (%)', user_record.email, user_record.id;
      ELSE
        RAISE NOTICE 'Failed to fix user: % (%)', user_record.email, user_record.id;
      END IF;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE NOTICE 'Error fixing user % (%): %', user_record.email, user_record.id, SQLERRM;
    END;
  END LOOP;
  
  RAISE NOTICE 'Fixed % users total', fixed_count;
  RETURN fixed_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Функция для исправления конкретного пользователя по email
CREATE OR REPLACE FUNCTION fix_user_by_email(user_email text)
RETURNS boolean AS $$
DECLARE
  target_user_id uuid;
  result boolean;
BEGIN
  -- Найти ID пользователя по email
  SELECT id INTO target_user_id 
  FROM auth.users 
  WHERE email = user_email 
  AND deleted_at IS NULL;
  
  IF target_user_id IS NULL THEN
    RAISE NOTICE 'User with email % not found', user_email;
    RETURN false;
  END IF;
  
  -- Инициализировать кредиты
  SELECT initialize_user_trial_credits_safe(target_user_id) INTO result;
  
  IF result THEN
    RAISE NOTICE 'Credits successfully initialized for user % (%)', user_email, target_user_id;
  ELSE
    RAISE NOTICE 'Failed to initialize credits for user % (%)', user_email, target_user_id;
  END IF;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Предоставляем права
GRANT EXECUTE ON FUNCTION initialize_user_trial_credits_safe TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION fix_all_users_missing_credits TO service_role, authenticated;
GRANT EXECUTE ON FUNCTION fix_user_by_email TO service_role, authenticated;