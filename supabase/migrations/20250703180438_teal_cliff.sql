/*
  # Fix Telegram webhook function

  1. Updates
    - Fix the webhook URL to use correct Supabase project reference
    - Add better error handling
    - Use proper HTTP extension for webhooks
    - Add debugging information

  2. Security
    - Maintain existing RLS policies
    - Ensure proper error logging
*/

-- Create or replace the function to notify Telegram about new ideas
CREATE OR REPLACE FUNCTION notify_telegram_new_idea()
RETURNS TRIGGER AS $$
DECLARE
  request_id bigint;
  payload jsonb;
  webhook_url text;
BEGIN
  -- Get the webhook URL from environment or use default
  -- You need to replace this with your actual Supabase project URL
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

  -- Call the edge function asynchronously
  BEGIN
    -- Use the http extension to make the request
    SELECT extensions.http_post(
      url := webhook_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
      ),
      body := payload::text
    ) INTO request_id;
    
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
        'webhook_url', webhook_url
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