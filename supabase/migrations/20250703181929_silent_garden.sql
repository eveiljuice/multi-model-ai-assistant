/*
  # Fix HTTP extension error for Telegram notifications

  1. Changes
    - Enable http extension if available
    - Create alternative webhook function using pg_net if http extension is not available
    - Update trigger to use the correct function

  2. Details
    - First try to enable http extension
    - If not available, use pg_net.http_post instead
    - Add proper error handling and logging
*/

-- Try to enable http extension (may not be available in all Supabase instances)
CREATE EXTENSION IF NOT EXISTS http;

-- Create or replace the function to notify Telegram about new ideas
CREATE OR REPLACE FUNCTION notify_telegram_new_idea()
RETURNS TRIGGER AS $$
DECLARE
  request_id bigint;
  payload jsonb;
  webhook_url text;
  response_status int;
BEGIN
  -- Get the webhook URL - replace with your actual Supabase project URL
  webhook_url := 'https://zp1v56uxy8rdx5ypatb0ockcb9tr6a.supabase.co/functions/v1/telegram-notify';
  
  -- Prepare payload for the edge function
  payload := jsonb_build_object(
    'record', to_jsonb(NEW),
    'table', 'idea_suggestions',
    'type', 'INSERT'
  );

  -- Log the webhook attempt
  INSERT INTO activity_logs (
    session_id,
    event_type,
    event_category,
    event_data
  ) VALUES (
    'system',
    'telegram_webhook_attempt',
    'notification',
    jsonb_build_object(
      'idea_id', NEW.id,
      'webhook_url', webhook_url,
      'payload_size', length(payload::text)
    )
  );

  -- Try to call the edge function
  BEGIN
    -- First try using pg_net (available in most Supabase instances)
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net') THEN
      SELECT net.http_post(
        url := webhook_url,
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
        ),
        body := payload
      ) INTO request_id;
      
    -- Fallback to http extension if available
    ELSIF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'http') THEN
      SELECT (http_post(
        webhook_url,
        payload::text,
        'application/json'
      )).status INTO response_status;
      request_id := response_status;
      
    ELSE
      -- If neither extension is available, log this fact
      RAISE NOTICE 'Neither pg_net nor http extension is available for webhook calls';
      
      INSERT INTO error_logs (
        session_id,
        error_type,
        error_message,
        component,
        additional_data,
        severity
      ) VALUES (
        'system',
        'webhook_extension_unavailable',
        'Neither pg_net nor http extension is available',
        'notify_telegram_new_idea',
        jsonb_build_object(
          'idea_id', NEW.id,
          'available_extensions', (
            SELECT array_agg(extname) 
            FROM pg_extension 
            WHERE extname IN ('pg_net', 'http')
          )
        ),
        'high'
      );
      
      RETURN NEW;
    END IF;
    
    -- Log successful webhook call
    INSERT INTO activity_logs (
      session_id,
      event_type,
      event_category,
      event_data
    ) VALUES (
      'system',
      'telegram_webhook_success',
      'notification',
      jsonb_build_object(
        'idea_id', NEW.id,
        'request_id', request_id,
        'success', true
      )
    );
    
  EXCEPTION WHEN OTHERS THEN
    -- Log error but don't fail the main operation
    INSERT INTO error_logs (
      session_id,
      error_type,
      error_message,
      component,
      additional_data,
      severity
    ) VALUES (
      'system',
      'telegram_webhook_error',
      SQLERRM,
      'notify_telegram_new_idea',
      jsonb_build_object(
        'idea_id', NEW.id,
        'error_detail', SQLSTATE,
        'webhook_url', webhook_url,
        'error_hint', SQLERRM
      ),
      'medium'
    );
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure the trigger exists
DROP TRIGGER IF EXISTS trigger_notify_telegram_new_idea ON idea_suggestions;

CREATE TRIGGER trigger_notify_telegram_new_idea
  AFTER INSERT ON idea_suggestions
  FOR EACH ROW
  EXECUTE FUNCTION notify_telegram_new_idea();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION notify_telegram_new_idea() TO service_role;
GRANT EXECUTE ON FUNCTION notify_telegram_new_idea() TO postgres;

-- Check what extensions are available (for debugging)
INSERT INTO activity_logs (
  session_id,
  event_type,
  event_category,
  event_data
) VALUES (
  'system',
  'extension_check',
  'system',
  jsonb_build_object(
    'available_extensions', (
      SELECT array_agg(extname) 
      FROM pg_extension 
      WHERE extname IN ('pg_net', 'http', 'net')
    ),
    'all_extensions', (
      SELECT array_agg(extname) 
      FROM pg_extension
    )
  )
);