import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Image, Modal, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors } from '@/constants/Colors';
import { borderRadius, commonStyles, softShadow, spacing, typography } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';

const SUPABASE_URL = 'https://klgeuewpslppoxgvkiqj.supabase.co';

export default function ParentSettingsScreen() {
    const router = useRouter();
    const { user, logout } = useAuthStore();
    const [isWithdrawModalVisible, setIsWithdrawModalVisible] = useState(false);
    const [isConfirmModalVisible, setIsConfirmModalVisible] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const handleLogout = async () => {
        await logout();
        router.replace('/auth/login');
    };

    const handleWithdraw = async () => {
        setIsLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                setIsConfirmModalVisible(false);
                setIsWithdrawModalVisible(false);
                return;
            }

            const response = await fetch(`${SUPABASE_URL}/functions/v1/withdraw-parent`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${session.access_token}`,
                    'Content-Type': 'application/json',
                },
            });
            const result = await response.json();

            if (!result.success) {
                console.error('[Withdraw] 실패:', result.message);
                // 실패해도 로컬 로그아웃은 진행
            }

            await logout();
            router.replace('/auth/login');
        } catch (e: any) {
            console.error('[Withdraw] 오류:', e);
            await logout();
            router.replace('/auth/login');
        } finally {
            setIsLoading(false);
        }
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

                {/* 계정 메뉴 */}
                <View style={styles.menuSection}>
                    <Text style={styles.menuSectionTitle}>계정</Text>
                    <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/parent/profile-edit' as any)} activeOpacity={0.7}>
                        <Ionicons name="person-outline" size={22} color={colors.textSecondary} />
                        <Text style={styles.menuItemText}>프로필 수정</Text>
                        <Ionicons name="chevron-forward" size={20} color={colors.textLight} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/parent/notification-settings' as any)} activeOpacity={0.7}>
                        <Ionicons name="notifications-outline" size={22} color={colors.textSecondary} />
                        <Text style={styles.menuItemText}>알림 설정</Text>
                        <Ionicons name="chevron-forward" size={20} color={colors.textLight} />
                    </TouchableOpacity>
                </View>

                {/* 고객지원 */}
                <View style={styles.menuSection}>
                    <Text style={styles.menuSectionTitle}>고객지원</Text>
                    <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/parent/support' as any)} activeOpacity={0.7}>
                        <Ionicons name="chatbubbles-outline" size={22} color={colors.textSecondary} />
                        <Text style={styles.menuItemText}>문의하기</Text>
                        <Ionicons name="chevron-forward" size={20} color={colors.textLight} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/terms' as any)} activeOpacity={0.7}>
                        <Ionicons name="document-text-outline" size={22} color={colors.textSecondary} />
                        <Text style={styles.menuItemText}>이용약관</Text>
                        <Ionicons name="chevron-forward" size={20} color={colors.textLight} />
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.menuItem, { borderTopWidth: 0.5, borderTopColor: colors.border }]} onPress={() => router.push('/privacy' as any)} activeOpacity={0.7}>
                        <Ionicons name="shield-checkmark-outline" size={22} color={colors.textSecondary} />
                        <Text style={styles.menuItemText}>개인정보처리방침</Text>
                        <Ionicons name="chevron-forward" size={20} color={colors.textLight} />
                    </TouchableOpacity>
                </View>

                {/* 기타 */}
                <View style={styles.menuSection}>
                    <Text style={styles.menuSectionTitle}>기타</Text>
                    <TouchableOpacity
                        style={[styles.menuItem, styles.logoutItem]}
                        onPress={handleLogout}
                        activeOpacity={0.6}
                    >
                        <Ionicons name="log-out-outline" size={22} color={colors.error} />
                        <Text style={[styles.menuItemText, styles.logoutText]}>로그아웃</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.menuItem, { borderBottomWidth: 0 }]}
                        activeOpacity={0.6}
                        onPress={() => setIsWithdrawModalVisible(true)}
                    >
                        <Ionicons name="trash-outline" size={22} color={colors.error} />
                        <Text style={[styles.menuItemText, styles.logoutText]}>회원탈퇴</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>

            {/* 1단계: 회원탈퇴 안내 모달 */}
            <Modal
                visible={isWithdrawModalVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setIsWithdrawModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>회원 탈퇴</Text>
                        <Text style={styles.modalSubtitle}>
                            탈퇴 시 기존 초대 코드가 무효화됩니다.{"\n"}
                            과거의 가족 기록은 케어자 앱에 보존됩니다.{"\n\n"}
                            재참여를 원하시면 케어자에게{"\n"}새 초대 코드를 요청하세요.
                        </Text>
                        <TouchableOpacity
                            style={[styles.modalButton, { backgroundColor: colors.error }]}
                            activeOpacity={0.8}
                            onPress={() => {
                                setIsWithdrawModalVisible(false);
                                setTimeout(() => setIsConfirmModalVisible(true), 300);
                            }}
                        >
                            <Text style={styles.modalButtonText}>탈퇴 진행</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.cancelButton}
                            activeOpacity={0.7}
                            onPress={() => setIsWithdrawModalVisible(false)}
                        >
                            <Text style={styles.cancelButtonText}>취소</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* 2단계: 최종 확인 모달 */}
            <Modal
                visible={isConfirmModalVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setIsConfirmModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>정말 탈퇴하시겠습니까?</Text>
                        <Text style={styles.modalSubtitle}>
                            이 작업은 되돌릴 수 없습니다.{"\n"}계속 진행하시겠습니까?
                        </Text>
                        {isLoading ? (
                            <ActivityIndicator color={colors.error} style={{ marginVertical: spacing.lg }} />
                        ) : (
                            <>
                                <TouchableOpacity
                                    style={[styles.modalButton, { backgroundColor: colors.error }]}
                                    activeOpacity={0.8}
                                    onPress={handleWithdraw}
                                >
                                    <Text style={styles.modalButtonText}>최종 탈퇴</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.cancelButton}
                                    activeOpacity={0.7}
                                    onPress={() => setIsConfirmModalVisible(false)}
                                >
                                    <Text style={styles.cancelButtonText}>취소</Text>
                                </TouchableOpacity>
                            </>
                        )}
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: spacing.lg,
        paddingBottom: 60,
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
    // Modal
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: spacing.xl,
    },
    modalContent: {
        backgroundColor: '#1E293B',
        width: '100%',
        borderRadius: borderRadius.lg,
        padding: spacing.xl,
        alignItems: 'center',
    },
    modalTitle: {
        ...typography.h2,
        color: '#fff',
        marginBottom: spacing.sm,
        textAlign: 'center',
    },
    modalSubtitle: {
        ...typography.body,
        color: '#94A3B8',
        textAlign: 'center',
        marginBottom: spacing.xl,
        lineHeight: 22,
    },
    modalButton: {
        width: '100%',
        paddingVertical: 14,
        borderRadius: borderRadius.md,
        alignItems: 'center',
    },
    modalButtonText: {
        ...typography.body,
        color: '#fff',
        fontWeight: 'bold',
    },
    cancelButton: {
        width: '100%',
        paddingVertical: 14,
        marginTop: spacing.md,
        borderRadius: borderRadius.md,
        borderWidth: 1,
        borderColor: '#475569',
        alignItems: 'center',
    },
    cancelButtonText: {
        ...typography.body,
        color: '#94A3B8',
        fontWeight: '600',
    },
});
