import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ParentProfile, StatusCard } from '@/components/home';
import { colors } from '@/constants/Colors';
import { commonStyles, spacing } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { useActionStore } from '@/stores/actionStore';
import { useAuthStore } from '@/stores/authStore';
import { Modal, Text, TouchableOpacity } from 'react-native';

export default function HomeScreen() {
  const router = useRouter();
  const { todayStatus } = useActionStore();
  const { selectedParent, parents, setSelectedParent } = useAuthStore();

  const [isComplete, setIsComplete] = useState(false);
  const [lastActionTime, setLastActionTime] = useState<string | null>(null);
  const [lastActionType, setLastActionType] = useState<string | null>(null);
  const [lastActionMessage, setLastActionMessage] = useState<string | null>(null);
  const [lastActionUrl, setLastActionUrl] = useState<string | null>(null);

  const [isParentModalVisible, setParentModalVisible] = useState(false);

  // 현재 선택된 부모님의 오늘 자 기상/안부 기록을 가져온다
  useEffect(() => {
    if (!selectedParent) return;

    const fetchTodayStatus = async () => {
      try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const { data, error } = await supabase
          .from('action_logs')
          .select('created_at, type, message, content_url')
          .eq('parent_id', selectedParent.id)
          .gte('created_at', today.toISOString())
          .in('type', ['check_in', 'voice_cheer', 'message'])
          .order('created_at', { ascending: false })
          .limit(1);

        if (error) throw error;

        if (data && data.length > 0) {
          setIsComplete(true);
          setLastActionTime(data[0].created_at);
          setLastActionType(data[0].type);
          setLastActionMessage(data[0].message);
          setLastActionUrl(data[0].content_url);
        } else {
          setIsComplete(false);
          setLastActionTime(null);
          setLastActionType(null);
          setLastActionMessage(null);
          setLastActionUrl(null);
        }
      } catch (e) {
        console.error('Error fetching parent status:', e);
      }
    };

    fetchTodayStatus();
  }, [selectedParent?.id]);

  // [추가] 화면 포커스 시 부모님 목록 최신화 (프로필 사진 등 반영용)
  useFocusEffect(
    useCallback(() => {
      // 컴포넌트 마운트/포커스 시 추가 로직이 필요하면 여기에 작성
    }, [])
  );

  const handleCarePress = useCallback(async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/care');
  }, [router]);

  const handleSettingsPress = useCallback(() => {
    router.push('/settings');
  }, [router]);

  // 예시 부모님 정보 (실제로는 selectedParent 사용)
  const parentName = selectedParent?.name || '어머니';
  const parentAvatar = selectedParent?.avatar_url || null;

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
          <Pressable
            onPress={handleSettingsPress}
            style={styles.settingsButton}
          >
            <Ionicons name="settings-outline" size={24} color={colors.textSecondary} />
          </Pressable>
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
          <StatusCard
            isComplete={isComplete}
            parentName={parentName}
            lastActionTime={lastActionTime}
            actionType={lastActionType}
            actionMessage={lastActionMessage}
            actionUrl={lastActionUrl}
          />
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
});
