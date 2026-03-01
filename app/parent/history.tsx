import { useRouter } from 'expo-router';
import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';

import { HistoryFeed } from '@/components/history/HistoryFeed';
import { commonStyles } from '@/constants/theme';

export default function ParentHistoryScreen() {
    const router = useRouter();

    return (
        <SafeAreaView style={commonStyles.container} edges={['top']}>
            {/* History Feed - Same as Guardian's tab */}
            <HistoryFeed
                hideHeader={false}
                headerTitle="우리 가족 기록"
                showBackButton={true}
                onBackPress={() => router.back()}
            />
        </SafeAreaView>
    );
}
