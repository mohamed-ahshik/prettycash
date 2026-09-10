import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fonts } from '../theme';

export function InsightsScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Insights</Text>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Spending by category</Text>
          <Text style={styles.cardBody}>Charts coming soon.</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Monthly trend</Text>
          <Text style={styles.cardBody}>Charts coming soon.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 120, gap: 16 },
  title: { fontSize: 24, fontWeight: '700', fontFamily: fonts.bold, color: colors.foreground },
  card: {
    borderRadius: 20,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 20,
  },
  cardTitle: { fontSize: 16, fontWeight: '700', fontFamily: fonts.bold, color: colors.foreground },
  cardBody: { marginTop: 8, fontSize: 14, color: colors.mutedForeground },
});
