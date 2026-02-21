import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { colors } from '@/constants/Colors';
import { borderRadius, spacing, typography, softShadow } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';

interface ParentProfileProps {
    name: string;
    avatarUrl?: string | null;
    relationshipLabel?: string;
}

export function ParentProfile({ name, avatarUrl, relationshipLabel }: ParentProfileProps) {
    return (
        <View style={styles.container}>
            <View style={styles.avatarContainer}>
                {avatarUrl ? (
                    <Image source={{ uri: avatarUrl }} style={styles.avatar} />
                ) : (
                    <View style={styles.avatarPlaceholder}>
                        <Ionicons name="person" size={32} color={colors.textSecondary} />
                    </View>
                )}
            </View>
            <View style={styles.textContainer}>
                {relationshipLabel && (
                    <Text style={styles.relationshipLabel}>{relationshipLabel}</Text>
                )}
                <Text style={styles.name}>{name}</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.md,
    },
    avatarContainer: {
        marginRight: spacing.md,
    },
    avatar: {
        width: 56,
        height: 56,
        borderRadius: borderRadius.full,
        borderWidth: 2,
        borderColor: colors.primary,
    },
    avatarPlaceholder: {
        width: 56,
        height: 56,
        borderRadius: borderRadius.full,
        backgroundColor: colors.pendingAccent,
        alignItems: 'center',
        justifyContent: 'center',
        ...softShadow,
    },
    textContainer: {
        flex: 1,
    },
    relationshipLabel: {
        ...typography.caption,
        color: colors.textSecondary,
        marginBottom: 2,
    },
    name: {
        ...typography.h3,
        color: colors.textPrimary,
    },
});

export default ParentProfile;
