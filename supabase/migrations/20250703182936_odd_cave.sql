/*
  # Remove automatic Telegram trigger from database

  1. Changes
    - Remove the trigger that automatically calls Telegram webhook
    - Remove the notify_telegram_new_idea function
    - Keep the idea_suggestions table intact
    - This allows frontend to handle Telegram notifications independently

  2. Reasoning
    - Frontend will handle both Supabase and Telegram submissions separately
    - This prevents database errors from affecting Telegram notifications
    - Better error handling and user feedback
    - More reliable dual-system approach
*/

-- Remove the trigger
DROP TRIGGER IF EXISTS trigger_notify_telegram_new_idea ON idea_suggestions;

-- Remove the function
DROP FUNCTION IF EXISTS notify_telegram_new_idea();

-- Log the removal
INSERT INTO activity_logs (
  session_id,
  event_type,
  event_category,
  event_data
) VALUES (
  'system',
  'telegram_trigger_removed',
  'system',
  jsonb_build_object(
    'reason', 'Moving to frontend-based dual submission system',
    'timestamp', now()
  )
);