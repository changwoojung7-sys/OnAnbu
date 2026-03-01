import { Ionicons } from '@expo/vector-icons';
import { Audio, ResizeMode, Video } from 'expo-av';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Image, Modal, Platform, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { colors } from '@/constants/Colors';
import { strings } from '@/constants/strings';
import { borderRadius, spacing, typography } from '@/constants/theme';
import { AdEventType, RewardedAd, RewardedAdEventType } from '@/lib/admob';
import { supabase } from '@/lib/supabase';
import { ActionLog } from '@/lib/types';
import { useActionStore } from '@/stores/actionStore';
import { useAuthStore } from '@/stores/authStore';

const adUnitId = __DEV__
    ? (Platform.OS === 'ios' ? 'ca-app-pub-3940256099942544/1712485313' : 'ca-app-pub-3940256099942544/5224354917')
    : 'ca-app-pub-2810872681064029/3833978077';

interface HistoryFeedProps {
    hideHeader?: boolean;
    headerTitle?: string;
    showBackButton?: boolean;
    onBackPress?: () => void;
}

const MOOD_MAP: Record<string, { emoji: string; label: string }> = {
    great: { emoji: '😊', label: '아주 좋아요' },
    good: { emoji: '🙂', label: '좋아요' },
    okay: { emoji: '😐', label: '그저 그래요' },
    not_good: { emoji: '😔', label: '좋지 않아요' },
};

