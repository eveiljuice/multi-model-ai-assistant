-- Исправление RLS политик для решения проблемы с новыми пользователями

-- 1. Исправляем политики для таблицы error_logs
DROP POLICY IF EXISTS "Users can insert their own error logs" ON error_logs;
DROP POLICY IF EXISTS "Users can view their own error logs" ON error_logs;
DROP POLICY IF EXISTS "Service role can manage all error logs" ON error_logs;

-- Создаем более гибкие политики для error_logs
CREATE POLICY "Users can insert error logs" ON error_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id OR 
    user_id IS NULL OR
    auth.jwt() ->> 'role' = 'service_role'
  );

CREATE POLICY "Users can view their own error logs" ON error_logs
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id OR 
    auth.jwt() ->> 'role' = 'service_role'
  );

CREATE POLICY "Service role can manage all error logs" ON error_logs
  FOR ALL
  TO service_role
  USING (true);

-- 2. Исправляем политики для таблицы credits
DROP POLICY IF EXISTS "Users can view their own credits" ON credits;
DROP POLICY IF EXISTS "System can manage all credits" ON credits;

CREATE POLICY "Users can view their own credits" ON credits
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id OR 
    auth.jwt() ->> 'role' = 'service_role'
  );

CREATE POLICY "Users can update their own credits" ON credits
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = user_id OR 
    auth.jwt() ->> 'role' = 'service_role'
  );

CREATE POLICY "System can insert credits" ON credits
  FOR INSERT
  TO authenticated, service_role
  WITH CHECK (
    auth.uid() = user_id OR 
    auth.jwt() ->> 'role' = 'service_role'
  );

CREATE POLICY "System can manage all credits" ON credits
  FOR ALL
  TO service_role
  USING (true);

-- 3. Исправляем политики для таблицы credit_transactions
DROP POLICY IF EXISTS "Users can view their own transactions" ON credit_transactions;
DROP POLICY IF EXISTS "System can manage all transactions" ON credit_transactions;

CREATE POLICY "Users can view their own transactions" ON credit_transactions
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id OR 
    auth.jwt() ->> 'role' = 'service_role'
  );

CREATE POLICY "System can insert transactions" ON credit_transactions
  FOR INSERT
  TO authenticated, service_role
  WITH CHECK (
    auth.uid() = user_id OR 
    auth.jwt() ->> 'role' = 'service_role'
  );

CREATE POLICY "System can manage all transactions" ON credit_transactions
  FOR ALL
  TO service_role
  USING (true);

-- 4. Исправляем политики для таблицы user_activity
DROP POLICY IF EXISTS "Users can view their own activity" ON user_activity;
DROP POLICY IF EXISTS "System can manage all activity" ON user_activity;

CREATE POLICY "Users can view their own activity" ON user_activity
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id OR 
    auth.jwt() ->> 'role' = 'service_role'
  );

CREATE POLICY "Users can update their own activity" ON user_activity
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = user_id OR 
    auth.jwt() ->> 'role' = 'service_role'
  );

CREATE POLICY "System can insert activity" ON user_activity
  FOR INSERT
  TO authenticated, service_role
  WITH CHECK (
    auth.uid() = user_id OR 
    auth.jwt() ->> 'role' = 'service_role'
  );

CREATE POLICY "System can manage all activity" ON user_activity
  FOR ALL
  TO service_role
  USING (true);

-- 5. Улучшаем функцию инициализации кредитов
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
    'Initial trial credits (safe initialization)',
    now()
  );
  
  -- Создаем запись активности если её нет
  INSERT INTO user_activity (user_id, last_active, weekly_logins, created_at, updated_at)
  VALUES (user_uuid, now(), 1, now(), now())
  ON CONFLICT (user_id) DO NOTHING;
  
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

-- 6. Обновляем триггер
CREATE OR REPLACE FUNCTION trigger_initialize_user_credits_safe()
RETURNS trigger AS $$
BEGIN
  -- Инициализируем кредиты безопасно
  PERFORM initialize_user_trial_credits_safe(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Пересоздаем триггер
DROP TRIGGER IF EXISTS on_auth_user_created_initialize_credits ON auth.users;
CREATE TRIGGER on_auth_user_created_initialize_credits
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION trigger_initialize_user_credits_safe();

-- 7. Предоставляем права
GRANT EXECUTE ON FUNCTION initialize_user_trial_credits_safe TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION trigger_initialize_user_credits_safe TO authenticated, anon, service_role;

-- 8. Создаем функцию для ручного исправления пользователей
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
    SELECT au.id, au.email
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
      user_record.email,
      fix_result,
      error_msg;
  END LOOP;
  
  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION fix_user_missing_credits TO service_role;

-- 9. Добавляем индекс для user_activity если его нет
CREATE UNIQUE INDEX IF NOT EXISTS user_activity_user_id_unique ON user_activity(user_id);

-- 10. Комментарии для документации
COMMENT ON FUNCTION initialize_user_trial_credits_safe IS 'Безопасная инициализация пробных кредитов для пользователя с проверками';
COMMENT ON FUNCTION fix_user_missing_credits IS 'Исправление пользователей без записей в credits';