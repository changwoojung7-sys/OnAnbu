
-- Emergency Fix for Login 500 Error
-- Run this in Supabase SQL Editor

BEGIN;

-- 1. Drop complex policies that might be causing recursion/performance issues
-- We will restore them properly later once you can login.

-- Drop "Family members can view each other" from profiles
DROP POLICY IF EXISTS "Family members can view each other" ON profiles;

-- Drop "Members can view group" from family_groups (just in case)
DROP POLICY IF EXISTS "Members can view group" ON family_groups;

-- 2. Ensure basic "View Own" policies exist
-- These are usually safe and sufficient for login.

-- Profiles: View Own
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- Family Groups: Parent View Own
DROP POLICY IF EXISTS "Parent can view own group" ON family_groups;
CREATE POLICY "Parent can view own group" ON family_groups
  FOR SELECT USING (auth.uid() = parent_id);

COMMIT;
