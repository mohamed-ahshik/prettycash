import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fonts } from '../theme';

export function WalletsScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.content}>
        <Text style={styles.title}>Wallets</Text>
        <Text style={styles.body}>No wallets yet.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: 20, paddingTop: 24 },
  title: { fontSize: 24, fontWeight: '700', fontFamily: fonts.bold, color: colors.foreground },
  body: { marginTop: 12, fontSize: 14, color: colors.mutedForeground },
});
