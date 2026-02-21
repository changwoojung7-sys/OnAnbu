import { colors } from '@/constants/Colors';
import { strings } from '@/constants/strings';
import { borderRadius, softShadow, spacing, typography } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

interface StatusCardProps {
    isComplete: boolean;
    parentName?: string;
    lastActionTime?: string | null;
    actionType?: string | null;
    actionMessage?: string | null;
    actionUrl?: string | null;
}

export function StatusCard({
    isComplete,
    parentName = '어머니',
    lastActionTime,
    actionType,
    actionMessage,
    actionUrl
}: StatusCardProps) {
    const router = useRouter();

    const formatTime = (isoString: string) => {
        const date = new Date(isoString);
        const hours = date.getHours();
        const minutes = date.getMinutes().toString().padStart(2, '0');
        const period = hours >= 12 ? '오후' : '오전';
        const displayHours = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
        return `${period} ${displayHours}:${minutes}`;
    };

    if (isComplete) {
        return (
            <View style={[styles.container, styles.containerComplete]}>
                {actionUrl && actionType === 'message' && !actionUrl.endsWith('.mp4') ? (
                    <Image
                        source={{ uri: actionUrl }}
                        style={styles.messageImage}
                        resizeMode="cover"
                    />
                ) : (
                    <View style={styles.iconContainer}>
                        <Text style={styles.iconEmoji}>
                            {actionType === 'voice_cheer' ? '🎤' : '🌸'}
                        </Text>
                    </View>
                )}
                <Text style={styles.title}>
                    {actionMessage ? actionMessage : `오늘 ${parentName}는 기분 좋게 하루를 시작하셨어요!`}
                </Text>
                <Text style={styles.subtitle}>
                    {actionType === 'voice_cheer' ? '음성 응원이 도착했습니다!' : actionType === 'message' ? '사진/영상이 도착했습니다!' : strings.home.doneEmoji}
                </Text>
                {lastActionTime && (
                    <View style={styles.timeContainer}>
                        <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                        <Text style={styles.timeText}>
                            {formatTime(lastActionTime)} 확인됨
                        </Text>
                    </View>
                )}

                <Pressable
                    style={styles.historyShortcutButton}
                    onPress={() => router.push('/two')}
                >
                    <Text style={styles.historyShortcutText}>우리가족 전체 기록 보기 〉</Text>
                </Pressable>
            </View>
        );
    }

    return (
        <View style={[styles.container, styles.containerPending]}>
            <View style={styles.iconContainer}>
                <Text style={styles.iconEmoji}>🌤️</Text>
            </View>
            <Text style={styles.title}>
                아직 {parentName}의 아침 소식이 없어요.
            </Text>
            <Text style={styles.subtitle}>{strings.home.pendingSub}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        borderRadius: borderRadius.xl,
        padding: spacing.xl,
        alignItems: 'center',
        marginVertical: spacing.lg,
        ...softShadow,
    },
    containerPending: {
        backgroundColor: colors.pending,
    },
    containerComplete: {
        backgroundColor: colors.complete,
    },
    iconContainer: {
        marginBottom: spacing.md,
    },
    iconEmoji: {
        fontSize: 64,
    },
    title: {
        ...typography.bodyLarge,
        color: colors.textPrimary,
        textAlign: 'center',
        marginBottom: spacing.sm,
    },
    subtitle: {
        ...typography.body,
        color: colors.textSecondary,
        textAlign: 'center',
    },
    timeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: spacing.md,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
        backgroundColor: 'rgba(255,255,255,0.7)',
        borderRadius: borderRadius.md,
    },
    timeText: {
        ...typography.small,
        color: colors.textSecondary,
        marginLeft: spacing.xs,
    },
    messageImage: {
        width: '100%',
        height: 200,
        borderRadius: borderRadius.lg,
        marginBottom: spacing.md,
    },
    historyShortcutButton: {
        marginTop: spacing.xl,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.lg,
        backgroundColor: 'rgba(255,255,255,0.5)',
        borderRadius: borderRadius.full,
    },
    historyShortcutText: {
        ...typography.body,
        fontWeight: '600',
        color: colors.primary,
    },
});

export default StatusCard;
