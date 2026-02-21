-- 가족 그룹 내 모든 멤버가 활동 기록을 공유할 수 있도록 RLS 정책 수정
-- action_logs 및 daily_status 테이블 대상
-- 1. 기존 정책 삭제
DROP POLICY IF EXISTS "Guardian can view and create actions" ON action_logs;
DROP POLICY IF EXISTS "Parent can view and update received actions" ON action_logs;
DROP POLICY IF EXISTS "Parent can update action status" ON action_logs;
DROP POLICY IF EXISTS "Guardians can view parent status" ON daily_status;
-- 2. action_logs 조회 권한: 같은 그룹 멤버라면 누구나 조회 가능
-- get_my_family_group_ids() 함수가 이미 정의되어 있다고 가정 (fix_rls.sql 실행 필요)
CREATE POLICY "Group members can view action logs" ON public.action_logs FOR
SELECT TO authenticated USING (
        group_id IN (
            SELECT get_my_family_group_ids()
        )
    );
-- 3. action_logs 생성 권한: 본인이 발신자인 경우만 가능
CREATE POLICY "Users can create action logs" ON public.action_logs FOR
INSERT TO authenticated WITH CHECK (
        auth.uid() = guardian_id
        OR auth.uid() = parent_id
    );
-- 4. action_logs 수정 권한: 본인이 발신자이거나 수신자(parent)인 경우 상태 변경 가능
CREATE POLICY "Users can update action logs" ON public.action_logs FOR
UPDATE TO authenticated USING (
        auth.uid() = guardian_id
        OR auth.uid() = parent_id
    );
-- 5. action_logs 삭제 권한: 본인이 발송한 기록만 삭제 가능
CREATE POLICY "Users can delete own action logs" ON public.action_logs FOR DELETE TO authenticated USING (
    auth.uid() = guardian_id
    OR auth.uid() = parent_id
);
-- 6. daily_status 조회 권한: 같은 그룹 보호자들 및 부모님 본인
CREATE POLICY "Group members can view daily status" ON public.daily_status FOR
SELECT TO authenticated USING (
        parent_id = auth.uid()
        OR parent_id IN (
            SELECT parent_id
            FROM public.family_groups
            WHERE id IN (
                    SELECT get_my_family_group_ids()
                )
        )
    );
SELECT 'Action Logs RLS Shared ✅' AS Result;