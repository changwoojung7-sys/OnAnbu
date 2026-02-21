-- ONANBU Database Schema v2
-- Migration: 001_initial_schema
-- Created: 2026-02-08
-- Description: 주케어대상/보조케어대상/부모님 역할 기반 스키마

-- =====================================================
-- 1. profiles 테이블
-- 모든 사용자 정보 저장
-- =====================================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- 기본 정보
  email TEXT UNIQUE,
  name TEXT NOT NULL,
  phone TEXT,
  avatar_url TEXT,
  
  -- 역할 구분 (guardian: 보호자, parent: 부모님)
  -- 보호자가 먼저 가입하고, 부모님을 초대하는 구조
  role TEXT NOT NULL DEFAULT 'guardian' 
    CHECK (role IN ('guardian', 'parent')),
  
  -- 보호자 전용 필드
  push_token TEXT,
  notification_enabled BOOLEAN DEFAULT TRUE,
  notification_time TIME DEFAULT '09:00',
  
  -- 부모님 전용 필드
  birth_date DATE,
  health_notes TEXT,
  
  -- 온보딩 완료 여부
  onboarding_completed BOOLEAN DEFAULT FALSE,
  
  -- 메타데이터
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 2. parent_invitations 테이블 (신규)
-- 부모님 초대 관리
-- =====================================================
CREATE TABLE IF NOT EXISTS parent_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 초대 발송자 (보호자)
  inviter_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- 초대 코드 (6자리 숫자 or 링크용 토큰)
  invite_code TEXT UNIQUE NOT NULL,
  
  -- 초대받는 부모님 정보 (가입 전)
  parent_name TEXT NOT NULL,
  parent_phone TEXT,
  relationship_label TEXT NOT NULL,  -- '어머니', '아버지' 등
  
  -- 초대 상태
  status TEXT DEFAULT 'pending' 
    CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
  
  -- 수락 후 연결된 부모님 ID
  accepted_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  
  -- 유효기간 (7일)
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  accepted_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 3. family_groups 테이블 (신규)
-- 가족 그룹 (한 부모님을 케어하는 그룹)
-- =====================================================
CREATE TABLE IF NOT EXISTS family_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 케어 대상 부모님
  parent_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- 그룹 정보
  group_name TEXT,  -- 예: "어머니 케어 그룹"
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- 한 부모님당 하나의 그룹만
  UNIQUE(parent_id)
);

-- =====================================================
-- 4. family_members 테이블 (신규)
-- 가족 그룹 구성원 (주케어대상 + 보조케어대상)
-- =====================================================
CREATE TABLE IF NOT EXISTS family_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 소속 그룹
  group_id UUID NOT NULL REFERENCES family_groups(id) ON DELETE CASCADE,
  
  -- 구성원 (보호자)
  guardian_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- 역할 구분
  role TEXT NOT NULL DEFAULT 'secondary' 
    CHECK (role IN ('primary', 'secondary')),
    -- primary: 주케어대상 (그룹 생성자, 관리 권한)
    -- secondary: 보조케어대상 (초대받은 가족)
  
  -- 관계 레이블 (부모님 입장에서)
  relationship_label TEXT NOT NULL,  -- '아들', '딸', '며느리', '사위' 등
  
  -- 별칭
  nickname TEXT,
  
  -- 초대 수락 여부
  invitation_status TEXT DEFAULT 'accepted'
    CHECK (invitation_status IN ('pending', 'accepted', 'declined')),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- 중복 방지
  UNIQUE(group_id, guardian_id)
);

-- =====================================================
-- 5. guardian_invitations 테이블 (신규)
-- 보조케어대상 초대 관리
-- =====================================================
CREATE TABLE IF NOT EXISTS guardian_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 초대 발송자 (주케어대상)
  inviter_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- 초대 대상 그룹
  group_id UUID NOT NULL REFERENCES family_groups(id) ON DELETE CASCADE,
  
  -- 초대 코드
  invite_code TEXT UNIQUE NOT NULL,
  
  -- 초대받는 보호자 정보
  invitee_email TEXT,
  invitee_phone TEXT,
  relationship_label TEXT NOT NULL,  -- 부모님 입장에서의 관계
  
  -- 상태
  status TEXT DEFAULT 'pending' 
    CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
  
  accepted_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  accepted_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 6. action_logs 테이블
-- 케어 액션 기록
-- =====================================================
CREATE TABLE IF NOT EXISTS action_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 그룹 기반 (어떤 가족 그룹의 액션인지)
  group_id UUID NOT NULL REFERENCES family_groups(id) ON DELETE CASCADE,
  
  -- 발신자 (보호자)
  guardian_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- 수신자 (부모님)
  parent_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- 액션 정보
  type TEXT NOT NULL CHECK (type IN ('voice_cheer', 'check_in', 'message')),
  status TEXT DEFAULT 'pending' 
    CHECK (status IN ('pending', 'played', 'viewed')),
  
  -- 광고 관련
  ad_watched BOOLEAN DEFAULT FALSE,
  ad_revenue DECIMAL(10, 4),
  
  -- 콘텐츠
  content_url TEXT,
  message TEXT,
  
  -- 메타데이터
  created_at TIMESTAMPTZ DEFAULT NOW(),
  played_at TIMESTAMPTZ
);

