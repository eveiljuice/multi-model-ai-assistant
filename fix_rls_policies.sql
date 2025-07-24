-- Исправление RLS политик для исправления ошибки 409
-- Выполните этот SQL в Supabase SQL Editor как супер-пользователь

-- Временно отключаем RLS для проблемных таблиц
ALTER TABLE idea_suggestions DISABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE error_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE performance_logs DISABLE ROW LEVEL SECURITY;

-- Или альтернативно - создаем разрешающие политики
-- (раскомментируйте этот блок, если хотите оставить RLS включенным)

/*
-- Политики для idea_suggestions
DROP POLICY IF EXISTS "idea_suggestions_insert_policy" ON idea_suggestions;
DROP POLICY IF EXISTS "idea_suggestions_select_policy" ON idea_suggestions;
DROP POLICY IF EXISTS "idea_suggestions_update_policy" ON idea_suggestions;

CREATE POLICY "idea_suggestions_insert_policy" ON idea_suggestions 
    FOR INSERT TO authenticated 
    WITH CHECK (true);

CREATE POLICY "idea_suggestions_select_policy" ON idea_suggestions 
    FOR SELECT TO authenticated 
    USING (true);

CREATE POLICY "idea_suggestions_update_policy" ON idea_suggestions 
    FOR UPDATE TO authenticated 
    USING (user_id = auth.uid());

-- Политики для activity_logs
DROP POLICY IF EXISTS "activity_logs_insert_policy" ON activity_logs;
DROP POLICY IF EXISTS "activity_logs_select_policy" ON activity_logs;

CREATE POLICY "activity_logs_insert_policy" ON activity_logs 
    FOR INSERT TO authenticated 
    WITH CHECK (true);

CREATE POLICY "activity_logs_select_policy" ON activity_logs 
    FOR SELECT TO authenticated 
    USING (user_id = auth.uid());

-- Политики для error_logs
DROP POLICY IF EXISTS "error_logs_insert_policy" ON error_logs;
DROP POLICY IF EXISTS "error_logs_select_policy" ON error_logs;

CREATE POLICY "error_logs_insert_policy" ON error_logs 
    FOR INSERT TO authenticated 
    WITH CHECK (true);

CREATE POLICY "error_logs_select_policy" ON error_logs 
    FOR SELECT TO authenticated 
    USING (user_id = auth.uid());

-- Политики для credits (исправляем 406 ошибку)
DROP POLICY IF EXISTS "credits_select_policy" ON credits;
DROP POLICY IF EXISTS "credits_update_policy" ON credits;
DROP POLICY IF EXISTS "credits_insert_policy" ON credits;

CREATE POLICY "credits_select_policy" ON credits 
    FOR SELECT TO authenticated 
    USING (user_id = auth.uid());

CREATE POLICY "credits_update_policy" ON credits 
    FOR UPDATE TO authenticated 
    USING (user_id = auth.uid());

CREATE POLICY "credits_insert_policy" ON credits 
    FOR INSERT TO authenticated 
    WITH CHECK (user_id = auth.uid());

-- Политики для credit_transactions
DROP POLICY IF EXISTS "credit_transactions_select_policy" ON credit_transactions;
DROP POLICY IF EXISTS "credit_transactions_insert_policy" ON credit_transactions;

CREATE POLICY "credit_transactions_select_policy" ON credit_transactions 
    FOR SELECT TO authenticated 
    USING (user_id = auth.uid());

CREATE POLICY "credit_transactions_insert_policy" ON credit_transactions 
    FOR INSERT TO authenticated 
    WITH CHECK (user_id = auth.uid());

-- Политики для users
DROP POLICY IF EXISTS "users_select_policy" ON users;
DROP POLICY IF EXISTS "users_update_policy" ON users;
DROP POLICY IF EXISTS "users_insert_policy" ON users;

CREATE POLICY "users_select_policy" ON users 
    FOR SELECT TO authenticated 
    USING (id = auth.uid());

CREATE POLICY "users_update_policy" ON users 
    FOR UPDATE TO authenticated 
    USING (id = auth.uid());

CREATE POLICY "users_insert_policy" ON users 
    FOR INSERT TO authenticated 
    WITH CHECK (id = auth.uid());

-- Политики для agent_pricing (публичное чтение)
DROP POLICY IF EXISTS "agent_pricing_select_policy" ON agent_pricing;

CREATE POLICY "agent_pricing_select_policy" ON agent_pricing 
    FOR SELECT TO authenticated 
    USING (true);

-- Политики для performance_logs
DROP POLICY IF EXISTS "performance_logs_insert_policy" ON performance_logs;
DROP POLICY IF EXISTS "performance_logs_select_policy" ON performance_logs;

CREATE POLICY "performance_logs_insert_policy" ON performance_logs 
    FOR INSERT TO authenticated 
    WITH CHECK (true);

CREATE POLICY "performance_logs_select_policy" ON performance_logs 
    FOR SELECT TO authenticated 
    USING (user_id = auth.uid());
*/

SELECT 'RLS policies updated successfully' as status; 