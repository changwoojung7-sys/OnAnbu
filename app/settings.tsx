import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors } from '@/constants/Colors';
import { borderRadius, commonStyles, softShadow, spacing, typography } from '@/constants/theme';
import { useAuthStore } from '@/stores/authStore';

export default function SettingsScreen() {
    const router = useRouter();
    const { user, logout } = useAuthStore();

    const handleLogout = async () => {
        await logout();
        router.replace('/auth/login');
    };

    return (
        <SafeAreaView style={commonStyles.container} edges={['top']}>
            <View style={styles.header}>
                <Pressable onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
                </Pressable>
                <Text style={styles.headerTitle}>설정</Text>
                <View style={{ width: 24 }} />
            </View>

            <View style={styles.content}>
                <View style={styles.profileCard}>
                    <View style={styles.avatar}>
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
                    <View>
                        <Text style={styles.name}>{user?.name || '사용자'}</Text>
                        <Text style={styles.email}>{user?.email}</Text>
                    </View>
                </View>

                <View style={styles.menuGroup}>
                    {user?.role === 'admin' && (
                        <Pressable style={styles.menuItem} onPress={() => router.push('/admin/users')}>
                            <Ionicons name="shield-checkmark-outline" size={22} color={colors.error} />
                            <Text style={[styles.menuText, { color: colors.error, fontWeight: 'bold' }]}>관리자 페이지</Text>
                            <Ionicons name="chevron-forward" size={20} color={colors.textLight} />
                        </Pressable>
                    )}
                    <Pressable style={styles.menuItem} onPress={() => router.push('/profile/edit')}>
                        <Text style={styles.menuText}>내 정보 수정</Text>
                        <Ionicons name="chevron-forward" size={20} color={colors.textLight} />
                    </Pressable>
                    <Pressable style={styles.menuItem} onPress={() => router.push('/notifications')}>
                        <Text style={styles.menuText}>알림 설정</Text>
                        <Ionicons name="chevron-forward" size={20} color={colors.textLight} />
                    </Pressable>
                    <Pressable style={styles.menuItem} onPress={() => router.push('/family' as any)}>
                        <Ionicons name="people-outline" size={22} color={colors.primary} />
                        <Text style={[styles.menuText, { marginLeft: 8 }]}>가족 관리</Text>
                        <Ionicons name="chevron-forward" size={20} color={colors.textLight} />
                    </Pressable>
                </View>

                <Pressable style={styles.logoutButton} onPress={handleLogout}>
                    <Text style={styles.logoutText}>로그아웃</Text>
                </Pressable>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    backButton: {
        padding: 4,
    },
    headerTitle: {
        ...typography.h2,
        fontSize: 18,
    },
    content: {
        flex: 1,
        padding: spacing.lg,
    },
    profileCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.cardBg,
        padding: spacing.lg,
        borderRadius: borderRadius.lg,
        marginBottom: spacing.xl,
        ...softShadow,
    },
    avatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: colors.background,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.md,
        overflow: 'hidden',
    },
    avatarImage: {
        width: '100%',
        height: '100%',
    },
    name: {
        ...typography.h3,
        marginBottom: 2,
    },
    email: {
        ...typography.caption,
        color: colors.textSecondary,
    },
    menuGroup: {
        backgroundColor: colors.cardBg,
        borderRadius: borderRadius.lg,
        overflow: 'hidden',
        marginBottom: spacing.xl,
        ...softShadow,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    menuText: {
        ...typography.body,
        color: colors.textPrimary,
    },
    logoutButton: {
        padding: spacing.md,
        alignItems: 'center',
        justifyContent: 'center',
    },
    logoutText: {
        ...typography.body,
        color: colors.error,
        fontWeight: '600',
    },
});
