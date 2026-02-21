import React from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { HistoryFeed } from '@/components/history/HistoryFeed';
import { commonStyles } from '@/constants/theme';

export default function HistoryScreen() {
  return (
    <SafeAreaView style={commonStyles.container} edges={['top']}>
      <HistoryFeed hideHeader={false} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({});
