import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors } from '@/constants/Colors';
import { borderRadius, softShadow, spacing, typography } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';

export default function ParentSetupScreen() {
    const router = useRouter();
    const { user, pendingInviteCode, setPendingInviteCode, setUser } = useAuthStore();

    const [name, setName] = useState(user?.name || '');
    const [phone, setPhone] = useState('');
    const [inviteCode, setInviteCode] = useState(pendingInviteCode || '');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        // 유저 정보가 없으면 로그인 화면으로
        if (!user) {
            router.replace('/auth/login');
        }
        // 프로필 이름 로드 (이미 user.name에 있을 수 있음)
        if (user && !name) {
            if (user.name) {
                setName(user.name);
            } else {
                // profiles 테이블에서 이름 가져오기 시도
                supabase.from('profiles').select('name').eq('id', user.id).single()
                    .then(({ data }: { data: any }) => {
                        if (data?.name) setName(data.name);
                    });
            }
        }
    }, [user]);

    const handleComplete = async () => {
        if (!name.trim()) {
            Alert.alert('알림', '이름을 입력해주세요.');
            return;
        }
        if (!inviteCode.trim()) {
            Alert.alert('알림', '초대 코드가 필요합니다.');
            return;
        }

        setIsLoading(true);

        try {
            // 1. 프로필 업데이트
            const { error: profileError } = await supabase
                .from('profiles')
                .update({
                    name: name.trim(),
                    phone: phone.trim() || null,
                    role: 'parent',
                    onboarding_completed: true,
                })
                .eq('id', user!.id);

            if (profileError) {
                console.error('Profile update error:', profileError);
                // 프로필 업데이트 실패해도 일단 진행? (가장 중요한건 그룹 생성)
            }

            // 2. 가족 연결 (Legacy logic from parent-signup)
            const { data: rpcResult, error: rpcError } = await supabase.rpc('complete_parent_signup', {
                p_parent_id: user!.id,
                p_name: name.trim(),
                p_invite_code: inviteCode.trim()
            });

            if (rpcError) {
                console.error('RPC Error:', rpcError);
                Alert.alert('오류', '가족 연결 중 문제가 발생했습니다.');
                return;
            }

            if (rpcResult && !rpcResult.success) {
                Alert.alert('연결 실패', rpcResult.message);
                return;
            }

            // 성공!
            setPendingInviteCode(null); // 코드 사용 완료
            Alert.alert('환영합니다', '가족 연결이 완료되었습니다!', [
                { text: '시작하기', onPress: () => router.replace('/parent') }
            ]);

        } catch (error: any) {
            Alert.alert('오류', error.message || '알 수 없는 오류가 발생했습니다.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>
                <View style={styles.header}>
                    <Text style={styles.emoji}>📝</Text>
                    <Text style={styles.title}>정보 입력</Text>
                    <Text style={styles.subtitle}>
                        서비스 이용을 위해 추가 정보를 입력해주세요
                    </Text>
                </View>

                <View style={styles.form}>
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>이름</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="이름"
                            placeholderTextColor={colors.textLight}
                            value={name}
                            onChangeText={setName}
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>전화번호 (선택)</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="010-1234-5678"
                            placeholderTextColor={colors.textLight}
                            value={phone}
                            onChangeText={setPhone}
                            keyboardType="phone-pad"
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>초대 코드</Text>
                        <TextInput
                            style={[styles.input, !pendingInviteCode && styles.inputEditable]}
                            placeholder="초대 코드"
                            value={inviteCode}
                            onChangeText={setInviteCode}
                            editable={!pendingInviteCode} // 코드가 있으면 수정 불가 (안전장치)
                        />
                        {pendingInviteCode && (
                            <Text style={styles.hint}>인증된 초대 코드가 자동으로 입력되었습니다.</Text>
                        )}
                    </View>
                </View>

                <Pressable
                    style={({ pressed }) => [
                        styles.submitButton,
                        pressed && styles.submitButtonPressed,
                        isLoading && styles.buttonDisabled,
                    ]}
                    onPress={handleComplete}
                    disabled={isLoading}
                >
                    {isLoading ? (
                        <ActivityIndicator color={colors.textWhite} />
                    ) : (
                        <Text style={styles.submitButtonText}>완료하기</Text>
                    )}
                </Pressable>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    content: {
        flex: 1,
        padding: spacing.lg,
    },
    header: {
        alignItems: 'center',
        marginBottom: spacing.xxl,
        marginTop: spacing.xl,
    },
    emoji: {
        fontSize: 48,
        marginBottom: spacing.md,
    },
    title: {
        ...typography.h2,
        color: colors.textPrimary,
        marginBottom: spacing.xs,
    },
    subtitle: {
        ...typography.body,
        color: colors.textSecondary,
        textAlign: 'center',
    },
    form: {
        gap: spacing.md,
    },
    inputGroup: {
        gap: spacing.xs,
    },
    label: {
        ...typography.small,
        color: colors.textSecondary,
        fontWeight: '500',
    },
    input: {
        backgroundColor: colors.cardBg,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        ...typography.body,
        color: colors.textPrimary,
        ...softShadow,
    },
    inputEditable: {
        backgroundColor: '#FFFFFF',
    },
    hint: {
        ...typography.caption,
        color: colors.primary,
        marginTop: 4,
    },
    submitButton: {
        backgroundColor: colors.primary,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        alignItems: 'center',
        marginTop: spacing.xl,
        ...softShadow,
    },
    submitButtonPressed: {
        backgroundColor: colors.primaryDark,
    },
    buttonDisabled: {
        opacity: 0.7,
    },
    submitButtonText: {
        ...typography.body,
        color: colors.textWhite,
        fontWeight: '600',
    },
});
