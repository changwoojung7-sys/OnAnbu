import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors } from '@/constants/Colors';
import { borderRadius, commonStyles, softShadow, spacing, typography } from '@/constants/theme';
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

                <View style={styles.menuSection}>
                    <Text style={styles.menuSectionTitle}>기타</Text>

                    <Pressable style={styles.menuItem}>
                        <Ionicons name="information-circle-outline" size={22} color={colors.textSecondary} />
                        <Text style={styles.menuItemText}>앱 정보</Text>
                        <Ionicons name="chevron-forward" size={20} color={colors.textLight} />
                    </Pressable>

                    <Pressable
                        style={[styles.menuItem, styles.logoutItem]}
                        onPress={handleLogout}
                    >
                        <Ionicons name="log-out-outline" size={22} color={colors.error} />
                        <Text style={[styles.menuItemText, styles.logoutText]}>로그아웃</Text>
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
