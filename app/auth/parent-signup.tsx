import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors } from '@/constants/Colors';
import { borderRadius, softShadow, spacing, typography } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';

export default function ParentSignUpScreen() {
    const router = useRouter();
    const params = useLocalSearchParams<{ code: string; name: string; inviterId: string }>();
    const { setUser, setIsAuthenticated } = useAuthStore();

    const [name, setName] = useState(params.name || '');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSignUp = async () => {
        if (!name.trim()) {
            Alert.alert('알림', '이름을 입력해주세요.');
            return;
        }
        if (password.length < 6) {
            Alert.alert('알림', '비밀번호는 6자 이상이어야 합니다.');
            return;
        }

        setIsLoading(true);

        try {
            // 부모님 전용 간편 이메일 생성 (이제 본인의 초대 코드가 곧 로그인 ID가 됨)
            const cleanCode = params.code.trim().toUpperCase();
            const email = `parent_${cleanCode}@onanbu.local`;
            console.log('[Parent Signup] Step 1: 회원가입 시작', { email, code: cleanCode });

            // 1. Supabase 회원가입
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        name: name.trim(),
                        role: 'parent',
                        auto_confirm: 'true',
                    },
                },
            });

            if (error) {
                console.error('[Parent Signup] signUp 에러:', error.message);
                Alert.alert('오류', error.message);
                setIsLoading(false);
                return;
            }

            if (!data.user) {
                Alert.alert('오류', '계정 생성에 실패했습니다.');
                setIsLoading(false);
                return;
            }

            console.log('[Parent Signup] Step 2: 회원가입 성공, 세션:', !!data.session);

            // 2. 세션이 없으면 RPC로 이메일 인증 + 로그인
            let session = data.session;
            if (!session) {
                console.log('[Parent Signup] Step 3: 세션 없음 → RPC로 이메일 인증 시도');

                // RPC 함수로 이메일 인증 처리
                const { error: rpcError } = await supabase.rpc('confirm_invited_user', {
                    user_email: email,
                    invite_code: params.code,
                });

                if (rpcError) {
                    console.error('[Parent Signup] RPC 에러:', rpcError.message);
                }

                // 인증 후 로그인 시도
                console.log('[Parent Signup] Step 4: signInWithPassword 시도');
                const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });

                if (signInError) {
                    console.error('[Parent Signup] 로그인 에러:', signInError.message);
                    Alert.alert('오류', `로그인 실패: ${signInError.message}`);
                    setIsLoading(false);
                    return;
                }
                session = signInData.session;
            }

            if (!session) {
                Alert.alert('오류', '로그인에 실패했습니다. 잠시 후 다시 시도해주세요.');
                setIsLoading(false);
                return;
            }

            console.log('[Parent Signup] Step 5: 세션 확보 완료, 프로필 업데이트');

            // 3. 프로필 업데이트 (트리거가 생성한 프로필에 추가 정보)
            const { error: profileError } = await supabase
                .from('profiles')
                .update({
                    name: name.trim(),
                    phone: phone.trim() || null,
                    role: 'parent',
                    onboarding_completed: true,
                })
                .eq('id', data.user.id);

            if (profileError) {
                console.error('[Parent Signup] 프로필 업데이트 에러:', profileError.message);
            }

            // 4. 가족 그룹 생성 및 연결 (RPC 사용)
            console.log('[Parent Signup] Step 6: 가족 연결 RPC 호출');
            const { data: rpcResult, error: rpcError } = await supabase.rpc('complete_parent_signup', {
                p_parent_id: data.user.id,
                p_name: name.trim(),
                p_invite_code: params.code
            });

            if (rpcError) {
                console.error('[Parent Signup] RPC 에러:', rpcError);
                Alert.alert('오류', '가족 연결 중 문제가 발생했습니다. 관리자에게 문의해주세요.');
                return; // 진행 중단
            } else if (rpcResult && !rpcResult.success) {
                console.error('[Parent Signup] 연결 실패:', rpcResult.message);
                Alert.alert('연결 실패', rpcResult.message);
                return; // 진행 중단
            } else {
                console.log('[Parent Signup] 가족 연결 성공:', rpcResult);
            }

            console.log('[Parent Signup] Step 8: 완료 → 부모님 화면으로 이동');
            // 부모님 전용 화면으로 이동
            router.replace('/parent');
        } catch (error: any) {
            console.error('[Parent Signup] 예외:', error);
            Alert.alert('오류', `가입 중 문제 발생: ${error?.message || '알 수 없는 오류'}`);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>
                {/* Header */}
                <Pressable style={styles.backButton} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
                </Pressable>

                <View style={styles.header}>
                    <Text style={styles.emoji}>🌸</Text>
                    <Text style={styles.title}>환영합니다!</Text>
                    <Text style={styles.subtitle}>
                        간단한 정보만 입력하시면 돼요
                    </Text>
                </View>

                {/* Form */}
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
                        <Text style={styles.label}>간편 비밀번호</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="6자리 이상"
                            placeholderTextColor={colors.textLight}
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry
                            keyboardType="number-pad"
                            maxLength={8}
                        />
                        <Text style={styles.passwordHint}>
                            다음 로그인 시 사용할 비밀번호예요
                        </Text>
                    </View>
                </View>

                {/* Submit Button */}
                <Pressable
                    style={({ pressed }) => [
                        styles.submitButton,
                        pressed && styles.submitButtonPressed,
                        isLoading && styles.buttonDisabled,
                    ]}
                    onPress={handleSignUp}
                    disabled={isLoading}
                >
                    {isLoading ? (
                        <ActivityIndicator color={colors.textWhite} />
                    ) : (
                        <Text style={styles.submitButtonText}>시작하기</Text>
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
    backButton: {
        marginBottom: spacing.lg,
    },
    header: {
        alignItems: 'center',
        marginBottom: spacing.xxl,
    },
    emoji: {
        fontSize: 64,
        marginBottom: spacing.md,
    },
    title: {
        ...typography.h1,
        color: colors.textPrimary,
        marginBottom: spacing.xs,
    },
    subtitle: {
        ...typography.body,
        color: colors.textSecondary,
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
    passwordHint: {
        ...typography.caption,
        color: colors.textLight,
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
