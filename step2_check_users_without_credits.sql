-- Шаг 2: Проверка пользователей без кредитов

-- Сначала посмотрим, сколько пользователей без кредитов
SELECT 
  au.id,
  au.email,
  au.created_at,
  EXTRACT(EPOCH FROM (now() - au.created_at))/3600 as hours_since_creation
FROM auth.users au
LEFT JOIN credits c ON c.user_id = au.id
WHERE c.user_id IS NULL
AND au.deleted_at IS NULL
ORDER BY au.created_at DESC
LIMIT 10;