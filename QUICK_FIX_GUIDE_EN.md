# Quick Fix Guide for Credits Issue

## Step-by-step Fix

### Step 1: Create repair functions

Execute in Supabase SQL Editor:

```sql
-- Copy and execute contents of step1_fixed_create_function.sql
```

### Step 2: Check users without credits

```sql
-- Copy and execute contents of step2_check_users_without_credits.sql
```

### Step 3: Fix RLS policies

```sql
-- Copy and execute contents of step3_fix_rls_policies.sql
```

### Step 4: Update trigger

```sql
-- Copy and execute contents of step4_update_trigger.sql
```

### Step 5: Fix all users without credits

```sql
-- Fix all users (returns count of fixed users)
SELECT fix_all_users_missing_credits();

-- OR fix specific user by email
SELECT fix_user_by_email('user@example.com');
```

## Alternative method - fix specific user

If you need to fix only one user:

```sql
-- Replace 'user-email@example.com' with actual email
DO $
DECLARE
    target_user_id uuid;
    result boolean;
BEGIN
    -- Find user ID by email
    SELECT id INTO target_user_id
    FROM auth.users
    WHERE email = 'user-email@example.com'
    AND deleted_at IS NULL;

    IF target_user_id IS NULL THEN
        RAISE NOTICE 'User not found';
        RETURN;
    END IF;

    -- Initialize credits
    SELECT initialize_user_trial_credits_safe(target_user_id) INTO result;

    IF result THEN
        RAISE NOTICE 'Credits successfully initialized for user %', target_user_id;
    ELSE
        RAISE NOTICE 'Failed to initialize credits for user %', target_user_id;
    END IF;
END $;
```

## Verify results

After applying fixes, check:

```sql
-- Check that all users have credits
SELECT
    COUNT(*) as total_users,
    COUNT(c.user_id) as users_with_credits,
    COUNT(*) - COUNT(c.user_id) as users_without_credits
FROM auth.users au
LEFT JOIN credits c ON c.user_id = au.id
WHERE au.deleted_at IS NULL;
```

```sql
-- Check specific user
SELECT
    au.email,
    c.balance,
    c.created_at as credits_created,
    ua.last_active
FROM auth.users au
LEFT JOIN credits c ON c.user_id = au.id
LEFT JOIN user_activity ua ON ua.user_id = au.id
WHERE au.email = 'user-email@example.com';
```

## Test functionality

After fixing, test:

1. **Credit deduction:**

```sql
-- Replace user_id with actual ID
SELECT deduct_credits(
    'user-id-here'::uuid,
    1,
    'test-agent'::uuid,
    'Test deduction'
);
```

2. **Error logging:**

```sql
-- Replace user_id with actual ID
INSERT INTO error_logs (
    user_id,
    session_id,
    error_type,
    error_message,
    component,
    severity
) VALUES (
    'user-id-here'::uuid,
    'test-session',
    'test_error',
    'Test error message',
    'test-component',
    'low'
);
```

## If problem persists

1. Check Supabase logs for errors
2. Ensure all SQL commands executed without errors
3. Check table access permissions
4. Contact developer with detailed error description
