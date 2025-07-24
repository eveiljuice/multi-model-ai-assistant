/*
  # Update user signup trigger to include trial credits

  1. Modify existing handle_new_user function
    - Add trial credits initialization
    - Ensure proper error handling

  2. Update trigger
    - Maintain existing functionality
    - Add credit initialization
*/

-- Update the handle_new_user function to include trial credits
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Create user profile
  INSERT INTO public.users (id, email, full_name, avatar_url, preferences, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url',
    '{}',
    NOW(),
    NOW()
  );

  -- Initialize trial credits
  PERFORM initialize_trial_credits(NEW.id);

  RETURN NEW;
EXCEPTION
  WHEN others THEN
    -- Log the error but don't fail the auth process
    RAISE WARNING 'Failed to create user profile or initialize credits: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;