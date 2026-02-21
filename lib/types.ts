// ONANBU Database Types v2
// 주케어대상/보조케어대상/부모님 역할 기반 스키마

export type Database = {
    public: {
        Tables: {
            profiles: {
                Row: {
                    id: string;
                    email: string | null;
                    name: string;
                    phone: string | null;
                    avatar_url: string | null;
                    role: 'guardian' | 'parent' | 'admin';
                    // 보호자 전용
                    push_token: string | null;
                    notification_enabled: boolean;
                    notification_time: string | null;
                    // 부모님 전용
                    birth_date: string | null;
                    health_notes: string | null;
                    // 온보딩
                    onboarding_completed: boolean;
                    // 메타데이터
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id: string;
                    email?: string | null;
                    name: string;
                    phone?: string | null;
                    avatar_url?: string | null;
                    role?: 'guardian' | 'parent' | 'admin';
                    push_token?: string | null;
                    notification_enabled?: boolean;
                    notification_time?: string | null;
                    birth_date?: string | null;
                    health_notes?: string | null;
                    onboarding_completed?: boolean;
                };
                Update: Partial<Database['public']['Tables']['profiles']['Insert']>;
            };
            parent_invitations: {
                Row: {
                    id: string;
                    inviter_id: string;
                    invite_code: string;
                    parent_name: string;
                    parent_phone: string | null;
                    relationship_label: string;
                    status: 'pending' | 'accepted' | 'expired' | 'cancelled';
                    accepted_by: string | null;
                    expires_at: string;
                    accepted_at: string | null;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    inviter_id: string;
                    invite_code: string;
                    parent_name: string;
                    parent_phone?: string | null;
                    relationship_label: string;
                    status?: 'pending' | 'accepted' | 'expired' | 'cancelled';
                    accepted_by?: string | null;
                    expires_at?: string;
                    accepted_at?: string | null;
                };
                Update: Partial<Database['public']['Tables']['parent_invitations']['Insert']>;
            };
            family_groups: {
                Row: {
                    id: string;
                    parent_id: string;
                    group_name: string | null;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    parent_id: string;
                    group_name?: string | null;
                };
                Update: Partial<Database['public']['Tables']['family_groups']['Insert']>;
            };
            family_members: {
                Row: {
                    id: string;
                    group_id: string;
                    guardian_id: string;
                    role: 'primary' | 'secondary';
                    relationship_label: string;
                    nickname: string | null;
                    invitation_status: 'pending' | 'accepted' | 'declined';
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    group_id: string;
                    guardian_id: string;
                    role?: 'primary' | 'secondary';
                    relationship_label: string;
                    nickname?: string | null;
                    invitation_status?: 'pending' | 'accepted' | 'declined';
                };
                Update: Partial<Database['public']['Tables']['family_members']['Insert']>;
            };
            guardian_invitations: {
                Row: {
                    id: string;
                    inviter_id: string;
                    group_id: string;
                    invite_code: string;
                    invitee_email: string | null;
                    invitee_phone: string | null;
                    relationship_label: string;
                    status: 'pending' | 'accepted' | 'expired' | 'cancelled';
                    accepted_by: string | null;
                    expires_at: string;
                    accepted_at: string | null;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    inviter_id: string;
                    group_id: string;
                    invite_code: string;
                    invitee_email?: string | null;
                    invitee_phone?: string | null;
                    relationship_label: string;
                    status?: 'pending' | 'accepted' | 'expired' | 'cancelled';
                };
                Update: Partial<Database['public']['Tables']['guardian_invitations']['Insert']>;
            };
            action_logs: {
                Row: {
                    id: string;
                    group_id: string;
                    guardian_id: string;
                    parent_id: string;
                    type: 'voice_cheer' | 'check_in' | 'message' | 'photo' | 'video';
                    status: 'pending' | 'played' | 'viewed';
                    ad_watched: boolean;
                    ad_revenue: number | null;
                    content_url: string | null;
                    message: string | null;
                    created_at: string;
                    played_at: string | null;
                };
                Insert: {
                    id?: string;
                    group_id: string;
                    guardian_id: string;
                    parent_id: string;
                    type: 'voice_cheer' | 'check_in' | 'message' | 'photo' | 'video';
                    status?: 'pending' | 'played' | 'viewed';
                    ad_watched?: boolean;
                    ad_revenue?: number | null;
                    content_url?: string | null;
                    message?: string | null;
                    played_at?: string | null;
                };
                Update: Partial<Database['public']['Tables']['action_logs']['Insert']>;
            };
            daily_status: {
                Row: {
                    id: string;
                    parent_id: string;
                    status_date: string;
                    mood: 'great' | 'good' | 'okay' | 'not_good' | null;
                    note: string | null;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    parent_id: string;
                    status_date?: string;
                    mood?: 'great' | 'good' | 'okay' | 'not_good' | null;
                    note?: string | null;
                };
                Update: Partial<Database['public']['Tables']['daily_status']['Insert']>;
            };
        };
    };
};

// 편의 타입 별칭
export type Profile = Database['public']['Tables']['profiles']['Row'];
export type ParentInvitation = Database['public']['Tables']['parent_invitations']['Row'];
export type FamilyGroup = Database['public']['Tables']['family_groups']['Row'];
export type FamilyMember = Database['public']['Tables']['family_members']['Row'];
export type GuardianInvitation = Database['public']['Tables']['guardian_invitations']['Row'];
export type ActionLog = Database['public']['Tables']['action_logs']['Row'];
export type DailyStatus = Database['public']['Tables']['daily_status']['Row'];

// Enum 타입
export type UserRole = 'guardian' | 'parent' | 'admin';
export type MemberRole = 'primary' | 'secondary';
export type ActionType = 'voice_cheer' | 'check_in' | 'message' | 'photo' | 'video';
export type ActionStatus = 'pending' | 'played' | 'viewed';
export type InvitationStatus = 'pending' | 'accepted' | 'expired' | 'cancelled';
export type MoodType = 'great' | 'good' | 'okay' | 'not_good';

// UI 확장 타입
export interface ParentInfo {
    id: string;
    name: string;
    avatar_url: string | null;
    phone: string | null;
    relationshipLabel: string;
    groupId: string;
}

export interface GuardianInfo {
    id: string;
    name: string;
    avatar_url: string | null;
    role: MemberRole;
    relationshipLabel: string;
    nickname: string | null;
}

export interface FamilyGroupWithMembers extends FamilyGroup {
    parent: Profile;
    members: (FamilyMember & { guardian: Profile })[];
}

export interface TodayStatus {
    hasSentMessage: boolean;
    lastActionTime: string | null;
    actionsToday: number;
    maxActionsPerDay: number;
}

// 온보딩 플로우
export interface OnboardingState {
    step: 'welcome' | 'role_select' | 'parent_invite' | 'guardian_invite_code' | 'complete';
    selectedRole: UserRole | null;
}

// 회원가입
export interface SignUpData {
    email: string;
    password: string;
    name: string;
    role: UserRole;
}
