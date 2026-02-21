-- =====================================================
-- 하이브리드 인증 & 안부 기능 종합 수정 SQL
-- Supabase SQL Editor에서 실행
-- =====================================================

-- 1. 초대코드 조회 RLS 정책 (로그인 전 조회 허용)
DROP POLICY IF EXISTS "Anyone can verify parent invite code" ON parent_invitations;
CREATE POLICY "Anyone can verify parent invite code" ON parent_invitations
  FOR SELECT USING (status = 'pending');

DROP POLICY IF EXISTS "Anyone can verify guardian invite code" ON guardian_invitations;
CREATE POLICY "Anyone can verify guardian invite code" ON guardian_invitations
  FOR SELECT USING (status = 'pending');


-- 2. 초대 유저 이메일 자동 인증 RPC 함수
CREATE OR REPLACE FUNCTION confirm_invited_user(user_email TEXT, invite_code TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  is_valid BOOLEAN := FALSE;
BEGIN
  -- 유효한 초대코드가 있는지 확인
  SELECT EXISTS (
    SELECT 1 FROM parent_invitations WHERE parent_invitations.invite_code = confirm_invited_user.invite_code AND status = 'pending'
    UNION ALL
    SELECT 1 FROM guardian_invitations WHERE guardian_invitations.invite_code = confirm_invited_user.invite_code AND status = 'pending'
  ) INTO is_valid;

  IF is_valid THEN
    -- 이메일 인증 처리
    UPDATE auth.users 
    SET email_confirmed_at = NOW()
    WHERE email = user_email 
    AND email_confirmed_at IS NULL;
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 권한 부여
GRANT EXECUTE ON FUNCTION confirm_invited_user(TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION confirm_invited_user(TEXT, TEXT) TO authenticated;


-- 3. Action Logs RLS 정책 추가 (부모님이 안부 작성 가능하도록)
-- 기존: Guardian only insert
-- 변경: Parent can insert 'check_in' or 'voice_cheer' (if we allow generic actions later)
-- 여기서는 부모님이 자신의 group_id, parent_id로 insert하는 것을 허용

DROP POLICY IF EXISTS "Parent can create actions" ON action_logs;
CREATE POLICY "Parent can create actions" ON action_logs
  FOR INSERT WITH CHECK (
    auth.uid() = parent_id 
    AND type IN ('check_in', 'voice_cheer', 'message') -- 부모님은 기상 알림 및 안부 메시지 생성 가능
  );

-- 부모님이 자신의 액션 로그를 조회할 수 있도록 (기존 정책 확인 및 보완)
DROP POLICY IF EXISTS "Parent can view own actions" ON action_logs;
CREATE POLICY "Parent can view own actions" ON action_logs
  FOR SELECT USING (auth.uid() = parent_id);
  
-- 부모님이 자신의 액션 로그(예: 읽음 처리) 업데이트 가능
DROP POLICY IF EXISTS "Parent can update own actions" ON action_logs;
CREATE POLICY "Parent can update own actions" ON action_logs
  FOR UPDATE USING (auth.uid() = parent_id);


-- 4. 기존 데이터 정리 (옵션)
UPDATE auth.users 
SET email_confirmed_at = NOW() 
WHERE email_confirmed_at IS NULL;

-- 5. Profiles INSERT 정책
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- 6. Family Groups & Members INSERT 정책 (부모님 가입 시 필요)
-- family_groups: 인증된 사용자는 누구나 자신의 그룹을 생성할 수 있음 (parent_id = uid)
DROP POLICY IF EXISTS "Users can create own family group" ON family_groups;
CREATE POLICY "Users can create own family group" ON family_groups
  FOR INSERT WITH CHECK (auth.uid() = parent_id);

-- family_members: 부모님은 자신이 소유한 그룹(parent_id=uid)에 멤버를 추가할 수 있음
DROP POLICY IF EXISTS "Parent can add members to own group" ON family_members;
CREATE POLICY "Parent can add members to own group" ON family_members
  FOR INSERT WITH CHECK (
    group_id IN (
      SELECT id FROM family_groups WHERE parent_id = auth.uid()
    )
  );


-- 7. 초대장 수락(UPDATE) 권한 정책
DROP POLICY IF EXISTS "Authenticated users can accept invitations" ON parent_invitations;
CREATE POLICY "Authenticated users can accept invitations" ON parent_invitations
  FOR UPDATE USING (status = 'pending');

DROP POLICY IF EXISTS "Authenticated users can accept guardian invitations" ON guardian_invitations;
CREATE POLICY "Authenticated users can accept guardian invitations" ON guardian_invitations
  FOR UPDATE USING (status = 'pending');


-- 8. 부모님 가입 완료 통합 처리 RPC (RLS 우회 및 트랜잭션 보장)
DROP FUNCTION IF EXISTS complete_parent_signup(UUID, TEXT, TEXT);

CREATE OR REPLACE FUNCTION complete_parent_signup(
  p_parent_id UUID,
  p_name TEXT,
  p_invite_code TEXT
) RETURNS JSONB AS $$
DECLARE
  v_invitation RECORD;
  v_group_id UUID;
  v_result JSONB;
BEGIN
  -- 보안 정의자(Security Definer) 함수에서는 search_path를 설정하는 것이 안전함
  -- SET search_path = public;

  -- 1. 유효한 초대장 조회 (공백 제거 및 대소문자 무시)
  SELECT * INTO v_invitation
  FROM public.parent_invitations
  WHERE 
    TRIM(invite_code) = TRIM(p_invite_code) 
    AND status = 'pending';

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false, 
      'message', '유효하지 않은 초대코드입니다. (Code: ' || COALESCE(p_invite_code, 'NULL') || ')'
    );
  END IF;

  -- 2. 초대장 상태 업데이트
  UPDATE public.parent_invitations
  SET status = 'accepted', accepted_by = p_parent_id, accepted_at = NOW()
  WHERE id = v_invitation.id;

  -- 3. 가족 그룹 생성
  INSERT INTO public.family_groups (parent_id, group_name)
  VALUES (p_parent_id, p_name || ' 케어 그룹')
  RETURNING id INTO v_group_id;

  -- 4. 멤버 연결 (Guardian)
  INSERT INTO public.family_members (group_id, guardian_id, role, relationship_label, invitation_status)
  VALUES (
    v_group_id, 
    v_invitation.inviter_id, 
    'primary', 
    CASE WHEN v_invitation.relationship_label = '어머니' THEN '아들/딸' ELSE '자녀' END,
    'accepted'
  );

  RETURN jsonb_build_object('success', true, 'group_id', v_group_id);

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION complete_parent_signup(UUID, TEXT, TEXT) TO authenticated;

SELECT 'ALL POLICIES AND RPCs UPDATED ✅' AS status;
