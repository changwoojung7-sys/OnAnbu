import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors } from '@/constants/Colors';
import { borderRadius, softShadow, spacing, typography } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';

// 6자리 초대코드 생성
const generateInviteCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
};

export default function InviteParentScreen() {
    const router = useRouter();
    const { user } = useAuthStore();

    const [parentName, setParentName] = useState('');
    const [relationship, setRelationship] = useState('어머니');
    const [inviteCode, setInviteCode] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isCodeGenerated, setIsCodeGenerated] = useState(false);

    const relationships = ['어머니', '아버지', '아내', '아들', '딸', '형제', '장인어른', '장모님', '시아버지', '시어머니', '할머니', '할아버지', '외할머니', '외할아버지', '친구', '동료', '기타'];

    const handleGenerateCode = async () => {
        if (!parentName.trim()) {
            Alert.alert('알림', '케어대상 이름을 입력해주세요.');
            return;
        }

        setIsLoading(true);

        try {
            const code = generateInviteCode();

            // 초대 정보 저장
            const { error } = await supabase.from('parent_invitations').insert({
                inviter_id: user?.id,
                invite_code: code,
                parent_name: parentName.trim(),
                relationship_label: relationship,
                status: 'pending',
            });

            if (error) {
                if (error.code === '23505') {
                    // 중복 코드, 다시 생성
                    handleGenerateCode();
                    return;
                }
                Alert.alert('오류', error.message);
                return;
            }

            setInviteCode(code);
            setIsCodeGenerated(true);
        } catch (error) {
            Alert.alert('오류', '초대코드 생성 중 문제가 발생했습니다.');
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCopyCode = async () => {
        // Share API로 코드 공유 (클립보드 대신)
        try {
            await Share.share({
                message: inviteCode,
            });
        } catch (error) {
            Alert.alert('알림', `초대코드: ${inviteCode}`);
        }
    };

    const handleShare = async () => {
        try {
            await Share.share({
                message: `${parentName}님, ONANBU 앱에서 서로의 따뜻한 안부를 받아보세요!\n\n초대코드: ${inviteCode}\n\n앱 다운로드 후 초대코드를 입력해주세요.`,
            });
        } catch (error) {
            console.error(error);
        }
    };

    const handleComplete = () => {
        router.replace('/(tabs)');
    };

    const handleSkip = () => {
        router.replace('/(tabs)');
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.emoji}>👨‍👩‍👧</Text>
                    <Text style={styles.title}>케어대상을 초대하세요</Text>
                    <Text style={styles.subtitle}>
                        케어대상이 앱에서 안부를 나눌 수 있어요
                    </Text>
                </View>

                {!isCodeGenerated ? (
                    <>
                        {/* Form */}
                        <View style={styles.form}>
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>케어대상 이름</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="홍길순"
                                    placeholderTextColor={colors.textLight}
                                    value={parentName}
                                    onChangeText={setParentName}
                                />
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>관계</Text>
                                <View style={styles.relationshipContainer}>
                                    {relationships.map((rel) => (
                                        <Pressable
                                            key={rel}
                                            style={[
                                                styles.relationshipChip,
                                                relationship === rel && styles.relationshipChipActive,
                                            ]}
                                            onPress={() => setRelationship(rel)}
                                        >
                                            <Text
                                                style={[
                                                    styles.relationshipChipText,
                                                    relationship === rel && styles.relationshipChipTextActive,
                                                ]}
                                            >
                                                {rel}
                                            </Text>
                                        </Pressable>
                                    ))}
                                </View>
                            </View>
                        </View>

                        {/* Generate Button */}
                        <Pressable
                            style={({ pressed }) => [
                                styles.generateButton,
                                pressed && styles.generateButtonPressed,
                                isLoading && styles.buttonDisabled,
                            ]}
                            onPress={handleGenerateCode}
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <ActivityIndicator color={colors.textWhite} />
                            ) : (
                                <Text style={styles.generateButtonText}>초대코드 생성하기</Text>
                            )}
                        </Pressable>

                        {/* Skip */}
                        <Pressable style={styles.skipButton} onPress={handleSkip}>
                            <Text style={styles.skipButtonText}>나중에 하기</Text>
                        </Pressable>
                    </>
                ) : (
                    <>
                        {/* Code Display */}
                        <View style={styles.codeContainer}>
                            <Text style={styles.codeLabel}>{parentName}님의 초대코드</Text>
                            <View style={styles.codeBox}>
                                <Text style={styles.codeText}>{inviteCode}</Text>
                            </View>
                            <Text style={styles.codeHint}>7일간 유효합니다</Text>
                        </View>

                        {/* Action Buttons */}
                        <View style={styles.actionButtons}>
                            <Pressable style={styles.copyButton} onPress={handleCopyCode}>
                                <Ionicons name="copy-outline" size={20} color={colors.primary} />
                                <Text style={styles.copyButtonText}>코드 복사</Text>
                            </Pressable>

                            <Pressable style={styles.shareButton} onPress={handleShare}>
                                <Ionicons name="share-social-outline" size={20} color={colors.textWhite} />
                                <Text style={styles.shareButtonText}>공유하기</Text>
                            </Pressable>
                        </View>

                        {/* Complete Button */}
                        <Pressable style={styles.completeButton} onPress={handleComplete}>
                            <Text style={styles.completeButtonText}>완료</Text>
                        </Pressable>
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
    header: {
        alignItems: 'center',
        marginBottom: spacing.xxl,
        marginTop: spacing.xl,
    },
    emoji: {
        fontSize: 64,
        marginBottom: spacing.md,
    },
    title: {
        ...typography.h1,
        color: colors.textPrimary,
        textAlign: 'center',
        marginBottom: spacing.sm,
    },
    subtitle: {
        ...typography.body,
        color: colors.textSecondary,
        textAlign: 'center',
    },
    form: {
        gap: spacing.lg,
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
    relationshipContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
    },
    relationshipChip: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.full,
        backgroundColor: colors.cardBg,
        borderWidth: 1,
        borderColor: colors.border,
    },
    relationshipChipActive: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    relationshipChipText: {
        ...typography.small,
        color: colors.textSecondary,
    },
    relationshipChipTextActive: {
        color: colors.textWhite,
    },
    generateButton: {
        backgroundColor: colors.primary,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        alignItems: 'center',
        marginTop: spacing.xl,
        ...softShadow,
    },
    generateButtonPressed: {
        backgroundColor: colors.primaryDark,
    },
    buttonDisabled: {
        opacity: 0.7,
    },
    generateButtonText: {
        ...typography.body,
        color: colors.textWhite,
        fontWeight: '600',
    },
    skipButton: {
        alignItems: 'center',
        marginTop: spacing.lg,
    },
    skipButtonText: {
        ...typography.body,
        color: colors.textSecondary,
    },
    codeContainer: {
        alignItems: 'center',
        marginBottom: spacing.xl,
    },
    codeLabel: {
        ...typography.body,
        color: colors.textSecondary,
        marginBottom: spacing.md,
    },
    codeBox: {
        backgroundColor: colors.cardBg,
        borderRadius: borderRadius.xl,
        paddingVertical: spacing.lg,
        paddingHorizontal: spacing.xxl,
        ...softShadow,
    },
    codeText: {
        fontSize: 32,
        fontWeight: '700',
        letterSpacing: 8,
        color: colors.primary,
    },
    codeHint: {
        ...typography.small,
        color: colors.textLight,
        marginTop: spacing.sm,
    },
    actionButtons: {
        flexDirection: 'row',
        gap: spacing.md,
        marginBottom: spacing.xl,
    },
    copyButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.xs,
        backgroundColor: colors.cardBg,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        borderWidth: 1,
        borderColor: colors.primary,
    },
    copyButtonText: {
        ...typography.body,
        color: colors.primary,
        fontWeight: '600',
    },
    shareButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.xs,
        backgroundColor: colors.action,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
    },
    shareButtonText: {
        ...typography.body,
        color: colors.textWhite,
        fontWeight: '600',
    },
    completeButton: {
        backgroundColor: colors.primary,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        alignItems: 'center',
        ...softShadow,
    },
    completeButtonText: {
        ...typography.body,
        color: colors.textWhite,
        fontWeight: '600',
    },
});
