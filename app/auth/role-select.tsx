import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors } from '@/constants/Colors';
import { borderRadius, softShadow, spacing, typography } from '@/constants/theme';

interface RoleOption {
    id: 'guardian' | 'parent' | 'invited';
    icon: keyof typeof Ionicons.glyphMap;
    title: string;
    description: string;
    route: string;
}

const ROLE_OPTIONS: RoleOption[] = [
    {
        id: 'guardian',
        icon: 'heart',
        title: '주 케어자로 시작할게요',
        description: '가족 그룹을 처음 만들고 케어대상을 초대해요',
        route: '/auth/signup?role=guardian',
    },
    {
        id: 'parent',
        icon: 'gift',
        title: '케어대상으로 초대받았어요',
        description: '초대코드를 입력하고 가족들과 안부를 나눠요',
        route: '/auth/enter-code?type=parent',
    },
    {
        id: 'invited',
        icon: 'people',
        title: '함께 케어할 보조 케어자예요',
        description: '가족 그룹에 합류하여 함께 안부를 확인해요',
        route: '/auth/enter-code?type=guardian',
    },
];

export default function RoleSelectScreen() {
    const router = useRouter();

    const handleRoleSelect = (option: RoleOption) => {
        router.push(option.route as any);
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.logo}>🌸 ONANBU</Text>
                    <Text style={styles.title}>어떻게 오셨나요?</Text>
                    <Text style={styles.subtitle}>
                        상황에 맞는 항목을 선택해주세요
                    </Text>
                </View>

                {/* Role Options */}
                <View style={styles.optionsContainer}>
                    {ROLE_OPTIONS.map((option) => (
                        <Pressable
                            key={option.id}
                            style={({ pressed }) => [
                                styles.optionCard,
                                pressed && styles.optionCardPressed,
                            ]}
                            onPress={() => handleRoleSelect(option)}
                        >
                            <View style={styles.optionIcon}>
                                <Ionicons name={option.icon} size={28} color={colors.primary} />
                            </View>
                            <View style={styles.optionText}>
                                <Text style={styles.optionTitle}>{option.title}</Text>
                                <Text style={styles.optionDescription}>{option.description}</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={24} color={colors.textSecondary} />
                        </Pressable>
                    ))}
                </View>

                {/* Footer */}
                <View style={styles.footer}>
                    <Text style={styles.footerText}>이미 계정이 있으신가요?</Text>
                    <Pressable onPress={() => router.push('/auth/login')}>
                        <Text style={styles.loginLink}>로그인하기</Text>
                    </Pressable>
                </View>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    content: {
        flex: 1,
        padding: spacing.lg,
        justifyContent: 'center',
    },
    header: {
        alignItems: 'center',
        marginBottom: spacing.xxl,
    },
    logo: {
        fontSize: 32,
        marginBottom: spacing.md,
    },
    title: {
        ...typography.h1,
        color: colors.textPrimary,
        textAlign: 'center',
        marginBottom: spacing.sm,
    },
    subtitle: {
        ...typography.body,
        color: colors.textSecondary,
        textAlign: 'center',
    },
    optionsContainer: {
        gap: spacing.md,
    },
    optionCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.cardBg,
        borderRadius: borderRadius.xl,
        padding: spacing.lg,
        ...softShadow,
    },
    optionCardPressed: {
        backgroundColor: colors.pending,
        transform: [{ scale: 0.98 }],
    },
    optionIcon: {
        width: 56,
        height: 56,
        borderRadius: borderRadius.lg,
        backgroundColor: colors.pending,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.md,
    },
    optionText: {
        flex: 1,
    },
    optionTitle: {
        ...typography.body,
        fontWeight: '600',
        color: colors.textPrimary,
        marginBottom: 4,
    },
    optionDescription: {
        ...typography.small,
        color: colors.textSecondary,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: spacing.xxl,
        gap: spacing.xs,
    },
    footerText: {
        ...typography.body,
        color: colors.textSecondary,
    },
    loginLink: {
        ...typography.body,
        color: colors.primary,
        fontWeight: '600',
    },
});
