import { colors } from '@/constants/Colors';
import { Stack } from 'expo-router';

export default function FamilyLayout() {
    return (
        <Stack
            screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: colors.background },
            }}
        />
    );
}
