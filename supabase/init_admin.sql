-- =====================================================
-- Admin Features Migration
-- Run this in Supabase Dashboard > SQL Editor
-- =====================================================

-- 1. 'role' 컬럼의 제약조건 수정 ('admin' 추가)
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check 
  CHECK (role IN ('guardian', 'parent', 'admin'));

-- 2. 관리자 권한 RLS 추가 (모든 프로필 조회 가능)
CREATE POLICY "Admins can view all profiles" ON profiles
  FOR SELECT USING (
    auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
  );

-- 3. [RPC] 모든 사용자 목록 조회 함수
-- 호출자가 admin role을 가지고 있어야만 실행됨
CREATE OR REPLACE FUNCTION get_all_users()
RETURNS TABLE (
  id UUID,
  email TEXT,
  name TEXT,
  role TEXT,
  created_at TIMESTAMPTZ
) 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- 호출자가 admin인지 확인
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin') THEN
    RAISE EXCEPTION 'Access denied: User is not an admin';
  END IF;

  RETURN QUERY
  SELECT p.id, p.email, p.name, p.role, p.created_at
  FROM profiles p
  ORDER BY p.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- 4. [RPC] 사용자 강제 삭제 함수
-- 호출자가 admin role을 가지고 있어야만 실행됨
-- auth.users 테이블에서 삭제하면 CASCADE 설정에 의해 profiles 등 관련 데이터도 자동 삭제됨
CREATE OR REPLACE FUNCTION delete_user_by_admin(target_user_id UUID)
RETURNS VOID
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- 호출자가 admin인지 확인
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin') THEN
    RAISE EXCEPTION 'Access denied: User is not an admin';
  END IF;

  -- 자기 자신 삭제 방지 (선택 사항)
  IF target_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Cannot delete yourself';
  END IF;

  -- auth.users에서 삭제
  DELETE FROM auth.users WHERE id = target_user_id;
END;
$$ LANGUAGE plpgsql;

-- 5. [Initial Setup] 특정 사용자를 관리자로 지정하는 예시 쿼리
-- 아래 이메일을 본인의 이메일로 변경해서 실행하세요.
-- UPDATE profiles SET role = 'admin' WHERE email = 'YOUR_EMAIL@example.com';
