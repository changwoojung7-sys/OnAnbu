import { Ionicons } from '@expo/vector-icons';
import { decode } from 'base64-arraybuffer';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ActionCard } from '@/components/care';
import { colors } from '@/constants/Colors';
import careMessages from '@/constants/careMessages.json';
import { strings } from '@/constants/strings';
import { borderRadius, commonStyles, spacing, typography } from '@/constants/theme';
import { AdEventType, RewardedAd, RewardedAdEventType } from '@/lib/admob';
import { supabase } from '@/lib/supabase';
import { ActionType } from '@/lib/types';
import { useActionStore } from '@/stores/actionStore';
import { useAuthStore } from '@/stores/authStore';

export default function CareScreen() {
    const { addAction, todayActions, setTodayActions } = useActionStore();
    const { user, selectedParent } = useAuthStore();
    const completedActions = todayActions.map(a => a.type);

    const [parentId, setParentId] = useState<string | null>(null);
    const [groupId, setGroupId] = useState<string | null>(null);
    const [parentName, setParentName] = useState('어머니');
    const [isLoadingAd, setIsLoadingAd] = useState(false);

    // Success Toast 상태
    const [showSuccessToast, setShowSuccessToast] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const toastOpacity = useRef(new Animated.Value(0)).current;

    const triggerSuccessToast = (message: string) => {
        setSuccessMessage(message);
        setShowSuccessToast(true);

        // 페이드 인
        Animated.timing(toastOpacity, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
        }).start(() => {
            // 3초 대기 후 페이드 아웃
            setTimeout(() => {
                Animated.timing(toastOpacity, {
                    toValue: 0,
                    duration: 400,
                    useNativeDriver: true,
                }).start(() => {
                    setShowSuccessToast(false);
                });
            }, 3000);
        });
    };

    // 모달 관리 상태 추가
    const [isTextModalVisible, setIsTextModalVisible] = useState(false);
    const [textMessage, setTextMessage] = useState('');

    const [isMediaModalVisible, setIsMediaModalVisible] = useState(false);

    // 미디어 업로드 상태
    const [mediaType, setMediaType] = useState<ActionType | null>(null);
    const [mediaBase64, setMediaBase64] = useState<string | null>(null);
    const [mediaUri, setMediaUri] = useState<string | null>(null);

    // 오디오 녹음 전용 상태
    const [recording, setRecording] = useState<Audio.Recording | null>(null);
    const [isRecording, setIsRecording] = useState(false);

    // 카테고리 상태 추가
    const CATEGORIES = [
        { id: 'parents', label: '부모님' },
        { id: 'grandparents', label: '조부모님' },
        { id: 'children', label: '자녀' },
        { id: 'spouse', label: '배우자' },
        { id: 'sibling', label: '형제/자매' },
        { id: 'friend', label: '친구' },
        { id: 'colleague', label: '동료' },
        { id: 'other', label: '기타' },
    ];
    const [selectedCategory, setSelectedCategory] = useState<string>('other');

    const generateRandomMessage = (cat?: string) => {
        const targetCategory = cat || selectedCategory;
        const messages = (careMessages as any)[targetCategory];

        if (messages && messages.length > 0) {
            const randomMsg = messages[Math.floor(Math.random() * messages.length)];
            setTextMessage(randomMsg);
        } else {
            setTextMessage('오늘 하루도 무사히 보내셨길 바랍니다. 편안한 밤 되세요!');
        }
    };

    const handleCategorySelect = (catId: string) => {
        setSelectedCategory(catId);
        generateRandomMessage(catId);
    };

    useFocusEffect(
        useCallback(() => {
            fetchConnectedParent();
        }, [user?.id, selectedParent?.id])
    );

    const fetchConnectedParent = async () => {
        if (!user?.id) return;
        try {
            if (selectedParent?.id) {
                setParentId(selectedParent.id);
                setParentName(selectedParent.name || '어머니');
                const { data: group } = await supabase
                    .from('family_groups')
                    .select('id')
                    .eq('parent_id', selectedParent.id)
                    .single();
                if (group) setGroupId(group.id);

                // 관계 정보 가져오기 제거 (수동 카테고리 선택으로 대체)
                return;
            }
            const { data: memberships } = await supabase
                .from('family_members')
                .select('group_id')
                .eq('guardian_id', user.id);
            if (!memberships || memberships.length === 0) return;
            const groupIds = memberships.map((m: any) => m.group_id);
            const { data: latestGroup } = await supabase
                .from('family_groups')
                .select('id, parent_id, profiles:parent_id(name)')
                .in('id', groupIds)
                .order('created_at', { ascending: false })
                .limit(1)
                .single();
            if (latestGroup) {
                setGroupId(latestGroup.id);
                setParentId(latestGroup.parent_id);
                setParentName((latestGroup.profiles as any)?.name || '어머니');

                const { data: member } = await supabase
                    .from('family_members')
                    .select('relationship_label')
                    .eq('group_id', latestGroup.id)
                    .eq('guardian_id', user.id)
                    .single();
            }
        } catch (error) {
            console.error('[Care] 부모님 정보 조회 에러:', error);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchTodayActions();
        }, [user?.id, groupId])
    );

    const fetchTodayActions = async () => {
        if (!user?.id) return;
        const today = new Date().toISOString().split('T')[0];
        const startOfDay = `${today}T00:00:00.000Z`;
        const { data } = await supabase
            .from('action_logs')
            .select('*')
            .eq('guardian_id', user.id)
            .gte('created_at', startOfDay);
        if (data) {
            setTodayActions(data as any[]);
        }
    };

    const uploadMediaToStorage = async (uri: string, type: ActionType, base64Data?: string | null): Promise<string> => {
        try {
            let fileData: ArrayBuffer | Blob;

            if (Platform.OS === 'web') {
                // 웹 환경: expo-file-system이 동작하지 않으므로 항상 fetch → blob 사용
                const res = await fetch(uri);
                fileData = await res.blob();
            } else if (base64Data) {
                fileData = decode(base64Data);
            } else if (type === 'voice_cheer') {
                const base64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
                fileData = decode(base64);
            } else {
                // 비디오 등 대용량 파일은 base64 변환을 우회하기 위해 fetch Blob 사용
                const res = await fetch(uri);
                fileData = await res.blob();
            }

            let folder = 'voice';
            let ext = 'm4a';
            let contentType = 'audio/m4a';

            // 웹 환경: blob/data URI에서는 확장자를 추출할 수 없으므로 기본값 사용
            const isWebBlobUri = uri.startsWith('blob:') || uri.startsWith('data:');

            if (type === 'photo' || (type === 'message' && mediaType === 'photo')) {
                folder = 'photos';
                ext = isWebBlobUri ? 'jpg' : (uri.split('.').pop() || 'jpg');
                contentType = `image/${ext === 'jpg' ? 'jpeg' : ext}`;
            } else if (type === 'video' || (type === 'message' && mediaType === 'video')) {
                folder = 'videos';
                ext = isWebBlobUri ? 'mp4' : (uri.split('.').pop() || 'mp4');
                contentType = `video/${ext}`;
            }

            const fileName = `${user?.id}-${Date.now()}.${ext}`;
            const filePath = `${folder}/${fileName}`;

            const { error } = await supabase.storage
                .from('media')
                .upload(filePath, fileData, {
                    contentType,
                    upsert: true
                });

            if (error) throw error;

            const { data: { publicUrl } } = supabase.storage
                .from('media')
                .getPublicUrl(filePath);

            return publicUrl;
        } catch (error) {
            console.error('Media upload error:', error);
            throw new Error('미디어 업로드 실패');
        }
    };

    const executeSendCareAction = async (type: ActionType, message?: string | null, uri?: string | null, base64Data?: string | null) => {
        if (!user?.id || !groupId || !parentId) return;
        try {
            let uploadedUrl = null;
            if (uri) {
                uploadedUrl = await uploadMediaToStorage(uri, type, base64Data);
            }

            const { data: inserted, error } = await supabase
                .from('action_logs')
                .insert({
                    group_id: groupId,
                    guardian_id: user.id,
                    parent_id: parentId,
                    type: type,
                    status: 'pending',
                    ad_watched: true,
                    ad_revenue: null,
                    content_url: uploadedUrl,
                    message: message || null,
                    created_at: new Date().toISOString(),
                    played_at: null,
                })
                .select()
                .single();
            if (error) {
                console.error('[Care] action_logs INSERT 에러:', error.message);
                Alert.alert('오류', `안부 전송 실패: ${error.message}`);
                return;
            }
            console.log('[Care] 안부 전송 성공:', inserted?.id);
            addAction({
                id: inserted?.id || Date.now().toString(),
                group_id: groupId,
                guardian_id: user.id,
                parent_id: parentId,
                type: type,
                status: 'pending',
                ad_watched: true,
                ad_revenue: null,
                content_url: uploadedUrl,
                message: message || null,
                created_at: new Date().toISOString(),
                played_at: null,
            });
            const userName = user?.name || '가족';
            const toastMsg = `${userName}님이 보낸 안부가\n따뜻하게 전달되었습니다! 💝`;
            triggerSuccessToast(toastMsg);
        } catch (err: any) {
            console.error('[Care] 예외:', err);
            Alert.alert('오류', '안부 전송 중 문제가 발생했습니다.');
        } finally {
            setTextMessage('');
            setMediaUri(null);
            setMediaBase64(null);
            setMediaType(null);
            setIsLoadingAd(false);
        }
    };

    // --- (광고 핸들러 묶음) ---
    const startAdRewardFlow = (type: ActionType, payloadMessage?: string, payloadUri?: string) => {
        setIsLoadingAd(true);

        const adUnitId = 'ca-app-pub-2810872681064029/3833978077';
        const rewarded = RewardedAd.createForAdRequest(adUnitId, {
            requestNonPersonalizedAdsOnly: true,
        });

        const unsubscribeLoaded = rewarded.addAdEventListener(RewardedAdEventType.LOADED, () => {
            setIsLoadingAd(false); // 로딩 팝업 해제
            rewarded.show();
        });

        const unsubscribeEarned = rewarded.addAdEventListener(
            RewardedAdEventType.EARNED_REWARD,
            reward => {
                console.log('User earned reward of ', reward);
                // 광고 시청 후 DB 전송
                // DB 제약조건(action_logs_type_check)에 의해 photo/video 타입은 허용되지 않으므로
                // voice_cheer 타입으로 전송하고, content_url 확장자로 미디어 종류를 구분
                executeSendCareAction(type, payloadMessage, payloadUri, mediaBase64);
            },
        );

        const unsubscribeError = rewarded.addAdEventListener(AdEventType.ERROR, (err) => {
            console.log('Ad error', err);
            // 에러 시 무조건 로딩 해제
            setIsLoadingAd(false);
            Alert.alert('알림', '광고를 불러올 수 없습니다. 다시 시도해주세요.');
        });

        rewarded.load();
    };

    const handleTextSubmit = () => {
        setIsTextModalVisible(false);
        startAdRewardFlow('check_in', textMessage, undefined);
    };

    // --- (오디오 녹음 핸들러 묶음) ---
    const startRecording = async () => {
        try {
            const permission = await Audio.requestPermissionsAsync();
            if (permission.status === 'granted') {
                await Audio.setAudioModeAsync({
                    allowsRecordingIOS: true,
                    playsInSilentModeIOS: true,
                });

                if (Platform.OS !== 'web') {
                    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                }
                const { recording } = await Audio.Recording.createAsync(
                    Audio.RecordingOptionsPresets.HIGH_QUALITY
                );
                setRecording(recording);
                setIsRecording(true);
            } else {
                Alert.alert('권한 필요', '마이크 권한을 허용해주세요.');
            }
        } catch (err) {
            console.error('Failed to start recording', err);
        }
    };

    const stopRecording = async () => {
        if (!recording) return;
        try {
            setIsRecording(false);
            await recording.stopAndUnloadAsync();
            await Audio.setAudioModeAsync({
                allowsRecordingIOS: false,
            });
            const uri = recording.getURI();
            setMediaType('voice_cheer');
            setMediaUri(uri);
            setMediaBase64(null);
            setRecording(null);
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (error) {
            console.error('Failed to stop recording', error);
        }
    };

    const pickMediaFromGallery = async (isVideo: boolean) => {
        try {
            const isWeb = Platform.OS === 'web';
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: isVideo ? ImagePicker.MediaTypeOptions.Videos : ImagePicker.MediaTypeOptions.Images,
                allowsEditing: !isWeb, // 웹에서는 편집 모드가 파일 선택을 방해할 수 있음
                quality: 0.7,
                base64: !isWeb && !isVideo, // 웹에서는 base64 불필요 (fetch→blob 방식 사용)
            });

            if (!result.canceled && result.assets && result.assets.length > 0) {
                const asset = result.assets[0];
                setMediaType(isVideo ? 'video' : 'photo');
                setMediaUri(asset.uri);
                if (!isWeb && !isVideo && asset.base64) {
                    setMediaBase64(asset.base64);
                } else {
                    setMediaBase64(null);
                }
            }
        } catch (error) {
            console.error('[Care] 미디어 선택 에러:', error);
            if (Platform.OS === 'web') {
                window.alert('미디어를 선택할 수 없습니다. 다시 시도해주세요.');
            } else {
                Alert.alert('오류', '미디어를 선택할 수 없습니다.');
            }
        }
    };

    const handleMediaSubmit = () => {
        if (!mediaUri || !mediaType) {
            Alert.alert('알림', '미디어를 먼저 선택하거나 녹음해주세요.');
            return;
        }
        setIsMediaModalVisible(false);
        // 사진은 'photo', 영상은 'video', 음성은 'voice_cheer' 타입으로 전송
        startAdRewardFlow(mediaType as ActionType, undefined, mediaUri);
    };

    const resetMediaModal = () => {
        setIsMediaModalVisible(false);
        setMediaUri(null);
        setMediaBase64(null);
        setMediaType(null);
    };

    const handleActionPress = useCallback(async (type: ActionType) => {
        if (!parentId || !groupId) {
            Alert.alert(
                '연결 필요',
                '아직 연결된 부모님이 없습니다. 부모님 초대를 먼저 완료해주세요.',
            );
            return;
        }
        if (Platform.OS !== 'web') {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }

        if (type === 'check_in') {
            generateRandomMessage();
            setIsTextModalVisible(true);
        } else if (type === 'voice_cheer') {
            setIsMediaModalVisible(true);
        }

    }, [parentId, groupId, selectedCategory]);

    return (
        <SafeAreaView style={commonStyles.container} edges={['top']}>
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* 전송 완료 토스트 */}
                {showSuccessToast && (
                    <View style={styles.toastContainer}>
                        <Animated.View style={[styles.successToast, { opacity: toastOpacity }]}>
                            <Ionicons name="checkmark-circle" size={24} color={colors.success} />
                            <Text style={styles.successToastText}>{successMessage}</Text>
                        </Animated.View>
                    </View>
                )}

                <View style={styles.header}>
                    <Text style={styles.title}>{strings.care.title}</Text>
                    <Text style={styles.subtitle}>
                        {parentName}님께 마음을 전해보세요
                    </Text>
                </View>

                {!parentId && (
                    <View style={styles.warningContainer}>
                        <Text style={styles.warningText}>
                            ⚠️ 연결된 케어대상이 없습니다. '가족 관리' 탭에서 초대를 먼저 진행해주세요.
                        </Text>
                    </View>
                )}

                <ActionCard
                    type="voice_cheer"
                    parentName={parentName}
                    isCompleted={false}
                    onPress={() => handleActionPress('voice_cheer')}
                />
                <ActionCard
                    type="check_in"
                    parentName={parentName}
                    isCompleted={false}
                    onPress={() => handleActionPress('check_in')}
                />

                {completedActions.length > 0 && (
                    <View style={styles.summaryContainer}>
                        <Text style={styles.summaryTitle}>오늘의 기록</Text>
                        <Text style={styles.summaryCount}>
                            {completedActions.length}개의 마음을 전했어요
                        </Text>
                    </View>
                )}
            </ScrollView>

            {/* 안부 체크 텍스트 입력 모달 */}
            <Modal visible={isTextModalVisible} transparent={true} animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>안부 여쭙기</Text>
                            <TouchableOpacity onPress={() => setIsTextModalVisible(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                                <Ionicons name="close" size={24} color={colors.textSecondary} />
                            </TouchableOpacity>
                        </View>
                        <Text style={styles.modalSubtitle}>{parentName}님께 전할 위로와 안부 메시지입니다.</Text>

                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll} contentContainerStyle={styles.categoryContent}>
                            {CATEGORIES.map(cat => (
                                <TouchableOpacity
                                    key={cat.id}
                                    style={[styles.categoryChip, selectedCategory === cat.id && styles.categoryChipSelected]}
                                    onPress={() => handleCategorySelect(cat.id)}
                                >
                                    <Text style={[styles.categoryChipText, selectedCategory === cat.id && styles.categoryChipTextSelected]}>
                                        {cat.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        <View style={styles.messageDisplayBox}>
                            <TextInput
                                style={styles.messageDisplayText}
                                value={textMessage}
                                onChangeText={setTextMessage}
                                multiline
                                textAlign="center"
                                placeholder="안부 메시지를 입력해주세요"
                                placeholderTextColor={colors.textLight}
                            />
                        </View>

                        <View style={styles.refreshContainer}>
                            <TouchableOpacity style={styles.refreshBtn} onPress={() => generateRandomMessage()}>
                                <Ionicons name="refresh" size={18} color={colors.textSecondary} />
                                <Text style={styles.refreshBtnText}>다른 문구 보기</Text>
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity style={styles.submitBtn} onPress={handleTextSubmit}>
                            <Ionicons name="gift" size={20} color="#fff" style={{ marginRight: 6 }} />
                            <Text style={styles.submitBtnText}>광고 보고 마음 전하기</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* 통합 미디어(사진/동영상/음성) 업로드 모달 */}
            <Modal visible={isMediaModalVisible} transparent={true} animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>사진/동영상/음성 올리기</Text>
                            <TouchableOpacity onPress={resetMediaModal} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                                <Ionicons name="close" size={24} color={colors.textSecondary} />
                            </TouchableOpacity>
                        </View>
                        <Text style={styles.modalSubtitle}>{parentName}님께 전하고 싶은 미디어를 첨부하세요.</Text>

                        {!mediaUri && !isRecording ? (
                            <View style={styles.dashedBox}>
                                <View style={styles.mediaIconsRow}>
                                    <TouchableOpacity style={styles.mediaIconWrapper} onPress={() => pickMediaFromGallery(false)}>
                                        <Ionicons name="camera-outline" size={32} color={colors.primary} />
                                        <Text style={styles.mediaIconLabel}>사진</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.mediaIconWrapper} onPress={() => pickMediaFromGallery(true)}>
                                        <Ionicons name="videocam-outline" size={32} color={colors.primary} />
                                        <Text style={styles.mediaIconLabel}>동영상</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.mediaIconWrapper} onPress={startRecording}>
                                        <Ionicons name="mic-outline" size={32} color={colors.primary} />
                                        <Text style={styles.mediaIconLabel}>음성</Text>
                                    </TouchableOpacity>
                                </View>
                                <Text style={styles.dashedBoxTextMain}>Tap to upload</Text>
                                <Text style={styles.dashedBoxTextSub}>Photo, Video, or Audio</Text>
                            </View>
                        ) : null}

                        {/* 녹음 중 UI */}
                        {isRecording && (
                            <View style={styles.recordContainer}>
                                <TouchableOpacity
                                    style={[styles.recordBtn, styles.recordingBtnActive]}
                                    onPress={stopRecording}
                                >
                                    <Ionicons name="stop" size={48} color="#fff" />
                                </TouchableOpacity>
                                <Text style={styles.recordStatusText}>
                                    녹음 중입니다... 터치를 눌러 종료하세요
                                </Text>
                            </View>
                        )}

                        {/* 업로드 완료 Preview UI */}
                        {mediaUri && !isRecording && (
                            <View style={[styles.dashedBox, { borderColor: colors.success, backgroundColor: '#f0fff4' }]}>
                                <Ionicons
                                    name={mediaType === 'photo' ? "image" : mediaType === 'video' ? "film" : "mic"}
                                    size={48} color={colors.success}
                                />
                                <Text style={[styles.dashedBoxTextMain, { color: colors.success, marginTop: 8 }]}>
                                    {mediaType === 'photo' ? '사진' : mediaType === 'video' ? '동영상' : '음성'} 첨부 완료!
                                </Text>
                                <TouchableOpacity onPress={() => { setMediaUri(null); setMediaType(null); }} style={{ marginTop: 8 }}>
                                    <Text style={{ color: colors.error, textDecorationLine: 'underline' }}>다시 선택하기</Text>
                                </TouchableOpacity>
                            </View>
                        )}

                        {mediaUri && (
                            <TouchableOpacity style={[styles.submitBtn, { marginTop: spacing.md }]} onPress={handleMediaSubmit}>
                                <Ionicons name="gift" size={20} color="#fff" style={{ marginRight: 6 }} />
                                <Text style={styles.submitBtnText}>광고 보고 전하기</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            </Modal>

            {/* 광고 대기 모달 */}
            <Modal visible={isLoadingAd} transparent={true} animationType="fade">
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' }}>
                    <ActivityIndicator size="large" color="#ffffff" />
                    <Text style={{ color: '#ffffff', marginTop: 16, fontSize: 16, fontWeight: '600' }}>광고로 선물을 포장중입니다...</Text>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    scrollView: { flex: 1 },
    scrollContent: { padding: spacing.lg },
    header: { marginBottom: spacing.xl },
    title: { ...typography.h1, color: colors.textPrimary, marginBottom: spacing.xs },
    subtitle: { ...typography.body, color: colors.textSecondary },
    warningContainer: { backgroundColor: '#FFF3E0', padding: spacing.md, borderRadius: 12, marginBottom: spacing.lg },
    warningText: { ...typography.small, color: '#E65100', textAlign: 'center' },
    summaryContainer: { marginTop: spacing.xl, padding: spacing.lg, backgroundColor: colors.complete, borderRadius: 16, alignItems: 'center' },
    summaryTitle: { ...typography.small, color: colors.textSecondary, marginBottom: spacing.xs },
    summaryCount: { ...typography.bodyLarge, color: colors.primary, fontWeight: '600' },

    modalOverlay: {
        flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end'
    },
    modalContent: {
        backgroundColor: colors.background,
        borderTopLeftRadius: borderRadius.xl,
        borderTopRightRadius: borderRadius.xl,
        padding: spacing.xl,
        minHeight: 320,
    },
    modalHeader: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm
    },
    modalTitle: { ...typography.h2, color: colors.textPrimary },
    modalSubtitle: { ...typography.body, color: colors.textSecondary, marginBottom: spacing.lg },

    messageDisplayBox: {
        backgroundColor: '#f8f9fa',
        borderRadius: borderRadius.md,
        padding: spacing.md,
        minHeight: 140,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.borderLight,
        marginBottom: spacing.xs,
    },
    messageDisplayText: {
        width: '100%',
        minHeight: 100,
        fontSize: 18,
        color: colors.textPrimary,
        textAlign: 'center',
        textAlignVertical: 'center',
        lineHeight: 28,
        fontWeight: '500',
    },
    refreshContainer: {
        alignItems: 'flex-end',
        marginBottom: spacing.lg,
    },
    refreshBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 12,
        backgroundColor: colors.cardBg,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: colors.border,
    },
    refreshBtnText: {
        fontSize: 14,
        color: colors.textSecondary,
        marginLeft: 4,
        fontWeight: '500',
    },

    submitBtn: {
        backgroundColor: colors.primary, borderRadius: borderRadius.lg, paddingVertical: spacing.md, flexDirection: 'row', justifyContent: 'center', alignItems: 'center'
    },
    submitBtnText: {
        color: '#fff', fontSize: 16, fontWeight: '700'
    },

    recordContainer: {
        alignItems: 'center', justifyContent: 'center', marginVertical: spacing.xl
    },
    recordBtn: {
        width: 100, height: 100, borderRadius: 50, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center',
        shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8
    },
    recordingBtnActive: {
        backgroundColor: colors.warning,
    },
    recordStatusText: {
        ...typography.body, color: colors.textSecondary, marginTop: spacing.lg, textAlign: 'center'
    },

    dashedBox: {
        borderWidth: 2,
        borderColor: colors.borderLight,
        borderStyle: 'dashed',
        borderRadius: borderRadius.xl,
        padding: spacing.xl,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 180,
        backgroundColor: '#fafafa',
        marginVertical: spacing.md,
    },
    mediaIconsRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        width: '100%',
        marginBottom: spacing.md,
    },
    mediaIconWrapper: {
        alignItems: 'center',
        padding: spacing.md,
        borderRadius: borderRadius.md,
        backgroundColor: '#f0f0f0',
    },
    mediaIconLabel: {
        ...typography.small,
        color: colors.primary,
        marginTop: 4,
        fontWeight: '600',
    },
    dashedBoxTextMain: {
        ...typography.bodyLarge,
        fontWeight: '600',
        color: colors.textPrimary,
        marginBottom: 4,
    },
    dashedBoxTextSub: {
        ...typography.small,
        color: colors.textLight,
    },
    categoryScroll: {
        maxHeight: 40,
        marginBottom: spacing.md,
    },
    categoryContent: {
        paddingHorizontal: spacing.sm,
    },
    categoryChip: {
        paddingHorizontal: spacing.md,
        paddingVertical: 6,
        borderRadius: 20,
        backgroundColor: '#f5f5f5',
        marginRight: spacing.sm,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    categoryChipSelected: {
        backgroundColor: colors.primary + '15',
        borderColor: colors.primary,
    },
    categoryChipText: {
        ...typography.small,
        color: colors.textSecondary,
        fontWeight: '500',
    },
    categoryChipTextSelected: {
        color: colors.primary,
        fontWeight: '700',
    },

    // Toast Styles
    toastContainer: {
        position: 'absolute',
        top: 20,
        left: 0,
        right: 0,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 999,
        paddingHorizontal: spacing.xl,
    },
    successToast: {
        backgroundColor: '#E8F5E9',
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 24,
        borderRadius: 20,
        borderWidth: 1.5,
        borderColor: colors.success,
        maxWidth: '100%',
        shadowColor: colors.success,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 10,
        elevation: 10,
    },
    successToastText: {
        fontSize: 20,
        color: colors.success,
        fontWeight: 'bold',
        marginLeft: 10,
        textAlign: 'center',
        flexShrink: 1,
        lineHeight: 28,
    },
});
