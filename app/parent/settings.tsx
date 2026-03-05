import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors } from '@/constants/Colors';
import { borderRadius, commonStyles, softShadow, spacing, typography } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';

export default function ParentSettingsScreen() {
    const router = useRouter();
    const { user, logout } = useAuthStore();

    const handleLogout = async () => {
        await logout();
        router.replace('/auth/login');
    };

    return (
        <SafeAreaView style={commonStyles.container} edges={['top']}>
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Header */}
                <View style={styles.header}>
                    <Pressable
                        style={styles.backButton}
                        onPress={() => router.back()}
                    >
                        <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
                    </Pressable>
                    <Text style={styles.headerTitle}>설정</Text>
                    <View style={{ width: 40 }} />
                </View>

                {/* Profile Section */}
                <View style={styles.profileCard}>
                    <View style={styles.profileAvatar}>
                        {user?.avatar_url ? (
                            <Image
                                source={{ uri: user.avatar_url }}
                                style={styles.avatarImage}
                                resizeMode="cover"
                            />
                        ) : (
                            <Ionicons name="person" size={32} color={colors.primary} />
                        )}
                    </View>
                    <View style={styles.profileInfo}>
                        <Text style={styles.profileName}>{user?.name || '사용자'}</Text>
                        <Text style={styles.profileEmail}>{user?.email || ''}</Text>
                    </View>
                </View>

                {/* Settings Menu */}
                <View style={styles.menuSection}>
                    <Text style={styles.menuSectionTitle}>계정</Text>

                    <Pressable
                        style={styles.menuItem}
                        onPress={() => router.push('/profile/edit')}
                    >
                        <Ionicons name="person-outline" size={22} color={colors.textSecondary} />
                        <Text style={styles.menuItemText}>프로필 수정</Text>
                        <Ionicons name="chevron-forward" size={20} color={colors.textLight} />
                    </Pressable>

                    <Pressable
                        style={styles.menuItem}
                        onPress={() => router.push('/notifications')}
                    >
                        <Ionicons name="notifications-outline" size={22} color={colors.textSecondary} />
                        <Text style={styles.menuItemText}>알림 설정</Text>
                        <Ionicons name="chevron-forward" size={20} color={colors.textLight} />
                    </Pressable>
                </View>

                {/* 고객지원 추가영역 */}
                <View style={styles.menuSection}>
                    <Text style={styles.menuSectionTitle}>고객지원</Text>
                    <Pressable style={styles.menuItem} onPress={() => router.push('/support' as any)}>
                        <Ionicons name="chatbubbles-outline" size={22} color={colors.textSecondary} />
                        <Text style={styles.menuItemText}>문의하기</Text>
                        <Ionicons name="chevron-forward" size={20} color={colors.textLight} />
                    </Pressable>
                    <Pressable style={styles.menuItem} onPress={() => router.push('/terms' as any)}>
                        <Ionicons name="document-text-outline" size={22} color={colors.textSecondary} />
                        <Text style={styles.menuItemText}>이용약관</Text>
                        <Ionicons name="chevron-forward" size={20} color={colors.textLight} />
                    </Pressable>
                    <Pressable style={styles.menuItem} onPress={() => router.push('/privacy' as any)}>
                        <Ionicons name="shield-checkmark-outline" size={22} color={colors.textSecondary} />
                        <Text style={styles.menuItemText}>개인정보처리방침</Text>
                        <Ionicons name="chevron-forward" size={20} color={colors.textLight} />
                    </Pressable>
                </View>

                <View style={styles.menuSection}>
                    <Text style={styles.menuSectionTitle}>기타</Text>

                    <Pressable
                        style={[styles.menuItem, styles.logoutItem]}
                        onPress={handleLogout}
                    >
                        <Ionicons name="log-out-outline" size={22} color={colors.error} />
                        <Text style={[styles.menuItemText, styles.logoutText]}>로그아웃</Text>
                    </Pressable>

                    <Pressable
                        style={[styles.menuItem, { borderBottomWidth: 0 }]}
                        onPress={() => {
                            Alert.alert(
                                '회원탈퇴',
                                '정말 탈퇴하시겠습니까?\n가족 그룹 연결이 해제되며, 기존의 초대 코드는 더 이상 사용할 수 없게 됩니다.',
                                [
                                    { text: '취소', style: 'cancel' },
                                    {
                                        text: '탈퇴',
                                        style: 'destructive',
                                        onPress: async () => {
                                            const { data, error } = await supabase.rpc('withdraw_parent');
                                            if (error || (data && !data.success)) {
                                                Alert.alert('오류', '탈퇴 처리에 실패했습니다. 고객센터에 문의해주세요.');
                                                return;
                                            }
                                            await logout();
                                            router.replace('/auth/login');
                                        }
                                    }
                                ]
                            );
                        }}
                    >
                        <Ionicons name="trash-outline" size={22} color={colors.error} />
                        <Text style={[styles.menuItemText, styles.logoutText]}>회원탈퇴</Text>
                    </Pressable>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: spacing.lg,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: spacing.xl,
    },
    backButton: {
        padding: spacing.sm,
    },
    headerTitle: {
        ...typography.h2,
        color: colors.textPrimary,
    },
    profileCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.cardBg,
        borderRadius: borderRadius.xl,
        padding: spacing.lg,
        marginBottom: spacing.xl,
        ...softShadow,
    },
    profileAvatar: {
        width: 56,
        height: 56,
        borderRadius: borderRadius.full,
        backgroundColor: colors.pending,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.md,
        overflow: 'hidden',
    },
    avatarImage: {
        width: '100%',
        height: '100%',
    },
    profileInfo: {
        flex: 1,
    },
    profileName: {
        ...typography.h3,
        color: colors.textPrimary,
    },
    profileEmail: {
        ...typography.small,
        color: colors.textSecondary,
        marginTop: 2,
    },
    menuSection: {
        backgroundColor: colors.cardBg,
        borderRadius: borderRadius.xl,
        marginBottom: spacing.lg,
        ...softShadow,
        overflow: 'hidden',
    },
    menuSectionTitle: {
        ...typography.caption,
        color: colors.textSecondary,
        fontWeight: '600',
        textTransform: 'uppercase',
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.md,
        paddingBottom: spacing.sm,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.lg,
        borderTopWidth: 0.5,
        borderTopColor: colors.border,
    },
    menuItemText: {
        ...typography.body,
        color: colors.textPrimary,
        flex: 1,
        marginLeft: spacing.md,
    },
    logoutItem: {
        borderTopWidth: 0.5,
        borderTopColor: colors.border,
    },
    logoutText: {
        color: colors.error,
    },
});
