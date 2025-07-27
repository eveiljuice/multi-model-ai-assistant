-- Диагностика отсутствующих пользователей

-- 1. Попробуем получить пользователей через разные способы
-- Способ 1: Прямой запрос к auth.users (может не работать из-за RLS)
SELECT 
    id,
    email,
    created_at,
    email_confirmed_at,
    deleted_at
FROM auth.users
ORDER BY created_at DESC
LIMIT 10;

-- 2. Проверим права доступа к схеме auth
SELECT 
    schemaname,
    tablename,
    tableowner,
    hasindexes,
    hasrules,
    hastriggers
FROM pg_tables 
WHERE schemaname = 'auth';

-- 3. Проверим существующие пользователи через credits (обратный поиск)
SELECT DISTINCT
    c.user_id,
    c.created_at as credits_created,
    c.balance
FROM credits c
ORDER BY c.created_at DESC
LIMIT 10;

-- 4. Проверим пользователей через credit_transactions
SELECT DISTINCT
    ct.user_id,
    ct.created_at as first_transaction,
    COUNT(*) as transaction_count
FROM credit_transactions ct
GROUP BY ct.user_id, ct.created_at
ORDER BY ct.created_at DESC
LIMIT 10;

-- 5. Проверим error_logs на предмет пользователей
SELECT DISTINCT
    el.user_id,
    COUNT(*) as error_count,
    MAX(el.created_at) as last_error
FROM error_logs el
WHERE el.user_id IS NOT NULL
GROUP BY el.user_id
ORDER BY last_error DESC
LIMIT 10;