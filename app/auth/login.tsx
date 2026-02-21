import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors } from '@/constants/Colors';
import { borderRadius, softShadow, spacing, typography } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';

type ResetStep = 'none' | 'email' | 'otp' | 'newPassword';

// 타임아웃 헬퍼
const timeoutPromise = (ms: number) => new Promise((_, reject) => setTimeout(() => reject(new Error('Request Timeout')), ms));

export default function LoginScreen() {
    const router = useRouter();
    const { setUser, setIsAuthenticated } = useAuthStore();
    const isMounted = useRef(true);

    // Login State
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    // Load pending invite code if routed from enter-code
    useEffect(() => {
        const store = useAuthStore.getState();
        if (store.pendingInviteCode) {
            setEmail(store.pendingInviteCode);
            store.setPendingInviteCode(null); // Clear once loaded
        }
    }, []);

    // Reset Password State
    const [resetStep, setResetStep] = useState<ResetStep>('none');
    const [otp, setOtp] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
        isMounted.current = true;
        return () => { isMounted.current = false; };
    }, []);

    const handleLogin = async () => {
        let loginEmail = email.trim();

        // 6자리 대소문자 알파벳/숫자 조합이면 부모님 자동 생성 계정으로 파싱
        if (loginEmail.length === 6 && !loginEmail.includes('@')) {
            loginEmail = `parent_${loginEmail.toUpperCase()}@onanbu.local`;
        }

        if (!loginEmail || !password) {
            Alert.alert('알림', '이메일(또는 초대코드)과 비밀번호를 입력해주세요.');
            return;
        }

        setIsLoading(true);
        console.log('Attempting login for:', email.trim());

        try {
            // 1. 로그인 시도 (타임아웃 15초)
            const signInPromise = supabase.auth.signInWithPassword({
                email: loginEmail,
                password,
            });

            const { data, error } = await Promise.race([
                signInPromise,
                timeoutPromise(15000)
            ]) as any;

            if (error) {
                console.error('Login Error:', error.message);

                if (error.message?.includes('Email not confirmed')) {
                    Alert.alert(
                        '이메일 인증 필요',
                        '아직 이메일 인증이 완료되지 않았습니다. 인증 화면으로 이동할까요?',
                        [
                            { text: '취소', style: 'cancel' },
                            {
                                text: '인증하기',
                                onPress: async () => {
                                    await supabase.auth.resend({
                                        type: 'signup',
                                        email: email.trim(),
                                    });
                                    if (isMounted.current) {
                                        router.push({
                                            pathname: '/auth/signup-success',
                                            params: { email: email.trim() },
                                        });
                                    }
                                },
                            },
                        ]
                    );
                } else if (error.message?.includes('Invalid login credentials')) {
                    Alert.alert('로그인 실패', '이메일 또는 비밀번호가 일치하지 않습니다.');
                } else {
                    Alert.alert('로그인 실패', `오류: ${error.message}`);
                }
                return;
            }

            console.log('Auth successful, user ID:', data.user?.id);

            if (data.user) {
                let profile = null;
                // Retry fetching profile (최대 3회, 0.5초 간격으로 단축)
                for (let i = 0; i < 3; i++) {
                    const { data: p, error: pError } = await supabase.from('profiles').select('*').eq('id', data.user.id).single();
                    if (p) {
                        profile = p;
                        break;
                    }
                    if (pError && pError.code !== 'PGRST116') {
                        console.warn('Profile fetch error:', pError.message);
                    }
                    console.log(`Profile fetch retry ${i + 1}...`);
                    await new Promise(resolve => setTimeout(resolve, 500));
                }

                if (!isMounted.current) return;

                if (profile) {
                    setUser(profile);
                    setIsAuthenticated(true);
                    console.log('Login successful, role:', profile.role);

                    setTimeout(() => {
                        if (profile.role === 'admin') router.replace('/admin/users');
                        else if (profile.role === 'parent') router.replace('/parent');
                        else router.replace('/(tabs)');
                    }, 100);
                } else {
                    console.error('Failed to load profile for user:', data.user.id);
                    Alert.alert('로그인 오류', '사용자 프로필을 찾을 수 없습니다. (잠시 후 다시 시도해주세요)');
                    await supabase.auth.signOut();
                }
            }
        } catch (err: any) {
            console.error('Login Exception:', err);
            Alert.alert('오류', `로그인 시스템 오류: ${err.message || '시간 초과 등'}`);
        } finally {
            if (isMounted.current) setIsLoading(false);
        }
    };

    // 1. 인증코드 발송
    const handleSendResetCode = async () => {
        setErrorMessage('');
        if (!email.trim()) { setErrorMessage('이메일을 입력해주세요.'); return; }
        setIsLoading(true);
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
            if (error) throw error;
            setResetStep('otp');
        } catch (error: any) {
            if (error.message?.includes('429') || error.status === 429) {
                setErrorMessage('요청이 너무 많습니다. 1분 뒤에 다시 시도해주세요.');
            } else {
                setErrorMessage(error.message || '전송 실패');
            }
        }
        finally { if (isMounted.current) setIsLoading(false); }
    };

    // 2. 인증코드 검증
    const handleVerifyOtp = async () => {
        setErrorMessage('');
        if (!otp.trim()) { setErrorMessage('인증코드를 입력해주세요.'); return; }
        setIsLoading(true);
        try {
            let { data, error } = await supabase.auth.verifyOtp({
                email: email.trim(),
                token: otp.trim(),
                type: 'recovery',
            });

            // 1차 'recovery' 실패 시 'signup' (이메일 인증)으로 재시도
            if (error) {
                console.log('Recovery verification failed, trying signup verification...', error.message);
                const { data: signupData, error: signupError } = await supabase.auth.verifyOtp({
                    email: email.trim(),
                    token: otp.trim(),
                    type: 'signup',
                });

                if (!signupError && signupData.session) {
                    data = signupData;
                    error = null;
                }
            }

            if (error) throw error;

            if (!data.session) {
                throw new Error('인증은 성공했으나 세션을 가져오지 못했습니다. 다시 시도해주세요.');
            }

            const { data: profile } = await supabase.from('profiles').select('*').eq('id', data.user!.id).single();
            if (profile) {
                setUser(profile);
                setIsAuthenticated(true);
            }

            setResetStep('newPassword');
        } catch (error: any) {
            console.error('Verify OTP Error:', error);
            setErrorMessage(error.message || '인증 코드가 올바르지 않습니다.');
        }
        finally { if (isMounted.current) setIsLoading(false); }
    };

    // 3. 새 비밀번호 설정
    const handleChangePassword = async () => {
        setErrorMessage('');
        if (!newPassword || newPassword.length < 6) { setErrorMessage('비밀번호는 6자리 이상이어야 합니다.'); return; }
        setIsLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                throw new Error('세션이 만료되었습니다. 처음부터 다시 시도해주세요.');
            }

            const { error } = await supabase.auth.updateUser({ password: newPassword });
            if (error) throw error;

            Alert.alert('성공', '비밀번호가 변경되었습니다.', [
                {
                    text: '확인', onPress: () => {
                        setResetStep('none');
                        setPassword('');
                        setErrorMessage('');
                        if (session.user) {
                            supabase.from('profiles').select('role').eq('id', session.user.id).single()
                                .then(({ data }: { data: any }) => {
                                    if (data && 'role' in data) {
                                        const role = data.role as string;
                                        if (role === 'admin') router.replace('/admin/users');
                                        else if (role === 'parent') router.replace('/parent');
                                        else router.replace('/(tabs)');
                                    } else {
                                        router.replace('/(tabs)');
                                    }
                                });
                        }
                    }
                }
            ]);
        } catch (error: any) {
            console.error('Update Password Error:', error);
            setErrorMessage(error.message || '비밀번호 변경 중 오류가 발생했습니다.');
        }
        finally { if (isMounted.current) setIsLoading(false); }
    };

    const renderResetModal = () => (
        <Modal visible={resetStep !== 'none'} transparent animationType="slide">
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <Text style={styles.modalTitle}>비밀번호 재설정</Text>

                    {errorMessage ? (
                        <View style={styles.errorContainer}>
                            <Ionicons name="alert-circle" size={20} color={colors.error} />
                            <Text style={styles.errorText}>{errorMessage}</Text>
                        </View>
                    ) : null}

                    {resetStep === 'email' && (
                        <>
                            <Text style={styles.modalText}>가입한 이메일 주소를 입력해주세요.</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="이메일"
                                value={email}
                                onChangeText={setEmail}
                                keyboardType="email-address"
                                autoCapitalize="none"
                            />
                            <Pressable style={styles.submitButton} onPress={handleSendResetCode} disabled={isLoading}>
                                {isLoading ? <ActivityIndicator color="white" /> : <Text style={styles.submitButtonText}>인증코드 발송</Text>}
                            </Pressable>
                        </>
                    )}

                    {resetStep === 'otp' && (
                        <>
                            <Text style={styles.modalText}>{email}(으)로 발송된 인증코드를 입력하세요.</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="인증코드 (6~8자리)"
                                value={otp}
                                onChangeText={setOtp}
                                keyboardType="number-pad"
                            />
                            <Pressable style={styles.submitButton} onPress={handleVerifyOtp} disabled={isLoading}>
                                {isLoading ? <ActivityIndicator color="white" /> : <Text style={styles.submitButtonText}>확인</Text>}
                            </Pressable>
                        </>
                    )}

                    {resetStep === 'newPassword' && (
                        <>
                            <Text style={styles.modalText}>새로운 비밀번호를 입력하세요.</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="새 비밀번호"
                                value={newPassword}
                                onChangeText={setNewPassword}
                                secureTextEntry
                            />
                            <Pressable style={styles.submitButton} onPress={handleChangePassword} disabled={isLoading}>
                                {isLoading ? <ActivityIndicator color="white" /> : <Text style={styles.submitButtonText}>비밀번호 변경</Text>}
                            </Pressable>
                        </>
                    )}

                    <Pressable style={styles.cancelButton} onPress={() => { setResetStep('none'); setErrorMessage(''); }}>
                        <Text style={styles.cancelButtonText}>취소</Text>
                    </Pressable>
                </View>
            </View>
        </Modal>
    );

    return (
        <SafeAreaView style={styles.container}>
            {renderResetModal()}
            <View style={styles.content}>
                <Pressable style={styles.backButton} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
                </Pressable>
                <View style={styles.header}>
                    <Text style={styles.logo}>🌸</Text>
                    <Text style={styles.title}>다시 만나서 반가워요</Text>
                    <Text style={styles.subtitle}>로그인해서 안부를 전해보세요</Text>
                </View>
                <View style={styles.form}>
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>이메일 또는 일련번호</Text>
                        <TextInput style={styles.input} placeholder="이메일 또는 6자리 초대코드" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} />
                    </View>
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>비밀번호</Text>
                        <View style={styles.passwordContainer}>
                            <TextInput style={styles.passwordInput} placeholder="비밀번호" value={password} onChangeText={setPassword} secureTextEntry={!showPassword} />
                            <Pressable onPress={() => setShowPassword(!showPassword)}>
                                <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={20} color={colors.textSecondary} />
                            </Pressable>
                        </View>
                    </View>
                    <Pressable style={styles.forgotPassword} onPress={() => setResetStep('email')}>
                        <Text style={styles.forgotPasswordText}>비밀번호를 잊으셨나요?</Text>
                    </Pressable>
                </View>
                <Pressable
                    style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
                    onPress={() => {
                        console.log('Login button pressed');
                        handleLogin();
                    }}
                    disabled={isLoading}
                >
                    {isLoading ? <ActivityIndicator color={colors.textWhite} /> : <Text style={styles.submitButtonText}>로그인</Text>}
                </Pressable>

                <View style={styles.footer}>
                    <Text style={styles.footerText}>계정이 없으신가요?</Text>
                    <Pressable onPress={() => {
                        console.log('Signup clicked');
                        router.push('/auth/signup?role=guardian');
                    }}><Text style={styles.signUpLink}>회원가입</Text></Pressable>
                </View>

                <View style={styles.footer}>
                    <Text style={styles.footerText}>가족에게 초대받으셨나요?</Text>
                    <Pressable onPress={() => {
                        console.log('Invite code clicked');
                        router.push('/auth/role-select');
                    }}>
                        <Text style={styles.signUpLink}>초대 코드로 시작하기</Text>
                    </Pressable>
                </View>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { flex: 1, padding: spacing.lg },
    backButton: { marginBottom: spacing.lg },
    header: { alignItems: 'center', marginBottom: spacing.xxl },
    logo: { fontSize: 48, marginBottom: spacing.md },
    title: { ...typography.h2, color: colors.textPrimary, marginBottom: spacing.xs },
    subtitle: { ...typography.body, color: colors.textSecondary },
    form: { gap: spacing.md },
    inputGroup: { gap: spacing.xs },
    label: { ...typography.small, color: colors.textSecondary, fontWeight: '500' },
    input: { backgroundColor: colors.cardBg, borderRadius: borderRadius.lg, padding: spacing.md, ...typography.body, color: colors.textPrimary, ...softShadow },
    passwordContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.cardBg, borderRadius: borderRadius.lg, paddingRight: spacing.md, ...softShadow },
    passwordInput: { flex: 1, padding: spacing.md, ...typography.body, color: colors.textPrimary },
    forgotPassword: { alignSelf: 'flex-end' },
    forgotPasswordText: { ...typography.small, color: colors.primary },
    submitButton: { backgroundColor: colors.primary, borderRadius: borderRadius.lg, padding: spacing.md, alignItems: 'center', marginTop: spacing.xl, ...softShadow },
    submitButtonPressed: { backgroundColor: colors.primaryDark },
    submitButtonDisabled: { opacity: 0.7 },
    submitButtonText: { ...typography.body, color: colors.textWhite, fontWeight: '600' },
    footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: spacing.lg, gap: spacing.xs },
    footerText: { ...typography.body, color: colors.textSecondary },
    signUpLink: { ...typography.body, color: colors.primary, fontWeight: '600' },
    // Modal Styles
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
    modalContent: { width: '85%', backgroundColor: 'white', borderRadius: 16, padding: 24, alignItems: 'center', ...softShadow },
    modalTitle: { ...typography.h3, marginBottom: 16 },
    modalText: { ...typography.body, marginBottom: 16, textAlign: 'center', color: colors.textSecondary },
    cancelButton: { marginTop: 16 },
    cancelButtonText: { color: colors.textSecondary },
    errorContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.error + '20', padding: 8, borderRadius: 8, marginBottom: 16 },
    errorText: { color: colors.error, marginLeft: 8, fontSize: 13, flex: 1 },
});
