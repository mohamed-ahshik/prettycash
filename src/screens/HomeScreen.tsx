import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BalanceCard } from '../components/BalanceCard';
import { MonthPicker } from '../components/MonthPicker';
import { TransactionGroup } from '../components/TransactionGroup';
import { mockBalance, mockMonth, mockTransactions, mockUser } from '../data/mockData';
import { colors, fonts } from '../theme';

export function HomeScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{mockUser.initial}</Text>
            </View>
            <View>
              <Text style={styles.greeting}>Hi {mockUser.name}!</Text>
              <Text style={styles.date}>{mockUser.date}</Text>
            </View>
          </View>
        </View>

        <MonthPicker month={mockMonth} />

        <BalanceCard
          total={mockBalance.total}
          income={mockBalance.income}
          expense={mockBalance.expense}
        />

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Daily transactions</Text>
          <Text style={styles.seeAll}>See all</Text>
        </View>

        <View style={styles.listCard}>
          {mockTransactions.map((group) => (
            <TransactionGroup key={group.label} group={group} />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 120,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    height: 48,
    width: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: fonts.bold,
    color: colors.primaryForeground,
  },
  greeting: {
    fontSize: 18,
    fontWeight: '600',
    fontFamily: fonts.semibold,
    lineHeight: 22,
    color: colors.foreground,
  },
  date: {
    fontSize: 12,
    fontWeight: '500',
    fontFamily: fonts.medium,
    color: colors.mutedForeground,
  },
  sectionHeader: {
    marginTop: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: fonts.bold,
    color: colors.foreground,
  },
  seeAll: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: fonts.bold,
    color: colors.primary,
  },
  listCard: {
    marginTop: 12,
    borderRadius: 20,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
});
