-- =====================================================
-- 보조 보호자(Guardian) 초대 수락 및 그룹 합류 RPC
-- =====================================================
CREATE OR REPLACE FUNCTION accept_guardian_invitation(p_invite_code TEXT) RETURNS JSONB AS $$
DECLARE v_invitation RECORD;
v_user_id UUID;
v_existing_member RECORD;
BEGIN -- 보안 정의자(Security Definer) 함수이므로 트리거/RLS 우회하여 강제 실행됨
v_user_id := auth.uid();
IF v_user_id IS NULL THEN RETURN jsonb_build_object('success', false, 'message', '로그인이 필요합니다.');
END IF;
-- 1. 유효한 초대장 조회
SELECT * INTO v_invitation
FROM public.guardian_invitations
WHERE TRIM(invite_code) = TRIM(p_invite_code)
    AND status = 'pending';
IF NOT FOUND THEN RETURN jsonb_build_object(
    'success',
    false,
    'message',
    '유효하지 않거나 이미 사용된 초대코드입니다.'
);
END IF;
-- 2. 이미 해당 그룹의 멤버인지 확인
SELECT * INTO v_existing_member
FROM public.family_members
WHERE group_id = v_invitation.group_id
    AND guardian_id = v_user_id;
IF FOUND THEN -- 이미 멤버라면 초대장만 처리
UPDATE public.guardian_invitations
SET status = 'accepted',
    accepted_by = v_user_id,
    accepted_at = NOW()
WHERE id = v_invitation.id;
RETURN jsonb_build_object('success', true, 'message', '이미 그룹에 소속되어 있습니다.');
END IF;
-- 3. 초대장 상태 업데이트
UPDATE public.guardian_invitations
SET status = 'accepted',
    accepted_by = v_user_id,
    accepted_at = NOW()
WHERE id = v_invitation.id;
-- 4. 멤버 연결 (가족 그룹 추가)
INSERT INTO public.family_members (
        group_id,
        guardian_id,
        role,
        relationship_label,
        invitation_status
    )
VALUES (
        v_invitation.group_id,
        v_user_id,
        'secondary',
        v_invitation.relationship_label,
        'accepted'
    );
RETURN jsonb_build_object(
    'success',
    true,
    'group_id',
    v_invitation.group_id
);
EXCEPTION
WHEN OTHERS THEN RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
GRANT EXECUTE ON FUNCTION accept_guardian_invitation(TEXT) TO authenticated;