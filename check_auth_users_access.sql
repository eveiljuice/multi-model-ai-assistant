-- Проверка доступа к таблице auth.users

-- 1. Проверим RLS политики на auth.users
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE schemaname = 'auth' AND tablename = 'users';

-- 2. Проверим права текущего пользователя
SELECT 
    current_user as current_user,
    session_user as session_user,
    current_setting('role') as current_role;

-- 3. Попробуем получить количество пользователей
SELECT COUNT(*) as total_users_count FROM auth.users;

-- 4. Проверим недавно созданных пользователей
SELECT 
    id,
    email,
    created_at,
    email_confirmed_at,
    phone_confirmed_at,
    deleted_at
FROM auth.users 
WHERE created_at > now() - interval '7 days'
ORDER BY created_at DESC;

-- 5. Проверим пользователей с подтвержденным email
SELECT 
    id,
    email,
    created_at,
    email_confirmed_at
FROM auth.users 
WHERE email_confirmed_at IS NOT NULL
ORDER BY created_at DESC
LIMIT 10;