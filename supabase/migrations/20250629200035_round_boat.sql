/*
  # Add missing columns to logging tables

  1. Changes to Tables
    - `activity_logs`: Add missing `eventCategory` column (TEXT)
    - `performance_logs`: Add missing `additionalData` column (JSONB)

  2. Details
    - The `eventCategory` column is required by the logging service to categorize different types of activities
    - The `additionalData` column allows storing structured performance metadata
    - Both columns are added safely using IF NOT EXISTS checks to prevent errors if they already exist
*/

-- Add eventCategory column to activity_logs table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'activity_logs' AND column_name = 'eventCategory'
  ) THEN
    ALTER TABLE activity_logs ADD COLUMN "eventCategory" TEXT;
  END IF;
END $$;

-- Add additionalData column to performance_logs table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'performance_logs' AND column_name = 'additionalData'
  ) THEN
    ALTER TABLE performance_logs ADD COLUMN "additionalData" JSONB DEFAULT '{}'::jsonb;
  END IF;
END $$;