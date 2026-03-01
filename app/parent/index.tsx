import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors } from '@/constants/Colors';
import { borderRadius, commonStyles, softShadow, spacing, typography } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { ActionLog } from '@/lib/types';
import { useAuthStore } from '@/stores/authStore';

export default function ParentHomeScreen() {
    const router = useRouter();
    const { user } = useAuthStore();

    const [pendingActions, setPendingActions] = useState<ActionLog[]>([]);
    const [todayMood, setTodayMood] = useState<string | null>(null);
    const [guardianName, setGuardianName] = useState('자녀');
    const [alreadyAwake, setAlreadyAwake] = useState(false);
    const [awakeLoading, setAwakeLoading] = useState(false);
    const [sendingMedia, setSendingMedia] = useState(false);
    const [groupId, setGroupId] = useState<string | null>(null);
    const [guardianId, setGuardianId] = useState<string | null>(null);

    // 음성 녹음 관련
    const [recording, setRecording] = useState<Audio.Recording | null>(null);
    const [isRecording, setIsRecording] = useState(false);

    // 음성 재생 관련
    const [sound, setSound] = useState<Audio.Sound | null>(null);
    const [playingId, setPlayingId] = useState<string | null>(null);

    // 새로고침 관련
    const [isRefreshing, setIsRefreshing] = useState(false);

    useFocusEffect(
        useCallback(() => {
            fetchPendingActions();
            fetchGuardianInfo();
            checkTodayAwake();

            return () => {
                if (sound) {
                    sound.unloadAsync();
                }
            };
        }, [])
    );

    const fetchPendingActions = async () => {
        if (!user?.id) return;
        setIsRefreshing(true);

        const today = new Date().toISOString().split('T')[0];
        const startOfDay = `${today}T00:00:00.000Z`;

        const { data } = await supabase
            .from('action_logs')
            .select('*, guardian:profiles!action_logs_guardian_id_fkey(name)')
            .eq('parent_id', user.id)
            .gte('created_at', startOfDay)
            .order('created_at', { ascending: false });

        if (data) {
            // 부모님 본인이 보낸 메시지는 받은 안부 목록에서 제외
            // - type='message': 부모님이 보낸 사진/동영상/음성
            // - '일어났어요! ☀️': 부모님의 기상 알림
            const received = data.filter((a: any) =>
                a.type !== 'message' && a.message !== '일어났어요! ☀️'
            );
            setPendingActions(received);
        }
        setIsRefreshing(false);
    };

    const fetchGuardianInfo = async () => {
        if (!user?.id) return;

        try {
            // 가족 그룹에서 주케어대상 정보 가져오기
            // 1. 내가 소속된 그룹 찾기 (parent_id가 나인 그룹)
            const { data: group, error: groupError } = await supabase
                .from('family_groups')
                .select('id')
                .eq('parent_id', user.id)
                .maybeSingle(); // single() 대신 maybeSingle() 사용 (없으면 null)

            if (groupError) {
                console.log('[Parent] 그룹 조회 에러:', groupError.message);
                return;
            }

            if (group) {
                setGroupId(group.id);
                console.log('[Parent] 그룹 ID 찾음:', group.id);

                const { data: member, error: memberError } = await supabase
                    .from('family_members')
                    .select('guardian_id, profiles:guardian_id(name)')
                    .eq('group_id', group.id)
                    .eq('role', 'primary')
                    .maybeSingle();

                if (memberError) {
                    console.log('[Parent] 주 보호자 조회 실패:', memberError.message);
                }

                if (member) {
                    setGuardianId(member.guardian_id);

                    if (member.profiles) {
                        const gName = (member.profiles as any).name || '자녀';
                        setGuardianName(gName);
                        console.log('[Parent] 주 보호자 연결됨:', gName, member.guardian_id);
                    } else {
                        console.log('[Parent] 주 보호자 프로필 조회 불가 (ID만 설정):', member.guardian_id);
                    }
                } else {
                    console.log('[Parent] 아직 주 보호자가 멤버로 추가되지 않음');
                }
            } else {
                console.log('[Parent] 아직 가족 그룹이 없습니다.');
            }
        } catch (err) {
            console.error('[Parent] fetchGuardianInfo 예외:', err);
        }
    };

    const checkTodayAwake = async () => {
        if (!user?.id) return;

        const today = new Date().toISOString().split('T')[0];
        const startOfDay = `${today}T00:00:00.000Z`;
        const endOfDay = `${today}T23:59:59.999Z`;

        const { data } = await supabase
            .from('action_logs')
            .select('id')
            .eq('parent_id', user.id)
            .eq('type', 'check_in')
            .gte('created_at', startOfDay)
            .lte('created_at', endOfDay)
            .limit(1);

        if (data && data.length > 0) {
            setAlreadyAwake(true);
        }
    };

    const handleMoodSelect = async (mood: string) => {
        setTodayMood(mood);

        if (!user?.id) return;

        // 오늘의 상태 저장
        const today = new Date().toISOString().split('T')[0];

        await supabase.from('daily_status').upsert({
            parent_id: user.id,
            status_date: today,
            mood,
        });
    };

    const handleAwake = async () => {
        if (!user?.id) return;

        if (alreadyAwake) {
            Alert.alert('알림', '오늘 이미 기상 알림을 보냈어요! ☀️');
            return;
        }

        if (!groupId || !guardianId) {
            console.log('[Parent] 전송 실패 - 연결 정보 없음', { groupId, guardianId });
            Alert.alert('연결 필요', '아직 자녀와 연결되지 않았거나 정보를 불러오는 중입니다. 잠시 후 다시 시도해주세요.');
            // 정보 다시 불러오기 시도
            fetchGuardianInfo();
            return;
        }

        setAwakeLoading(true);
        try {
            console.log('[Parent] 기상 알림 전송 시도...', { groupId, guardianId, parentId: user.id });

            const { error } = await supabase.from('action_logs').insert({
                group_id: groupId,
                guardian_id: guardianId,
                parent_id: user.id,
                type: 'check_in',
                message: '일어났어요! ☀️',
                status: 'pending',
            });

            if (error) {
                console.error('[Parent] 기상 알림 Insert 에러:', error);
                throw error;
            }

            setAlreadyAwake(true);
            Alert.alert('알림', `${guardianName}에게 기상 알림을 보냈어요! ☀️`);
        } catch (error: any) {
            console.error('[Parent] Awake error:', error);
            Alert.alert('오류', `알림 전송 실패: ${error?.message || '알 수 없는 오류'}`);
        } finally {
            setAwakeLoading(false);
        }
    };

    const handleViewAction = async (action: ActionLog) => {
        // 음성 메시지인 경우 바로 재생
        if (action.type === 'voice_cheer' && action.content_url) {
            try {
                if (sound && playingId === action.id) {
                    await sound.stopAsync();
                    setPlayingId(null);
                    return;
                }

                if (sound) {
                    await sound.unloadAsync();
                }

                const { sound: newSound } = await Audio.Sound.createAsync(
                    { uri: action.content_url },
                    { shouldPlay: true }
                );

                setSound(newSound);
                setPlayingId(action.id);

                newSound.setOnPlaybackStatusUpdate((status) => {
                    if (status.isLoaded && status.didJustFinish) {
                        setPlayingId(null);
                    }
                });

                // 상태 업데이트 (읽음 처리)
                if (action.status === 'pending') {
                    await supabase
                        .from('action_logs')
                        .update({ status: 'played', played_at: new Date().toISOString() })
                        .eq('id', action.id);
                    setPendingActions(prev => prev.filter(a => a.id !== action.id));
                }

                return; // 재생만 하고 화면 이동 안 함
            } catch (error) {
                console.error('Audio play error:', error);
                Alert.alert('오류', '음성을 재생할 수 없습니다.');
                return;
            }
        }

        // 액션을 재생/확인 처리 (안읽음 -> 읽음 변경)시키면서 상세(히스토리) 타임라인으로 바로 이동
        if (action.status === 'pending') {
            await supabase
                .from('action_logs')
                .update({ status: 'played', played_at: new Date().toISOString() })
                .eq('id', action.id);
            setPendingActions(prev => prev.filter(a => a.id !== action.id));
        }

        // 상세 히스토리 화면으로 이동
        router.push('/parent/history');
    };

    // 전체 기록 보기
    const handleViewFullHistory = () => {
        router.push('/parent/history');
    };

    // 사진 보내기
    const handleSendPhoto = async () => {
        if (!user?.id || !groupId || !guardianId) {
            Alert.alert('오류', '가족 그룹 정보를 찾을 수 없습니다.');
            return;
        }

        try {
            const permResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (!permResult.granted) {
                Alert.alert('권한 필요', '사진 접근 권한이 필요합니다.');
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.All,
                quality: 0.7,
                allowsEditing: true,
            });

            if (result.canceled || !result.assets || result.assets.length === 0) return;

            setSendingMedia(true);

            const asset = result.assets[0];
            const isVideo = asset.type === 'video';
            // 웹 환경: blob URI에서 확장자를 추출할 수 없으므로 기본값 사용
            const isWebBlobUri = asset.uri.startsWith('blob:') || asset.uri.startsWith('data:');
            const fileExt = isWebBlobUri
                ? (isVideo ? 'mp4' : 'jpg')
                : (asset.uri.split('.').pop() || (isVideo ? 'mp4' : 'jpg'));
            const fileName = `parent-${isVideo ? 'video' : 'photo'}-${user.id}-${Date.now()}.${fileExt}`;
            const filePath = `parent-messages/${fileName}`;
            const mimeType = isVideo ? `video/${fileExt}` : `image/${fileExt}`;

            // Supabase Storage에 업로드
            const response = await fetch(asset.uri);
            const blob = await response.blob();

            const { error: uploadError } = await supabase.storage
                .from('media')
                .upload(filePath, blob, {
                    contentType: mimeType,
                    upsert: false,
                });

            if (uploadError) throw uploadError;

            // Public URL 가져오기
            const { data: urlData } = supabase.storage
                .from('media')
                .getPublicUrl(filePath);

            const messageText = isVideo ? '🎥 동영상을 보냈습니다' : '📷 사진을 보냈습니다';

            // action_logs에 저장
            const { error: logError } = await supabase.from('action_logs').insert({
                group_id: groupId,
                guardian_id: guardianId,
                parent_id: user.id,
                type: 'message', // 부모님이 보낸 미디어는 message 타입으로 통일
                content_url: urlData.publicUrl,
                message: messageText,
                status: 'pending',
            });

            if (logError) throw logError;

            Alert.alert('전송 완료', `${guardianName}에게 ${isVideo ? '동영상을' : '사진을'} 보냈어요! 💌`);
        } catch (error: any) {
            console.error('Photo send error:', error);
            Alert.alert('오류', '사진 전송 중 문제가 발생했습니다.');
        } finally {
            setSendingMedia(false);
        }
    };

    // 음성 녹음 시작
    const handleStartRecording = async () => {
        try {
            const permission = await Audio.requestPermissionsAsync();
            if (!permission.granted) {
                Alert.alert('권한 필요', '마이크 사용 권한이 필요합니다.');
                return;
            }

            await Audio.setAudioModeAsync({
                allowsRecordingIOS: true,
                playsInSilentModeIOS: true,
            });

            const { recording: newRecording } = await Audio.Recording.createAsync(
                Audio.RecordingOptionsPresets.HIGH_QUALITY
            );

            setRecording(newRecording);
            setIsRecording(true);
        } catch (error) {
            console.error('Recording start error:', error);
            Alert.alert('오류', '녹음 시작에 실패했습니다.');
        }
    };

    // 음성 녹음 중지 및 전송
    const handleStopRecording = async () => {
        if (!recording || !user?.id || !groupId || !guardianId) return;

        setIsRecording(false);
        setSendingMedia(true);

        try {
            await recording.stopAndUnloadAsync();
            const uri = recording.getURI();
            setRecording(null);

            if (!uri) throw new Error('녹음 파일을 찾을 수 없습니다.');

            await Audio.setAudioModeAsync({
                allowsRecordingIOS: false,
            });

            const fileName = `parent-voice-${user.id}-${Date.now()}.m4a`;
            const filePath = `parent-messages/${fileName}`;

            // Supabase Storage에 업로드
            const response = await fetch(uri);
            const blob = await response.blob();

            const { error: uploadError } = await supabase.storage
                .from('media')
                .upload(filePath, blob, {
                    contentType: 'audio/m4a',
                    upsert: false,
                });

            if (uploadError) throw uploadError;

            // Public URL 가져오기
            const { data: urlData } = supabase.storage
                .from('media')
                .getPublicUrl(filePath);

            // action_logs에 저장
            const { error: logError } = await supabase.from('action_logs').insert({
                group_id: groupId,
                guardian_id: guardianId,
                parent_id: user.id,
                type: 'message',
                content_url: urlData.publicUrl,
                message: null,
                status: 'pending',
            });

            if (logError) throw logError;

            Alert.alert('전송 완료', `${guardianName}에게 음성 메시지를 보냈어요! 🎤`);
        } catch (error: any) {
            console.error('Voice send error:', error);
            Alert.alert('오류', '음성 전송 중 문제가 발생했습니다.');
        } finally {
            setSendingMedia(false);
        }
    };

    const moods = [
        { id: 'great', emoji: '😊', label: '아주 좋아요' },
        { id: 'good', emoji: '🙂', label: '좋아요' },
        { id: 'okay', emoji: '😐', label: '그저 그래요' },
        { id: 'not_good', emoji: '😔', label: '좋지 않아요' },
    ];

    const getActionIcon = (type: string) => {
        if (type === 'voice_cheer') return 'mic';
        if (type === 'video') return 'videocam';
        if (type === 'photo') return 'image';
        if (type === 'check_in') return 'sunny';
        return 'heart';
    };

    const getActionLabel = (type: string) => {
        if (type === 'voice_cheer') return '음성 메시지';
        if (type === 'video') return '동영상 안부';
        if (type === 'photo') return '사진 안부';
        if (type === 'check_in') return '안부 체크';
        return '안부 체크';
    };

    const getSenderName = (action: any) => {
        return (action.guardian as any)?.name || guardianName;
    };

    const formatTime = (isoString: string) => {
        const date = new Date(isoString);
        const hours = date.getHours();
        const minutes = date.getMinutes().toString().padStart(2, '0');
        const period = hours >= 12 ? '오후' : '오전';
        const displayHours = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
        return `${period} ${displayHours}:${minutes}`;
    };

    return (
        <SafeAreaView style={commonStyles.container} edges={['top']}>
            <View style={styles.mainContainer}>
                {/* Header */}
                <View style={styles.header}>
                    <View>
                        <Text style={styles.greeting}>안녕하세요, {user?.name || '사용자'}님 🌸</Text>
                        <Text style={styles.subGreeting}>
                            {pendingActions.length > 0
                                ? `${getSenderName(pendingActions[0])}(이)가 안부를 보냈어요`
                                : `${guardianName}(이)가 안부를 보냈어요`}
                        </Text>
                    </View>
                    <Pressable
                        style={styles.settingsButton}
                        onPress={() => router.push('/parent/settings')}
                    >
                        <Ionicons name="settings-outline" size={24} color={colors.textSecondary} />
                    </Pressable>
                </View>

                {/* Mood Selector */}
                <View style={styles.moodCard}>
                    <Text style={styles.moodTitle}>오늘 기분은 어떠세요?</Text>
                    <View style={styles.moodContainer}>
                        {moods.map((mood) => (
                            <Pressable
                                key={mood.id}
                                style={[
                                    styles.moodButton,
                                    todayMood === mood.id && styles.moodButtonActive,
                                ]}
                                onPress={() => handleMoodSelect(mood.id)}
                            >
                                <Text style={styles.moodEmoji}>{mood.emoji}</Text>
                                <Text style={[
                                    styles.moodLabel,
                                    todayMood === mood.id && styles.moodLabelActive,
                                ]}>
                                    {mood.label}
                                </Text>
                            </Pressable>
                        ))}
                    </View>
                </View>

                {/* Awake Button */}
                <Pressable
                    style={[
                        styles.awakeButton,
                        alreadyAwake && styles.awakeButtonDone,
                    ]}
                    onPress={handleAwake}
                    disabled={alreadyAwake || awakeLoading}
                >
                    {awakeLoading ? (
                        <ActivityIndicator color={colors.textWhite} />
                    ) : (
                        <>
                            <Text style={styles.awakeEmoji}>{alreadyAwake ? '✅' : '☀️'}</Text>
                            <Text style={[styles.awakeText, alreadyAwake && styles.awakeTextDone]}>
                                {alreadyAwake ? '오늘 이미 알렸어요' : '일어났어요!'}
                            </Text>
                        </>
                    )}
                </Pressable>

                {/* Pending Actions */}
                <View style={[styles.section, styles.pendingActionsSection]}>
                    <View style={styles.sectionHeader}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Text style={styles.sectionTitle}>
                                💌 오늘의 안부 {pendingActions.length > 0 && `(${pendingActions.length})`}
                            </Text>
                            <Pressable
                                onPress={fetchPendingActions}
                                disabled={isRefreshing}
                                hitSlop={10}
                                style={({ pressed }) => [{
                                    marginLeft: 6,
                                    marginTop: -4,
                                    opacity: pressed ? 0.6 : 1
                                }]}
                            >
                                {isRefreshing ? (
                                    <ActivityIndicator size="small" color={colors.primary} />
                                ) : (
                                    <Ionicons name="refresh" size={20} color={colors.primary} />
                                )}
                            </Pressable>
                        </View>
                        <Pressable onPress={handleViewFullHistory}>
                            <Text style={styles.viewHistoryText}>전체 보기 〉</Text>
                        </Pressable>
                    </View>

                    {pendingActions.length > 0 ? (
                        <ScrollView
                            style={styles.actionsScrollView}
                            contentContainerStyle={styles.actionsList}
                            showsVerticalScrollIndicator={false}
                        >
                            {pendingActions.map((action) => (
                                <Pressable
                                    key={action.id}
                                    style={styles.actionCard}
                                    onPress={() => handleViewAction(action)}
                                >
                                    <View style={styles.actionIconContainer}>
                                        <Ionicons
                                            name={getActionIcon(action.type)}
                                            size={24}
                                            color={colors.primary}
                                        />
                                    </View>
                                    <View style={styles.actionContent}>
                                        <Text style={styles.actionLabel}>
                                            {getSenderName(action)}님의 {getActionLabel(action.type)}
                                        </Text>
                                        <Text style={styles.actionTime}>
                                            {formatTime(action.created_at)}
                                        </Text>
                                    </View>
                                    <View style={styles.playButton}>
                                        <Ionicons
                                            name={action.type === 'voice_cheer' && playingId === action.id ? "stop" : "play"}
                                            size={20}
                                            color={colors.textWhite}
                                        />
                                    </View>
                                </Pressable>
                            ))}
                        </ScrollView>
                    ) : (
                        <View style={styles.emptyContainer}>
                            <Text style={styles.emptyEmoji}>📭</Text>
                            <Text style={styles.emptyText}>아직 받은 안부가 없어요</Text>
                            <Text style={styles.emptySubText}>
                                {guardianName}(이)가 곧 안부를 보낼 거예요
                            </Text>
                        </View>
                    )}
                </View>

                {/* Send Media Section */}
                <View style={styles.bottomSection}>
                    <Text style={styles.sectionTitle}>💝 안부 보내기</Text>

                    {sendingMedia && (
                        <View style={styles.sendingOverlay}>
                            <ActivityIndicator size="large" color={colors.primary} />
                            <Text style={styles.sendingText}>전송 중...</Text>
                        </View>
                    )}

                    <View style={styles.mediaButtons}>
                        <Pressable
                            style={[styles.mediaButton, sendingMedia && styles.mediaButtonDisabled]}
                            onPress={handleSendPhoto}
                            disabled={sendingMedia}
                        >
                            <View style={[styles.mediaIconContainer, { backgroundColor: '#FFF3E0' }]}>
                                <Ionicons name="camera" size={28} color="#FF9800" />
                            </View>
                            <Text style={styles.mediaButtonLabel}>📷 사진/동영상</Text>
                            <Text style={styles.mediaButtonHint}>앨범에서 선택</Text>
                        </Pressable>

                        <Pressable
                            style={[
                                styles.mediaButton,
                                isRecording && styles.mediaButtonRecording,
                                sendingMedia && styles.mediaButtonDisabled,
                            ]}
                            onPress={isRecording ? handleStopRecording : handleStartRecording}
                            disabled={sendingMedia}
                        >
                            <View style={[styles.mediaIconContainer, { backgroundColor: isRecording ? '#FFEBEE' : '#E8F5E9' }]}>
                                <Ionicons
                                    name={isRecording ? 'stop-circle' : 'mic'}
                                    size={28}
                                    color={isRecording ? '#F44336' : '#4CAF50'}
                                />
                            </View>
                            <Text style={styles.mediaButtonLabel}>
                                {isRecording ? '🔴 녹음 중...' : '🎤 음성 보내기'}
                            </Text>
                            <Text style={styles.mediaButtonHint}>
                                {isRecording ? '탭하여 전송' : '탭하여 녹음'}
                            </Text>
                        </Pressable>
                    </View>
                </View>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    mainContainer: {
        flex: 1,
        padding: spacing.lg,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: spacing.lg,
    },
    greeting: {
        ...typography.h2,
        color: colors.textPrimary,
    },
    subGreeting: {
        ...typography.body,
        color: colors.textSecondary,
        marginTop: spacing.xs,
    },
    settingsButton: {
        padding: spacing.sm,
    },
    moodCard: {
        backgroundColor: colors.cardBg,
        borderRadius: borderRadius.xl,
        padding: spacing.md,
        marginBottom: spacing.sm,
        ...softShadow,
    },
    moodTitle: {
        ...typography.body,
        color: colors.textPrimary,
        fontWeight: '600',
        marginBottom: spacing.sm,
        textAlign: 'center',
    },
    moodContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
    },
    moodButton: {
        alignItems: 'center',
        padding: 8,
        borderRadius: borderRadius.lg,
    },
    moodButtonActive: {
        backgroundColor: colors.pending,
    },
    moodEmoji: {
        fontSize: 28,
        marginBottom: 4,
    },
    moodLabel: {
        ...typography.caption,
        color: colors.textSecondary,
    },
    moodLabelActive: {
        color: colors.primary,
        fontWeight: '600',
    },
    // Awake Button
    awakeButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FF9800',
        borderRadius: borderRadius.xl,
        padding: spacing.sm,
        marginBottom: spacing.md,
        gap: spacing.sm,
        ...softShadow,
    },
    awakeButtonDone: {
        backgroundColor: colors.cardBg,
        borderWidth: 1,
        borderColor: colors.border,
    },
    awakeEmoji: {
        fontSize: 22,
    },
    awakeText: {
        ...typography.body,
        color: colors.textWhite,
        fontWeight: '700',
    },
    awakeTextDone: {
        color: colors.textSecondary,
    },
    // Sections
    section: {
        marginBottom: spacing.md,
    },
    bottomSection: {
        paddingBottom: spacing.sm,
    },
    pendingActionsSection: {
        flex: 1,
        marginBottom: spacing.md,
    },
    actionsScrollView: {
        flex: 1,
    },
    sectionTitle: {
        ...typography.h3,
        color: colors.textPrimary,
        marginBottom: spacing.xs,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        marginBottom: spacing.sm,
    },
    viewHistoryText: {
        ...typography.body,
        fontWeight: '600',
        color: colors.primary,
    },
    actionsList: {
        gap: spacing.md,
    },
    actionCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.cardBg,
        borderRadius: borderRadius.xl,
        padding: spacing.md,
        ...softShadow,
    },
    actionIconContainer: {
        width: 48,
        height: 48,
        borderRadius: borderRadius.lg,
        backgroundColor: colors.pending,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.md,
    },
    actionContent: {
        flex: 1,
    },
    actionLabel: {
        ...typography.body,
        color: colors.textPrimary,
        fontWeight: '500',
    },
    actionTime: {
        ...typography.small,
        color: colors.textSecondary,
        marginTop: 2,
    },
    playButton: {
        width: 36,
        height: 36,
        borderRadius: borderRadius.full,
        backgroundColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: spacing.md,
        backgroundColor: colors.cardBg,
        borderRadius: borderRadius.xl,
        ...softShadow,
    },
    emptyEmoji: {
        fontSize: 40,
        marginBottom: spacing.sm,
    },
    emptyText: {
        ...typography.body,
        color: colors.textSecondary,
        marginBottom: spacing.xs,
    },
    emptySubText: {
        ...typography.small,
        color: colors.textLight,
    },
    // Media Send Section
    sendingOverlay: {
        alignItems: 'center',
        padding: spacing.lg,
        marginBottom: spacing.md,
    },
    sendingText: {
        ...typography.small,
        color: colors.textSecondary,
        marginTop: spacing.sm,
    },
    mediaButtons: {
        flexDirection: 'row',
        gap: spacing.md,
    },
    mediaButton: {
        flex: 1,
        alignItems: 'center',
        backgroundColor: colors.cardBg,
        borderRadius: borderRadius.xl,
        padding: spacing.lg,
        ...softShadow,
    },
    mediaButtonRecording: {
        borderWidth: 2,
        borderColor: '#F44336',
    },
    mediaButtonDisabled: {
        opacity: 0.5,
    },
    mediaIconContainer: {
        width: 56,
        height: 56,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.sm,
    },
    mediaButtonLabel: {
        ...typography.body,
        color: colors.textPrimary,
        fontWeight: '600',
        marginBottom: 2,
    },
    mediaButtonHint: {
        ...typography.caption,
        color: colors.textSecondary,
    },
});
