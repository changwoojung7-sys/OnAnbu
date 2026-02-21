import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors } from '@/constants/Colors';
import { borderRadius, softShadow, spacing, typography } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';

export default function SignUpScreen() {
    const router = useRouter();
    const params = useLocalSearchParams<{ role: string; inviteCode?: string; groupId?: string }>();
    const { setUser, setIsAuthenticated } = useAuthStore();

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const role = params.role || 'guardian';

    const handleSignUp = async () => {
        // 유효성 검사
        if (!name.trim()) {
            Alert.alert('알림', '이름을 입력해주세요.');
            return;
        }
        if (!email.trim()) {
            Alert.alert('알림', '이메일을 입력해주세요.');
            return;
        }
        if (password.length < 6) {
            Alert.alert('알림', '비밀번호는 6자 이상이어야 합니다.');
            return;
        }
        if (password !== confirmPassword) {
            Alert.alert('알림', '비밀번호가 일치하지 않습니다.');
            return;
        }

        setIsLoading(true);

        try {
            const inviteCode = params.inviteCode;
            const isInvited = !!inviteCode;

            // Supabase 회원가입
            const { data, error } = await supabase.auth.signUp({
                email: email.trim(),
                password,
                options: {
                    data: {
                        name: name.trim(),
                        role: role,
                        ...(isInvited ? { auto_confirm: 'true' } : {}),
                    },
                },
            });

            if (error) {
                Alert.alert('오류', error.message);
                return;
            }

            if (data.user) {
                console.log('Signup successful, user:', data.user.id);

                if (isInvited) {
                    // 초대받은 유저: 이메일 인증 불필요 → 즉시 로그인
                    // auto_confirm 트리거로 인해 즉시 인증됨
                    let session = data.session;

                    // 세션이 없으면 로그인 시도 (트리거 타이밍 대비)
                    if (!session) {
                        const { data: signInData } = await supabase.auth.signInWithPassword({
                            email: email.trim(),
                            password,
                        });
                        session = signInData.session;
                    }

                    if (session) {
                        // 프로필 가져오기 (트리거로 생성될 때까지 대기)
                        let profile = null;
                        for (let i = 0; i < 3; i++) {
                            const { data: p } = await supabase.from('profiles').select('*').eq('id', data.user.id).single();
                            if (p) { profile = p; break; }
                            await new Promise(resolve => setTimeout(resolve, 500));
                        }

                        if (profile) {
                            setUser(profile);
                            setIsAuthenticated(true);

                            // 초대 수락 처리 (보조 Guardian)
                            if (inviteCode && params.groupId) {
                                console.log('[Guardian Signup] Step: RPC로 가족 연결 시도');
                                const { data: rpcResult, error: rpcError } = await supabase.rpc('accept_guardian_invitation', {
                                    p_invite_code: inviteCode
                                });

                                if (rpcError || (rpcResult && !rpcResult.success)) {
                                    console.error('[Guardian Signup] 가족 연결 오류:', rpcError || rpcResult);
                                    Alert.alert('알림', '계정은 생성되었으나 가족 연결에 실패했습니다. 관리자에게 문의해주세요.');
                                } else {
                                    console.log('[Guardian Signup] 가족 연결 성공');
                                }
                            }

                            router.replace('/(tabs)');
                        } else {
                            Alert.alert('오류', '프로필 생성에 실패했습니다.');
                        }
                    } else {
                        Alert.alert('오류', '로그인에 실패했습니다. 다시 시도해주세요.');
                    }
                } else {
                    // Guardian 가입: OTP 인증 필요 → 인증 화면으로 이동
                    router.replace({
                        pathname: '/auth/signup-success',
                        params: { email: email.trim() },
                    });
                }
            }
        } catch (error) {
            Alert.alert('오류', '회원가입 중 문제가 발생했습니다.');
            console.error(error);
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
                    <Text style={styles.title}>회원가입</Text>
                    <Text style={styles.subtitle}>
                        {role === 'guardian'
                            ? '부모님을 케어할 계정을 만들어요'
                            : '계정을 만들어주세요'}
                    </Text>
                </View>

                {/* Form */}
                <View style={styles.form}>
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>이름</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="홍길동"
                            placeholderTextColor={colors.textLight}
                            value={name}
                            onChangeText={setName}
                            autoCapitalize="none"
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>이메일</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="email@example.com"
                            placeholderTextColor={colors.textLight}
                            value={email}
                            onChangeText={setEmail}
                            keyboardType="email-address"
                            autoCapitalize="none"
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>비밀번호</Text>
                        <View style={styles.passwordContainer}>
                            <TextInput
                                style={styles.passwordInput}
                                placeholder="6자 이상"
                                placeholderTextColor={colors.textLight}
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry={!showPassword}
                            />
                            <Pressable onPress={() => setShowPassword(!showPassword)}>
                                <Ionicons
                                    name={showPassword ? 'eye-off' : 'eye'}
                                    size={20}
                                    color={colors.textSecondary}
                                />
                            </Pressable>
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>비밀번호 확인</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="비밀번호를 다시 입력"
                            placeholderTextColor={colors.textLight}
                            value={confirmPassword}
                            onChangeText={setConfirmPassword}
                            secureTextEntry={!showPassword}
                        />
                    </View>
                </View>

                {/* Submit Button */}
                <Pressable
                    style={({ pressed }) => [
                        styles.submitButton,
                        pressed && styles.submitButtonPressed,
                        isLoading && styles.submitButtonDisabled,
                    ]}
                    onPress={handleSignUp}
                    disabled={isLoading}
                >
                    {isLoading ? (
                        <ActivityIndicator color={colors.textWhite} />
                    ) : (
                        <Text style={styles.submitButtonText}>가입하기</Text>
                    )}
                </Pressable>

                {/* Login Link */}
                <View style={styles.footer}>
                    <Text style={styles.footerText}>이미 계정이 있으신가요?</Text>
                    <Pressable onPress={() => router.push('/auth/login')}>
                        <Text style={styles.loginLink}>로그인</Text>
                    </Pressable>
                </View>
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
        marginBottom: spacing.xl,
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
    passwordContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.cardBg,
        borderRadius: borderRadius.lg,
        paddingRight: spacing.md,
        ...softShadow,
    },
    passwordInput: {
        flex: 1,
        padding: spacing.md,
        ...typography.body,
        color: colors.textPrimary,
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
    submitButtonDisabled: {
        opacity: 0.7,
    },
    submitButtonText: {
        ...typography.body,
        color: colors.textWhite,
        fontWeight: '600',
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: spacing.lg,
        gap: spacing.xs,
    },
    footerText: {
        ...typography.body,
        color: colors.textSecondary,
    },
    loginLink: {
        ...typography.body,
        color: colors.primary,
        fontWeight: '600',
    },
});
