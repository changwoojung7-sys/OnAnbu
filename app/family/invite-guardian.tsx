import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
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

export default function InviteGuardianScreen() {
    const router = useRouter();
    const { user } = useAuthStore();

    const [guardianName, setGuardianName] = useState('');
    const [relationship, setRelationship] = useState('형제');
    const [inviteCode, setInviteCode] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isCodeGenerated, setIsCodeGenerated] = useState(false);

    const [parents, setParents] = useState<{ groupId: string, parentName: string }[]>([]);
    const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);

    const relationships = ['아내', '아들', '딸', '형제', '자매', '배우자', '친구', '동료', '사촌', '친척', '기타'];

    useEffect(() => {
        const fetchParents = async () => {
            if (!user?.id) return;
            // Get all groups this guardian is part of
            const { data, error } = await supabase
                .from('family_members')
                .select('group_id, family_groups(profiles!parent_id(name))')
                .eq('guardian_id', user.id);

            if (data && !error) {
                const parentsList = data.map((item: any) => ({
                    groupId: item.group_id,
                    parentName: item.family_groups?.profiles?.name || '케어대상'
                }));
                setParents(parentsList);
                if (parentsList.length > 0) {
                    setSelectedGroupId(parentsList[0].groupId);
                }
            }
        };
        fetchParents();
    }, [user?.id]);

    const handleGenerateCode = async () => {
        if (!guardianName.trim()) {
            Alert.alert('알림', '보조 보호자 이름을 입력해주세요.');
            return;
        }

        if (!selectedGroupId) {
            Alert.alert('알림', '초대할 대상을 선택해주세요.\n아직 연동된 케어대상이 없다면 먼저 케어대상을 초대해주세요.');
            return;
        }

        setIsLoading(true);

        try {
            if (!user?.id) {
                Alert.alert('오류', '로그인이 필요합니다.');
                return;
            }

            const code = generateInviteCode();

            // 2. guardian_invitations 테이블에 초대 저장
            const { error } = await supabase.from('guardian_invitations').insert({
                inviter_id: user.id,
                group_id: selectedGroupId,
                invite_code: code,
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
        const link = `https://onanbu.calamus.ai.kr/invite?code=${inviteCode}&type=guardian`;
        try {
            await Share.share({
                message: link,
            });
        } catch (error) {
            Alert.alert('알림', `초대코드: ${inviteCode}`);
        }
    };

    const handleShare = async () => {
        const link = `https://onanbu.calamus.ai.kr/invite?code=${inviteCode}&type=guardian`;
        try {
            await Share.share({
                message: `[ONANBU 가족 초대]\n\n${guardianName}님, ONANBU 앱에서 함께 케어해요!\n\n아래 링크를 눌러 앱을 설치하고 바로 시작해 보세요!\n👉 ${link}\n\n(직접 입력 시 코드: ${inviteCode})`,
            });
        } catch (error) {
            console.error(error);
        }
    };

    const handleComplete = () => {
        router.back();
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>
                {/* Header */}
                <View style={styles.topBar}>
                    <Pressable onPress={() => router.back()}>
                        <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
                    </Pressable>
                </View>

                <View style={styles.header}>
                    <Text style={styles.emoji}>🤝</Text>
                    <Text style={styles.title}>보조 보호자 초대</Text>
                    <Text style={styles.subtitle}>
                        함께 케어할 가족이나 지인을 초대하세요
                    </Text>
                </View>

                {!isCodeGenerated ? (
                    <>
                        {/* Form */}
                        <View style={styles.form}>
                            {parents.length > 0 && (
                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>함께 케어할 대상</Text>
                                    <View style={styles.relationshipContainer}>
                                        {parents.map((p) => (
                                            <Pressable
                                                key={p.groupId}
                                                style={[
                                                    styles.relationshipChip,
                                                    selectedGroupId === p.groupId && styles.relationshipChipActive,
                                                ]}
                                                onPress={() => setSelectedGroupId(p.groupId)}
                                            >
                                                <Text
                                                    style={[
                                                        styles.relationshipChipText,
                                                        selectedGroupId === p.groupId && styles.relationshipChipTextActive,
                                                    ]}
                                                >
                                                    {p.parentName}
                                                </Text>
                                            </Pressable>
                                        ))}
                                    </View>
                                </View>
                            )}

                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>보조 보호자 이름</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="이름을 입력하세요"
                                    placeholderTextColor={colors.textLight}
                                    value={guardianName}
                                    onChangeText={setGuardianName}
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
                    </>
                ) : (
                    <>
                        {/* Code Display */}
                        <View style={styles.codeContainer}>
                            <Text style={styles.codeLabel}>{guardianName}님의 초대코드</Text>
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
    topBar: {
        marginBottom: spacing.md,
    },
    header: {
        alignItems: 'center',
        marginBottom: spacing.xxl,
        marginTop: spacing.md,
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
