import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BalanceCard } from '../components/BalanceCard';
import { MonthPicker } from '../components/MonthPicker';
import { TransactionGroup } from '../components/TransactionGroup';
import { useTransactions } from '../context/TransactionsContext';
import { mockBalance, mockMonth, mockUser } from '../data/mockData';
import { colors, fonts } from '../theme';

export function HomeScreen() {
  const { groups } = useTransactions();
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Text style={styles.brandingTitle}>PrettyCash</Text>
            <Text style={styles.date}>{mockUser.date}</Text>
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
          {groups.map((group) => (
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
  brandingTitle: {
    fontSize: 22,
    fontWeight: '700',
    fontFamily: fonts.bold,
    color: colors.foreground,
    letterSpacing: -0.3,
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
