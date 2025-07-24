/*
  # Create comprehensive logging system

  1. New Tables
    - `activity_logs`
      - `id` (uuid, primary key)
      - `user_id` (uuid, nullable for anonymous users)
      - `session_id` (text, for tracking user sessions)
      - `event_type` (text, type of activity)
      - `event_category` (text, category of event)
      - `event_data` (jsonb, detailed event information)
      - `user_agent` (text, browser information)
      - `ip_address` (text, user IP)
      - `url` (text, current page URL)
      - `referrer` (text, referrer URL)
      - `timestamp` (timestamptz, when event occurred)
      - `created_at` (timestamptz, record creation time)

    - `error_logs`
      - `id` (uuid, primary key)
      - `user_id` (uuid, nullable)
      - `session_id` (text)
      - `error_type` (text, type of error)
      - `error_message` (text, error message)
      - `error_stack` (text, error stack trace)
      - `component` (text, component where error occurred)
      - `url` (text, page URL)
      - `user_agent` (text)
      - `additional_data` (jsonb, extra context)
      - `severity` (text, error severity level)
      - `resolved` (boolean, whether error is resolved)
      - `created_at` (timestamptz)

    - `performance_logs`
      - `id` (uuid, primary key)
      - `user_id` (uuid, nullable)
      - `session_id` (text)
      - `metric_name` (text, performance metric name)
      - `metric_value` (numeric, metric value)
      - `url` (text, page URL)
      - `user_agent` (text)
      - `additional_data` (jsonb)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Add policies for logging access
*/

-- Activity Logs Table
CREATE TABLE IF NOT EXISTS activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id text NOT NULL,
  event_type text NOT NULL,
  event_category text NOT NULL,
  event_data jsonb DEFAULT '{}',
  user_agent text,
  ip_address text,
  url text,
  referrer text,
  timestamp timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Error Logs Table
CREATE TABLE IF NOT EXISTS error_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id text NOT NULL,
  error_type text NOT NULL,
  error_message text NOT NULL,
  error_stack text,
  component text,
  url text,
  user_agent text,
  additional_data jsonb DEFAULT '{}',
  severity text DEFAULT 'error' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  resolved boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Performance Logs Table
CREATE TABLE IF NOT EXISTS performance_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id text NOT NULL,
  metric_name text NOT NULL,
  metric_value numeric NOT NULL,
  url text,
  user_agent text,
  additional_data jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_logs ENABLE ROW LEVEL SECURITY;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_activity_logs_session_id ON activity_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_event_type ON activity_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_activity_logs_timestamp ON activity_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);

CREATE INDEX IF NOT EXISTS idx_error_logs_session_id ON error_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_error_logs_error_type ON error_logs(error_type);
CREATE INDEX IF NOT EXISTS idx_error_logs_severity ON error_logs(severity);
CREATE INDEX IF NOT EXISTS idx_error_logs_resolved ON error_logs(resolved);
CREATE INDEX IF NOT EXISTS idx_error_logs_created_at ON error_logs(created_at);

CREATE INDEX IF NOT EXISTS idx_performance_logs_session_id ON performance_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_performance_logs_metric_name ON performance_logs(metric_name);
CREATE INDEX IF NOT EXISTS idx_performance_logs_created_at ON performance_logs(created_at);

-- RLS Policies for Activity Logs
CREATE POLICY "Allow insert activity logs for all users"
  ON activity_logs
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Allow select activity logs for authenticated users"
  ON activity_logs
  FOR SELECT
  TO authenticated
  USING (true);

-- RLS Policies for Error Logs
CREATE POLICY "Allow insert error logs for all users"
  ON error_logs
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Allow select error logs for authenticated users"
  ON error_logs
  FOR SELECT
  TO authenticated
  USING (true);

-- RLS Policies for Performance Logs
CREATE POLICY "Allow insert performance logs for all users"
  ON performance_logs
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Allow select performance logs for authenticated users"
  ON performance_logs
  FOR SELECT
  TO authenticated
  USING (true);