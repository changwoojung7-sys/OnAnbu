import { Stack } from 'expo-router';
import { colors } from '@/constants/Colors';

export default function AuthLayout() {
    return (
        <Stack
            screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: colors.background },
                animation: 'slide_from_right',
            }}
        >
            <Stack.Screen name="index" />
            <Stack.Screen name="role-select" />
            <Stack.Screen name="signup" />
            <Stack.Screen name="login" />
            <Stack.Screen name="invite-parent" />
            <Stack.Screen name="enter-code" />
            <Stack.Screen name="parent-signup" />
            <Stack.Screen name="signup-success" />
        </Stack>
    );
}
