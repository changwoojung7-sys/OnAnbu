-- action_logs 테이블에 대한 삭제 (DELETE) 정책 추가
-- 사용자는 자신의 기록(guardian_id가 자신의 id인 경우)을 삭제할 수 있습니다.
CREATE POLICY "Users can delete their own action logs" ON action_logs FOR DELETE USING (
    auth.uid() = guardian_id
    OR auth.uid() = parent_id
);