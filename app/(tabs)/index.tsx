import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ParentProfile } from '@/components/home';
import { colors } from '@/constants/Colors';
import { commonStyles, spacing } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { useActionStore } from '@/stores/actionStore';
import { useAuthStore } from '@/stores/authStore';

export default function HomeScreen() {
  const router = useRouter();
  const { todayStatus } = useActionStore();
  const { selectedParent, parents, setSelectedParent } = useAuthStore();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [todayActions, setTodayActions] = useState<any[]>([]);
  const [todayMood, setTodayMood] = useState<{ emoji: string, label: string } | null>(null);
  const [isAwake, setIsAwake] = useState(false);

  const [isParentModalVisible, setParentModalVisible] = useState(false);

  const fetchTodayData = async () => {
    if (!selectedParent) return;
    setIsRefreshing(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const startOfDay = `${today}T00:00:00.000Z`;

      const { data: actionsData } = await supabase
        .from('action_logs')
        .select('*, guardian:profiles!action_logs_guardian_id_fkey(name, avatar_url), parent:profiles!action_logs_parent_id_fkey(name, avatar_url)')
        .eq('parent_id', selectedParent.id)
        .gte('created_at', startOfDay)
        .order('created_at', { ascending: false });

      if (actionsData) {
        setTodayActions(actionsData);
        const awakeAction = actionsData.find((a: any) => a.type === 'check_in' && a.message === '일어났어요! ☀️');
        setIsAwake(!!awakeAction);
      } else {
        setTodayActions([]);
        setIsAwake(false);
      }

      const { data: moodData } = await supabase
        .from('daily_status')
        .select('mood')
        .eq('parent_id', selectedParent.id)
        .eq('status_date', today)
        .single();

      if (moodData && moodData.mood) {
        const MOOD_MAP: Record<string, { emoji: string, label: string }> = {
          great: { emoji: '😊', label: '아주 좋아요' },
          good: { emoji: '🙂', label: '좋아요' },
          okay: { emoji: '😐', label: '그저 그래요' },
          not_good: { emoji: '😔', label: '좋지 않아요' },
        };
        setTodayMood(MOOD_MAP[moodData.mood]);
      } else {
        setTodayMood(null);
      }
    } catch (e) {
      console.log('fetchTodayData error', e);
    } finally {
      setIsRefreshing(false);
    }
  };

  // 화면 포커스 시 부모님 프로필 최신화 및 안부 데이터 조회
  useFocusEffect(
    useCallback(() => {
      const refreshParentProfiles = async () => {
        const { user, parents: currentParents, selectedParent: currentSelected, setParents, setSelectedParent } = useAuthStore.getState();
        if (!user) return;

        try {
          // 1. 보호자가 속한 가족 그룹 ID들 가져오기
          const { data: memberOf, error: memberError } = await supabase
            .from('family_members')
            .select('group_id')
            .eq('guardian_id', user.id);

          if (memberError) throw memberError;
          const groupIds = memberOf?.map((m: any) => m.group_id) || [];

          if (groupIds.length > 0) {
            // 2. 그룹 내 부모님 ID들 가져오기
            const { data: groups, error: groupError } = await supabase
              .from('family_groups')
              .select('parent_id')
              .in('id', groupIds);

            if (groupError) throw groupError;
            const parentIds = groups?.map((g: any) => g.parent_id).filter((id: any) => id) || [];

            if (parentIds.length > 0) {
              // 3. 부모님 프로필 정보 최신 조회
              const { data: fetchedParents, error: profileError } = await supabase
                .from('profiles')
                .select('id, name, email, role, avatar_url')
                .in('id', parentIds);

              if (profileError) throw profileError;
              if (fetchedParents && fetchedParents.length > 0) {
                setParents(fetchedParents);

                // 현재 선택된 부모님의 프로필도 최신 데이터로 갱신
                if (currentSelected) {
                  const updated = fetchedParents.find((p: any) => p.id === currentSelected.id);
                  if (updated) {
                    setSelectedParent(updated);
                  }
                }
              }
            }
          }
        } catch (e) {
          console.error('Error refreshing parent profiles:', e);
        }
      };

      refreshParentProfiles();
      fetchTodayData();
    }, [selectedParent?.id])
  );

  const handleCarePress = useCallback(async () => {
    if (Platform.OS !== 'web') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    router.push('/care');
  }, [router]);

  const handleSettingsPress = useCallback(() => {
    router.push('/settings');
  }, [router]);

  // 예시 부모님 정보 (실제로는 selectedParent 사용)
  const parentName = selectedParent?.name || '어머니';
  const parentAvatar = selectedParent?.avatar_url || null;

  const getActionIcon = (type: string) => {
    if (type === 'voice_cheer') return 'mic';
    if (type === 'video') return 'videocam';
    if (type === 'photo') return 'image';
    if (type === 'message') return 'chatbubble-ellipses';
    return 'heart';
  };

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    const hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const period = hours >= 12 ? '오후' : '오전';
    const displayHours = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
    return `${period} ${displayHours}:${minutes}`;
  };

  const renderActionItem = (action: any) => {
    const isFromParent = action.type === 'message' || (action.type === 'check_in' && action.message === '일어났어요! ☀️');
    const senderName = isFromParent ? (action.parent?.name || parentName) : (action.guardian?.name || '가족');

    let actionLabel = '';
    if (isFromParent) {
      if (action.type === 'message') actionLabel = '사진/영상';
      else actionLabel = '기상/안부';
    } else {
      if (action.type === 'voice_cheer') actionLabel = '음성 안부';
      else if (action.type === 'video') actionLabel = '동영상 안부';
      else if (action.type === 'photo') actionLabel = '사진 안부';
      else actionLabel = '안부 체크';
    }

    return (
      <Pressable key={action.id} style={styles.actionRow} onPress={() => router.push('/two')}>
        <View style={styles.actionIconWrapper}>
          <Ionicons name={getActionIcon(action.type)} size={20} color={colors.primary} />
        </View>
        <View style={styles.actionRowContent}>
          <Text style={styles.actionRowTitle}>{senderName}님의 {actionLabel}</Text>
          {action.message && action.message !== '일어났어요! ☀️' && (
            <Text style={styles.actionRowMessage} numberOfLines={1}>"{action.message}"</Text>
          )}
          <Text style={styles.actionRowTime}>{formatTime(action.created_at)}</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.textLight} />
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={commonStyles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={[styles.header, parents.length === 0 && { marginBottom: spacing.xl }]}>
          <Pressable onPress={() => { if (parents.length > 1) setParentModalVisible(true); }}>
            <ParentProfile
              name={parents.length === 0 ? "부모님 연결 대기 중" : parentName}
              avatarUrl={parentAvatar}
              relationshipLabel={parents.length > 1 ? "다른 부모님 선택 ▼" : parents.length === 0 ? "아직 연결되지 않았어요" : "부모님"}
            />
          </Pressable>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Pressable onPress={fetchTodayData} disabled={isRefreshing} style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1, marginRight: 12 }]}>
              {isRefreshing ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Ionicons name="refresh" size={24} color={colors.primary} />
              )}
            </Pressable>
            <Pressable
              onPress={handleSettingsPress}
              style={styles.settingsButton}
            >
              <Ionicons name="settings-outline" size={24} color={colors.textSecondary} />
            </Pressable>
          </View>
        </View>

        {parents.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconContainer}>
              <Ionicons name="people-outline" size={48} color={colors.textSecondary} />
            </View>
            <Text style={styles.emptyTitle}>아직 연결된 부모님이 없어요</Text>
            <Text style={styles.emptySubtitle}>
              가족 관리 화면에서 부모님을 초대하고 연결을 마무리해주세요.
            </Text>
            <Pressable
              style={styles.emptyButton}
              onPress={() => router.push('/family')}
            >
              <Text style={styles.emptyButtonText}>가족 관리로 이동</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.summaryContainer}>
            {/* 부모님 기상 및 기분 상태 */}
            <View style={styles.topStatus}>
              {isAwake ? (
                <View style={[styles.statusBadge, { backgroundColor: '#e8f5e9' }]}>
                  <Text style={styles.statusText}>☀️ {parentName}님께서 기상하셨어요!</Text>
                </View>
              ) : (
                <Text style={styles.pendingText}>아직 {parentName}님의 기상 소식이 없어요.</Text>
              )}

              {todayMood && (
                <View style={[styles.statusBadge, { backgroundColor: '#e3f2fd', marginTop: spacing.sm }]}>
                  <Text style={styles.statusEmoji}>{todayMood.emoji}</Text>
                  <Text style={styles.statusText}>오늘 기분: {todayMood.label}</Text>
                </View>
              )}
            </View>

            {/* 꽃그림 */}
            <View style={styles.flowerContainer}>
              <Text style={styles.largeFlower}>🌸</Text>
            </View>

            {/* 오늘의 안부 목록 */}
            <View style={styles.actionsSection}>
              <Text style={styles.actionsTitle}>💌 오늘의 안부 ({todayActions.length})</Text>
              {todayActions.length > 0 ? (
                <View style={styles.actionList}>
                  {todayActions.map(action => renderActionItem(action))}
                </View>
              ) : (
                <View style={styles.emptyActionContainer}>
                  <Text style={styles.emptyActionText}>오늘 기록된 안부가 없어요.</Text>
                </View>
              )}
            </View>

            <Pressable style={styles.historyBtn} onPress={() => router.push('/two')}>
              <Text style={styles.historyBtnText}>우리가족 전체 기록 보기 〉</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>

      {/* Floating Action Button */}
      <Pressable
        style={({ pressed }) => [
          styles.fab,
          pressed && styles.fabPressed
        ]}
        onPress={handleCarePress}
      >
        <Ionicons name="heart" size={28} color={colors.textWhite} />
      </Pressable>

      {/* 부모님 선택 모달 */}
      <Modal visible={isParentModalVisible} transparent={true} animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>부모님 선택</Text>
            {parents.map((parent) => (
              <TouchableOpacity
                key={parent.id}
                style={[
                  styles.parentSelectItem,
                  selectedParent?.id === parent.id && styles.parentSelectItemSelected
                ]}
                onPress={() => {
                  setSelectedParent(parent);
                  setParentModalVisible(false);
                }}
              >
                <Text style={styles.parentSelectItemText}>{parent.name}</Text>
                {selectedParent?.id === parent.id && (
                  <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
                )}
              </TouchableOpacity>
            ))}
            <Pressable
              style={styles.modalCloseButton}
              onPress={() => setParentModalVisible(false)}
            >
              <Text style={styles.modalCloseButtonText}>닫기</Text>
            </Pressable>
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
    paddingBottom: 100,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  settingsButton: {
    padding: spacing.sm,
  },
  devToggle: {
    alignSelf: 'center',
    padding: spacing.sm,
    opacity: 0.3,
  },
  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.xl,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fabPressed: {
    backgroundColor: colors.primaryDark,
    transform: [{ scale: 0.95 }],
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.cardBg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: spacing.lg,
    color: colors.textPrimary,
  },
  parentSelectItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.background,
    borderRadius: 12,
    marginBottom: spacing.sm,
  },
  parentSelectItemSelected: {
    borderWidth: 1,
    borderColor: colors.primary,
  },
  parentSelectItemText: {
    fontSize: 16,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  modalCloseButton: {
    marginTop: spacing.xl,
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  modalCloseButtonText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  emptyContainer: {
    backgroundColor: colors.cardBg,
    borderRadius: 24,
    padding: spacing.xxl,
    alignItems: 'center',
    marginVertical: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.md,
  },
  emptyButton: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  emptyButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  summaryContainer: {
    backgroundColor: colors.cardBg,
    borderRadius: 24,
    padding: spacing.lg,
    alignItems: 'center',
    marginVertical: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  topStatus: {
    alignItems: 'center',
    marginBottom: spacing.md,
    width: '100%',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 16,
  },
  statusText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  statusEmoji: {
    fontSize: 18,
    marginRight: 6,
  },
  pendingText: {
    fontSize: 15,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  flowerContainer: {
    marginVertical: spacing.md,
  },
  largeFlower: {
    fontSize: 64,
  },
  actionsSection: {
    width: '100%',
    marginTop: spacing.md,
  },
  actionsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  actionList: {
    width: '100%',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fafafa',
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: '#eee',
  },
  actionIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#eee',
    marginRight: spacing.sm,
  },
  actionRowContent: {
    flex: 1,
  },
  actionRowTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  actionRowMessage: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  actionRowTime: {
    fontSize: 12,
    color: colors.textLight,
    marginTop: 2,
  },
  emptyActionContainer: {
    padding: spacing.xl,
    alignItems: 'center',
    backgroundColor: '#fafafa',
    borderRadius: 12,
  },
  emptyActionText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  historyBtn: {
    marginTop: spacing.xl,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
  },
  historyBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.primary,
  },
});
