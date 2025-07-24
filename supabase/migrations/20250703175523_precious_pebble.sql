/*
  # Add Telegram webhook trigger for idea suggestions

  1. Database Trigger
    - Create trigger function to call Telegram notification edge function
    - Trigger on INSERT to idea_suggestions table

  2. Security
    - Function runs with security definer privileges
    - Handles errors gracefully without failing the main operation
*/

-- Create function to notify Telegram about new ideas
CREATE OR REPLACE FUNCTION notify_telegram_new_idea()
RETURNS TRIGGER AS $$
DECLARE
  request_id bigint;
  payload jsonb;
BEGIN
  -- Prepare payload for the edge function
  payload := jsonb_build_object(
    'record', to_jsonb(NEW),
    'table', 'idea_suggestions',
    'type', 'INSERT'
  );

  -- Call the edge function asynchronously
  -- Note: In production, you might want to use a more robust queue system
  BEGIN
    SELECT net.http_post(
      url := 'https://your-project-ref.supabase.co/functions/v1/telegram-notify',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
      ),
      body := payload
    ) INTO request_id;
    
    -- Log successful webhook call
    INSERT INTO activity_logs (
      session_id,
      event_type,
      event_category,
      event_data
    ) VALUES (
      'system',
      'telegram_webhook_called',
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
        'error_detail', SQLSTATE
      ),
      'medium'
    );
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new idea suggestions
DROP TRIGGER IF EXISTS trigger_notify_telegram_new_idea ON idea_suggestions;

CREATE TRIGGER trigger_notify_telegram_new_idea
  AFTER INSERT ON idea_suggestions
  FOR EACH ROW
  EXECUTE FUNCTION notify_telegram_new_idea();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION notify_telegram_new_idea() TO service_role;