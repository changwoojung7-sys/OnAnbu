
import { colors } from '@/constants/Colors';
import { borderRadius, commonStyles, spacing, typography } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function NotificationSettingsScreen() {
    const router = useRouter();
    const { user, setUser } = useAuthStore();

    // State initialization with null checks
    const [enabled, setEnabled] = useState(user?.notification_enabled ?? true);
    const [time, setTime] = useState(user?.notification_time?.substring(0, 5) || '09:00');
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        // Simple time validation (HH:MM)
        const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
        if (enabled && !timeRegex.test(time)) {
            if (Platform.OS === 'web') alert('시간 형식이 올바르지 않습니다. (예: 09:00)');
            else Alert.alert('알림', '시간 형식이 올바르지 않습니다. (예: 09:00)');
            return;
        }

        setIsSaving(true);
        console.log('[NotificationSettings] Saving updates...', { enabled, time });

        try {
            if (!user?.id) throw new Error('사용자 세션이 만료되었습니다. 다시 로그인해주세요.');

            const formattedTime = time.length === 5 ? `${time}:00` : time;
            const updates = {
                notification_enabled: enabled,
                notification_time: enabled ? formattedTime : null,
            };

            const { error } = await supabase
                .from('profiles')
                .update(updates)
                .eq('id', user.id);

            if (error) {
                console.error('[NotificationSettings] Update error:', error);
                throw error;
            }

            // Update local store
            if (user) {
                setUser({ ...user, ...updates });
            }

            console.log('[NotificationSettings] Save success');
            if (Platform.OS === 'web') {
                window.alert('알림 설정이 저장되었습니다.');
                router.back();
            } else {
                Alert.alert('완료', '알림 설정이 저장되었습니다.', [
                    { text: '확인', onPress: () => router.back() }
                ]);
            }
        } catch (error: any) {
            console.error('[NotificationSettings] Exception:', error);
            if (Platform.OS === 'web') {
                window.alert(error.message || '저장 중 문제가 발생했습니다.');
            } else {
                Alert.alert('오류', error.message || '저장 중 문제가 발생했습니다.');
            }
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
                <Text style={styles.headerTitle}>알림 설정</Text>
                <View style={{ width: 24 }} />
            </View>

            <View style={styles.content}>
                <View style={styles.settingItem}>
                    <View>
                        <Text style={styles.label}>알림 받기</Text>
                        <Text style={styles.description}>
                            부모님의 활동이나 안부 확인 알림을 받습니다.
                        </Text>
                    </View>
                    <Switch
                        value={enabled}
                        onValueChange={setEnabled}
                        trackColor={{ true: colors.primary, false: colors.border }}
                    />
                </View>

                {enabled && (
                    <View style={styles.settingItem}>
                        <View>
                            <Text style={styles.label}>알림 시간</Text>
                            <Text style={styles.description}>
                                매일 이 시간에 정기 알림을 보냅니다.
                            </Text>
                        </View>
                        <TextInput
                            style={styles.timeInput}
                            value={time}
                            onChangeText={setTime}
                            placeholder="09:00"
                            placeholderTextColor={colors.textLight}
                            maxLength={5}
                            keyboardType="numbers-and-punctuation"
                        />
                    </View>
                )}
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
    content: { flex: 1, padding: spacing.lg },
    settingItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.xl,
        backgroundColor: colors.cardBg,
        padding: spacing.md,
        borderRadius: borderRadius.md,
        borderWidth: 1,
        borderColor: colors.border,
    },
    label: { ...typography.h3, fontSize: 16, color: colors.textPrimary, marginBottom: 4 },
    description: { ...typography.caption, color: colors.textSecondary, maxWidth: 200 },
    timeInput: {
        backgroundColor: colors.background,
        padding: spacing.sm,
        borderRadius: borderRadius.sm,
        borderWidth: 1,
        borderColor: colors.border,
        fontSize: 18,
        fontWeight: 'bold',
        color: colors.primary,
        width: 80,
        textAlign: 'center',
    },
    footer: { padding: spacing.lg, borderTopWidth: 1, borderTopColor: colors.border },
    saveButton: {
        backgroundColor: colors.primary,
        paddingVertical: spacing.md,
        borderRadius: borderRadius.lg,
        alignItems: 'center',
    },
    disabledButton: { opacity: 0.7 },
    saveButtonText: { ...typography.body, color: 'white', fontWeight: 'bold' },
});
