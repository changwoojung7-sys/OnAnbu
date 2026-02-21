
-- Admin Setup Script
-- 1. Run this script in the Supabase SQL Editor to make a user an admin.
-- 2. Replace 'YOUR_EMAIL@example.com' with the email address you signed up with.

-- Transaction to ensure consistency
BEGIN;

-- Check if the user exists and update the role
DO $$
DECLARE
    target_email TEXT := 'YOUR_EMAIL@example.com'; -- <<< CHANGE THIS TO YOUR EMAIL
    user_exists BOOLEAN;
BEGIN
    -- Check if profile exists
    SELECT EXISTS(SELECT 1 FROM profiles WHERE email = target_email) INTO user_exists;

    IF user_exists THEN
        UPDATE profiles
        SET role = 'admin'
        WHERE email = target_email;
        
        RAISE NOTICE 'Success: User % has been promoted to admin.', target_email;
    ELSE
        RAISE EXCEPTION 'Error: User with email % not found. Please sign up first.', target_email;
    END IF;
END $$;

COMMIT;
