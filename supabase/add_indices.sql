-- RLS 성능 최적화를 위한 인덱스 추가
-- family_members, family_groups 등 조인이 빈번하게 일어나는 컬럼에 인덱스 생성

-- 1. family_members 인덱스
CREATE INDEX IF NOT EXISTS idx_family_members_guardian_id ON public.family_members(guardian_id);
CREATE INDEX IF NOT EXISTS idx_family_members_group_id ON public.family_members(group_id);

-- 2. family_groups 인덱스
CREATE INDEX IF NOT EXISTS idx_family_groups_parent_id ON public.family_groups(parent_id);

-- 3. profiles 인덱스 (RLS에서 id 조회가 많음 - PK라 자동 생성되지만 확실히)
-- CREATE INDEX IF NOT EXISTS idx_profiles_id ON public.profiles(id); -- PK는 이미 인덱스 있음

-- 4. parent_invitations 인덱스 (초대 코드 조회용)
CREATE INDEX IF NOT EXISTS idx_parent_invitations_invite_code ON public.parent_invitations(invite_code);
CREATE INDEX IF NOT EXISTS idx_parent_invitations_inviter_id ON public.parent_invitations(inviter_id);

-- 5. action_logs 인덱스 (조회 속도용)
CREATE INDEX IF NOT EXISTS idx_action_logs_parent_id ON public.action_logs(parent_id);
CREATE INDEX IF NOT EXISTS idx_action_logs_created_at ON public.action_logs(created_at DESC);

SELECT 'All indices created successfully ✅' as status;
