# Исправление проблем с новыми пользователями

## Проблема

На новосозданных аккаунтах возникают ошибки:

1. **Credit deduction failed for agent** - не удается списать кредиты
2. **Foreign key constraint violation** - пользователь не существует в таблице `users` при попытке логирования ошибок

## Причины

1. **Триггер инициализации кредитов не срабатывает** - новые пользователи не получают начальные кредиты
2. **RLS политики слишком строгие** - блокируют создание записей для новых пользователей
3. **Отсутствие записи в user_activity** - нет связанных данных активности пользователя

## Решение

### Шаг 1: Применить исправления RLS политик

```bash
# Применить SQL исправления
psql -h your-supabase-host -U postgres -d postgres -f fix_rls_policies.sql
```

Или через Supabase Dashboard:

1. Перейти в SQL Editor
2. Выполнить содержимое файла `fix_rls_policies.sql`

### Шаг 2: Диагностика конкретного пользователя

```bash
# Установить зависимости если нужно
npm install @supabase/supabase-js dotenv

# Запустить диагностику
node debug-user-issue.js user@example.com
```

### Шаг 3: Исправление конкретного пользователя

```bash
# Исправить проблему для конкретного пользователя
node fix-user-credits-issue.js user@example.com
```

### Шаг 4: Массовое исправление всех пользователей

Через SQL Editor в Supabase:

```sql
-- Исправить всех пользователей без кредитов
SELECT * FROM fix_user_missing_credits();
```

## Проверка исправления

### 1. Проверить инициализацию кредитов

```sql
-- Проверить пользователей без кредитов
SELECT au.id, au.email, au.created_at
FROM auth.users au
LEFT JOIN credits c ON c.user_id = au.id
WHERE c.user_id IS NULL
AND au.deleted_at IS NULL;
```

### 2. Проверить работу триггера

```sql
-- Создать тестового пользователя (через приложение)
-- Проверить автоматическое создание кредитов
SELECT c.*, ct.*
FROM credits c
LEFT JOIN credit_transactions ct ON ct.user_id = c.user_id
WHERE c.user_id = 'test-user-id';
```

### 3. Проверить логирование ошибок

```sql
-- Попробовать создать запись в error_logs
INSERT INTO error_logs (
  user_id,
  session_id,
  error_type,
  error_message,
  component,
  severity
) VALUES (
  'test-user-id',
  'test-session',
  'test_error',
  'Test error message',
  'test-component',
  'low'
);
```

## Улучшения в коде

### 1. Обновить функцию списания кредитов

В `src/services/creditService.ts` добавить дополнительную проверку:

```typescript
// Перед списанием кредитов проверить существование пользователя
const { data: userCheck } = await supabase
  .from("credits")
  .select("user_id")
  .eq("user_id", userId)
  .single();

if (!userCheck) {
  // Попробовать инициализировать кредиты
  await supabase.rpc("initialize_user_trial_credits_safe", {
    user_uuid: userId,
  });
}
```

### 2. Обновить логирование ошибок

В `src/services/loggingService.ts` добавить fallback:

```typescript
// При ошибке foreign key constraint попробовать без user_id
if (error && error.code === "23503") {
  const logDataWithoutUser = {
    ...logData,
    user_id: null,
  };

  const { error: fallbackError } = await supabase
    .from("error_logs")
    .insert([logDataWithoutUser]);

  if (!fallbackError) {
    console.log("Error logged without user_id");
  }
}
```

## Мониторинг

### Создать алерт для отслеживания проблем

```sql
-- Создать view для мониторинга пользователей без кредитов
CREATE OR REPLACE VIEW users_without_credits AS
SELECT
  au.id,
  au.email,
  au.created_at,
  EXTRACT(EPOCH FROM (now() - au.created_at))/3600 as hours_since_creation
FROM auth.users au
LEFT JOIN credits c ON c.user_id = au.id
WHERE c.user_id IS NULL
AND au.deleted_at IS NULL
AND au.created_at > now() - interval '24 hours';
```

### Настроить уведомления

```sql
-- Функция для отправки уведомлений о проблемах
CREATE OR REPLACE FUNCTION notify_missing_credits()
RETURNS void AS $$
DECLARE
  problem_count integer;
BEGIN
  SELECT count(*) INTO problem_count
  FROM users_without_credits
  WHERE hours_since_creation > 1; -- Пользователи без кредитов больше часа

  IF problem_count > 0 THEN
    -- Здесь можно добавить логику отправки уведомлений
    INSERT INTO error_logs (
      user_id,
      session_id,
      error_type,
      error_message,
      component,
      severity
    ) VALUES (
      NULL,
      'system',
      'missing_credits_alert',
      format('Found %s users without credits', problem_count),
      'monitoring',
      'high'
    );
  END IF;
END;
$$ LANGUAGE plpgsql;
```

## Предотвращение в будущем

1. **Добавить проверки в регистрацию** - убедиться что кредиты создаются
2. **Улучшить обработку ошибок** - graceful fallback при проблемах с БД
3. **Мониторинг** - отслеживать пользователей без кредитов
4. **Тесты** - добавить тесты для процесса регистрации

## Контакты для поддержки

При возникновении проблем:

1. Проверить логи Supabase
2. Запустить диагностический скрипт
3. Применить исправления из этого документа
4. Обратиться к разработчику если проблема не решена
