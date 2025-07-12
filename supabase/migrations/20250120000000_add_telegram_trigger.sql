-- Migration: Add Telegram notification trigger for idea_suggestions
-- This migration adds automatic Telegram notifications when new ideas are submitted

-- First, enable the http extension if not already enabled
CREATE EXTENSION IF NOT EXISTS http;

-- Create function for Telegram notification
CREATE OR REPLACE FUNCTION notify_idea_suggestion()
RETURNS TRIGGER AS $$
BEGIN
  -- Отправляем HTTP request к Edge Function для уведомления в Telegram
  -- Используем perform для асинхронного выполнения, чтобы не блокировать INSERT
  PERFORM pg_notify('telegram_notify', json_build_object(
    'table', 'idea_suggestions',
    'record', row_to_json(NEW)
  )::text);
  
  -- Альтернативно, можно использовать прямой HTTP запрос
  -- Но это может замедлить INSERT операции
  -- PERFORM net.http_post(
  --   url := 'https://sgzlhcagtesjazvwskjw.supabase.co/functions/v1/telegram-notify',
  --   headers := jsonb_build_object(
  --     'Content-Type', 'application/json',
  --     'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
  --   ),
  --   body := jsonb_build_object(
  --     'record', row_to_json(NEW)
  --   )
  -- );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic Telegram notifications
DROP TRIGGER IF EXISTS idea_suggestion_telegram_notify ON idea_suggestions;
CREATE TRIGGER idea_suggestion_telegram_notify
  AFTER INSERT ON idea_suggestions
  FOR EACH ROW
  EXECUTE FUNCTION notify_idea_suggestion();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION notify_idea_suggestion() TO anon, authenticated;

-- Create webhook function for processing notifications
CREATE OR REPLACE FUNCTION process_telegram_webhook()
RETURNS TRIGGER AS $$
BEGIN
  -- Этот trigger будет вызван при получении уведомления
  -- Можно добавить дополнительную логику обработки
  
  PERFORM net.http_post(
    url := 'https://sgzlhcagtesjazvwskjw.supabase.co/functions/v1/telegram-notify',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := jsonb_build_object(
      'record', NEW
    )
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Добавляем комментарии для документации
COMMENT ON FUNCTION notify_idea_suggestion() IS 'Trigger function to notify Telegram when new idea is submitted';
COMMENT ON TRIGGER idea_suggestion_telegram_notify ON idea_suggestions IS 'Automatically notify development team via Telegram when new idea is submitted'; 