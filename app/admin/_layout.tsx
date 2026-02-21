
import React, { useEffect } from 'react';
import { Stack, useRouter } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';
import { View, ActivityIndicator, Alert } from 'react-native';
import { colors } from '@/constants/Colors';

export default function AdminLayout() {
    const { user, isLoading } = useAuthStore();
    const router = useRouter();

    useEffect(() => {
        console.log('AdminLayout Check:', { isLoading, user, role: user?.role });
        if (!isLoading) {
            if (!user || user.role !== 'admin') {
                console.log('Admin Access Denied. Redirecting...');
                Alert.alert('접근 거부', '관리자만 접근할 수 있습니다.');
                router.replace('/(tabs)'); // 또는 /parent
            }
        }
    }, [user, isLoading]);

    if (isLoading || !user || user.role !== 'admin') {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    return (
        <Stack
            screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: colors.background },
            }}
        >
            <Stack.Screen name="users" />
        </Stack>
    );
}
