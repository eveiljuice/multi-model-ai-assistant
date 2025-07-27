# Быстрое исправление проблемы с кредитами

## Пошаговое исправление

### Шаг 1: Создать функции исправления

Выполните в SQL Editor Supabase:

```sql
-- Скопируйте и выполните содержимое файла step1_fixed_create_function.sql
```

### Шаг 2: Проверить пользователей без кредитов

```sql
-- Скопируйте и выполните содержимое файла step2_check_users_without_credits.sql
```

### Шаг 3: Исправить RLS политики

```sql
-- Скопируйте и выполните содержимое файла step3_fix_rls_policies.sql
```

### Шаг 4: Обновить триггер

```sql
-- Скопируйте и выполните содержимое файла step4_update_trigger.sql
```

### Шаг 5: Исправить всех пользователей без кредитов

```sql
-- Исправить всех пользователей (возвращает количество исправленных)
SELECT fix_all_users_missing_credits();

-- ИЛИ исправить конкретного пользователя по email
SELECT fix_user_by_email('user@example.com');
```

## Альтернативный способ - исправление конкретного пользователя

Если нужно исправить только одного пользователя:

```sql
-- Замените 'user-email@example.com' на реальный email
DO $$
DECLARE
    target_user_id uuid;
    result boolean;
BEGIN
    -- Найти ID пользователя по email
    SELECT id INTO target_user_id
    FROM auth.users
    WHERE email = 'user-email@example.com'
    AND deleted_at IS NULL;

    IF target_user_id IS NULL THEN
        RAISE NOTICE 'Пользователь не найден';
        RETURN;
    END IF;

    -- Инициализировать кредиты
    SELECT initialize_user_trial_credits_safe(target_user_id) INTO result;

    IF result THEN
        RAISE NOTICE 'Кредиты успешно инициализированы для пользователя %', target_user_id;
    ELSE
        RAISE NOTICE 'Не удалось инициализировать кредиты для пользователя %', target_user_id;
    END IF;
END $$;
```

## Проверка результата

После выполнения исправлений проверьте:

```sql
-- Проверить что у всех пользователей есть кредиты
SELECT
    COUNT(*) as total_users,
    COUNT(c.user_id) as users_with_credits,
    COUNT(*) - COUNT(c.user_id) as users_without_credits
FROM auth.users au
LEFT JOIN credits c ON c.user_id = au.id
WHERE au.deleted_at IS NULL;
```

```sql
-- Проверить конкретного пользователя
SELECT
    au.email,
    c.balance,
    c.created_at as credits_created,
    ua.last_active
FROM auth.users au
LEFT JOIN credits c ON c.user_id = au.id
LEFT JOIN user_activity ua ON ua.user_id = au.id
WHERE au.email = 'user-email@example.com';
```

## Тест функциональности

После исправления протестируйте:

1. **Списание кредитов:**

```sql
-- Замените user_id на реальный ID
SELECT deduct_credits(
    'user-id-here'::uuid,
    1,
    'test-agent'::uuid,
    'Test deduction'
);
```

2. **Логирование ошибок:**

```sql
-- Замените user_id на реальный ID
INSERT INTO error_logs (
    user_id,
    session_id,
    error_type,
    error_message,
    component,
    severity
) VALUES (
    'user-id-here'::uuid,
    'test-session',
    'test_error',
    'Test error message',
    'test-component',
    'low'
);
```

## Если проблема не решена

1. Проверьте логи Supabase на наличие ошибок
2. Убедитесь что все SQL команды выполнились без ошибок
3. Проверьте права доступа к таблицам
4. Обратитесь к разработчику с подробным описанием ошибки
