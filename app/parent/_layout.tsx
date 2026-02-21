import { Stack } from 'expo-router';
import { colors } from '@/constants/Colors';

export default function ParentLayout() {
    return (
        <Stack
            screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: colors.background },
            }}
        >
            <Stack.Screen name="index" />
            <Stack.Screen name="settings" />
        </Stack>
    );
}