export function HistoryFeed({
    hideHeader = false,
    headerTitle,
    showBackButton = false,
    onBackPress
}: HistoryFeedProps) {
    const { user, selectedParent } = useAuthStore();
    const [actions, setActions] = useState<ActionLog[]>([]);
    const [moodByDate, setMoodByDate] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    // Audio Playback state
    const [sound, setSound] = useState<Audio.Sound | null>(null);
    const [playingId, setPlayingId] = useState<string | null>(null);

    // PlayMovie state
    const [isMoviePlaying, setIsMoviePlaying] = useState(false);
    const [movieIndex, setMovieIndex] = useState(0);
    const [isLoadingAd, setIsLoadingAd] = useState(false);
    const [isPlayingPaused, setIsPlayingPaused] = useState(false);
    const [bgmSound, setBgmSound] = useState<Audio.Sound | null>(null);

    const { addAction } = useActionStore(); // Add Ad logic variables here

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

            // 부모님 기분(daily_status) 조회
            try {
                // 조회된 그룹에 연결된 부모님 ID 수집
                const { data: groups } = await supabase
                    .from('family_groups')
                    .select('parent_id')
                    .in('id', targetGroupIds);
                const parentIds = groups?.map((g: any) => g.parent_id) || [];
                // user 본인이 parent인 경우도 포함
                if (user?.id && !parentIds.includes(user.id)) {
                    parentIds.push(user.id);
                }
                if (parentIds.length > 0) {
                    const { data: statuses } = await supabase
                        .from('daily_status')
                        .select('parent_id, status_date, mood')
                        .in('parent_id', parentIds)
                        .not('mood', 'is', null)
                        .order('status_date', { ascending: false })
                        .limit(30);
                    if (statuses) {
                        const moodMap: Record<string, string> = {};
                        statuses.forEach((s: any) => {
                            // key: "parentId_date" 형태로 저장
                            moodMap[`${s.parent_id}_${s.status_date}`] = s.mood;
                        });
                        setMoodByDate(moodMap);
                    }
                }
            } catch (moodErr) {
                console.log('[History] Mood fetch error (ignored):', moodErr);
            }
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

    // PlayMovie 기능
    const startPlayMovie = async () => {
        if (actions.length === 0) {
            Alert.alert('알림', '아직 모아볼 추억이 없습니다.');
            return;
        }
        setMovieIndex(0);
        setIsMoviePlaying(true);
        setIsPlayingPaused(false);

        // BGM Load and Play
        try {
            if (!bgmSound) {
                const { sound } = await Audio.Sound.createAsync(
                    require('../../public/bgm_Anbu.mp3'),
                    { isLooping: true, volume: 0.5 }
                );
                setBgmSound(sound);
                await sound.playAsync();
            } else {
                await bgmSound.setPositionAsync(0);
                await bgmSound.playAsync();
            }
        } catch (e) {
            console.log('BGM Load Error (ignored):', e);
        }
    };

    const handlePlayMovieClick = () => {
        if (actions.length === 0) {
            Alert.alert('알림', '아직 모아볼 추억이 없습니다.');
            return;
        }

        if (Platform.OS === 'web') {
            startPlayMovie();
            return;
        }

        setIsLoadingAd(true);
        const rewarded = RewardedAd.createForAdRequest(adUnitId, {
            requestNonPersonalizedAdsOnly: true,
            keywords: ['family', 'memory', 'photo', 'history'],
        });

        const unsubscribeLoaded = rewarded.addAdEventListener(RewardedAdEventType.LOADED, () => {
            setIsLoadingAd(false);
            rewarded.show();
        });

        const unsubscribeEarned = rewarded.addAdEventListener(
            RewardedAdEventType.EARNED_REWARD,
            () => {
                startPlayMovie();
            }
        );

        const unsubscribeClosed = rewarded.addAdEventListener(AdEventType.CLOSED, () => {
            setIsLoadingAd(false);
            unsubscribeLoaded();
            unsubscribeEarned();
            unsubscribeClosed();
            unsubscribeError();
        });

        const unsubscribeError = rewarded.addAdEventListener(AdEventType.ERROR, (error) => {
            setIsLoadingAd(false);
            Alert.alert(
                '광고 오류',
                '광고를 불러오는 중 오류가 발생했습니다. 추억 앨범을 바로 보여드릴게요.',
                [{ text: '확인', onPress: startPlayMovie }]
            );
            unsubscribeLoaded();
            unsubscribeEarned();
            unsubscribeClosed();
            unsubscribeError();
        });

        rewarded.load();
    };

    // 슬라이드 타이머 로직
    React.useEffect(() => {
        let timer: NodeJS.Timeout;
        if (isMoviePlaying && !isPlayingPaused) {
            timer = setTimeout(() => {
                if (movieIndex < actions.length - 1) {
                    setMovieIndex(movieIndex + 1);
                } else {
                    setIsMoviePlaying(false);
                }
            }, 3500); // 3.5초 간격 전환
        }
        return () => clearTimeout(timer);
    }, [isMoviePlaying, movieIndex, isPlayingPaused, actions.length]);

    // BGM 재생/일시정지 연동 로직
    React.useEffect(() => {
        const manageBgm = async () => {
            if (!bgmSound) return;

            if (!isMoviePlaying) {
                await bgmSound.pauseAsync();
                return;
            }

            const currentAction = actions[movieIndex];
            const isVideo = (currentAction?.type === 'video' || (currentAction?.type === 'message' && currentAction.content_url?.endsWith('.mp4'))) && !!currentAction.content_url;
            const isAudio = (currentAction?.type === 'voice_cheer' || (currentAction?.type === 'message' && currentAction.content_url?.endsWith('.m4a'))) && !!currentAction.content_url;

            if (isVideo || isAudio) {
                // 영상/음성일 땐 BGM 일시정지
                await bgmSound.pauseAsync();
            } else {
                if (!isPlayingPaused) {
                    await bgmSound.playAsync();
                } else {
                    await bgmSound.pauseAsync();
                }
            }
        };
        manageBgm();
    }, [isMoviePlaying, movieIndex, isPlayingPaused, bgmSound, actions]);

    // 언마운트 시 BGM 정리
    React.useEffect(() => {
        return () => {
            if (bgmSound) bgmSound.unloadAsync();
        };
    }, [bgmSound]);

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

        // 해당 날짜의 부모님 기분 조회
        const itemDate = item.created_at.split('T')[0];
        const parentId = item.parent_id;
        const moodKey = `${parentId}_${itemDate}`;
        const moodValue = moodByDate[moodKey];
        const moodInfo = moodValue ? MOOD_MAP[moodValue] : null;

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

                {/* 부모님 기분 표시 (해당 날짜에 mood가 기록된 경우) */}
                {isFromParent && moodInfo && (
                    <View style={styles.moodBadge}>
                        <Text style={styles.moodBadgeEmoji}>{moodInfo.emoji}</Text>
                        <Text style={styles.moodBadgeText}>오늘 기분: {moodInfo.label}</Text>
                    </View>
                )}
            </View>
        );
    };

    return (
        <View style={{ flex: 1 }}>
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            >
                {!hideHeader && (
                    <View style={styles.headerRow}>
                        <View style={styles.headerLeft}>
                            {showBackButton && onBackPress && (
                                <TouchableOpacity onPress={onBackPress} style={styles.backBtn}>
                                    <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
                                </TouchableOpacity>
                            )}
                            <Text style={styles.title}>{headerTitle || strings.history.title}</Text>
                        </View>
                        <View style={styles.headerRight}>
                            <TouchableOpacity style={styles.playMovieBtn} onPress={handlePlayMovieClick}>
                                <Ionicons name="film-outline" size={16} color={colors.primary} />
                                <Text style={styles.playMovieText}>추억 모아보기</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.refreshIconBtn} onPress={onRefresh}>
                                <Ionicons name="refresh" size={20} color={colors.textSecondary} />
                            </TouchableOpacity>
                        </View>
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

            {/* Play Movie Modal */}
            <Modal
                visible={isMoviePlaying}
                animationType="fade"
                transparent={false}
                onRequestClose={() => {
                    setIsMoviePlaying(false);
                    if (bgmSound) bgmSound.pauseAsync();
                }}
            >
                <View style={styles.movieContainer}>
                    {/* 상단 프로그레스 바 영역 */}
                    <View style={styles.movieHeader}>
                        <View style={styles.progressContainer}>
                            {actions.map((_, idx) => (
                                <View
                                    key={idx}
                                    style={[
                                        styles.progressSegment,
                                        idx < movieIndex ? styles.progressSegmentPassed :
                                            idx === movieIndex ? styles.progressSegmentActive : null
                                    ]}
                                />
                            ))}
                        </View>
                        <TouchableOpacity
                            style={styles.movieCloseBtn}
                            onPress={() => {
                                setIsMoviePlaying(false);
                                if (bgmSound) bgmSound.pauseAsync();
                            }}
                        >
                            <Ionicons name="close" size={28} color="#fff" />
                        </TouchableOpacity>
                    </View>

                    {/* 메인 슬라이드 콘텐츠 - Full Screen */}
                    <View style={[styles.movieContent, { paddingHorizontal: 0, paddingVertical: 0 }]}>
                        {actions.length > 0 && isMoviePlaying && (() => {
                            const item = actions[movieIndex];
                            const isVideo = (item.type === 'video' || (item.type === 'message' && item.content_url?.endsWith('.mp4'))) && !!item.content_url;
                            const isAudio = (item.type === 'voice_cheer' || (item.type === 'message' && item.content_url?.endsWith('.m4a'))) && !!item.content_url;
                            const isPhoto = (item.type === 'photo' || (item.type === 'message' && !item.content_url?.endsWith('.mp4') && !item.content_url?.endsWith('.m4a'))) && !!item.content_url;
                            const hasText = !!item.message;

                            const typedItem = item as any;
                            const senderName = (typedItem.type === 'message' || (typedItem.type === 'check_in' && typedItem.message === '일어났어요! ☀️'))
                                ? (typedItem.parent?.name || '부모님')
                                : (typedItem.guardian?.name || '가족');

                            return (
                                <View style={{ flex: 1, backgroundColor: '#000', width: '100%', justifyContent: 'center', alignItems: 'center' }}>
                                    {/* 상단 작성자 및 시간 정보 */}
                                    <View style={{
                                        position: 'absolute',
                                        top: 20,
                                        left: 20,
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        zIndex: 20,
                                        backgroundColor: 'rgba(0,0,0,0.5)',
                                        paddingHorizontal: 12,
                                        paddingVertical: 6,
                                        borderRadius: 20,
                                    }}>
                                        <Ionicons name="person-circle" size={24} color="#fff" style={{ marginRight: 6 }} />
                                        <View>
                                            <Text style={{ color: '#fff', fontSize: 14, fontWeight: 'bold' }}>{senderName}</Text>
                                            <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12 }}>{formatDate(item.created_at)} · {formatTime(item.created_at)}</Text>
                                        </View>
                                    </View>

                                    {isPhoto && item.content_url && (
                                        <Image source={{ uri: item.content_url }} style={{ flex: 1, width: '100%', height: '100%' }} resizeMode="contain" />
                                    )}
                                    {isVideo && item.content_url && (
                                        <View style={{ flex: 1, width: '100%', justifyContent: 'center', alignItems: 'center' }}>
                                            <Video
                                                source={{ uri: item.content_url }}
                                                style={{ width: '100%', height: '100%', alignSelf: 'center' }}
                                                useNativeControls={false}
                                                resizeMode={ResizeMode.CONTAIN}
                                                shouldPlay={!isPlayingPaused}
                                                isLooping={true}
                                            />
                                        </View>
                                    )}
                                    {isAudio && item.content_url && (
                                        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                                            <Ionicons name="mic-circle" size={120} color={colors.primary} />
                                            <Text style={{ color: '#fff', marginTop: 16, fontSize: 18, fontWeight: '500' }}>음성 메시지 듣는 중...</Text>
                                            <Video
                                                source={{ uri: item.content_url }}
                                                style={{ width: 0, height: 0 }}
                                                useNativeControls={false}
                                                shouldPlay={!isPlayingPaused}
                                            />
                                        </View>
                                    )}
                                    {hasText && (
                                        <View style={{
                                            position: 'absolute',
                                            bottom: 120,
                                            backgroundColor: 'rgba(0,0,0,0.65)',
                                            padding: 24,
                                            borderRadius: 12,
                                            width: '85%',
                                            alignItems: 'center'
                                        }}>
                                            <Text style={{ color: '#fff', fontSize: 20, textAlign: 'center', lineHeight: 30 }}>"{item.message}"</Text>
                                        </View>
                                    )}
                                </View>
                            );
                        })()}
                    </View>

                    {/* 하단 투명 컨트롤 */}
                    <View style={styles.movieControls}>
                        <TouchableOpacity
                            style={styles.movieControlBtn}
                            onPress={() => setMovieIndex(prev => Math.max(0, prev - 1))}
                        >
                            <Ionicons name="chevron-back" size={32} color="#fff" />
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.movieControlBtn}
                            onPress={() => setIsPlayingPaused(!isPlayingPaused)}
                        >
                            <Ionicons name={isPlayingPaused ? "play" : "pause"} size={32} color="#fff" />
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.movieControlBtn}
                            onPress={() => setMovieIndex(prev => Math.min(actions.length - 1, prev + 1))}
                        >
                            <Ionicons name="chevron-forward" size={32} color="#fff" />
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Loading Ad Modal */}
            <Modal visible={isLoadingAd} transparent={true} animationType="fade">
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' }}>
                    <ActivityIndicator size="large" color="#ffffff" />
                    <Text style={{ color: '#ffffff', marginTop: 16, fontSize: 16, fontWeight: '600' }}>추억을 불러오는 중입니다...</Text>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: spacing.lg,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.lg,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    backBtn: {
        paddingRight: spacing.sm,
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    playMovieBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.primary + '15',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        marginRight: spacing.sm,
    },
    playMovieText: {
        ...typography.small,
        color: colors.primary,
        fontWeight: '600',
        marginLeft: 4,
    },
    refreshIconBtn: {
        padding: spacing.xs,
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
    moodBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing.md,
        gap: 6,
    },
    moodBadgeEmoji: {
        fontSize: 18,
    },
    moodBadgeText: {
        ...typography.small,
        color: colors.textSecondary,
        fontWeight: '500',
    },
    emptySubText: {
        ...typography.small,
        color: colors.textLight,
    },
    // Movie Modal Styles
    movieContainer: {
        flex: 1,
        backgroundColor: '#000',
    },
    movieHeader: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        paddingTop: 50,
        paddingHorizontal: spacing.md,
        zIndex: 10,
        flexDirection: 'row',
        alignItems: 'center',
    },
    progressContainer: {
        flex: 1,
        flexDirection: 'row',
        height: 4,
        gap: 4,
        marginRight: spacing.lg,
    },
    progressSegment: {
        flex: 1,
        height: '100%',
        backgroundColor: 'rgba(255,255,255,0.3)',
        borderRadius: 2,
    },
    progressSegmentPassed: {
        backgroundColor: 'rgba(255,255,255,0.6)',
    },
    progressSegmentActive: {
        backgroundColor: '#fff',
    },
    movieCloseBtn: {
        padding: spacing.xs,
    },
    movieContent: {
        flex: 1,
        justifyContent: 'center',
        paddingHorizontal: spacing.md,
    },
    movieControls: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        paddingBottom: 40,
        paddingHorizontal: spacing.xl,
    },
    movieControlBtn: {
        padding: spacing.md,
    },
});
