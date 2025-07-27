-- Тест для конкретного пользователя
-- Замените 'user@example.com' на email проблемного пользователя

-- 1. Проверить статус пользователя
SELECT 
    au.id,
    au.email,
    au.created_at as user_created,
    c.balance,
    c.created_at as credits_created,
    ua.last_active,
    ua.weekly_logins
FROM auth.users au
LEFT JOIN credits c ON c.user_id = au.id
LEFT JOIN user_activity ua ON ua.user_id = au.id
WHERE au.email = 'user@example.com'  -- ЗАМЕНИТЕ НА НУЖНЫЙ EMAIL
AND au.deleted_at IS NULL;

-- 2. Проверить транзакции пользователя
SELECT 
    ct.amount,
    ct.type,
    ct.description,
    ct.created_at
FROM credit_transactions ct
JOIN auth.users au ON au.id = ct.user_id
WHERE au.email = 'user@example.com'  -- ЗАМЕНИТЕ НА НУЖНЫЙ EMAIL
ORDER BY ct.created_at DESC
LIMIT 5;

-- 3. Тест списания кредитов (замените user_id)
-- SELECT deduct_credits(
--     'USER_ID_HERE'::uuid,
--     1,
--     'test-agent'::uuid,
--     'Test deduction after fix'
-- );

-- 4. Тест логирования ошибок (замените user_id)
-- INSERT INTO error_logs (
--     user_id,
--     session_id,
--     error_type,
--     error_message,
--     component,
--     severity
-- ) VALUES (
--     'USER_ID_HERE'::uuid,
--     'test-session',
--     'test_error',
--     'Test error message',
--     'test-component',
--     'low'
-- );