-- =====================================================
-- 7. daily_status 테이블
-- 부모님의 일일 상태
-- =====================================================
CREATE TABLE IF NOT EXISTS daily_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  status_date DATE NOT NULL DEFAULT CURRENT_DATE,
  mood TEXT CHECK (mood IN ('great', 'good', 'okay', 'not_good')),
  note TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(parent_id, status_date)
);

-- =====================================================
-- 8. RLS 정책
-- =====================================================

-- profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- 같은 가족 그룹 멤버끼리 프로필 조회 가능
CREATE POLICY "Family members can view each other" ON profiles
  FOR SELECT USING (
    id IN (
      -- 내가 보호자인 그룹의 부모님
      SELECT fg.parent_id FROM family_groups fg
      JOIN family_members fm ON fm.group_id = fg.id
      WHERE fm.guardian_id = auth.uid()
      UNION
      -- 내가 부모님인 그룹의 보호자들
      SELECT fm.guardian_id FROM family_groups fg
      JOIN family_members fm ON fm.group_id = fg.id
      WHERE fg.parent_id = auth.uid()
    )
  );

-- parent_invitations
ALTER TABLE parent_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Inviter can manage invitations" ON parent_invitations
  FOR ALL USING (auth.uid() = inviter_id);

CREATE POLICY "Anyone can accept by code" ON parent_invitations
  FOR UPDATE USING (status = 'pending');

-- family_groups
ALTER TABLE family_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Parent can view own group" ON family_groups
  FOR SELECT USING (auth.uid() = parent_id);

CREATE POLICY "Members can view group" ON family_groups
  FOR SELECT USING (
    id IN (SELECT group_id FROM family_members WHERE guardian_id = auth.uid())
  );

CREATE POLICY "Primary guardian can manage group" ON family_groups
  FOR ALL USING (
    id IN (
      SELECT group_id FROM family_members 
      WHERE guardian_id = auth.uid() AND role = 'primary'
    )
  );

-- family_members
ALTER TABLE family_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view group members" ON family_members
  FOR SELECT USING (
    group_id IN (
      SELECT group_id FROM family_members WHERE guardian_id = auth.uid()
      UNION
      SELECT id FROM family_groups WHERE parent_id = auth.uid()
    )
  );

CREATE POLICY "Primary can manage members" ON family_members
  FOR ALL USING (
    group_id IN (
      SELECT group_id FROM family_members 
      WHERE guardian_id = auth.uid() AND role = 'primary'
    )
  );

-- action_logs
ALTER TABLE action_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Guardian can view and create actions" ON action_logs
  FOR ALL USING (auth.uid() = guardian_id);

CREATE POLICY "Parent can view and update received actions" ON action_logs
  FOR SELECT USING (auth.uid() = parent_id);

CREATE POLICY "Parent can update action status" ON action_logs
  FOR UPDATE USING (auth.uid() = parent_id);

-- daily_status
ALTER TABLE daily_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Parent can manage own status" ON daily_status
  FOR ALL USING (auth.uid() = parent_id);

CREATE POLICY "Guardians can view parent status" ON daily_status
  FOR SELECT USING (
    parent_id IN (
      SELECT fg.parent_id FROM family_groups fg
      JOIN family_members fm ON fm.group_id = fg.id
      WHERE fm.guardian_id = auth.uid()
    )
  );

-- =====================================================
-- 9. 인덱스
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

CREATE INDEX IF NOT EXISTS idx_parent_invitations_code ON parent_invitations(invite_code);
CREATE INDEX IF NOT EXISTS idx_parent_invitations_status ON parent_invitations(status);

CREATE INDEX IF NOT EXISTS idx_family_groups_parent ON family_groups(parent_id);

CREATE INDEX IF NOT EXISTS idx_family_members_group ON family_members(group_id);
CREATE INDEX IF NOT EXISTS idx_family_members_guardian ON family_members(guardian_id);
CREATE INDEX IF NOT EXISTS idx_family_members_role ON family_members(role);

CREATE INDEX IF NOT EXISTS idx_action_logs_group ON action_logs(group_id);
CREATE INDEX IF NOT EXISTS idx_action_logs_guardian ON action_logs(guardian_id);
CREATE INDEX IF NOT EXISTS idx_action_logs_parent ON action_logs(parent_id);
CREATE INDEX IF NOT EXISTS idx_action_logs_created ON action_logs(created_at DESC);

-- =====================================================
-- 10. 트리거 함수
-- =====================================================

-- updated_at 자동 갱신
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 회원가입 시 자동 profiles 생성
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, role)
  VALUES (
    NEW.id, 
    NEW.email, 
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'guardian')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 초대 코드 생성 함수
CREATE OR REPLACE FUNCTION generate_invite_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..6 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;
