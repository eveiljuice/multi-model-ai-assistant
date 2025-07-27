-- Функция для исправления пользователей, которые есть в auth но нет в credits

-- Создаем функцию для поиска и исправления "потерянных" пользователей
CREATE OR REPLACE FUNCTION find_and_fix_missing_user_credits()
RETURNS TABLE(
  user_id uuid,
  email text,
  created_at timestamptz,
  credits_added boolean,
  error_message text
) AS $$
DECLARE
  user_record record;
  credits_exist boolean;
  fix_result boolean;
  error_msg text;
BEGIN
  -- Ищем всех пользователей из auth.users, у которых нет записи в credits
  FOR user_record IN 
    SELECT au.id, au.email, au.created_at
    FROM auth.users au
    WHERE au.deleted_at IS NULL
  LOOP
    -- Проверяем есть ли у пользователя кредиты
    SELECT EXISTS(
      SELECT 1 FROM credits c WHERE c.user_id = user_record.id
    ) INTO credits_exist;
    
    IF NOT credits_exist THEN
      -- Пользователь найден без кредитов, пытаемся исправить
      BEGIN
        fix_result := initialize_user_trial_credits_safe(user_record.id);
        error_msg := NULL;
        
        RAISE NOTICE 'Processing user: % (%) - Credits added: %', 
          user_record.email, user_record.id, fix_result;
          
      EXCEPTION
        WHEN OTHERS THEN
          fix_result := false;
          error_msg := SQLERRM;
          RAISE NOTICE 'Error processing user % (%): %', 
            user_record.email, user_record.id, error_msg;
      END;
      
      -- Возвращаем результат для этого пользователя
      RETURN QUERY SELECT 
        user_record.id,
        COALESCE(user_record.email, 'No email')::text,
        user_record.created_at,
        fix_result,
        COALESCE(error_msg, '')::text;
    END IF;
  END LOOP;
  
  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Функция для получения статистики пользователей
CREATE OR REPLACE FUNCTION get_users_statistics()
RETURNS TABLE(
  metric text,
  count bigint
) AS $$
BEGIN
  -- Общее количество пользователей в auth.users
  RETURN QUERY SELECT 
    'total_auth_users'::text,
    COUNT(*)::bigint
  FROM auth.users 
  WHERE deleted_at IS NULL;
  
  -- Пользователи с кредитами
  RETURN QUERY SELECT 
    'users_with_credits'::text,
    COUNT(DISTINCT c.user_id)::bigint
  FROM credits c;
  
  -- Пользователи без кредитов
  RETURN QUERY SELECT 
    'users_without_credits'::text,
    COUNT(*)::bigint
  FROM auth.users au
  WHERE au.deleted_at IS NULL
  AND NOT EXISTS (SELECT 1 FROM credits c WHERE c.user_id = au.id);
  
  -- Пользователи с подтвержденным email
  RETURN QUERY SELECT 
    'users_email_confirmed'::text,
    COUNT(*)::bigint
  FROM auth.users au
  WHERE au.deleted_at IS NULL
  AND au.email_confirmed_at IS NOT NULL;
  
  -- Пользователи созданные за последние 7 дней
  RETURN QUERY SELECT 
    'users_last_7_days'::text,
    COUNT(*)::bigint
  FROM auth.users au
  WHERE au.deleted_at IS NULL
  AND au.created_at > now() - interval '7 days';
  
  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Предоставляем права
GRANT EXECUTE ON FUNCTION find_and_fix_missing_user_credits TO service_role, authenticated;
GRANT EXECUTE ON FUNCTION get_users_statistics TO service_role, authenticated;