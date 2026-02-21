
-- Fix RLS Infinite Recursion V2
-- Run this in Supabase SQL Editor to fix login issues.

BEGIN;

-- 1. Helper function for "Members can view" policy
-- Defines who can see family members (bypassing RLS)
CREATE OR REPLACE FUNCTION get_my_group_ids()
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT group_id FROM family_members WHERE guardian_id = auth.uid()
  UNION
  SELECT id FROM family_groups WHERE parent_id = auth.uid();
$$;

-- 2. Helper function for "Primary can manage" policy
-- Defines who is a primary guardian (bypassing RLS)
CREATE OR REPLACE FUNCTION is_primary_member(target_group_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM family_members 
    WHERE group_id = target_group_id 
    AND guardian_id = auth.uid() 
    AND role = 'primary'
  );
$$;

-- 3. Drop ALL problematic policies on family_members
DROP POLICY IF EXISTS "Members can view group members" ON family_members;
DROP POLICY IF EXISTS "Primary can manage members" ON family_members;
DROP POLICY IF EXISTS "Members can view group members 2" ON family_members; 

-- 4. Re-create policies using the safe functions
-- These policies now call the SECURITY DEFINER functions instead of querying the table directly,
-- preventing the infinite recursion loop.

CREATE POLICY "Members can view group members" ON family_members
  FOR SELECT USING (
    group_id IN (SELECT get_my_group_ids())
  );

CREATE POLICY "Primary can manage members" ON family_members
  FOR ALL USING (
    is_primary_member(group_id)
  );

COMMIT;
