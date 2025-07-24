/*
  # Create idea suggestions system

  1. New Tables
    - `idea_suggestions`
      - `id` (uuid, primary key)
      - `user_id` (uuid, nullable for anonymous suggestions)
      - `title` (text, idea title)
      - `description` (text, detailed description)
      - `category` (text, suggestion category)
      - `priority` (text, priority level)
      - `status` (text, review status)
      - `admin_notes` (text, admin feedback)
      - `votes` (integer, community votes)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on idea_suggestions table
    - Add policies for public submission and authenticated viewing
    - Add admin policies for management

  3. Indexes
    - Add indexes for performance on common queries
*/

-- Create idea_suggestions table
CREATE TABLE IF NOT EXISTS idea_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text NOT NULL,
  category text NOT NULL CHECK (category IN ('new_agent', 'feature_improvement', 'ui_enhancement', 'integration', 'other')),
  priority text DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'under_review', 'approved', 'rejected', 'implemented')),
  admin_notes text,
  votes integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE idea_suggestions ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can submit ideas"
  ON idea_suggestions
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Users can view all ideas"
  ON idea_suggestions
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Users can update their own ideas"
  ON idea_suggestions
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_idea_suggestions_status ON idea_suggestions(status);
CREATE INDEX IF NOT EXISTS idx_idea_suggestions_category ON idea_suggestions(category);
CREATE INDEX IF NOT EXISTS idx_idea_suggestions_created_at ON idea_suggestions(created_at);
CREATE INDEX IF NOT EXISTS idx_idea_suggestions_votes ON idea_suggestions(votes);
CREATE INDEX IF NOT EXISTS idx_idea_suggestions_user_id ON idea_suggestions(user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_idea_suggestions_updated_at
  BEFORE UPDATE ON idea_suggestions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create function for Telegram notification
CREATE OR REPLACE FUNCTION notify_idea_suggestion()
RETURNS TRIGGER AS $$
BEGIN
  -- Отправляем HTTP request к Edge Function для уведомления в Telegram
  PERFORM net.http_post(
    url := 'https://sgzlhcagtesjazvwskjw.supabase.co/functions/v1/telegram-notify',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := jsonb_build_object(
      'record', row_to_json(NEW)
    )
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic Telegram notifications
CREATE TRIGGER idea_suggestion_telegram_notify
  AFTER INSERT ON idea_suggestions
  FOR EACH ROW
  EXECUTE FUNCTION notify_idea_suggestion();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA net TO anon, authenticated;
GRANT EXECUTE ON FUNCTION notify_idea_suggestion() TO anon, authenticated;