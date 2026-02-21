import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { HistoryFeed } from '@/components/history/HistoryFeed';
import { colors } from '@/constants/Colors';
import { commonStyles, spacing, typography } from '@/constants/theme';

export default function ParentHistoryScreen() {
    const router = useRouter();

    return (
        <SafeAreaView style={commonStyles.container} edges={['top']}>
            {/* Header */}
            <View style={styles.header}>
                <Pressable onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
                </Pressable>
                <Text style={styles.headerTitle}>우리 가족 기록</Text>
                <View style={{ width: 24 }} />
            </View>

            {/* History Feed - Same as Guardian's tab */}
            <HistoryFeed hideHeader={true} />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.xl,
        paddingBottom: spacing.lg,
    },
    backButton: {
        padding: spacing.xs,
        marginLeft: -spacing.xs,
    },
    headerTitle: {
        ...typography.h3,
        color: colors.textPrimary,
    },
});
