
import { colors } from '@/constants/Colors';
import { borderRadius, commonStyles, softShadow, spacing, typography } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { Ionicons } from '@expo/vector-icons';
import { decode } from 'base64-arraybuffer';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Image, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function EditProfileScreen() {
    const router = useRouter();
    const { user, setUser } = useAuthStore();
    const [name, setName] = useState(user?.name || '');
    const [avatarUrl, setAvatarUrl] = useState<string | null>(user?.avatar_url || null);
    const [isSaving, setIsSaving] = useState(false);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);

    const handlePickImage = async () => {
        try {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('권한 필요', '사진첩 접근 권한이 필요합니다.');
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.5,
                base64: true,
            });

            if (!result.canceled && result.assets && result.assets.length > 0) {
                const asset = result.assets[0];
                uploadAvatar(asset.uri, asset.base64);
            }
        } catch (error) {
            console.error('Image picking error:', error);
            Alert.alert('오류', '이미지를 선택하는 중 문제가 발생했습니다.');
        }
    };

    const uploadAvatar = async (uri: string, base64Data?: string | null) => {
        if (!user?.id) return;

        setUploadingAvatar(true);
        try {
            const fileExt = uri.split('.').pop() || 'jpg';
            const cleanExt = fileExt.length > 4 ? 'jpg' : fileExt.replace(/[^a-zA-Z]/g, '');
            const fileName = `avatars/${user.id}-${Date.now()}.${cleanExt || 'jpg'}`;

            let fileData: Blob | ArrayBuffer;

            // 웹/앱에서 안정적으로 업로드하기 위해 base64Data 우선 활용
            if (base64Data) {
                fileData = decode(base64Data);
            } else {
                const response = await fetch(uri);
                fileData = await response.blob();
            }

            const { error: uploadError } = await supabase.storage
                .from('media')
                .upload(fileName, fileData, {
                    contentType: `image/${cleanExt || 'jpeg'}`,
                    upsert: false,
                });

            if (uploadError) throw uploadError;

            const { data: publicUrlData } = supabase.storage
                .from('media')
                .getPublicUrl(fileName);

            setAvatarUrl(publicUrlData.publicUrl);

        } catch (error: any) {
            console.error('Avatar upload error:', error);
            Alert.alert('오류', '프로필 사진을 업로드하지 못했습니다.');
        } finally {
            setUploadingAvatar(false);
        }
    };

    const handleSave = async () => {
        if (!name.trim()) {
            Alert.alert('알림', '이름을 입력해주세요.');
            return;
        }

        setIsSaving(true);
        try {
            const updates = {
                name: name.trim(),
                avatar_url: avatarUrl
            };

            const { error } = await supabase
                .from('profiles')
                .update(updates)
                .eq('id', user?.id);

            if (error) throw error;

            // Update local store with a fresh object to trigger re-renders
            if (user) {
                const updatedUser = { ...user, ...updates };
                setUser(updatedUser);
                console.log('[ProfileEdit] Store updated with new avatar:', updates.avatar_url);
            }

            Alert.alert('완료', '프로필 정보가 성공적으로 변경되었습니다.', [
                {
                    text: '확인',
                    onPress: () => {
                        // 약간의 지연 후 뒤로가기 (상태 반영 시간 확보)
                        setTimeout(() => router.back(), 100);
                    }
                }
            ]);
        } catch (error: any) {
            Alert.alert('오류', error.message || '프로필 수정 중 문제가 발생했습니다.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <SafeAreaView style={commonStyles.container} edges={['top']}>
            <View style={styles.header}>
                <Pressable onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
                </Pressable>
                <Text style={styles.headerTitle}>내 정보 수정</Text>
                <View style={{ width: 24 }} />
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <View style={styles.content}>

                    <View style={styles.avatarSection}>
                        <Pressable
                            style={styles.avatarContainer}
                            onPress={handlePickImage}
                            disabled={uploadingAvatar}
                        >
                            {avatarUrl ? (
                                <Image key={avatarUrl} source={{ uri: avatarUrl }} style={styles.avatarImage} resizeMode="cover" />
                            ) : (
                                <View style={styles.avatarPlaceholder}>
                                    <Ionicons name="person" size={40} color={colors.textSecondary} />
                                </View>
                            )}

                            {uploadingAvatar ? (
                                <View style={styles.avatarOverlay}>
                                    <ActivityIndicator color={colors.textWhite} size="small" />
                                </View>
                            ) : (
                                <View style={styles.avatarEditBadge}>
                                    <Ionicons name="camera" size={16} color={colors.textWhite} />
                                </View>
                            )}
                        </Pressable>
                        <Text style={styles.avatarHintText}>프로필 사진 변경</Text>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>이름</Text>
                        <TextInput
                            style={styles.input}
                            value={name}
                            onChangeText={setName}
                            placeholder="이름을 입력하세요"
                            placeholderTextColor={colors.textLight}
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>이메일</Text>
                        <TextInput
                            style={[styles.input, styles.disabledInput]}
                            value={user?.email || ''}
                            editable={false}
                        />
                        <Text style={styles.helpText}>이메일은 변경할 수 없습니다.</Text>
                    </View>
                </View>

                <View style={styles.footer}>
                    <Pressable
                        style={[styles.saveButton, isSaving && styles.disabledButton]}
                        onPress={handleSave}
                        disabled={isSaving}
                    >
                        {isSaving ? (
                            <ActivityIndicator color="white" />
                        ) : (
                            <Text style={styles.saveButtonText}>저장하기</Text>
                        )}
                    </Pressable>
                </View>
            </KeyboardAvoidingView>
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
    avatarSection: {
        alignItems: 'center',
        marginBottom: spacing.xxl,
    },
    avatarContainer: {
        width: 100,
        height: 100,
        borderRadius: 50,
        ...softShadow,
        backgroundColor: colors.cardBg,
        position: 'relative',
    },
    avatarImage: {
        width: 100,
        height: 100,
        borderRadius: 50,
    },
    avatarPlaceholder: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: colors.background,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.5)',
        borderRadius: 50,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarEditBadge: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: colors.primary,
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: colors.cardBg,
    },
    avatarHintText: {
        ...typography.caption,
        color: colors.textSecondary,
        marginTop: spacing.sm,
    },
    inputGroup: {
        marginBottom: spacing.xl,
    },
    label: {
        ...typography.h3,
        fontSize: 16,
        marginBottom: spacing.xs,
        color: colors.textPrimary,
    },
    input: {
        backgroundColor: colors.cardBg,
        padding: spacing.md,
        borderRadius: borderRadius.md,
        borderWidth: 1,
        borderColor: colors.border,
        fontSize: 16,
        color: colors.textPrimary,
    },
    disabledInput: {
        backgroundColor: colors.background,
        color: colors.textSecondary,
    },
    helpText: {
        ...typography.caption,
        color: colors.textSecondary,
        marginTop: spacing.xs,
    },
    footer: {
        padding: spacing.lg,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    saveButton: {
        backgroundColor: colors.primary,
        paddingVertical: spacing.md,
        borderRadius: borderRadius.lg,
        alignItems: 'center',
    },
    disabledButton: {
        opacity: 0.7,
    },
    saveButtonText: {
        ...typography.body,
        color: 'white',
        fontWeight: 'bold',
    },
});
