-- Шаг 4: Обновление триггера для автоинициализации кредитов

-- Обновляем триггер функцию
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

-- Предоставляем права
GRANT EXECUTE ON FUNCTION trigger_initialize_user_credits_safe TO authenticated, anon, service_role;