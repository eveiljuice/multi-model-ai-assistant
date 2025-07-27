-- Проверка статуса исправления

-- 1. Общая статистика пользователей и кредитов
SELECT 
    COUNT(*) as total_users,
    COUNT(c.user_id) as users_with_credits,
    COUNT(*) - COUNT(c.user_id) as users_without_credits
FROM auth.users au
LEFT JOIN credits c ON c.user_id = au.id
WHERE au.deleted_at IS NULL;

-- 2. Показать последних 5 пользователей с их кредитами
SELECT 
    au.email,
    au.created_at as user_created,
    c.balance,
    c.created_at as credits_created,
    CASE 
        WHEN c.user_id IS NULL THEN '❌ НЕТ КРЕДИТОВ'
        ELSE '✅ ЕСТЬ КРЕДИТЫ'
    END as status
FROM auth.users au
LEFT JOIN credits c ON c.user_id = au.id
WHERE au.deleted_at IS NULL
ORDER BY au.created_at DESC
LIMIT 5;

-- 3. Проверить есть ли пользователи без кредитов вообще
SELECT 
    au.id,
    au.email,
    au.created_at,
    'Пользователь без кредитов' as issue
FROM auth.users au
LEFT JOIN credits c ON c.user_id = au.id
WHERE c.user_id IS NULL
AND au.deleted_at IS NULL;

-- 4. Проверить работу триггера - показать недавние транзакции
SELECT 
    ct.user_id,
    au.email,
    ct.amount,
    ct.type,
    ct.description,
    ct.created_at
FROM credit_transactions ct
JOIN auth.users au ON au.id = ct.user_id
WHERE ct.type = 'trial'
ORDER BY ct.created_at DESC
LIMIT 5;