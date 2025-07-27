-- Шаг 3: Исправление RLS политик

-- Исправляем политики для таблицы error_logs
DROP POLICY IF EXISTS "Users can insert their own error logs" ON error_logs;
DROP POLICY IF EXISTS "Users can view their own error logs" ON error_logs;
DROP POLICY IF EXISTS "Service role can manage all error logs" ON error_logs;

-- Создаем более гибкие политики для error_logs
CREATE POLICY "Users can insert error logs" ON error_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id OR 
    user_id IS NULL OR
    auth.jwt() ->> 'role' = 'service_role'
  );

CREATE POLICY "Users can view their own error logs" ON error_logs
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id OR 
    auth.jwt() ->> 'role' = 'service_role'
  );

CREATE POLICY "Service role can manage all error logs" ON error_logs
  FOR ALL
  TO service_role
  USING (true);

-- Исправляем политики для таблицы credits
DROP POLICY IF EXISTS "Users can view their own credits" ON credits;
DROP POLICY IF EXISTS "System can manage all credits" ON credits;

CREATE POLICY "Users can view their own credits" ON credits
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id OR 
    auth.jwt() ->> 'role' = 'service_role'
  );

CREATE POLICY "Users can update their own credits" ON credits
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = user_id OR 
    auth.jwt() ->> 'role' = 'service_role'
  );

CREATE POLICY "System can insert credits" ON credits
  FOR INSERT
  TO authenticated, service_role
  WITH CHECK (
    auth.uid() = user_id OR 
    auth.jwt() ->> 'role' = 'service_role'
  );

CREATE POLICY "System can manage all credits" ON credits
  FOR ALL
  TO service_role
  USING (true);

-- Исправляем политики для таблицы credit_transactions
DROP POLICY IF EXISTS "Users can view their own transactions" ON credit_transactions;
DROP POLICY IF EXISTS "System can manage all transactions" ON credit_transactions;

CREATE POLICY "Users can view their own transactions" ON credit_transactions
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id OR 
    auth.jwt() ->> 'role' = 'service_role'
  );

CREATE POLICY "System can insert transactions" ON credit_transactions
  FOR INSERT
  TO authenticated, service_role
  WITH CHECK (
    auth.uid() = user_id OR 
    auth.jwt() ->> 'role' = 'service_role'
  );

CREATE POLICY "System can manage all transactions" ON credit_transactions
  FOR ALL
  TO service_role
  USING (true);

-- Исправляем политики для таблицы user_activity
DROP POLICY IF EXISTS "Users can view their own activity" ON user_activity;
DROP POLICY IF EXISTS "System can manage all activity" ON user_activity;

CREATE POLICY "Users can view their own activity" ON user_activity
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id OR 
    auth.jwt() ->> 'role' = 'service_role'
  );

CREATE POLICY "Users can update their own activity" ON user_activity
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = user_id OR 
    auth.jwt() ->> 'role' = 'service_role'
  );

CREATE POLICY "System can insert activity" ON user_activity
  FOR INSERT
  TO authenticated, service_role
  WITH CHECK (
    auth.uid() = user_id OR 
    auth.jwt() ->> 'role' = 'service_role'
  );

CREATE POLICY "System can manage all activity" ON user_activity
  FOR ALL
  TO service_role
  USING (true);