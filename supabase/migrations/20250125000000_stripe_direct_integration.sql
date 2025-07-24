-- Stripe Direct Integration Migration
-- Создает RPC функции для работы со Stripe API напрямую из клиента
-- Все секреты хранятся в Supabase secrets и доступны только через RPC

-- Создаем функцию для получения Stripe секретов (только публичный ключ)
CREATE OR REPLACE FUNCTION get_stripe_secrets()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
BEGIN
  -- Проверяем авторизацию пользователя
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  -- Получаем только публичный ключ для клиента
  SELECT json_build_object(
    'public_key', vault.decrypted_secret('stripe_public_key')
  ) INTO result;

  RETURN result;
END;
$$;

-- Создаем функцию для получения всех Stripe секретов (только для service role)
CREATE OR REPLACE FUNCTION get_stripe_secrets_admin()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
BEGIN
  -- Проверяем, что вызывается от service role
  IF auth.role() != 'service_role' THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  -- Получаем все секреты из Supabase vault
  SELECT json_build_object(
    'public_key', vault.decrypted_secret('stripe_public_key'),
    'secret_key', vault.decrypted_secret('stripe_secret_key'),
    'webhook_secret', vault.decrypted_secret('stripe_webhook_secret')
  ) INTO result;

  RETURN result;
END;
$$;

