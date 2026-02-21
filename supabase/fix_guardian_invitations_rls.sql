-- 보조 보호자 초대 권한 설정
-- guardian_invitations 테이블에 대한 RLS 정책 추가/수정
-- RLS 활성화 확인
ALTER TABLE public.guardian_invitations ENABLE ROW LEVEL SECURITY;
-- 기존 정책 삭제 (안전을 위해)
DROP POLICY IF EXISTS "사용자는 자신이 만든 초대를 볼 수 있습니다" ON public.guardian_invitations;
DROP POLICY IF EXISTS "사용자는 새로운 초대를 생성할 수 있습니다" ON public.guardian_invitations;
DROP POLICY IF EXISTS "Users can view invitations they created" ON public.guardian_invitations;
DROP POLICY IF EXISTS "Users can create invitations" ON public.guardian_invitations;
-- 초대 생성 권한: 로그인한 사용자가 본인을 inviter_id로 지정하여 생성 가능
CREATE POLICY "Users can create invitations" ON public.guardian_invitations FOR
INSERT TO authenticated WITH CHECK (auth.uid() = inviter_id);
-- 초대 조회 권한: 본인이 만든 초대이거나, 해당 그룹에 속해 있는 경우 조회 가능
CREATE POLICY "Users can view invitations they created" ON public.guardian_invitations FOR
SELECT TO authenticated USING (
        auth.uid() = inviter_id
        OR auth.uid() IN (
            SELECT guardian_id
            FROM public.family_members
            WHERE public.family_members.group_id = public.guardian_invitations.group_id
        )
    );
-- 초대 수정 권한: 본인이 만든 초대 가능
CREATE POLICY "Users can update their own invitations" ON public.guardian_invitations FOR
UPDATE TO authenticated USING (auth.uid() = inviter_id);
-- 초대 삭제 권한: 본인이 만든 초대 가능
CREATE POLICY "Users can delete their own invitations" ON public.guardian_invitations FOR DELETE TO authenticated USING (auth.uid() = inviter_id);