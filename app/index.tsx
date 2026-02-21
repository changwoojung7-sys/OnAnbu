import { colors } from '@/constants/Colors';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { useRootNavigationState, useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

// 이 페이지는 _layout.tsx의 리다이렉트 로직이 작동할 때까지 잠시 보여주는 로딩 화면입니다.
// 실제로는 사용자가 거의 볼 일이 없어야 합니다.
export default function Index() {
    const router = useRouter();
    const { user, isAuthenticated } = useAuthStore();
    // 네비게이션 상태 확인
    const rootNavigationState = useRootNavigationState();

    useEffect(() => {
        // 네비게이션이 준비될 때까지 기다림
        if (!rootNavigationState?.key) return;

        const checkRouting = async () => {
            console.log('[Index] Checking auth state...', { isAuthenticated, role: user?.role });

            if (!isAuthenticated) {
                console.log('[Index] Redirecting to login');
                router.replace('/auth/login');
                return;
            }

            if (user) {
                console.log('[Index] User found, redirecting based on role:', user.role);
                if (user.role === 'admin') {
                    router.replace('/admin/users');
                } else if (user.role === 'parent') {
                    // 부모인 경우 추가 확인
                    // 1. 패밀리 그룹 확인
                    const { data: familyGroup } = await supabase
                        .from('family_groups')
                        .select('id')
                        .eq('parent_id', user.id)
                        .maybeSingle();

                    if (familyGroup) {
                        console.log('[Index] Family group found, going to main');
                        router.replace('/parent');
                        return;
                    }

                    // 2. 이미 수락한 초대 코드인지 확인
                    const { data: invitation } = await supabase
                        .from('parent_invitations')
                        .select('*')
                        .eq('accepted_by', user.id)
                        .eq('status', 'accepted')
                        .maybeSingle();

                    if (invitation) {
                        console.log('[Index] User accepted invitation, going to main');
                        router.replace('/parent');
                        return;
                    }

                    // 3. 아무것도 해당 안 되면 정보 입력 화면으로
                    console.log('[Index] No group/invitation, going to setup');
                    router.replace('/auth/parent-setup');
                } else {
                    router.replace('/(tabs)');
                }
            }
        };

        checkRouting();
    }, [user, isAuthenticated, rootNavigationState?.key]);

    return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={{ marginTop: 20, color: colors.textSecondary }}>잠시만 기다려주세요...</Text>
        </View>
    );
}