-- Создаем функцию для создания checkout сессии
CREATE OR REPLACE FUNCTION create_stripe_checkout_session(
  price_id TEXT,
  mode TEXT DEFAULT 'payment',
  success_url TEXT DEFAULT NULL,
  cancel_url TEXT DEFAULT NULL,
  credits INTEGER DEFAULT 0
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_id UUID;
  customer_id TEXT;
  checkout_session JSON;
  stripe_response JSON;
BEGIN
  -- Проверяем авторизацию
  user_id := auth.uid();
  IF user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  -- Получаем или создаем Stripe customer
  SELECT sc.customer_id INTO customer_id
  FROM stripe_customers sc
  WHERE sc.user_id = user_id;

  -- Если customer не найден, создаем заглушку (реальное создание будет в webhook)
  IF customer_id IS NULL THEN
    customer_id := 'temp_' || user_id::TEXT;
  END IF;

  -- Создаем запись в stripe_orders для отслеживания
  INSERT INTO stripe_orders (
    checkout_session_id,
    customer_id,
    amount_total,
    currency,
    payment_status,
    status,
    credits_amount
  ) VALUES (
    'pending_' || gen_random_uuid()::TEXT,
    customer_id,
    0, -- Будет обновлено в webhook
    'usd',
    'pending',
    'pending',
    credits
  );

  -- Возвращаем данные для создания сессии на клиенте
  RETURN json_build_object(
    'session_id', 'client_side_session',
    'url', 'client_side_redirect',
    'price_id', price_id,
    'mode', mode,
    'success_url', COALESCE(success_url, 'http://localhost:5174/success'),
    'cancel_url', COALESCE(cancel_url, 'http://localhost:5174/pricing')
  );
END;
$$;

-- Создаем функцию для обработки успешного платежа
CREATE OR REPLACE FUNCTION handle_stripe_payment_success(
  session_id TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_id UUID;
  order_record RECORD;
BEGIN
  -- Проверяем авторизацию
  user_id := auth.uid();
  IF user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  -- Находим заказ по session_id
  SELECT so.*, sc.user_id INTO order_record
  FROM stripe_orders so
  JOIN stripe_customers sc ON so.customer_id = sc.customer_id
  WHERE so.checkout_session_id = session_id
  AND sc.user_id = user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found or access denied';
  END IF;

  -- Обновляем статус заказа
  UPDATE stripe_orders
  SET 
    payment_status = 'paid',
    status = 'completed',
    updated_at = NOW()
  WHERE checkout_session_id = session_id;

  -- Добавляем кредиты пользователю
  IF order_record.credits_amount > 0 THEN
    INSERT INTO credit_transactions (
      user_id,
      amount,
      transaction_type,
      description,
      reference_id
    ) VALUES (
      user_id,
      order_record.credits_amount,
      'purchase',
      'Stripe payment: ' || session_id,
      session_id
    );
  END IF;

  RETURN json_build_object(
    'success', true,
    'credits_added', order_record.credits_amount
  );
END;
$$;

-- Создаем функцию для отмены подписки
CREATE OR REPLACE FUNCTION cancel_stripe_subscription(
  subscription_id TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_id UUID;
  subscription_record RECORD;
BEGIN
  -- Проверяем авторизацию
  user_id := auth.uid();
  IF user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  -- Находим подписку пользователя
  SELECT ss.*, sc.user_id INTO subscription_record
  FROM stripe_subscriptions ss
  JOIN stripe_customers sc ON ss.customer_id = sc.customer_id
  WHERE ss.subscription_id = subscription_id
  AND sc.user_id = user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Subscription not found or access denied';
  END IF;

  -- Обновляем статус подписки
  UPDATE stripe_subscriptions
  SET 
    status = 'canceled',
    updated_at = NOW()
  WHERE subscription_id = subscription_id;

  RETURN json_build_object(
    'success', true,
    'subscription_id', subscription_id,
    'status', 'canceled'
  );
END;
$$;

-- Создаем функцию для обработки webhook событий
CREATE OR REPLACE FUNCTION process_stripe_webhook(
  event_id TEXT,
  event_type TEXT,
  event_data JSON
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  customer_id TEXT;
  user_id UUID;
  subscription_data JSON;
  checkout_session_data JSON;
BEGIN
  -- Проверяем идемпотентность
  IF EXISTS (SELECT 1 FROM stripe_events WHERE stripe_event_id = event_id) THEN
    RETURN json_build_object('status', 'already_processed');
  END IF;

  -- Записываем событие
  INSERT INTO stripe_events (stripe_event_id, event_type, processed_at)
  VALUES (event_id, event_type, NOW());

  -- Обрабатываем разные типы событий
  CASE event_type
    WHEN 'checkout.session.completed' THEN
      checkout_session_data := event_data->'data'->'object';
      customer_id := checkout_session_data->>'customer';
      
      -- Создаем или обновляем customer
      INSERT INTO stripe_customers (user_id, customer_id, email)
      VALUES (
        (checkout_session_data->'metadata'->>'user_id')::UUID,
        customer_id,
        checkout_session_data->>'customer_email'
      )
      ON CONFLICT (customer_id) DO UPDATE SET
        email = EXCLUDED.email,
        updated_at = NOW();

      -- Обновляем заказ
      UPDATE stripe_orders
      SET 
        checkout_session_id = checkout_session_data->>'id',
        payment_intent_id = checkout_session_data->>'payment_intent',
        customer_id = customer_id,
        amount_total = (checkout_session_data->>'amount_total')::INTEGER,
        currency = checkout_session_data->>'currency',
        payment_status = checkout_session_data->>'payment_status',
        status = 'completed',
        updated_at = NOW()
      WHERE customer_id = customer_id
      AND status = 'pending';

      -- Добавляем кредиты
      IF (checkout_session_data->'metadata'->>'credits')::INTEGER > 0 THEN
        INSERT INTO credit_transactions (
          user_id,
          amount,
          transaction_type,
          description,
          reference_id
        ) VALUES (
          (checkout_session_data->'metadata'->>'user_id')::UUID,
          (checkout_session_data->'metadata'->>'credits')::INTEGER,
          'purchase',
          'Stripe payment: ' || checkout_session_data->>'id',
          checkout_session_data->>'id'
        );
      END IF;

    WHEN 'customer.subscription.created', 'customer.subscription.updated' THEN
      subscription_data := event_data->'data'->'object';
      customer_id := subscription_data->>'customer';
      
      -- Создаем или обновляем подписку
      INSERT INTO stripe_subscriptions (
        subscription_id,
        customer_id,
        status,
        price_id,
        current_period_start,
        current_period_end
      ) VALUES (
        subscription_data->>'id',
        customer_id,
        subscription_data->>'status',
        (subscription_data->'items'->'data'->0->>'price'),
        to_timestamp((subscription_data->>'current_period_start')::INTEGER),
        to_timestamp((subscription_data->>'current_period_end')::INTEGER)
      )
      ON CONFLICT (subscription_id) DO UPDATE SET
        status = EXCLUDED.status,
        price_id = EXCLUDED.price_id,
        current_period_start = EXCLUDED.current_period_start,
        current_period_end = EXCLUDED.current_period_end,
        updated_at = NOW();

    WHEN 'customer.subscription.deleted' THEN
      subscription_data := event_data->'data'->'object';
      
      UPDATE stripe_subscriptions
      SET 
        status = 'canceled',
        updated_at = NOW()
      WHERE subscription_id = subscription_data->>'id';

    ELSE
      -- Неизвестный тип события, просто логируем
      NULL;
  END CASE;

  RETURN json_build_object('status', 'processed');
END;
$$;

-- Предоставляем права на выполнение функций
GRANT EXECUTE ON FUNCTION get_stripe_secrets() TO authenticated;
GRANT EXECUTE ON FUNCTION get_stripe_secrets_admin() TO service_role;
GRANT EXECUTE ON FUNCTION create_stripe_checkout_session(TEXT, TEXT, TEXT, TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION handle_stripe_payment_success(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION cancel_stripe_subscription(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION process_stripe_webhook(TEXT, TEXT, JSON) TO service_role;

-- Создаем индексы для оптимизации
CREATE INDEX IF NOT EXISTS idx_stripe_orders_user_lookup ON stripe_orders(customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stripe_subscriptions_user_lookup ON stripe_subscriptions(customer_id, status);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_lookup ON credit_transactions(user_id, created_at DESC); 