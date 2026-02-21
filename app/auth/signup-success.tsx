import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors } from '@/constants/Colors';
import { borderRadius, softShadow, spacing, typography } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';

export default function VerifyEmailScreen() {
    const router = useRouter();
    const params = useLocalSearchParams<{ email: string }>();
    const { setUser, setIsAuthenticated } = useAuthStore();

    const [otp, setOtp] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isResending, setIsResending] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    const email = params.email || '';

    // OTP 인증 처리
    const handleVerifyOtp = async () => {
        setErrorMessage('');
        const code = otp.trim();

        if (code.length < 6) {
            setErrorMessage('인증 코드를 입력해주세요.');
            return;
        }

        setIsLoading(true);

        try {
            console.log('[OTP] Step 1: verifyOtp 호출...', { email, code });

            const { data, error } = await supabase.auth.verifyOtp({
                email,
                token: code,
                type: 'signup',
            });

            console.log('[OTP] Step 2: verifyOtp 결과', {
                hasSession: !!data?.session,
                hasUser: !!data?.user,
                error: error?.message,
            });

            if (error) {
                const msg = error.message?.toLowerCase() || '';
                if (msg.includes('expired') || msg.includes('invalid')) {
                    setErrorMessage('인증 코드가 만료되었거나 올바르지 않습니다. "다시 보내기"를 눌러주세요.');
                } else {
                    setErrorMessage(`인증 오류: ${error.message}`);
                }
                setIsLoading(false);
                return;
            }

            // verifyOtp 성공 — 세션 확보
            let userId = data?.user?.id;

            if (!data?.session) {
                // verifyOtp가 세션을 반환하지 않은 경우 → 비밀번호 로그인 시도
                console.log('[OTP] Step 3: 세션 없음 → signInWithPassword 시도...');

                // 사용자에게 비밀번호를 다시 요청할 수는 없으므로
                // 이메일 인증은 성공했지만 세션이 없는 경우
                // → 로그인 화면으로 안내
                setErrorMessage('');
                setIsLoading(false);
                Alert.alert(
                    '✅ 인증 완료!',
                    '이메일 인증이 완료되었습니다. 로그인 화면에서 다시 로그인해주세요.',
                    [{ text: '로그인하기', onPress: () => router.replace('/auth/login') }]
                );
                return;
            }

            // 세션 있음 → 프로필 가져오기
            userId = data.user!.id;
            console.log('[OTP] Step 4: 세션 확보 완료, 프로필 조회 중...', userId);

            let profile = null;
            for (let i = 0; i < 3; i++) {
                const { data: p, error: pErr } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', userId)
                    .single();

                console.log(`[OTP] 프로필 조회 시도 ${i + 1}:`, { found: !!p, error: pErr?.message });

                if (p) { profile = p; break; }
                await new Promise(resolve => setTimeout(resolve, 800));
            }

            if (profile) {
                console.log('[OTP] Step 5: 프로필 확보 → 홈 이동', profile.role);
                setUser(profile);
                setIsAuthenticated(true);
                setIsLoading(false);

                // 역할 기반 라우팅
                if (profile.role === 'admin') router.replace('/admin/users');
                else if (profile.role === 'parent') router.replace('/parent');
                else router.replace('/(tabs)');
            } else {
                // 프로필이 아직 없어도 인증은 성공 → 로그인 안내
                console.log('[OTP] 프로필 없음 → 로그인 화면으로 안내');
                setIsLoading(false);
                Alert.alert(
                    '✅ 인증 완료!',
                    '인증이 완료되었습니다. 로그인 화면에서 다시 로그인해주세요.',
                    [{ text: '로그인하기', onPress: () => router.replace('/auth/login') }]
                );
            }
        } catch (err: any) {
            console.error('[OTP] 예외 발생:', err);
            setErrorMessage(`오류: ${err?.message || '알 수 없는 오류'}`);
            setIsLoading(false);
        }
    };

    // 인증 코드 재발송
    const handleResend = async () => {
        setErrorMessage('');
        setIsResending(true);

        try {
            const { error } = await supabase.auth.resend({
                type: 'signup',
                email,
            });

            if (error) {
                if (error.message?.includes('429') || (error as any).status === 429) {
                    setErrorMessage('요청이 너무 많습니다. 1분 뒤에 다시 시도해주세요.');
                } else {
                    setErrorMessage(error.message || '재발송에 실패했습니다.');
                }
            } else {
                Alert.alert('✉️ 발송 완료', '인증 코드가 다시 발송되었습니다. 이메일을 확인해주세요.');
            }
        } catch (error) {
            setErrorMessage('재발송 중 오류가 발생했습니다.');
        } finally {
            setIsResending(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>
                {/* Icon */}
                <View style={styles.iconContainer}>
                    <Ionicons name="mail-outline" size={64} color={colors.primary} />
                </View>

                {/* Title */}
                <Text style={styles.title}>이메일 인증</Text>
                <Text style={styles.subtitle}>
                    <Text style={styles.emailHighlight}>{email}</Text>
                    {'\n'}(으)로 발송된 인증 코드를 입력해주세요.
                </Text>

                {/* Error Message */}
                {errorMessage ? (
                    <View style={styles.errorContainer}>
                        <Ionicons name="alert-circle" size={18} color={colors.error} />
                        <Text style={styles.errorText}>{errorMessage}</Text>
                    </View>
                ) : null}

                {/* OTP Input */}
                <View style={styles.otpContainer}>
                    <TextInput
                        style={styles.otpInput}
                        placeholder="00000000"
                        placeholderTextColor={colors.textLight}
                        value={otp}
                        onChangeText={(text) => setOtp(text.replace(/\D/g, ''))}
                        keyboardType="number-pad"
                        maxLength={8}
                        autoFocus
                    />
                </View>

                {/* Verify Button */}
                <Pressable
                    style={[styles.verifyButton, isLoading && styles.buttonDisabled]}
                    onPress={handleVerifyOtp}
                    disabled={isLoading}
                >
                    {isLoading ? (
                        <ActivityIndicator color={colors.textWhite} />
                    ) : (
                        <Text style={styles.verifyButtonText}>인증 확인</Text>
                    )}
                </Pressable>

                {/* Resend */}
                <View style={styles.resendContainer}>
                    <Text style={styles.resendText}>코드가 도착하지 않았나요?</Text>
                    <Pressable onPress={handleResend} disabled={isResending}>
                        <Text style={[styles.resendLink, isResending && { opacity: 0.5 }]}>
                            {isResending ? '발송 중...' : '다시 보내기'}
                        </Text>
                    </Pressable>
                </View>

                {/* Back to Login */}
                <Pressable style={styles.backLink} onPress={() => router.replace('/auth/login')}>
                    <Text style={styles.backLinkText}>로그인 화면으로 돌아가기</Text>
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
        alignItems: 'center',
        justifyContent: 'center',
        padding: spacing.xl,
    },
    iconContainer: {
        backgroundColor: colors.cardBg,
        padding: spacing.lg,
        borderRadius: 100,
        marginBottom: spacing.xl,
        ...softShadow,
    },
    title: {
        ...typography.h2,
        color: colors.textPrimary,
        marginBottom: spacing.sm,
        textAlign: 'center',
    },
    subtitle: {
        ...typography.body,
        color: colors.textSecondary,
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: spacing.xl,
    },
    emailHighlight: {
        color: colors.primary,
        fontWeight: '600',
    },
    errorContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.error + '15',
        padding: spacing.sm,
        borderRadius: borderRadius.md,
        marginBottom: spacing.md,
        width: '100%',
    },
    errorText: {
        color: colors.error,
        marginLeft: spacing.xs,
        fontSize: 13,
        flex: 1,
    },
    otpContainer: {
        alignItems: 'center',
        marginBottom: spacing.xl,
        width: '100%',
    },
    otpInput: {
        backgroundColor: colors.cardBg,
        borderRadius: borderRadius.xl,
        paddingVertical: spacing.lg,
        paddingHorizontal: spacing.xxl,
        fontSize: 32,
        fontWeight: '700',
        letterSpacing: 12,
        color: colors.textPrimary,
        textAlign: 'center',
        width: '80%',
        ...softShadow,
    },
    verifyButton: {
        backgroundColor: colors.primary,
        borderRadius: borderRadius.lg,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.xxl,
        alignItems: 'center',
        width: '100%',
        ...softShadow,
    },
    buttonDisabled: {
        opacity: 0.7,
    },
    verifyButtonText: {
        ...typography.body,
        color: colors.textWhite,
        fontWeight: '600',
    },
    resendContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: spacing.xl,
        gap: spacing.xs,
    },
    resendText: {
        ...typography.small,
        color: colors.textSecondary,
    },
    resendLink: {
        ...typography.small,
        color: colors.primary,
        fontWeight: '600',
    },
    backLink: {
        marginTop: spacing.lg,
    },
    backLinkText: {
        ...typography.small,
        color: colors.textLight,
    },
});
