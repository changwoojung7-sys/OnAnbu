import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors } from '@/constants/Colors';
import { borderRadius, softShadow, spacing, typography } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';

export default function EnterCodeScreen() {
    const router = useRouter();
    const params = useLocalSearchParams<{ type: string }>();
    const { user, setUser, setIsAuthenticated, setPendingInviteCode } = useAuthStore();

    const [code, setCode] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [verifiedInvitation, setVerifiedInvitation] = useState<any>(null);

    const isParentType = params.type === 'parent';

    const handleVerifyCode = async () => {
        const cleanCode = code.trim().toUpperCase();

        if (cleanCode.length !== 6) {
            Alert.alert('알림', '6자리 초대코드를 입력해주세요.');
            return;
        }

        setIsLoading(true);

        try {
            // RPC 호출로 초대 코드 검증 (보안 및 권한 문제 해결)
            const { data: invitation, error } = await supabase.rpc('check_invite_code', {
                code_input: cleanCode,
                type_input: isParentType ? 'parent' : 'guardian'
            });

            if (error || !invitation) {
                console.error('Invite code check failed:', error);
                Alert.alert('오류', '유효하지 않거나 만료된 초대코드입니다.');
                setIsLoading(false);
                return;
            }

            // 이미 사용된 코드인 경우 로그인으로 유도
            if (invitation.status === 'accepted') {
                Alert.alert('알림', '이미 등록된 초대코드입니다.\n해당 코드로 로그인해주세요.');
                if (isParentType) {
                    setPendingInviteCode(cleanCode);
                }
                router.replace('/auth/login');
                return;
            }

            if (isParentType) {
                // 부모님 초대 코드 처리
                // 부모님은 아직 계정이 없으므로 parent-signup 페이지로 이동해야 함
                router.push({
                    pathname: '/auth/parent-signup',
                    params: {
                        code: cleanCode,
                        inviterId: invitation.created_by,
                    },
                });

            } else {
                // 보조케어대상: 즉시 이동하지 않고 부모님 정보를 화면에 표시
                setVerifiedInvitation(invitation);
            }
        } catch (error) {
            Alert.alert('오류', '코드 확인 중 문제가 발생했습니다.');
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAcceptInvitation = () => {
        if (!verifiedInvitation) return;
        router.push({
            pathname: '/auth/signup',
            params: {
                role: 'guardian',
                inviteCode: code.trim().toUpperCase(),
                groupId: verifiedInvitation.group_id,
            },
        });
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>
                {/* Header */}
                <Pressable style={styles.backButton} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
                </Pressable>

                <View style={styles.header}>
                    <Text style={styles.emoji}>{isParentType ? '💌' : '👨‍👩‍👧'}</Text>
                    <Text style={styles.title}>
                        {isParentType ? '초대코드를 입력하세요' : '가족 초대코드 입력'}
                    </Text>
                    <Text style={styles.subtitle}>
                        {isParentType
                            ? '자녀에게 받은 6자리 코드를 입력해주세요'
                            : '주케어대상에게 받은 코드를 입력해주세요'}
                    </Text>
                </View>

                {verifiedInvitation ? (
                    <View style={styles.verifiedContainer}>
                        <View style={styles.parentCard}>
                            <View style={styles.avatarPlaceholder}>
                                {verifiedInvitation.parent_avatar ? (
                                    <Image source={{ uri: verifiedInvitation.parent_avatar }} style={styles.avatarImage} />
                                ) : (
                                    <Ionicons name="person" size={40} color={colors.textLight} />
                                )}
                            </View>
                            <Text style={styles.parentName}>{verifiedInvitation.parent_name}님</Text>
                            <Text style={styles.parentDesc}>함께 케어를 시작하시겠습니까?</Text>
                        </View>

                        <Pressable style={styles.submitButton} onPress={handleAcceptInvitation}>
                            <Text style={styles.submitButtonText}>수락 및 회원가입</Text>
                        </Pressable>
                    </View>
                ) : (
                    <>
                        {/* Code Input */}
                        <View style={styles.codeInputContainer}>
                            <TextInput
                                style={styles.codeInput}
                                placeholder="ABC123"
                                placeholderTextColor={colors.textLight}
                                value={code}
                                onChangeText={(text) => setCode(text.toUpperCase())}
                                maxLength={6}
                                autoCapitalize="characters"
                                autoCorrect={false}
                            />
                        </View>

                        {/* Submit Button */}
                        <Pressable
                            style={({ pressed }) => [
                                styles.submitButton,
                                pressed && styles.submitButtonPressed,
                                isLoading && styles.buttonDisabled,
                            ]}
                            onPress={handleVerifyCode}
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <ActivityIndicator color={colors.textWhite} />
                            ) : (
                                <Text style={styles.submitButtonText}>확인</Text>
                            )}
                        </Pressable>

                        {/* Help Text */}
                        <View style={styles.helpContainer}>
                            <Text style={styles.helpText}>
                                {isParentType
                                    ? '초대코드는 자녀가 앱에서 생성할 수 있어요'
                                    : '초대코드가 없다면 주케어대상에게 요청해주세요'}
                            </Text>
                        </View>
                    </>
                )}
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
        ...typography.h2,
        color: colors.textPrimary,
        textAlign: 'center',
        marginBottom: spacing.sm,
    },
    subtitle: {
        ...typography.body,
        color: colors.textSecondary,
        textAlign: 'center',
    },
    codeInputContainer: {
        alignItems: 'center',
        marginBottom: spacing.xl,
    },
    codeInput: {
        backgroundColor: colors.cardBg,
        borderRadius: borderRadius.xl,
        paddingVertical: spacing.lg,
        paddingHorizontal: spacing.xxl,
        fontSize: 28,
        fontWeight: '700',
        letterSpacing: 8,
        color: colors.textPrimary,
        textAlign: 'center',
        minWidth: 200,
        ...softShadow,
    },
    submitButton: {
        backgroundColor: colors.primary,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        alignItems: 'center',
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
    helpContainer: {
        alignItems: 'center',
        marginTop: spacing.xl,
    },
    helpText: {
        ...typography.small,
        color: colors.textLight,
        textAlign: 'center',
    },
    verifiedContainer: {
        alignItems: 'center',
        gap: spacing.xl,
        marginTop: spacing.md,
    },
    parentCard: {
        backgroundColor: colors.cardBg,
        padding: spacing.xl,
        borderRadius: borderRadius.xl,
        alignItems: 'center',
        ...softShadow,
        width: '100%',
    },
    avatarPlaceholder: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: colors.background,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: spacing.md,
        overflow: 'hidden',
    },
    avatarImage: {
        width: '100%',
        height: '100%',
    },
    parentName: {
        ...typography.h3,
        color: colors.textPrimary,
        marginBottom: spacing.xs,
    },
    parentDesc: {
        ...typography.body,
        color: colors.textSecondary,
    },
});
