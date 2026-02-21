
-- Fix RLS Infinite Recursion in family_members
-- Run this in Supabase SQL Editor

BEGIN;

-- 1. Helper function to access family_members safely (bypassing RLS)
-- SECURITY DEFINER allows this function to run with the privileges of the creator (admin/postgres)
CREATE OR REPLACE FUNCTION get_my_group_ids()
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT group_id FROM family_members WHERE guardian_id = auth.uid()
  UNION
  SELECT id FROM family_groups WHERE parent_id = auth.uid();
$$;

-- 2. Drop the problematic recursive policy
DROP POLICY IF EXISTS "Members can view group members" ON family_members;

-- 3. Re-create the policy using the safe helper function
CREATE POLICY "Members can view group members" ON family_members
  FOR SELECT USING (
    group_id IN (SELECT get_my_group_ids())
  );

COMMIT;
