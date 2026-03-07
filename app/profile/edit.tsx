
import { colors } from '@/constants/Colors';
import { borderRadius, commonStyles, softShadow, spacing, typography } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { Ionicons } from '@expo/vector-icons';
import { decode } from 'base64-arraybuffer';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function EditProfileScreen() {
    const router = useRouter();
    const { user, setUser } = useAuthStore();

    // 프로필 필드
    const [name, setName] = useState(user?.name || '');
    const [phone, setPhone] = useState(user?.phone || '');
    const [avatarUrl, setAvatarUrl] = useState<string | null>(user?.avatar_url || null);
    const [isSaving, setIsSaving] = useState(false);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);

    // 비밀번호 변경 필드
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showCurrentPw, setShowCurrentPw] = useState(false);
    const [showNewPw, setShowNewPw] = useState(false);
    const [showConfirmPw, setShowConfirmPw] = useState(false);
    const [isChangingPw, setIsChangingPw] = useState(false);

    // 케어대상 여부 (초대코드 이메일 형식)
    const isParent = user?.email?.endsWith('@onanbu.local') ?? false;

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
            Alert.alert('오류', '이미지를 선택하는 중 문제가 발생했습니다.');
        }
    };

    const uploadAvatar = async (uri: string, base64Data?: string | null) => {
        if (!user?.id) return;
        setUploadingAvatar(true);
        try {
            if (user.avatar_url) {
                try {
                    const urlPath = user.avatar_url.split('/storage/v1/object/public/onanbu_media/')[1]?.split('?')[0];
                    if (urlPath) await supabase.storage.from('onanbu_media').remove([urlPath]);
                } catch {}
            }
            const fileExt = uri.split('.').pop() || 'jpg';
            const cleanExt = fileExt.length > 4 ? 'jpg' : fileExt.replace(/[^a-zA-Z]/g, '') || 'jpg';
            const fileName = `avatars/${user.id}.${cleanExt}`;
            let fileData: Blob | ArrayBuffer;
            if (base64Data) {
                fileData = decode(base64Data);
            } else {
                const response = await fetch(uri);
                fileData = await response.blob();
            }
            const { error: uploadError } = await supabase.storage.from('onanbu_media').upload(fileName, fileData, {
                contentType: `image/${cleanExt}`,
                upsert: true,
            });
            if (uploadError) throw uploadError;
            const { data: publicUrlData } = supabase.storage.from('onanbu_media').getPublicUrl(fileName);
            const finalUrl = `${publicUrlData.publicUrl}?t=${Date.now()}`;
            setAvatarUrl(finalUrl);
        } catch (error: any) {
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
            const updates: any = { name: name.trim(), avatar_url: avatarUrl };
            if (phone.trim()) updates.phone = phone.trim();

            const { error } = await supabase.from('profiles').update(updates).eq('id', user?.id);
            if (error) throw error;

            if (user) setUser({ ...user, ...updates });

            const msg = '프로필 정보가 성공적으로 변경되었습니다.';
            if (Platform.OS === 'web') {
                window.alert(msg);
                setTimeout(() => router.back(), 100);
            } else {
                Alert.alert('완료', msg, [{ text: '확인', onPress: () => setTimeout(() => router.back(), 100) }]);
            }
        } catch (error: any) {
            Alert.alert('오류', error.message || '프로필 수정 중 문제가 발생했습니다.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleChangePassword = async () => {
        if (!currentPassword || !newPassword || !confirmPassword) {
            Alert.alert('알림', '모든 비밀번호 항목을 입력해주세요.');
            return;
        }
        if (newPassword.length < 6) {
            Alert.alert('알림', '새 비밀번호는 6자 이상이어야 합니다.');
            return;
        }
        if (newPassword !== confirmPassword) {
            Alert.alert('알림', '새 비밀번호와 확인 비밀번호가 일치하지 않습니다.');
            return;
        }

        setIsChangingPw(true);
        try {
            // 현재 비밀번호 검증: 현재 이메일로 재로그인
            const loginEmail = user?.email || '';
            const { error: loginError } = await supabase.auth.signInWithPassword({
                email: loginEmail,
                password: currentPassword,
            });
            if (loginError) {
                Alert.alert('오류', '현재 비밀번호가 올바르지 않습니다.');
                return;
            }

            // 새 비밀번호로 변경
            const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
            if (updateError) throw updateError;

            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');

            const msg = '비밀번호가 성공적으로 변경되었습니다.';
            if (Platform.OS === 'web') {
                window.alert(msg);
            } else {
                Alert.alert('완료', msg);
            }
        } catch (error: any) {
            Alert.alert('오류', error.message || '비밀번호 변경 중 문제가 발생했습니다.');
        } finally {
            setIsChangingPw(false);
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

            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

                    {/* 프로필 사진 */}
                    <View style={styles.avatarSection}>
                        <Pressable style={styles.avatarContainer} onPress={handlePickImage} disabled={uploadingAvatar}>
                            {avatarUrl ? (
                                <Image key={avatarUrl} source={{ uri: avatarUrl }} style={styles.avatarImage} resizeMode="cover" />
                            ) : (
                                <View style={styles.avatarPlaceholder}>
                                    <Ionicons name="person" size={40} color={colors.textSecondary} />
                                </View>
                            )}
                            {uploadingAvatar ? (
                                <View style={styles.avatarOverlay}>
                                    <ActivityIndicator color="white" size="small" />
                                </View>
                            ) : (
                                <View style={styles.avatarEditBadge}>
                                    <Ionicons name="camera" size={16} color="white" />
                                </View>
                            )}
                        </Pressable>
                        <Text style={styles.avatarHintText}>프로필 사진 변경</Text>
                    </View>

                    {/* ── 기본 정보 섹션 ── */}
                    <Text style={styles.sectionTitle}>기본 정보</Text>

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
                        <Text style={styles.label}>전화번호</Text>
                        <TextInput
                            style={styles.input}
                            value={phone}
                            onChangeText={setPhone}
                            placeholder="010-0000-0000"
                            placeholderTextColor={colors.textLight}
                            keyboardType="phone-pad"
                        />
                    </View>

                    {/* 이메일: 케어대상은 초대코드 표시, 일반은 이메일 표시 (변경 불가) */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>{isParent ? '초대코드 (로그인 아이디)' : '이메일'}</Text>
                        <TextInput
                            style={[styles.input, styles.disabledInput]}
                            value={isParent ? (user?.email?.replace('@onanbu.local', '') || '') : (user?.email || '')}
                            editable={false}
                        />
                        <Text style={styles.helpText}>{isParent ? '초대코드는 변경할 수 없습니다.' : '이메일은 변경할 수 없습니다.'}</Text>
                    </View>

                    <TouchableOpacity
                        style={[styles.saveButton, isSaving && styles.disabledButton]}
                        onPress={handleSave}
                        disabled={isSaving}
                        activeOpacity={0.8}
                    >
                        {isSaving ? (
                            <ActivityIndicator color="white" />
                        ) : (
                            <Text style={styles.saveButtonText}>정보 저장하기</Text>
                        )}
                    </TouchableOpacity>

                    {/* ── 비밀번호 변경 섹션 ── */}
                    <View style={styles.divider} />
                    <Text style={styles.sectionTitle}>비밀번호 변경</Text>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>현재 비밀번호</Text>
                        <View style={styles.passwordRow}>
                            <TextInput
                                style={[styles.input, { flex: 1 }]}
                                value={currentPassword}
                                onChangeText={setCurrentPassword}
                                placeholder="현재 비밀번호"
                                placeholderTextColor={colors.textLight}
                                secureTextEntry={!showCurrentPw}
                            />
                            <Pressable style={styles.eyeBtn} onPress={() => setShowCurrentPw(v => !v)}>
                                <Ionicons name={showCurrentPw ? 'eye-off' : 'eye'} size={20} color={colors.textSecondary} />
                            </Pressable>
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>새 비밀번호</Text>
                        <View style={styles.passwordRow}>
                            <TextInput
                                style={[styles.input, { flex: 1 }]}
                                value={newPassword}
                                onChangeText={setNewPassword}
                                placeholder="새 비밀번호 (6자 이상)"
                                placeholderTextColor={colors.textLight}
                                secureTextEntry={!showNewPw}
                            />
                            <Pressable style={styles.eyeBtn} onPress={() => setShowNewPw(v => !v)}>
                                <Ionicons name={showNewPw ? 'eye-off' : 'eye'} size={20} color={colors.textSecondary} />
                            </Pressable>
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>새 비밀번호 확인</Text>
                        <View style={styles.passwordRow}>
                            <TextInput
                                style={[styles.input, { flex: 1 }]}
                                value={confirmPassword}
                                onChangeText={setConfirmPassword}
                                placeholder="새 비밀번호 다시 입력"
                                placeholderTextColor={colors.textLight}
                                secureTextEntry={!showConfirmPw}
                            />
                            <Pressable style={styles.eyeBtn} onPress={() => setShowConfirmPw(v => !v)}>
                                <Ionicons name={showConfirmPw ? 'eye-off' : 'eye'} size={20} color={colors.textSecondary} />
                            </Pressable>
                        </View>
                        {newPassword.length > 0 && confirmPassword.length > 0 && newPassword !== confirmPassword && (
                            <Text style={[styles.helpText, { color: colors.error }]}>비밀번호가 일치하지 않습니다.</Text>
                        )}
                    </View>

                    <TouchableOpacity
                        style={[styles.pwChangeButton, isChangingPw && styles.disabledButton]}
                        onPress={handleChangePassword}
                        disabled={isChangingPw}
                        activeOpacity={0.8}
                    >
                        {isChangingPw ? (
                            <ActivityIndicator color="white" />
                        ) : (
                            <Text style={styles.saveButtonText}>비밀번호 변경하기</Text>
                        )}
                    </TouchableOpacity>

                    <View style={{ height: spacing.xxl }} />
                </ScrollView>
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
    backButton: { padding: 4 },
    headerTitle: { ...typography.h2, fontSize: 18 },
    content: {
        padding: spacing.lg,
        paddingBottom: 40,
    },
    sectionTitle: {
        ...typography.h3,
        fontSize: 15,
        color: colors.textSecondary,
        fontWeight: '600',
        marginBottom: spacing.md,
        marginTop: spacing.xs,
    },
    divider: {
        height: 1,
        backgroundColor: colors.border,
        marginVertical: spacing.xl,
    },
    avatarSection: {
        alignItems: 'center',
        marginBottom: spacing.xl,
    },
    avatarContainer: {
        width: 100,
        height: 100,
        borderRadius: 50,
        ...softShadow,
        backgroundColor: colors.cardBg,
        position: 'relative',
    },
    avatarImage: { width: 100, height: 100, borderRadius: 50 },
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
    inputGroup: { marginBottom: spacing.lg },
    label: {
        ...typography.h3,
        fontSize: 14,
        marginBottom: spacing.xs,
        color: colors.textPrimary,
        fontWeight: '600',
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
    passwordRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    eyeBtn: {
        padding: spacing.sm,
        backgroundColor: colors.cardBg,
        borderRadius: borderRadius.md,
        borderWidth: 1,
        borderColor: colors.border,
        height: 50,
        alignItems: 'center',
        justifyContent: 'center',
    },
    saveButton: {
        backgroundColor: colors.primary,
        paddingVertical: spacing.md,
        borderRadius: borderRadius.lg,
        alignItems: 'center',
        marginTop: spacing.xs,
    },
    pwChangeButton: {
        backgroundColor: '#475569',
        paddingVertical: spacing.md,
        borderRadius: borderRadius.lg,
        alignItems: 'center',
        marginTop: spacing.xs,
    },
    disabledButton: { opacity: 0.7 },
    saveButtonText: {
        ...typography.body,
        color: 'white',
        fontWeight: 'bold',
    },
});
