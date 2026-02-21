import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { colors } from '@/constants/Colors';
import { borderRadius, spacing, typography, softShadow } from '@/constants/theme';
import { strings } from '@/constants/strings';
import { ActionType } from '@/lib/types';
import { Ionicons } from '@expo/vector-icons';

interface ActionCardProps {
    type: ActionType;
    isCompleted?: boolean;
    onPress: () => void;
}

export function ActionCard({ type, isCompleted = false, onPress }: ActionCardProps) {
    const isVoice = type === 'voice_cheer';

    const config: Record<string, { icon: any; title: string; description: string; buttonLabel: string }> = {
        voice_cheer: {
            icon: 'mic-outline' as const,
            title: strings.care.voiceTitle,
            description: strings.care.voiceDesc,
            buttonLabel: strings.care.adButtonFull,
        },
        check_in: {
            icon: 'heart-outline' as const,
            title: strings.care.checkInTitle,
            description: strings.care.checkInDesc,
            buttonLabel: strings.care.adButton15s,
        },
        message: {
            icon: 'chatbubble-outline' as const,
            title: '안부 메시지',
            description: '따뜻한 메시지를 보내세요',
            buttonLabel: strings.care.adButton15s,
        },
    };

    const { icon, title, description, buttonLabel } = config[type];

    return (
        <View style={[styles.container, isCompleted && styles.containerCompleted]}>
            <View style={styles.header}>
                <View style={[styles.iconContainer, isCompleted && styles.iconCompleted]}>
                    <Ionicons
                        name={isCompleted ? 'checkmark' : icon}
                        size={28}
                        color={isCompleted ? colors.success : colors.primary}
                    />
                </View>
                <View style={styles.textContainer}>
                    <Text style={styles.title}>{title}</Text>
                    <Text style={styles.description}>{description}</Text>
                </View>
            </View>

            {!isCompleted ? (
                <>
                    <Pressable
                        style={({ pressed }) => [
                            styles.button,
                            pressed && styles.buttonPressed
                        ]}
                        onPress={onPress}
                    >
                        <Text style={styles.buttonText}>{buttonLabel}</Text>
                    </Pressable>
                    <Text style={styles.caption}>{strings.care.adCaption}</Text>
                </>
            ) : (
                <View style={styles.completedBadge}>
                    <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                    <Text style={styles.completedText}>완료됨</Text>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: colors.cardBg,
        borderRadius: borderRadius.xl,
        padding: spacing.lg,
        marginBottom: spacing.md,
        ...softShadow,
    },
    containerCompleted: {
        opacity: 0.7,
    },
    header: {
        flexDirection: 'row',
        marginBottom: spacing.lg,
    },
    iconContainer: {
        width: 56,
        height: 56,
        borderRadius: borderRadius.lg,
        backgroundColor: colors.pending,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.md,
    },
    iconCompleted: {
        backgroundColor: '#E8F5E9',
    },
    textContainer: {
        flex: 1,
        justifyContent: 'center',
    },
    title: {
        ...typography.h3,
        color: colors.textPrimary,
        marginBottom: spacing.xs,
    },
    description: {
        ...typography.small,
        color: colors.textSecondary,
    },
    button: {
        backgroundColor: colors.action,
        borderRadius: borderRadius.lg,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.lg,
        alignItems: 'center',
        marginBottom: spacing.sm,
        ...softShadow,
    },
    buttonPressed: {
        backgroundColor: colors.actionLight,
        transform: [{ scale: 0.98 }],
    },
    buttonText: {
        ...typography.body,
        color: colors.textWhite,
        fontWeight: '600',
    },
    caption: {
        ...typography.caption,
        color: colors.textSecondary,
        textAlign: 'center',
    },
    completedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.sm,
    },
    completedText: {
        ...typography.body,
        color: colors.success,
        marginLeft: spacing.xs,
    },
});

export default ActionCard;
