import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Image, Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors } from '@/constants/Colors';
import { borderRadius, commonStyles, softShadow, spacing, typography } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';

export default function SettingsScreen() {
    const router = useRouter();
    const { user, logout } = useAuthStore();
    const [isWithdrawModalVisible, setIsWithdrawModalVisible] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [withdrawStep, setWithdrawStep] = useState(1); // 1: Select, 2: Confirm Full Delete

    const handleWithdrawGuardian = async (option: number) => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase.functions.invoke('withdraw-guardian', {
                body: { p_option: option }
            });

            if (error || (data && !data.success)) {
                Alert.alert('오류', '탈퇴 처리에 실패했습니다. 서버 메시지: ' + (error?.message || data?.message));
                setIsLoading(false);
                return;
            }

            setIsWithdrawModalVisible(false);
            await logout();
            router.replace('/auth/login');
        } catch (e: any) {
            Alert.alert('오류', '탈퇴 진행 중 알 수 없는 문제가 발생했습니다.');
        } finally {
            setIsLoading(false);
        }
    };

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

                <View style={styles.menuGroup}>
                    <Pressable style={styles.menuItem} onPress={() => router.push('/support' as any)}>
                        <Ionicons name="chatbubbles-outline" size={22} color={colors.textPrimary} />
                        <Text style={[styles.menuText, { marginLeft: 8, flex: 1 }]}>문의하기</Text>
                        <Ionicons name="chevron-forward" size={20} color={colors.textLight} />
                    </Pressable>
                    <Pressable style={styles.menuItem} onPress={() => router.push('/terms' as any)}>
                        <Ionicons name="document-text-outline" size={22} color={colors.textPrimary} />
                        <Text style={[styles.menuText, { marginLeft: 8, flex: 1 }]}>이용약관</Text>
                        <Ionicons name="chevron-forward" size={20} color={colors.textLight} />
                    </Pressable>
                    <Pressable style={styles.menuItem} onPress={() => router.push('/privacy' as any)}>
                        <Ionicons name="lock-closed-outline" size={22} color={colors.textPrimary} />
                        <Text style={[styles.menuText, { marginLeft: 8, flex: 1 }]}>개인정보처리방침</Text>
                        <Ionicons name="chevron-forward" size={20} color={colors.textLight} />
                    </Pressable>
                </View>

                <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 10 }}>
                    <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.6}>
                        <Text style={styles.logoutText}>로그아웃</Text>
                    </TouchableOpacity>

                    <Text style={{ marginHorizontal: 10, alignSelf: 'center', color: colors.border }}>|</Text>

                    <TouchableOpacity style={styles.logoutButton} onPress={() => setIsWithdrawModalVisible(true)} activeOpacity={0.6}>
                        <Text style={[styles.logoutText, { color: colors.textSecondary }]}>회원탈퇴</Text>
                    </TouchableOpacity>
                </View>

                {/* 다단계 회원탈퇴 모달 */}
                <Modal
                    visible={isWithdrawModalVisible}
                    transparent={true}
                    animationType="fade"
                    onRequestClose={() => setIsWithdrawModalVisible(false)}
                >
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <Text style={styles.modalTitle}>회원 탈퇴 선택</Text>
                            <Text style={styles.modalSubtitle}>
                                탈퇴 시 계정 복구가 불가능합니다.{"\n"}원하시는 탈퇴 방식을 선택해주세요.
                            </Text>

                            {withdrawStep === 1 ? (
                                <>
                                    <TouchableOpacity
                                        style={[styles.modalButton, { backgroundColor: '#475569' }]}
                                        onPress={() => handleWithdrawGuardian(1)}
                                        activeOpacity={0.7}
                                        disabled={isLoading}
                                    >
                                        {isLoading ? (
                                            <ActivityIndicator color={colors.textWhite} size="small" />
                                        ) : (
                                            <Text style={styles.modalButtonText}>내 계정만 탈퇴 (나머지 가족/기록 유지)</Text>
                                        )}
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={[styles.modalButton, { backgroundColor: '#ea4335', marginTop: spacing.md }]}
                                        activeOpacity={0.7}
                                        disabled={isLoading}
                                        onPress={() => setWithdrawStep(2)}
                                    >
                                        <Text style={styles.modalButtonText}>모든 가족과 앱 이용 중단 및 내역 삭제</Text>
                                    </TouchableOpacity>
                                </>
                            ) : (
                                <>
                                    <Text style={[styles.modalSubtitle, { color: colors.error, fontWeight: '600' }]}>
                                        정말 모든 기록을 파기하시겠습니까?{"\n"}
                                        본인이 초대한 부모님 계정과 모든 활동 내역이 영구 삭제되며 복구할 수 없습니다.
                                    </Text>

                                    <TouchableOpacity
                                        style={[styles.modalButton, { backgroundColor: '#ea4335' }]}
                                        activeOpacity={0.7}
                                        disabled={isLoading}
                                        onPress={() => handleWithdrawGuardian(3)}
                                    >
                                        {isLoading ? (
                                            <ActivityIndicator color={colors.textWhite} size="small" />
                                        ) : (
                                            <Text style={styles.modalButtonText}>확인했습니다. 모든 내역 삭제</Text>
                                        )}
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={[styles.cancelButton, { marginTop: spacing.md }]}
                                        onPress={() => setWithdrawStep(1)}
                                        activeOpacity={0.7}
                                        disabled={isLoading}
                                    >
                                        <Text style={styles.cancelButtonText}>이전으로</Text>
                                    </TouchableOpacity>
                                </>
                            )}

                            {withdrawStep === 1 && (
                                <TouchableOpacity
                                    style={styles.cancelButton}
                                    onPress={() => setIsWithdrawModalVisible(false)}
                                    activeOpacity={0.7}
                                    disabled={isLoading}
                                >
                                    <Text style={styles.cancelButtonText}>취소</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                </Modal>
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
    // Modal Styles
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
    },
    modalSubtitle: {
        ...typography.body,
        color: '#94A3B8',
        textAlign: 'center',
        marginBottom: spacing.xl,
        lineHeight: 20,
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
        fontSize: 15,
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
