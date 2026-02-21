import { Ionicons } from '@expo/vector-icons';
import { Audio, ResizeMode, Video } from 'expo-av';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { Alert, Image, Platform, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { colors } from '@/constants/Colors';
import { strings } from '@/constants/strings';
import { borderRadius, spacing, typography } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { ActionLog } from '@/lib/types';
import { useAuthStore } from '@/stores/authStore';

interface HistoryFeedProps {
    hideHeader?: boolean;
}

export function HistoryFeed({ hideHeader = false }: HistoryFeedProps) {
    const { user, selectedParent } = useAuthStore();
    const [actions, setActions] = useState<ActionLog[]>([]);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    // Audio Playback state
    const [sound, setSound] = useState<Audio.Sound | null>(null);
    const [playingId, setPlayingId] = useState<string | null>(null);

    // 현재 연동된 대표 부모님 / 그룹 파악
    const parentName = selectedParent?.name || '부모님';

    const fetchBidirectionalHistory = async () => {
        if (!user?.id) return;
        try {
            setLoading(true);

            let targetGroupIds: string[] = [];

            // 1. 만약 자녀(보호자) 모드이고, 선택된 부모님이 있다면 해당 부모님과의 그룹만 조회
            if (selectedParent?.id) {
                const { data: specificGroup } = await supabase
                    .from('family_groups')
                    .select('id')
                    .eq('parent_id', selectedParent.id)
                    .single();

                if (specificGroup) {
                    targetGroupIds = [specificGroup.id];
                }
            }
            // 2. 부모님 본인이 로그인했거나, 선택된 부모님이 없는 경우 (기존 로직 전체 조회 폴백)
            else {
                const { data: memberGroups } = await supabase
                    .from('family_members')
                    .select('group_id')
                    .eq('guardian_id', user.id);

                const { data: parentGroups } = await supabase
                    .from('family_groups')
                    .select('id')
                    .eq('parent_id', user.id);

                targetGroupIds = [
                    ...(memberGroups?.map((m: any) => m.group_id) || []),
                    ...(parentGroups?.map((p: any) => p.id) || [])
                ];
            }

            if (targetGroupIds.length === 0) {
                setActions([]);
                return;
            }

            // 그룹 ID 기반 양방향 히스토리 조회
            const { data: logs, error } = await supabase
                .from('action_logs')
                .select('*, guardian:profiles!action_logs_guardian_id_fkey(name, avatar_url), parent:profiles!action_logs_parent_id_fkey(name, avatar_url)')
                .in('group_id', targetGroupIds)
                .order('created_at', { ascending: false });

            if (error) throw error;
            if (logs) setActions(logs as any[]);
        } catch (err) {
            console.error('[History] Fetch error:', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchBidirectionalHistory();
            return () => {
                // 컴포넌트 언마운트 또는 포커스 잃을 때 사운드 정리
                if (sound) {
                    sound.unloadAsync();
                }
            };
        }, [user?.id, selectedParent?.id, sound])
    );

    const playAudio = async (uri: string, id: string) => {
        try {
            if (sound && playingId === id) {
                // 이미 해당 audio가 재생 중이라면 일시정지 (또는 정지)
                await sound.stopAsync();
                setPlayingId(null);
                return;
            }

            // 기존 사운드 존재하면 정리
            if (sound) {
                await sound.unloadAsync();
            }

            const { sound: newSound } = await Audio.Sound.createAsync(
                { uri },
                { shouldPlay: true }
            );

            setSound(newSound);
            setPlayingId(id);

            // 재생 완료 콜백
            newSound.setOnPlaybackStatusUpdate((status) => {
                if (status.isLoaded && status.didJustFinish) {
                    setPlayingId(null);
                }
            });
        } catch (error) {
            console.error('Audio play error:', error);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        fetchBidirectionalHistory();
    };

    const monthlyCount = useMemo(() => {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        return actions.filter(a => new Date(a.created_at) >= startOfMonth).length;
    }, [actions]);

    const formatDate = (isoString: string) => {
        const date = new Date(isoString);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        if (date.toDateString() === today.toDateString()) return '오늘';
        if (date.toDateString() === yesterday.toDateString()) return '어제';
        return `${date.getMonth() + 1}월 ${date.getDate()}일`;
    };

    const formatTime = (isoString: string) => {
        const date = new Date(isoString);
        const hours = date.getHours();
        const minutes = date.getMinutes().toString().padStart(2, '0');
        const period = hours >= 12 ? '오후' : '오전';
        const displayHours = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
        return `${period} ${displayHours}:${minutes}`;
    };

    const getActionIcon = (type: string) => {
        if (type === 'voice_cheer') return 'mic';
        if (type === 'video') return 'videocam';
        if (type === 'photo') return 'image';
        return 'heart';
    };

    const getActionLabel = (type: string, senderName: string, isFromParent: boolean) => {
        const prefix = `[${senderName}] `;
        if (isFromParent) {
            if (type === 'message') {
                return `${prefix}사진/영상`;
            }
            return `${prefix}안부 확인`;
        }

        if (type === 'voice_cheer') return `${prefix}음성 응원`;
        if (type === 'video') return `${prefix}동영상 안부`;
        if (type === 'photo') return `${prefix}사진 안부`;
        return `${prefix}안부 체크`;
    };

    const handleDelete = async (id: string, contentUrl?: string) => {
        const performDelete = async () => {
            try {
                // If there is media, try to delete it from storage first
                if (contentUrl && contentUrl.includes('supabase.co/storage/v1/object/public/media/')) {
                    try {
                        const filePath = contentUrl.split('supabase.co/storage/v1/object/public/media/')[1];
                        if (filePath) {
                            await supabase.storage.from('media').remove([filePath]);
                        }
                    } catch (storageErr) {
                        console.log('Storage delete error (ignored):', storageErr);
                    }
                }

                // Always delete DB record even if storage delete fails
                const { error } = await supabase
                    .from('action_logs')
                    .delete()
                    .eq('id', id);
                if (error) throw error;

                // 로컬 상태 즉시 업데이트
                setActions(prev => prev.filter(a => a.id !== id));
            } catch (err) {
                console.error('Delete error:', err);
                Alert.alert('오류', '삭제 중 문제가 발생했습니다.');
            }
        };

        if (Platform.OS === 'web') {
            if (window.confirm('이 기록을 정말 삭제하시겠습니까?')) {
                performDelete();
            }
        } else {
            Alert.alert(
                '기록 삭제',
                '이 기록을 정말 삭제하시겠습니까?',
                [
                    { text: '취소', style: 'cancel' },
                    { text: '삭제', style: 'destructive', onPress: performDelete }
                ]
            );
        }
    };

    const renderActionItem = (item: any) => {
        // 부모님이 보낸 것인지 확인
        const isFromParent = item.type === 'message' || (item.type === 'check_in' && item.message === '일어났어요! ☀️');
        const senderName = isFromParent
            ? (item.parent?.name || '부모님')
            : (item.guardian?.name || '가족');

        // 미디어 판별 (부모님이 보낸 message 타입에도 대응)
        const isVideo = (item.type === 'video' || (item.type === 'message' && item.content_url?.endsWith('.mp4'))) && !!item.content_url;
        const isAudio = (item.type === 'voice_cheer' || (item.type === 'message' && item.content_url?.endsWith('.m4a'))) && !!item.content_url;
        const isPhoto = (item.type === 'photo' || (item.type === 'message' && !item.content_url?.endsWith('.mp4') && !item.content_url?.endsWith('.m4a'))) && !!item.content_url;

        const hasText = !!item.message;
        const isPlaying = playingId === item.id;

        // 내가 보낸 기록인지 확인 (삭제 권한)
        const isMyRecord = (user?.id === item.guardian_id && !isFromParent) || (user?.id === item.parent_id && isFromParent);

        return (
            <View key={item.id} style={styles.actionCard}>
                {/* Header: User Info & Time */}
                <View style={styles.actionCardHeader}>
                    <View style={styles.senderAvatarContainer}>
                        {(isFromParent ? item.parent?.avatar_url : item.guardian?.avatar_url) ? (
                            <Image
                                source={{ uri: isFromParent ? item.parent.avatar_url : item.guardian.avatar_url }}
                                style={styles.senderAvatar}
                            />
                        ) : (
                            <View style={styles.senderAvatarPlaceholder}>
                                <Ionicons name="person" size={16} color={colors.textSecondary} />
                            </View>
                        )}
                        <View style={styles.actionIconBadge}>
                            <Ionicons
                                name={getActionIcon(item.type)}
                                size={12}
                                color={colors.textWhite}
                            />
                        </View>
                    </View>
                    <View style={styles.actionContent}>
                        <Text style={styles.actionLabel}>{getActionLabel(item.type, senderName, isFromParent)}</Text>
                        <Text style={styles.actionTime}>
                            {formatDate(item.created_at)} · {formatTime(item.created_at)}
                        </Text>
                    </View>

                    {/* Audio Play Button Moved to Header Right */}
                    {isAudio && (
                        <TouchableOpacity
                            style={styles.audioPlayBtn}
                            onPress={() => playAudio(item.content_url, item.id)}
                        >
                            <Ionicons
                                name={isPlaying ? "stop-circle" : "play-circle"}
                                size={36}
                                color={colors.primary}
                            />
                        </TouchableOpacity>
                    )}

                    {/* Delete Button (Only for own records) */}
                    {isMyRecord && (
                        <TouchableOpacity
                            style={styles.deleteBtn}
                            onPress={() => handleDelete(item.id, item.content_url)}
                        >
                            <Ionicons name="trash-outline" size={20} color={colors.textLight} />
                        </TouchableOpacity>
                    )}
                </View>

                {/* Media Block (Photo or Video) */}
                {(isPhoto || isVideo) && (
                    <View style={styles.mediaContainer}>
                        {isPhoto && (
                            <Image
                                source={{ uri: item.content_url }}
                                style={styles.mediaImage}
                                resizeMode="cover"
                            />
                        )}
                        {isVideo && (
                            <Video
                                style={styles.mediaVideo}
                                source={{ uri: item.content_url }}
                                useNativeControls
                                resizeMode={ResizeMode.COVER}
                                isLooping={false}
                            />
                        )}
                    </View>
                )}

                {/* Text Message Block / Caption */}
                {hasText && (
                    <View style={[styles.messageBubble, !(isPhoto || isVideo) && styles.messageBubbleStandAlone]}>
                        <Text style={styles.messageText}>"{item.message}"</Text>
                    </View>
                )}
            </View>
        );
    };

    return (
        <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
            {!hideHeader && (
                <View style={styles.header}>
                    <Text style={styles.title}>{strings.history.title}</Text>
                </View>
            )}

            <View style={styles.summaryCard}>
                <Text style={styles.summaryEmoji}>💕</Text>
                <Text style={styles.summaryText}>
                    이번 달, 우리 가족은 총 {monthlyCount}번 마음을 전했어요!
                </Text>
            </View>

            {actions.length > 0 ? (
                <View style={styles.listContainer}>
                    {actions.map(renderActionItem)}
                </View>
            ) : (
                <View style={styles.emptyContainer}>
                    <Text style={styles.emptyEmoji}>📝</Text>
                    <Text style={styles.emptyText}>{strings.history.emptyState}</Text>
                    <Text style={styles.emptySubText}>{strings.history.emptyStateSub}</Text>
                </View>
            )}
        </ScrollView>
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
        marginBottom: spacing.lg,
    },
    title: {
        ...typography.h1,
        color: colors.textPrimary,
    },
    summaryCard: {
        backgroundColor: colors.complete,
        borderRadius: borderRadius.xl,
        padding: spacing.xl,
        alignItems: 'center',
        marginBottom: spacing.xl,
    },
    summaryEmoji: {
        fontSize: 48,
        marginBottom: spacing.md,
    },
    summaryText: {
        ...typography.bodyLarge,
        color: colors.textPrimary,
        textAlign: 'center',
    },
    listContainer: {
        paddingBottom: spacing.xxl,
    },
    actionCard: {
        backgroundColor: colors.cardBg,
        borderRadius: borderRadius.xl,
        marginBottom: spacing.lg,
        overflow: 'hidden', // 미디어가 테두리를 벗어나지 않게 처리
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 3,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.02)',
    },
    actionCardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.lg,
    },
    senderAvatarContainer: {
        position: 'relative',
        marginRight: spacing.md,
    },
    senderAvatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: colors.background,
    },
    senderAvatarPlaceholder: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: colors.pendingAccent,
        alignItems: 'center',
        justifyContent: 'center',
    },
    actionIconBadge: {
        position: 'absolute',
        bottom: -2,
        right: -2,
        backgroundColor: colors.primary,
        width: 20,
        height: 20,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: colors.cardBg,
    },
    actionContent: {
        flex: 1,
    },
    actionLabel: {
        ...typography.bodyLarge,
        fontWeight: '700',
        color: colors.textPrimary,
        marginBottom: 2,
    },
    actionTime: {
        ...typography.small,
        color: colors.textSecondary,
    },
    mediaContainer: {
        width: '100%',
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing.lg,
    },
    mediaImage: {
        width: '100%',
        height: 200,
        borderRadius: borderRadius.lg,
        backgroundColor: '#f5f5f5',
    },
    mediaVideo: {
        width: '100%',
        height: 200,
        borderRadius: borderRadius.lg,
        backgroundColor: '#000',
    },
    audioPlayBtn: {
        padding: spacing.xs,
        marginLeft: spacing.md,
    },
    deleteBtn: {
        padding: spacing.xs,
        marginLeft: spacing.sm,
    },
    messageBubble: {
        padding: spacing.lg,
        backgroundColor: colors.cardBg,
    },
    messageBubbleStandAlone: {
        // Media가 없이 텍스트만 존재할 때의 예쁜 배경 테두리
        marginHorizontal: spacing.lg,
        marginBottom: spacing.lg,
        backgroundColor: '#fafafa',
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        borderColor: colors.borderLight,
        padding: spacing.md,
    },
    messageText: {
        ...typography.body,
        color: colors.textPrimary,
        lineHeight: 24,
        letterSpacing: -0.2,
    },
    emptyContainer: {
        alignItems: 'center',
        paddingVertical: spacing.xxl,
    },
    emptyEmoji: {
        fontSize: 48,
        marginBottom: spacing.md,
    },
    emptyText: {
        ...typography.bodyLarge,
        color: colors.textSecondary,
        marginBottom: spacing.xs,
    },
    emptySubText: {
        ...typography.small,
        color: colors.textLight,
    },
});
