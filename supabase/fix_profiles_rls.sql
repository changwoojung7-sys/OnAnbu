
-- Fix RLS Infinite Recursion in PROFILES table
-- Run this in Supabase SQL Editor

BEGIN;

-- 1. Helper Function to check Admin status safely
-- This bypasses RLS to check the user's role, preventing infinite loops.
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role = 'admin'
  );
$$;

-- 2. Drop policies that cause recursion
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Family members can view each other" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles; -- We re-create this to be sure

-- 3. Re-create safe policies

-- A. Users can view their own profile (Always allowed)
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- B. Admins can view ALL profiles (Using safe function)
CREATE POLICY "Admins can view all profiles" ON profiles
  FOR SELECT USING (is_admin());

-- C. (Optional) Family members view - Simplified/Safe version could be added later
-- For now, we omit the complex family view to ensure login works.

COMMIT;
